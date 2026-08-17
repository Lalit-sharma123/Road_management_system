import cv2
import numpy as np
import base64
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Body, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.database import get_db
from app.models.models import DriverSettings, DriverAlertLog, Detection, DamageCategory, SeverityLevel
from app.driver.camera import driver_camera_manager
from app.driver.detector import driver_pipeline
from app.driver.distance import distance_estimator
from app.driver.alerts import alert_evaluator
from app.driver.tts import driver_tts
from app.services.websocket_manager import ws_broadcaster

router = APIRouter(prefix="/driver", tags=["Driver Assistance System"])


# Pydantic Schemas for API Requests & Responses
class DriverSettingsSchema(BaseModel):
    alert_distance_meters: float = Field(default=30.0, ge=5.0, le=100.0)
    voice_alerts_enabled: bool = Field(default=True)
    min_confidence: float = Field(default=0.35, ge=0.1, le=1.0)
    min_severity: str = Field(default="low")
    camera_source: str = Field(default="0")
    fps: float = Field(default=25.0, ge=5.0, le=60.0)
    frame_skip: int = Field(default=2, ge=1, le=10)
    camera_height_meters: float = Field(default=1.3, ge=0.5, le=3.0)
    camera_pitch_degrees: float = Field(default=15.0, ge=0.0, le=45.0)
    speed_kmh: float = Field(default=45.0, ge=0.0, le=200.0)


class FrameProcessingRequest(BaseModel):
    image_base64: str
    latitude: Optional[float] = 37.7749
    longitude: Optional[float] = -122.4194
    speed_kmh: Optional[float] = 45.0


# In-memory session state
driver_session_state = {
    "is_active": False,
    "started_at": None,
    "last_warning": None,
    "total_alerts_triggered": 0,
    "current_settings": {
        "alert_distance_meters": 30.0,
        "voice_alerts_enabled": True,
        "min_confidence": 0.35,
        "min_severity": "low",
        "camera_source": "0",
        "fps": 25.0,
        "frame_skip": 2,
        "camera_height_meters": 1.3,
        "camera_pitch_degrees": 15.0,
        "speed_kmh": 45.0
    }
}


async def _get_or_create_settings(db: AsyncSession) -> DriverSettings:
    """Helper to fetch or seed driver settings in PostgreSQL."""
    result = await db.execute(select(DriverSettings).limit(1))
    db_settings = result.scalars().first()
    if not db_settings:
        db_settings = DriverSettings()
        db.add(db_settings)
        await db.commit()
        await db.refresh(db_settings)
    return db_settings


@router.post("/start")
@router.post("/start-camera")
async def start_driver_assistance(
    payload: Optional[DriverSettingsSchema] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    POST /driver/start or /driver/start-camera
    Initiate real-time Driver Assistance System with configured camera stream.
    """
    db_settings = await _get_or_create_settings(db)
    
    if payload:
        db_settings.alert_distance_meters = payload.alert_distance_meters
        db_settings.voice_alerts_enabled = payload.voice_alerts_enabled
        db_settings.min_confidence = payload.min_confidence
        db_settings.min_severity = payload.min_severity
        db_settings.camera_source = payload.camera_source
        db_settings.fps = payload.fps
        db_settings.frame_skip = payload.frame_skip
        db_settings.camera_height_meters = payload.camera_height_meters
        db_settings.camera_pitch_degrees = payload.camera_pitch_degrees
        db_settings.speed_kmh = payload.speed_kmh
        await db.commit()

    # Update camera calibration
    distance_estimator.update_calibration(
        camera_height_meters=db_settings.camera_height_meters,
        pitch_angle_degrees=db_settings.camera_pitch_degrees
    )

    # Launch camera stream worker
    success = driver_camera_manager.start_camera(db_settings.camera_source)

    driver_session_state["is_active"] = True
    driver_session_state["started_at"] = datetime.now(timezone.utc).isoformat()
    driver_session_state["current_settings"] = {
        "alert_distance_meters": db_settings.alert_distance_meters,
        "voice_alerts_enabled": db_settings.voice_alerts_enabled,
        "min_confidence": db_settings.min_confidence,
        "min_severity": db_settings.min_severity,
        "camera_source": db_settings.camera_source,
        "fps": db_settings.fps,
        "frame_skip": db_settings.frame_skip,
        "camera_height_meters": db_settings.camera_height_meters,
        "camera_pitch_degrees": db_settings.camera_pitch_degrees,
        "speed_kmh": db_settings.speed_kmh
    }

    await ws_broadcaster.broadcast({
        "type": "camera_status",
        "status": "online",
        "message": "Live camera processing started",
        "settings": driver_session_state["current_settings"]
    })

    return {
        "status": "success",
        "message": "Driver Assistance System initiated successfully.",
        "session_active": True,
        "camera_status": driver_camera_manager.get_status(),
        "settings": driver_session_state["current_settings"]
    }


@router.post("/stop")
@router.post("/stop-camera")
async def stop_driver_assistance():
    """
    POST /driver/stop or /driver/stop-camera
    Halt real-time Driver Assistance System camera stream and alerts.
    """
    driver_camera_manager.stop_camera()
    driver_session_state["is_active"] = False

    await ws_broadcaster.broadcast({
        "type": "camera_status",
        "status": "offline",
        "message": "Live camera processing stopped"
    })

    return {
        "status": "success",
        "message": "Driver Assistance System halted.",
        "session_active": False
    }


@router.get("/status")
async def get_driver_status():
    """
    GET /api/v1/driver/status
    Get real-time operational status, camera health, FPS, and active warning state.
    """
    cam_status = driver_camera_manager.get_status()
    
    return {
        "session_active": driver_session_state["is_active"],
        "started_at": driver_session_state["started_at"],
        "camera_status": cam_status,
        "fps": cam_status.get("fps", driver_pipeline.fps),
        "total_alerts_triggered": driver_session_state["total_alerts_triggered"],
        "current_warning": driver_session_state["last_warning"],
        "settings": driver_session_state["current_settings"]
    }


@router.get("/current-warning")
async def get_current_warning():
    """
    GET /api/v1/driver/current-warning
    Get latest active road damage hazard warning ahead of vehicle.
    """
    warning = driver_session_state.get("last_warning")
    return {
        "active_warning_present": warning is not None,
        "warning": warning,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/settings")
async def get_driver_settings(db: AsyncSession = Depends(get_db)):
    """
    GET /api/v1/driver/settings
    Retrieve stored Driver Assistance configuration parameters.
    """
    db_settings = await _get_or_create_settings(db)
    return {
        "alert_distance_meters": db_settings.alert_distance_meters,
        "voice_alerts_enabled": db_settings.voice_alerts_enabled,
        "min_confidence": db_settings.min_confidence,
        "min_severity": db_settings.min_severity,
        "camera_source": db_settings.camera_source,
        "fps": db_settings.fps,
        "frame_skip": db_settings.frame_skip,
        "camera_height_meters": db_settings.camera_height_meters,
        "camera_pitch_degrees": db_settings.camera_pitch_degrees,
        "speed_kmh": db_settings.speed_kmh
    }


@router.put("/settings")
async def update_driver_settings(
    settings_payload: DriverSettingsSchema,
    db: AsyncSession = Depends(get_db)
):
    """
    PUT /api/v1/driver/settings
    Update Driver Assistance threshold settings in PostgreSQL database.
    """
    db_settings = await _get_or_create_settings(db)

    db_settings.alert_distance_meters = settings_payload.alert_distance_meters
    db_settings.voice_alerts_enabled = settings_payload.voice_alerts_enabled
    db_settings.min_confidence = settings_payload.min_confidence
    db_settings.min_severity = settings_payload.min_severity
    db_settings.camera_source = settings_payload.camera_source
    db_settings.fps = settings_payload.fps
    db_settings.frame_skip = settings_payload.frame_skip
    db_settings.camera_height_meters = settings_payload.camera_height_meters
    db_settings.camera_pitch_degrees = settings_payload.camera_pitch_degrees
    db_settings.speed_kmh = settings_payload.speed_kmh

    await db.commit()

    # Apply live to in-memory state & distance estimator
    distance_estimator.update_calibration(
        camera_height_meters=db_settings.camera_height_meters,
        pitch_angle_degrees=db_settings.camera_pitch_degrees
    )

    driver_session_state["current_settings"] = {
        "alert_distance_meters": db_settings.alert_distance_meters,
        "voice_alerts_enabled": db_settings.voice_alerts_enabled,
        "min_confidence": db_settings.min_confidence,
        "min_severity": db_settings.min_severity,
        "camera_source": db_settings.camera_source,
        "fps": db_settings.fps,
        "frame_skip": db_settings.frame_skip,
        "camera_height_meters": db_settings.camera_height_meters,
        "camera_pitch_degrees": db_settings.camera_pitch_degrees,
        "speed_kmh": db_settings.speed_kmh
    }

    return {
        "status": "success",
        "message": "Driver Assistance settings updated successfully.",
        "settings": driver_session_state["current_settings"]
    }


@router.post("/process-frame")
async def process_driver_camera_frame(
    req: FrameProcessingRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    POST /api/v1/driver/process-frame
    Process base64 camera frame (from browser webcam, mobile camera, or dashcam stream).
    Executes real-time YOLOv11 + distance estimation + tracking + driver alert evaluation.
    Returns processed frame with HUD overlay and warning JSON payload.
    """
    try:
        # Decode base64 frame
        img_data = base64.b64decode(req.image_base64.split(",")[-1])
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image frame encoding.")

        settings_dict = driver_session_state["current_settings"]

        # Run pipeline
        overlay_frame, res_payload = driver_pipeline.process_driver_frame(
            frame=frame,
            alert_distance_m=settings_dict.get("alert_distance_meters", 30.0),
            min_confidence=settings_dict.get("min_confidence", 0.35),
            min_severity=settings_dict.get("min_severity", "low"),
            draw_overlays=True
        )

        # Encode processed overlay frame to JPEG Base64
        _, buffer = cv2.imencode(".jpg", overlay_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        processed_base64 = base64.b64encode(buffer).decode("utf-8")

        primary_warning = res_payload.get("primary_warning")
        if primary_warning:
            driver_session_state["last_warning"] = primary_warning
            if primary_warning.get("should_speak_voice"):
                driver_session_state["total_alerts_triggered"] += 1
                
                # Geotag and persist alert to PostgreSQL database
                alert_log = DriverAlertLog(
                    damage_category=primary_warning.get("category", "pothole"),
                    alert_level=primary_warning.get("level", "high"),
                    distance_meters=primary_warning.get("distance_meters", 15.0),
                    lane_position=primary_warning.get("lane_position", "Center lane"),
                    confidence=primary_warning.get("confidence", 0.85),
                    voice_message=primary_warning.get("voice_message", "Road damage ahead"),
                    latitude=req.latitude or 37.7749,
                    longitude=req.longitude or -122.4194,
                    speed_kmh=req.speed_kmh or settings_dict.get("speed_kmh", 45.0)
                )
                db.add(alert_log)

        # Save all detected hazards into the Detection table
        for hazard in res_payload.get("tracked_hazards", []):
            cat_str = hazard.get("category", "pothole").lower()
            cat_enum = DamageCategory(cat_str) if cat_str in DamageCategory._value2member_map_ else DamageCategory.POTHOLE
            
            sev_str = hazard.get("severity", "low").lower()
            sev_enum = SeverityLevel(sev_str) if sev_str in SeverityLevel._value2member_map_ else SeverityLevel.LOW

            det = Detection(
                camera_id="live_camera",
                category=cat_enum,
                confidence=hazard.get("confidence", 0.85),
                x_min=hazard.get("bbox", [0,0,0,0])[0],
                y_min=hazard.get("bbox", [0,0,0,0])[1],
                x_max=hazard.get("bbox", [0,0,0,0])[2],
                y_max=hazard.get("bbox", [0,0,0,0])[3],
                area_pixels=hazard.get("area_pixels", 0.0),
                severity=sev_enum,
                severity_score=hazard.get("severity_score", 0.5),
                distance_meters=hazard.get("distance_meters", 0.0),
                latitude=req.latitude or 37.7749,
                longitude=req.longitude or -122.4194
            )
            db.add(det)

        await db.commit()

        # Broadcast live detection frame to WebSockets (/ws/live-detections and /ws/dashboard)
        ws_frame_msg = {
            "type": "live_camera_frame",
            "fps": res_payload["fps"],
            "latency_ms": res_payload["latency_ms"],
            "total_hazards_detected": res_payload["total_hazards_detected"],
            "primary_warning": primary_warning,
            "tts_payload": res_payload.get("tts_payload"),
            "tracked_hazards": res_payload.get("tracked_hazards", []),
            "image_url": f"data:image/jpeg;base64,{processed_base64}",
            "gps": {
                "latitude": req.latitude or 37.7749,
                "longitude": req.longitude or -122.4194
            }
        }
        await ws_broadcaster.broadcast(ws_frame_msg)

        return {
            "fps": res_payload["fps"],
            "latency_ms": res_payload["latency_ms"],
            "total_hazards_detected": res_payload["total_hazards_detected"],
            "primary_warning": primary_warning,
            "tts_payload": res_payload.get("tts_payload"),
            "tracked_hazards": res_payload.get("tracked_hazards", []),
            "overlay_image_base64": f"data:image/jpeg;base64,{processed_base64}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Driver frame processing failure: {str(e)}")


@router.get("/mjpeg-stream")
async def driver_mjpeg_stream():
    """
    GET /api/v1/driver/mjpeg-stream
    Multipart MJPEG video stream for HTML5 <img src="..."> dashcam live feed.
    """
    def generate_frames():
        while True:
            frame = driver_camera_manager.get_latest_frame()
            if frame is None:
                # Fallback synthetic frame if camera unattached
                frame = driver_camera_manager._generate_synthetic_road_frame()

            settings_dict = driver_session_state["current_settings"]

            overlay_frame, res_payload = driver_pipeline.process_driver_frame(
                frame=frame,
                alert_distance_m=settings_dict.get("alert_distance_meters", 30.0),
                min_confidence=settings_dict.get("min_confidence", 0.35),
                min_severity=settings_dict.get("min_severity", "low"),
                draw_overlays=True
            )

            primary_warning = res_payload.get("primary_warning")
            if primary_warning:
                driver_session_state["last_warning"] = primary_warning

            _, jpeg = cv2.imencode('.jpg', overlay_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
            frame_bytes = jpeg.tobytes()

            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@router.get("/tts-audio")
async def get_tts_audio(
    message: str = "Warning! Pothole ahead. Reduce speed.",
    level: str = "high"
):
    """
    GET /api/v1/driver/tts-audio
    Return synthesized warning chime audio WAV stream.
    """
    wav_bytes = driver_tts.generate_warning_chime_wav(level)
    return Response(content=wav_bytes, media_type="audio/wav")
