import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.config import settings
from app.database.database import get_db
from app.models.models import User, Video, Detection, UserRole, ProcessingStatus
from app.schemas.schemas import VideoUploadResponse, VideoDetailResponse, VideoDashboardResponse
from app.auth.jwt import get_current_user, get_current_user_optional, require_role
from app.cv.video_processor import VideoProcessor
from app.api.process import global_session_manager, cleanup_system_resources, ws_manager
from app.services.websocket_manager import ws_broadcaster

router = APIRouter(prefix="/videos", tags=["Videos"])

ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv"}


@router.post("/upload", response_model=VideoUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_video(
    title: str = Form(...),
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a road inspection video file (.mp4, .avi, .mov, .mkv).
    Validates extension, cancels any active previous video processing, purges old temporary
    files, caches and frame buffers, releases resources, saves the new video and extracts metadata.
    """
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{file_ext}'. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # 1. Immediately cancel any running video processing session and release handles
    await global_session_manager.cancel_current_session()

    # 2. Save new file
    video_id = str(uuid.uuid4())
    sanitized_filename = f"{video_id}{file_ext}"
    saved_path = os.path.join(settings.UPLOAD_DIR, sanitized_filename)

    # 3. Clean up previous temporary videos and cached frame outputs
    cleanup_system_resources(exclude_video_id=video_id)

    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(saved_path)

    # 4. Process OpenCV Metadata & Thumbnail with guaranteed release
    processor = None
    try:
        processor = VideoProcessor(video_path=saved_path, video_id=video_id)
        metadata = processor.get_metadata()
        
        thumbnail_filename = f"thumb_{video_id}.jpg"
        thumbnail_path = os.path.join(settings.PROCESSED_DIR, thumbnail_filename)
        processor.generate_thumbnail(thumbnail_path, frame_num=15)

        duration = metadata["duration_seconds"]
        total_frames = metadata["total_frames"]
        fps = metadata["fps"]
        resolution = metadata["resolution"]
    except Exception as e:
        print(f"Warning: OpenCV thumbnail generation note: {e}")
        duration = 0.0
        total_frames = 0
        fps = 30.0
        resolution = "1920x1080"
        thumbnail_path = None
    finally:
        if processor:
            processor.close()
            processor = None

    new_video = Video(
        id=video_id,
        title=title,
        filename=file.filename,
        file_path=saved_path,
        thumbnail_path=thumbnail_path,
        file_size_bytes=file_size,
        duration_seconds=duration,
        total_frames=total_frames,
        fps=fps,
        resolution=resolution,
        status=ProcessingStatus.PENDING,
        uploader_id=current_user.id if current_user else None
    )

    db.add(new_video)
    await db.commit()
    await db.refresh(new_video)

    # 5. Broadcast reset message to any connected WebSockets so UI clears old frames
    reset_msg = {
        "type": "session_reset",
        "video_id": video_id,
        "message": f"New video uploaded: {title}. Previous video state cleared."
    }
    await ws_manager.broadcast(reset_msg)
    await ws_broadcaster.broadcast(reset_msg)

    return new_video


@router.get("/", response_model=List[VideoUploadResponse])
async def list_videos(
    skip: int = 0,
    limit: int = 50,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """List uploaded inspection videos with pagination."""
    stmt = select(Video).order_by(Video.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{video_id}", response_model=VideoDetailResponse)
async def get_video_details(
    video_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve complete metadata, processing state, and analytics for a video."""
    stmt = (
        select(Video)
        .options(
            selectinload(Video.analytics),
            selectinload(Video.gps_tracks)
        )
        .where(Video.id == video_id)
    )
    video = (await db.execute(stmt)).scalar_one_or_none()
    
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video with ID '{video_id}' not found."
        )
    return video


@router.get("/{video_id}/dashboard", response_model=VideoDashboardResponse)
async def get_video_dashboard(
    video_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetch comprehensive dashboard metrics for a single video inspection,
    including video metadata, analytics, road health, GPS coordinates,
    damage timeline events, and defect counts.
    """
    stmt = (
        select(Video)
        .options(
            selectinload(Video.analytics),
            selectinload(Video.gps_tracks),
            selectinload(Video.detections).selectinload(Detection.frame)
        )
        .where(Video.id == video_id)
    )
    result = await db.execute(stmt)
    video = result.scalar_one_or_none()

    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video with ID '{video_id}' not found."
        )

    # 1. Video Metadata
    status_str = video.status.value if hasattr(video.status, "value") else str(video.status)
    metadata = {
        "id": video.id,
        "title": video.title,
        "filename": video.filename,
        "file_path": video.file_path,
        "processed_file_path": video.processed_file_path,
        "thumbnail_path": video.thumbnail_path,
        "duration_seconds": video.duration_seconds,
        "total_frames": video.total_frames,
        "fps": video.fps,
        "resolution": video.resolution,
        "status": status_str,
        "created_at": video.created_at.isoformat() if video.created_at else None,
    }

    # 2. Analytics
    analytics_data = None
    health_score = 100.0
    overall_sev = "low"
    if video.analytics:
        health_score = video.analytics.road_health_score
        overall_sev = video.analytics.overall_severity.value if hasattr(video.analytics.overall_severity, "value") else str(video.analytics.overall_severity)
        analytics_data = {
            "id": video.analytics.id,
            "road_health_score": video.analytics.road_health_score,
            "total_detections": video.analytics.total_detections,
            "pothole_count": video.analytics.pothole_count,
            "crack_count": video.analytics.crack_count,
            "critical_count": video.analytics.critical_count,
            "damage_density_per_km": video.analytics.damage_density_per_km,
            "overall_severity": overall_sev,
            "summary_json": video.analytics.summary_json
        }

    # 3. Detections & Timeline
    category_counts = {}
    severity_counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    timeline_events = []

    detections = video.detections or []
    for d in detections:
        cat_val = d.category.value if hasattr(d.category, "value") else str(d.category)
        sev_val = d.severity.value if hasattr(d.severity, "value") else str(d.severity)

        category_counts[cat_val] = category_counts.get(cat_val, 0) + 1
        severity_counts[sev_val] = severity_counts.get(sev_val, 0) + 1

        frame_num = d.frame.frame_number if d.frame else 0
        timestamp = d.frame.timestamp_seconds if d.frame else 0.0
        img_path = d.frame.image_path if d.frame else ""

        timeline_events.append({
            "id": d.id,
            "frame_number": frame_num,
            "timestamp_seconds": timestamp,
            "category": cat_val,
            "confidence": d.confidence,
            "severity": sev_val,
            "severity_score": d.severity_score,
            "image_path": img_path,
            "bbox": {
                "x_min": d.x_min,
                "y_min": d.y_min,
                "x_max": d.x_max,
                "y_max": d.y_max,
                "area_pixels": d.area_pixels
            }
        })

    # Sort timeline chronological
    timeline_events.sort(key=lambda x: x["timestamp_seconds"])

    # 4. Road Health Score Assessment
    health_status = "EXCELLENT"
    if health_score < 50:
        health_status = "CRITICAL DAMAGE"
    elif health_score < 70:
        health_status = "FAIR / MODERATE"
    elif health_score < 85:
        health_status = "GOOD QUALITY"

    road_health = {
        "score": health_score,
        "status": health_status,
        "overall_severity": overall_sev
    }

    # 5. GPS Tracks
    gps_data = [
        {
            "id": g.id,
            "frame_number": g.frame_number,
            "latitude": g.latitude,
            "longitude": g.longitude,
            "altitude_meters": g.altitude_meters,
            "speed_kmh": g.speed_kmh,
            "road_name": g.road_name
        }
        for g in (video.gps_tracks or [])
    ]

    return {
        "video_metadata": metadata,
        "analytics": analytics_data,
        "detection_summary": {
            "total": len(detections),
            "category_counts": category_counts,
            "severity_counts": severity_counts
        },
        "road_health": road_health,
        "gps": gps_data,
        "timeline": timeline_events,
        "detection_counts": category_counts
    }


@router.get("/{video_id}/download")
async def download_processed_video(
    video_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Download the processed annotated video MP4 file."""
    stmt = select(Video).where(Video.id == video_id)
    video = (await db.execute(stmt)).scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    file_to_send = None
    if video.processed_file_path and os.path.exists(video.processed_file_path):
        file_to_send = video.processed_file_path
    elif video.file_path and os.path.exists(video.file_path):
        file_to_send = video.file_path

    if not file_to_send or not os.path.exists(file_to_send):
        raise HTTPException(status_code=404, detail="Processed video file not available on disk yet")

    clean_title = "".join(c for c in video.title if c.isalnum() or c in (' ', '_', '-')).rstrip()
    download_filename = f"processed_{clean_title or video_id}.mp4"

    return FileResponse(
        path=file_to_send,
        media_type="video/mp4",
        filename=download_filename
    )


@router.delete("/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_video(
    video_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db)
):
    """Delete a video and all associated frames, detections, and reports."""
    stmt = select(Video).where(Video.id == video_id)
    video = (await db.execute(stmt)).scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    if os.path.exists(video.file_path):
        os.remove(video.file_path)

    await db.delete(video)
    await db.commit()
