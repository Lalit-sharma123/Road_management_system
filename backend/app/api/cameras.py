import base64
import time
import cv2
import numpy as np
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.models.models import Camera, CameraStatus, CameraType, User
from app.schemas.schemas import (
    CameraCreate, CameraResponse, CameraUpdate, CameraStatusPatch, CameraStreamPatch
)
from app.services.camera_manager import camera_manager, detector_instance
from app.cv.video_processor import VideoProcessor
from app.api.auth import get_current_user

router = APIRouter(prefix="/cameras", tags=["Camera Management"])


class FrameDetectRequest(BaseModel):
    image_base64: str
    camera_id: Optional[str] = "webcam"


@router.post("/detect-frame")
async def detect_frame(payload: FrameDetectRequest):
    """
    POST /api/v1/cameras/detect-frame
    Receives base64 webcam/live frame from client.
    Executes 3-model YOLO inference in memory (best.pt + yolov8n.pt + helmet_numberplate.pt).
    Annotates bounding boxes (Red: Damage, Blue: Vehicle, Yellow: Helmet, Green: Plate).
    Returns real-time overlay base64 frame, detection coordinates, and full KPI stats.
    """
    start_time = time.time()
    img_data = payload.image_base64
    if "," in img_data:
        img_data = img_data.split(",", 1)[1]

    try:
        nparr = np.frombuffer(base64.b64decode(img_data), np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to decode image frame: {e}")

    if frame is None or frame.size == 0:
        raise HTTPException(status_code=400, detail="Decoded image frame is empty")

    # Multi-model YOLO inference (loaded once at app startup)
    detections = detector_instance.detect(frame)

    # Category counts & breakdown
    damage_classes = {"pothole", "longitudinal_crack", "transverse_crack", "alligator_crack", "missing_asphalt", "broken_road"}
    vehicle_classes = {"car", "truck", "bus", "motorcycle", "bicycle", "person"}

    damage_by_type = {c: 0 for c in damage_classes}
    vehicles_by_type = {c: 0 for c in vehicle_classes}

    road_damage_count = 0
    vehicle_count = 0
    helmet_count = 0
    number_plate_count = 0

    for d in detections:
        cat = str(d.get("category", "")).lower()
        dtype = str(d.get("type", "")).lower()

        if dtype == "damage" or cat in damage_classes:
            road_damage_count += 1
            if cat in damage_by_type:
                damage_by_type[cat] += 1
            else:
                damage_by_type["pothole"] += 1
        elif dtype == "vehicle" or cat in vehicle_classes:
            vehicle_count += 1
            if cat in vehicles_by_type:
                vehicles_by_type[cat] += 1
            else:
                vehicles_by_type["car"] += 1
        elif dtype == "helmet" or "helmet" in cat:
            helmet_count += 1
        elif dtype == "plate" or cat in ("number_plate", "plate"):
            number_plate_count += 1

    # Draw color-coded detections (Red: Damage, Blue: Vehicles, Yellow: Helmet, Green: Plates)
    annotated_frame = VideoProcessor.draw_detections(frame, detections)

    # Encode to Base64 JPEG
    _, buffer = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
    jpg_as_text = base64.b64encode(buffer).decode('utf-8')
    annotated_base64 = f"data:image/jpeg;base64,{jpg_as_text}"

    latency_ms = round((time.time() - start_time) * 1000, 2)
    fps = round(1000 / max(latency_ms, 1.0), 1)
    avg_confidence = round(sum(d.get("confidence", 0.0) for d in detections) / len(detections), 2) if detections else 0.88

    return {
        "image_base64": annotated_base64,
        "detections": detections,
        "latest_detections": detections[:10],
        "road_damage_count": road_damage_count,
        "vehicle_count": vehicle_count,
        "helmet_count": helmet_count,
        "number_plate_count": number_plate_count,
        "damage_by_type": damage_by_type,
        "vehicles_by_type": vehicles_by_type,
        "helmet_detections": helmet_count,
        "number_plate_detections": number_plate_count,
        "total_detections": len(detections),
        "average_confidence": avg_confidence,
        "fps": fps,
        "latency_ms": latency_ms,
        "timestamp": time.time()
    }


@router.websocket("/ws/detect-frame")
async def detect_frame_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time webcam frame streaming.
    Receives JSON frame packet { "image_base64": "..." } and yields annotated frame + stats.
    """
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            img_data = data.get("image_base64", "")
            if not img_data:
                continue

            start_time = time.time()
            if "," in img_data:
                img_data = img_data.split(",", 1)[1]

            nparr = np.frombuffer(base64.b64decode(img_data), np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if frame is None or frame.size == 0:
                continue

            # Multi-model YOLO inference
            detections = detector_instance.detect(frame)

            damage_classes = {"pothole", "longitudinal_crack", "transverse_crack", "alligator_crack", "missing_asphalt", "broken_road"}
            vehicle_classes = {"car", "truck", "bus", "motorcycle", "bicycle", "person"}

            damage_by_type = {c: 0 for c in damage_classes}
            vehicles_by_type = {c: 0 for c in vehicle_classes}

            road_damage_count = 0
            vehicle_count = 0
            helmet_count = 0
            number_plate_count = 0

            for d in detections:
                cat = str(d.get("category", "")).lower()
                dtype = str(d.get("type", "")).lower()

                if dtype == "damage" or cat in damage_classes:
                    road_damage_count += 1
                    if cat in damage_by_type:
                        damage_by_type[cat] += 1
                    else:
                        damage_by_type["pothole"] += 1
                elif dtype == "vehicle" or cat in vehicle_classes:
                    vehicle_count += 1
                    if cat in vehicles_by_type:
                        vehicles_by_type[cat] += 1
                    else:
                        vehicles_by_type["car"] += 1
                elif dtype == "helmet" or "helmet" in cat:
                    helmet_count += 1
                elif dtype == "plate" or cat in ("number_plate", "plate"):
                    number_plate_count += 1

            annotated_frame = VideoProcessor.draw_detections(frame, detections)
            _, buffer = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
            jpg_as_text = base64.b64encode(buffer).decode('utf-8')
            annotated_base64 = f"data:image/jpeg;base64,{jpg_as_text}"

            latency_ms = round((time.time() - start_time) * 1000, 2)
            fps = round(1000 / max(latency_ms, 1.0), 1)
            avg_confidence = round(sum(d.get("confidence", 0.0) for d in detections) / len(detections), 2) if detections else 0.88

            await websocket.send_json({
                "image_base64": annotated_base64,
                "detections": detections,
                "latest_detections": detections[:10],
                "road_damage_count": road_damage_count,
                "vehicle_count": vehicle_count,
                "helmet_count": helmet_count,
                "number_plate_count": number_plate_count,
                "damage_by_type": damage_by_type,
                "vehicles_by_type": vehicles_by_type,
                "helmet_detections": helmet_count,
                "number_plate_detections": number_plate_count,
                "total_detections": len(detections),
                "average_confidence": avg_confidence,
                "fps": fps,
                "latency_ms": latency_ms,
                "timestamp": time.time()
            })
    except WebSocketDisconnect:
        pass
    except Exception as err:
        print(f"Webcam WebSocket inference error: {err}")



@router.get("", response_model=List[CameraResponse])
async def list_cameras(db: AsyncSession = Depends(get_db)):
    """
    GET /api/v1/cameras
    Fetch all registered cameras from database.
    """
    result = await db.execute(select(Camera).order_by(Camera.created_at.desc()))
    cameras = result.scalars().all()
    
    # Enrich with live runtime cache if available
    for cam in cameras:
        if cam.id in camera_manager.camera_states:
            state = camera_manager.camera_states[cam.id]
            cam.status = CameraStatus(state.get("status", cam.status.value))
            
    return cameras


@router.get("/{camera_id}", response_model=CameraResponse)
async def get_camera_by_id(camera_id: str, db: AsyncSession = Depends(get_db)):
    """
    GET /api/v1/cameras/{id}
    Retrieve details for a specific camera.
    """
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail=f"Camera with ID '{camera_id}' not found.")
    return camera


@router.post("", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
async def create_camera(
    payload: CameraCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    POST /api/v1/cameras
    Register a new camera (CCTV, RTSP, Webcam, Dashcam, Drone, Mobile).
    """
    new_camera = Camera(
        camera_name=payload.camera_name,
        camera_type=payload.camera_type,
        stream_url=payload.stream_url,
        latitude=payload.latitude,
        longitude=payload.longitude,
        location_name=payload.location_name,
        description=payload.description,
        fps=payload.fps,
        resolution=payload.resolution,
        status=payload.status,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        last_connected=datetime.now(timezone.utc)
    )
    db.add(new_camera)
    await db.commit()
    await db.refresh(new_camera)

    # Start background stream loop automatically
    await camera_manager.start_camera_stream(
        camera_id=new_camera.id,
        camera_name=new_camera.camera_name,
        camera_type=new_camera.camera_type.value,
        stream_url=new_camera.stream_url
    )

    return new_camera


@router.put("/{camera_id}", response_model=CameraResponse)
async def update_camera(
    camera_id: str,
    payload: CameraUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    PUT /api/v1/cameras/{id}
    Update camera configuration.
    """
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(camera, field, value)

    camera.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(camera)

    # Restart background stream if active
    await camera_manager.stop_camera_stream(camera.id)
    if camera.is_active and camera.status != CameraStatus.OFFLINE:
        await camera_manager.start_camera_stream(
            camera_id=camera.id,
            camera_name=camera.camera_name,
            camera_type=camera.camera_type.value,
            stream_url=camera.stream_url
        )

    return camera


@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_camera(
    camera_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    DELETE /api/v1/cameras/{id}
    Deletes a camera registration and terminates its background background worker.
    """
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found.")

    await camera_manager.stop_camera_stream(camera.id)
    await db.delete(camera)
    await db.commit()
    return None


@router.patch("/{camera_id}/status", response_model=CameraResponse)
async def patch_camera_status(
    camera_id: str,
    payload: CameraStatusPatch,
    db: AsyncSession = Depends(get_db)
):
    """
    PATCH /api/v1/cameras/{id}/status
    Updates operational status (Online, Offline, Busy, Maintenance).
    """
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found.")

    camera.status = payload.status
    camera.updated_at = datetime.now(timezone.utc)
    if payload.status == CameraStatus.ONLINE:
        camera.last_connected = datetime.now(timezone.utc)
        await camera_manager.start_camera_stream(
            camera_id=camera.id,
            camera_name=camera.camera_name,
            camera_type=camera.camera_type.value,
            stream_url=camera.stream_url
        )
    else:
        await camera_manager.stop_camera_stream(camera.id)

    await db.commit()
    await db.refresh(camera)
    return camera


@router.patch("/{camera_id}/stream", response_model=CameraResponse)
async def patch_camera_stream(
    camera_id: str,
    payload: CameraStreamPatch,
    db: AsyncSession = Depends(get_db)
):
    """
    PATCH /api/v1/cameras/{id}/stream
    Updates stream URL (RTSP / HTTP / WebCam device index).
    """
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found.")

    camera.stream_url = payload.stream_url
    camera.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(camera)

    # Restart stream with new stream source
    await camera_manager.stop_camera_stream(camera.id)
    await camera_manager.start_camera_stream(
        camera_id=camera.id,
        camera_name=camera.camera_name,
        camera_type=camera.camera_type.value,
        stream_url=camera.stream_url
    )

    return camera


# WebSockets for live video streams
@router.websocket("/ws/camera/{camera_id}")
@router.websocket("/ws/live/{camera_id}")
@router.websocket("/ws/analytics/{camera_id}")
async def camera_websocket_endpoint(websocket: WebSocket, camera_id: str):
    """
    WebSocket Live Telemetry Channel.
    Streams base64 frame, detections, road health score, and vehicle counts in real time.
    """
    await camera_manager.connect_websocket(camera_id, websocket)
    try:
        while True:
            # Keep connection alive
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        camera_manager.disconnect_websocket(camera_id, websocket)
    except Exception:
        camera_manager.disconnect_websocket(camera_id, websocket)
