import asyncio
import json
from typing import Dict, Any, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database.database import get_db
from app.services.websocket_manager import ws_broadcaster
from app.driver.camera import driver_camera_manager
from app.driver.routes import driver_session_state
from app.models.models import Video, Detection, DamageCategory, ProcessingStatus

router = APIRouter(tags=["WebSockets & Live Telemetry"])

# Global state for video processing progress tracking
processing_progress_state: Dict[str, Any] = {
    "is_processing": False,
    "video_id": None,
    "current_frame": 0,
    "total_frames": 0,
    "progress_percent": 0.0,
    "current_fps": 0.0,
    "estimated_time_remaining_sec": 0,
    "pothole_count": 0,
    "crack_count": 0,
    "road_health_index": 100.0,
    "status": "idle"
}


@router.websocket("/ws/live-detections")
@router.websocket("/ws/dashboard")
@router.websocket("/ws")
@router.websocket("/ws/{client_id}")
async def websocket_telemetry_endpoint(websocket: WebSocket, client_id: str = "client"):
    """
    Real-Time WebSocket Endpoint for Live Detections & Dashboard Updates.
    Channels:
    - /ws/live-detections
    - /ws/dashboard
    """
    await ws_broadcaster.connect(websocket)
    try:
        # Send initial confirmation connection handshake
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "message": f"Connected to Smart Road Damage Telemetry Stream ({client_id})",
            "camera_active": driver_camera_manager.is_running,
            "processing_active": processing_progress_state["is_processing"]
        }))

        while True:
            data = await websocket.receive_text()
            # Handle incoming ping / client messages if needed
            try:
                msg = json.loads(data)
                if msg.get("action") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong", "timestamp": asyncio.get_event_loop().time()}))
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_broadcaster.disconnect(websocket)


@router.get("/processing/status")
async def get_processing_status(db: AsyncSession = Depends(get_db)):
    """
    GET /processing/status
    Get current progress status of background video processing pipeline or camera stream.
    """
    # Fetch active or latest processing video from DB
    stmt = select(Video).order_by(Video.created_at.desc()).limit(1)
    result = await db.execute(stmt)
    latest_video = result.scalars().first()

    return {
        "is_processing": processing_progress_state["is_processing"],
        "video_id": processing_progress_state["video_id"] or (latest_video.id if latest_video else None),
        "video_status": latest_video.status.value if latest_video else "idle",
        "current_frame": processing_progress_state["current_frame"],
        "total_frames": processing_progress_state["total_frames"],
        "progress_percent": processing_progress_state["progress_percent"],
        "current_fps": processing_progress_state["current_fps"],
        "estimated_time_remaining_sec": processing_progress_state["estimated_time_remaining_sec"],
        "camera_active": driver_camera_manager.is_running,
        "camera_fps": driver_camera_manager.current_fps,
        "status_message": processing_progress_state.get("status", "System operational")
    }


@router.get("/processing/live")
async def get_live_telemetry(db: AsyncSession = Depends(get_db)):
    """
    GET /processing/live
    Snapshot of live telemetry metrics for instant real-time dashboard rendering.
    """
    # Aggregate total detections
    total_det_stmt = select(func.count(Detection.id))
    total_detections = (await db.execute(total_det_stmt)).scalar() or 0

    pothole_stmt = select(func.count(Detection.id)).where(Detection.category == DamageCategory.POTHOLE)
    pothole_count = (await db.execute(pothole_stmt)).scalar() or 0

    crack_count = total_detections - pothole_count

    # Calculate Road Health Index (100 - weighted defects)
    rhi = max(15.0, round(100.0 - (pothole_count * 2.5 + crack_count * 1.2), 1))

    active_warning = driver_session_state.get("last_warning")

    return {
        "timestamp": asyncio.get_event_loop().time(),
        "total_potholes_detected": pothole_count,
        "total_cracks_detected": crack_count,
        "total_detections": total_detections,
        "road_health_index": rhi,
        "current_frame_number": processing_progress_state["current_frame"],
        "video_timestamp_sec": round(processing_progress_state["current_frame"] / max(1.0, processing_progress_state["current_fps"] or 30.0), 2),
        "live_confidence": active_warning.get("confidence", 0.88) if active_warning else 0.91,
        "current_severity": active_warning.get("level", "low") if active_warning else "low",
        "gps_location": {
            "latitude": 37.7749,
            "longitude": -122.4194
        },
        "processing_fps": driver_camera_manager.current_fps if driver_camera_manager.is_running else processing_progress_state["current_fps"],
        "current_warning": active_warning,
        "camera_status": driver_camera_manager.get_status(),
        "video_processing_status": processing_progress_state
    }
