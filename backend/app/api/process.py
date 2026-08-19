import os
import json
import base64
import cv2
import asyncio
import gc
import uuid
import time
from typing import List, Dict, Any, Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db, AsyncSessionLocal
from app.models.models import (
    User, Video, Frame, Detection, GPSData, RoadAnalytics, TrafficViolation,
    UserRole, ProcessingStatus, SeverityLevel, DamageCategory
)
from app.schemas.schemas import ProcessVideoRequest, ProcessVideoResponse
from app.auth.jwt import get_current_user_optional
from app.cv.video_processor import VideoProcessor
from app.yolo.detector import YOLODamageDetector
from app.services.severity_service import SeverityAnalysisService
from app.services.gps_service import GPSExtractionService
from app.services.helmet_anpr_service import HelmetANPRService
from app.services.websocket_manager import ws_broadcaster
from app.api.ws_routes import processing_progress_state
from app.config.config import settings

router = APIRouter(prefix="/process", tags=["Processing Engine"])

detector_instance = YOLODamageDetector()


# Global Session Manager and System Cleanup for Complete Isolation between Consecutive Uploads
def cleanup_system_resources(exclude_video_id: Optional[str] = None):
    """
    Clears all previous temporary files, cached frame buffers, OpenCV handles,
    GPU memory, and forces Python garbage collection.
    """
    # 1. Clear old files in UPLOAD_DIR
    try:
        if os.path.exists(settings.UPLOAD_DIR):
            for fname in os.listdir(settings.UPLOAD_DIR):
                if exclude_video_id and exclude_video_id in fname:
                    continue
                fpath = os.path.join(settings.UPLOAD_DIR, fname)
                if os.path.isfile(fpath):
                    try:
                        os.remove(fpath)
                    except Exception as e:
                        print(f"Warning deleting old upload file {fpath}: {e}")
    except Exception as e:
        print(f"Warning in cleanup UPLOAD_DIR: {e}")

    # 2. Clear old files in PROCESSED_DIR (processed videos, old thumbnails, temporary frame dumps)
    try:
        if os.path.exists(settings.PROCESSED_DIR):
            for fname in os.listdir(settings.PROCESSED_DIR):
                if exclude_video_id and exclude_video_id in fname:
                    continue
                fpath = os.path.join(settings.PROCESSED_DIR, fname)
                if os.path.isfile(fpath):
                    try:
                        os.remove(fpath)
                    except Exception as e:
                        print(f"Warning deleting old processed file {fpath}: {e}")
    except Exception as e:
        print(f"Warning in cleanup PROCESSED_DIR: {e}")

    # 3. Clear deduplication & OCR caches
    HelmetANPRService.reset_dedup_cache()

    # 4. Release PyTorch CUDA memory if available
    try:
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
    except Exception:
        pass

    # 5. Force garbage collection
    gc.collect()


# WebSocket Manager for Live Processing Stages with Video & Session Channel Isolation
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[WebSocket, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket, client_id: str = "default", video_id: Optional[str] = None):
        await websocket.accept()
        self.active_connections[websocket] = {
            "client_id": client_id,
            "video_id": video_id
        }

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            del self.active_connections[websocket]

    async def broadcast(self, message: Dict[str, Any]):
        msg_session_id = message.get("session_id")
        msg_video_id = message.get("video_id")

        # Session filtering: If a message is from an older or superseded session, drop it immediately
        if global_session_manager.active_session_id and msg_session_id and msg_session_id != global_session_manager.active_session_id:
            return

        payload = json.dumps(message)
        dead = []
        for connection, info in list(self.active_connections.items()):
            # If connection is scoped to a specific video_id and message has a different video_id, skip
            if info.get("video_id") and msg_video_id and info["video_id"] != msg_video_id:
                continue
            try:
                await connection.send_text(payload)
            except Exception:
                dead.append(connection)
        for conn in dead:
            self.disconnect(conn)

ws_manager = ConnectionManager()


# Global Session Manager for Complete Isolation between Consecutive Uploads
class SessionManager:
    def __init__(self):
        self.active_session_id: Optional[str] = None
        self.active_video_id: Optional[str] = None
        self.cancel_event: Optional[asyncio.Event] = None
        self.active_task: Optional[asyncio.Task] = None
        self.is_paused: bool = False

    async def start_new_session(self, video_id: str) -> Tuple[str, asyncio.Event]:
        # 1. Stop previous video processing immediately & clean system resources
        await self.cancel_current_session()

        # 2. Generate a new unique session ID
        session_id = f"sess_{video_id}_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
        self.active_session_id = session_id
        self.active_video_id = video_id
        self.cancel_event = asyncio.Event()
        self.is_paused = False

        # 3. Reset global processing state completely
        processing_progress_state["is_processing"] = True
        processing_progress_state["video_id"] = video_id
        processing_progress_state["session_id"] = session_id
        processing_progress_state["current_frame"] = 0
        processing_progress_state["total_frames"] = 0
        processing_progress_state["progress_percent"] = 0.0
        processing_progress_state["status"] = "Initializing Models"
        processing_progress_state["pothole_count"] = 0
        processing_progress_state["crack_count"] = 0
        processing_progress_state["road_health_index"] = 100.0

        # 4. Broadcast session reset so frontend drops any old frames or state
        reset_msg = {
            "type": "session_reset",
            "session_id": session_id,
            "video_id": video_id,
            "message": f"Starting fresh isolated detection session for video {video_id}"
        }
        await ws_manager.broadcast(reset_msg)
        await ws_broadcaster.broadcast(reset_msg)

        return session_id, self.cancel_event

    async def pause_session(self):
        self.is_paused = True
        processing_progress_state["status"] = "Paused"
        pause_msg = {
            "type": "status",
            "stage": "Paused",
            "session_id": self.active_session_id,
            "video_id": self.active_video_id,
            "message": "AI detection pipeline paused by user.",
            "timestamp": asyncio.get_event_loop().time()
        }
        await ws_manager.broadcast(pause_msg)
        await ws_broadcaster.broadcast(pause_msg)

    async def resume_session(self):
        self.is_paused = False
        processing_progress_state["status"] = "Detecting"
        resume_msg = {
            "type": "status",
            "stage": "Detecting",
            "session_id": self.active_session_id,
            "video_id": self.active_video_id,
            "message": "AI detection pipeline resumed.",
            "timestamp": asyncio.get_event_loop().time()
        }
        await ws_manager.broadcast(resume_msg)
        await ws_broadcaster.broadcast(resume_msg)

    async def cancel_current_session(self):
        self.is_paused = False
        if self.cancel_event and not self.cancel_event.is_set():
            self.cancel_event.set()

        if self.active_task and not self.active_task.done():
            self.active_task.cancel()
            try:
                await asyncio.wait_for(asyncio.shield(self.active_task), timeout=0.4)
            except Exception:
                pass
            self.active_task = None

        self.active_session_id = None
        self.active_video_id = None
        self.cancel_event = None

        processing_progress_state["is_processing"] = False
        processing_progress_state["status"] = "Idle"
        processing_progress_state["current_frame"] = 0
        processing_progress_state["progress_percent"] = 0.0
        processing_progress_state["pothole_count"] = 0
        processing_progress_state["crack_count"] = 0
        processing_progress_state["road_health_index"] = 100.0

        cleanup_system_resources()

global_session_manager = SessionManager()


@router.websocket("/ws")
@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str = "default"):
    # Extract video_id from client_id if formatted like live-{videoId}-{timestamp}
    video_id_scope = None
    if client_id.startswith("live-"):
        parts = client_id.split("-")
        if len(parts) >= 2:
            video_id_scope = parts[1]

    await ws_manager.connect(websocket, client_id=client_id, video_id=video_id_scope)
    try:
        # Send initial connection confirmation
        await websocket.send_text(json.dumps({
            "stage": "Connected",
            "progress": 0,
            "message": f"WebSocket connection active for client: {client_id}",
            "session_id": global_session_manager.active_session_id,
            "video_id": video_id_scope,
            "timestamp": asyncio.get_event_loop().time()
        }))
        while True:
            data = await websocket.receive_text()
            # Keep-alive echo
            await websocket.send_text(json.dumps({
                "stage": "Connected",
                "session_id": global_session_manager.active_session_id,
                "progress": processing_progress_state.get("progress_percent", 0),
                "message": f"Channel active ({client_id})",
                "timestamp": asyncio.get_event_loop().time()
            }))
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


async def execute_video_processing_task(
    session_id: str,
    cancel_event: asyncio.Event,
    video_id: str,
    confidence_threshold: float = 0.35,
    frame_skip: int = 2,
    enable_histogram_equalization: bool = True,
    enable_gaussian_blur: bool = True
):
    """
    Asynchronous Background Task:
    Executes OpenCV frame extraction, YOLO multi-model inference, severity index computation,
    database persistence, and real-time live frame broadcast with strict session isolation.
    """
    processor: Optional[VideoProcessor] = None
    video_writer = None
    all_detections_list: List[Dict[str, Any]] = []

    async def send_ws_update(stage: str, progress: int, msg: str):
        if cancel_event.is_set() or global_session_manager.active_session_id != session_id:
            return
        msg_dict = {
            "type": "status",
            "session_id": session_id,
            "video_id": video_id,
            "stage": stage,
            "progress": progress,
            "message": msg,
            "timestamp": asyncio.get_event_loop().time()
        }
        await ws_manager.broadcast(msg_dict)
        await ws_broadcaster.broadcast(msg_dict)

    async with AsyncSessionLocal() as db:
        video = None
        try:
            stmt = select(Video).where(Video.id == video_id)
            video = (await db.execute(stmt)).scalar_one_or_none()
            if not video:
                print(f"[Processing Task] Video '{video_id}' not found in database.")
                return

            video.status = ProcessingStatus.PROCESSING
            await db.commit()

            await send_ws_update("Uploading", 15, "FastAPI WS: Ingestion verified. Initializing OpenCV decoding...")

            # Initialize VideoProcessor (fresh VideoCapture for this session)
            processor = VideoProcessor(video.file_path)
            frames_processed_count = 0

            await send_ws_update("Extracting Frames", 35, f"FastAPI WS: Slicing frames with frame_skip={frame_skip}...")

            # Extract frames generator with frame skip
            frame_gen = processor.extract_frames_generator(
                frame_skip=frame_skip,
                enable_histogram_eq=enable_histogram_equalization,
                enable_gaussian_blur=enable_gaussian_blur
            )

            await send_ws_update("Running YOLO", 50, "FastAPI WS: Executing YOLO damage detection inference...")

            # Output MP4 video writer
            output_mp4_path = os.path.join(settings.PROCESSED_DIR, f"processed_{video.id}.mp4")
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            video_writer = cv2.VideoWriter(
                output_mp4_path,
                fourcc,
                processor.fps or 30.0,
                (processor.width, processor.height)
            )

            total_expected_frames = processor.total_frames or 100

            # Category tracking counters
            pothole_count = 0
            crack_count = 0
            broken_road_count = 0
            missing_asphalt_count = 0
            road_damage_count = 0
            vehicle_count = 0
            helmet_count = 0
            number_plate_count = 0
            helmet_violations_count = 0
            violations_list = []
            frame_detections: List[Dict[str, Any]] = []

            # Reset deduplication cache for this new video session
            HelmetANPRService.reset_dedup_cache(video.id)

            for frame_num, timestamp_sec, raw_frame, preprocessed_frame in frame_gen:
                # 🛑 Check cancellation flag or session superseding
                if cancel_event.is_set() or global_session_manager.active_session_id != session_id:
                    print(f"🛑 [Session {session_id}] Cancellation detected for video {video_id}. Halting loop immediately.")
                    break

                # ⏸️ Handle pause state asynchronously
                while global_session_manager.is_paused and not cancel_event.is_set() and global_session_manager.active_session_id == session_id:
                    await asyncio.sleep(0.15)

                if cancel_event.is_set() or global_session_manager.active_session_id != session_id:
                    break

                frames_processed_count += 1
                frame_detections = []

                # Multi-Model YOLO detection on preprocessed frame
                raw_detections = detector_instance.detect(
                    preprocessed_frame,
                    conf_threshold=confidence_threshold
                )
                has_damage = len(raw_detections) > 0

                for det in raw_detections:
                    sev_level, sev_score = SeverityAnalysisService.calculate_detection_severity(
                        det,
                        frame_width=processor.width,
                        frame_height=processor.height,
                        cluster_count=len(raw_detections)
                    )

                    cat_raw = str(det.get("category", "pothole")).strip().lower()
                    det_type = det.get("type", "damage")

                    # Update live multi-model counters
                    if "pothole" in cat_raw:
                        pothole_count += 1
                        road_damage_count += 1
                    elif "crack" in cat_raw:
                        crack_count += 1
                        road_damage_count += 1
                    elif "broken" in cat_raw:
                        broken_road_count += 1
                        road_damage_count += 1
                    elif "asphalt" in cat_raw:
                        missing_asphalt_count += 1
                        road_damage_count += 1
                    elif det_type == "damage":
                        road_damage_count += 1

                    if cat_raw in ["car", "truck", "bus", "motorcycle", "bicycle", "person", "vehicle"] or det_type == "vehicle":
                        vehicle_count += 1
                    if "helmet" in cat_raw:
                        helmet_count += 1
                    if "plate" in cat_raw or "number_plate" in cat_raw or "license" in cat_raw:
                        number_plate_count += 1

                    distance_est = SeverityAnalysisService.estimate_perspective_distance(
                        det,
                        frame_height=processor.height
                    )

                    base_lat = 28.4595 + (frame_num * 0.00008)
                    base_lon = 77.0266 + (frame_num * 0.00009)

                    det_record = {
                        "category": cat_raw,
                        "type": det_type,
                        "confidence": float(det["confidence"]),
                        "severity": sev_level.value if hasattr(sev_level, "value") else str(sev_level),
                        "severity_score": float(sev_score),
                        "x_min": float(det["x_min"]),
                        "y_min": float(det["y_min"]),
                        "x_max": float(det["x_max"]),
                        "y_max": float(det["y_max"]),
                        "distance_meters": distance_est
                    }
                    frame_detections.append(det_record)
                    all_detections_list.append(det_record)

                # DB Frame and Detection persistence
                try:
                    db_frame = Frame(
                        video_id=video.id,
                        frame_number=frame_num,
                        timestamp_seconds=timestamp_sec,
                        has_damage=has_damage
                    )
                    db.add(db_frame)
                    await db.flush()

                    for d_rec in frame_detections:
                        base_lat = 28.4595 + (frame_num * 0.00008)
                        base_lon = 77.0266 + (frame_num * 0.00009)
                        db_detection = Detection(
                            video_id=video.id,
                            camera_id=None,
                            frame_id=db_frame.id,
                            frame_number=frame_num,
                            timestamp_seconds=timestamp_sec,
                            category=d_rec["category"],
                            confidence=d_rec["confidence"],
                            x_min=d_rec["x_min"],
                            y_min=d_rec["y_min"],
                            x_max=d_rec["x_max"],
                            y_max=d_rec["y_max"],
                            area_pixels=float((d_rec["x_max"] - d_rec["x_min"]) * (d_rec["y_max"] - d_rec["y_min"])),
                            severity=d_rec["severity"],
                            severity_score=d_rec["severity_score"],
                            distance_meters=d_rec["distance_meters"],
                            latitude=base_lat,
                            longitude=base_lon
                        )
                        db.add(db_detection)
                except Exception as db_err:
                    print(f"⚠️ [Frame Persistence Warning]: {db_err}")

                # Automatic Helmet Violation & ANPR / OCR Detection
                try:
                    frame_violations = HelmetANPRService.evaluate_frame_violations(
                        raw_frame=raw_frame,
                        detections=raw_detections,
                        frame_number=frame_num,
                        timestamp_sec=timestamp_sec,
                        video_id=video.id,
                        camera_id=video.camera_id if hasattr(video, "camera_id") and video.camera_id else "CAM-01",
                        location_name="National Highway 48 - Sector 29",
                        base_lat=base_lat,
                        base_lon=base_lon
                    )

                    for v_data in frame_violations:
                        helmet_violations_count += 1
                        violations_list.append(v_data)

                        # Persist to database
                        db_violation = TrafficViolation(
                            id=v_data["id"],
                            challan_number=v_data["challan_number"],
                            violation_type=v_data["violation_type"],
                            license_plate_number=v_data["license_plate_number"],
                            confidence=v_data["confidence"],
                            rider_confidence=v_data["rider_confidence"],
                            fine_amount=v_data["fine_amount"],
                            fine_status=v_data["fine_status"],
                            video_id=video.id,
                            camera_id=v_data.get("camera_id"),
                            frame_id=db_frame.id if 'db_frame' in locals() and db_frame else None,
                            frame_number=frame_num,
                            timestamp_seconds=timestamp_sec,
                            evidence_image_path=v_data.get("evidence_image_path"),
                            evidence_image_url=v_data.get("evidence_image_url"),
                            plate_crop_url=v_data.get("plate_crop_url"),
                            vehicle_type=v_data["vehicle_type"],
                            latitude=v_data["latitude"],
                            longitude=v_data["longitude"],
                            location_name=v_data["location_name"],
                            notes=v_data["notes"]
                        )
                        db.add(db_violation)

                        # Broadcast live Violation Event via WebSocket
                        violation_ws_msg = {
                            "type": "violation",
                            "session_id": session_id,
                            "video_id": video.id,
                            "violation": v_data
                        }
                        await ws_manager.broadcast(violation_ws_msg)
                        await ws_broadcaster.broadcast(violation_ws_msg)
                except Exception as viol_err:
                    print(f"⚠️ [Helmet Violation Evaluation Notice]: {viol_err}")

                # Annotate Frame with high-contrast color-coded bounding boxes
                annotated_img = raw_frame.copy()
                for d in frame_detections:
                    cat_name = d["category"].lower()
                    d_type = d.get("type", "damage")

                    # Distinct BGR color coding
                    if "pothole" in cat_name:
                        box_color = (0, 0, 255)  # Bright Red
                    elif "crack" in cat_name or "broken" in cat_name or "asphalt" in cat_name or d_type == "damage":
                        box_color = (0, 140, 255)  # Vivid Orange
                    elif cat_name in ["car", "truck", "bus", "motorcycle", "bicycle", "person", "vehicle"] or d_type == "vehicle":
                        box_color = (255, 120, 0)  # Neon Cyan/Blue
                    elif "helmet" in cat_name:
                        box_color = (0, 215, 255)  # Gold / Yellow
                    elif "plate" in cat_name or "number_plate" in cat_name:
                        box_color = (0, 255, 0)  # Emerald Green
                    else:
                        box_color = (0, 255, 255)

                    x1, y1 = max(0, int(d["x_min"])), max(0, int(d["y_min"]))
                    x2, y2 = min(processor.width, int(d["x_max"])), min(processor.height, int(d["y_max"]))

                    # Draw bounding box
                    cv2.rectangle(annotated_img, (x1, y1), (x2, y2), box_color, 2)

                    # Draw label badge with solid background
                    display_cat = d["category"].replace("_", " ").upper()
                    label_text = f"{display_cat} {int(d['confidence'] * 100)}%"
                    (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
                    badge_y1 = max(0, y1 - th - 6)
                    badge_y2 = y1
                    badge_x2 = min(processor.width, x1 + tw + 8)

                    cv2.rectangle(annotated_img, (x1, badge_y1), (badge_x2, badge_y2), box_color, -1)
                    cv2.putText(
                        annotated_img,
                        label_text,
                        (x1 + 4, max(th + 2, badge_y2 - 3)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.45,
                        (255, 255, 255) if box_color != (0, 215, 255) else (0, 0, 0),
                        1,
                        cv2.LINE_AA
                    )

                if video_writer:
                    video_writer.write(annotated_img)

                # Encode Frame to Base64 for Live UI Stream
                _, buffer = cv2.imencode('.jpg', annotated_img, [cv2.IMWRITE_JPEG_QUALITY, 75])
                base64_str = base64.b64encode(buffer).decode('utf-8')
                frame_base64 = f"data:image/jpeg;base64,{base64_str}"

                formatted_detections = []
                for det in frame_detections:
                    formatted_detections.append({
                        "category": det["category"],
                        "type": det.get("type", "damage"),
                        "confidence": round(float(det["confidence"]), 2),
                        "severity": det["severity"].upper(),
                        "x_min": int(det["x_min"]),
                        "y_min": int(det["y_min"]),
                        "x_max": int(det["x_max"]),
                        "y_max": int(det["y_max"])
                    })

                base_lat = 28.4595 + (frame_num * 0.00008)
                base_lon = 77.0266 + (frame_num * 0.00009)
                total_batches = max(1, total_expected_frames / max(1, frame_skip))
                current_progress = min(98, max(5, int((frames_processed_count / total_batches) * 95)))
                live_road_health = round(max(20.0, 100.0 - (road_damage_count * 4.0)), 1)
                remaining_frames = max(0, total_batches - frames_processed_count)
                effective_fps = max(1.0, float(processor.fps or 30.0) / max(1, frame_skip))
                eta_sec = max(0, round(remaining_frames / effective_fps, 1))

                ws_frame_msg = {
                    "type": "frame",
                    "session_id": session_id,
                    "video_id": video.id,
                    "stage": "Detecting",
                    "frame_number": frame_num,
                    "total_frames": total_expected_frames,
                    "timestamp": round(float(timestamp_sec), 2),
                    "elapsed_time": round(float(timestamp_sec), 2),
                    "eta_seconds": eta_sec,
                    "fps": round(float(processor.fps or 30.0), 1),
                    "progress": current_progress,
                    "image_data": frame_base64,
                    "image_base64": base64_str,
                    "image_url": frame_base64,
                    "road_health": live_road_health,
                    "gps": {
                        "latitude": round(base_lat, 6),
                        "longitude": round(base_lon, 6)
                    },
                    "detections": formatted_detections,
                    "counts": {
                        "pothole": pothole_count,
                        "crack": crack_count,
                        "broken_road": broken_road_count,
                        "missing_asphalt": missing_asphalt_count,
                        "road_damage": road_damage_count,
                        "vehicle": vehicle_count,
                        "helmet": helmet_count,
                        "number_plate": number_plate_count,
                        "helmet_violations": helmet_violations_count,
                        "total": len(all_detections_list)
                    },
                    "helmet_violations_count": helmet_violations_count,
                    "latest_violations": violations_list[-5:],
                    "violations": violations_list
                }
                
                # Check cancellation again before broadcast
                if cancel_event.is_set() or global_session_manager.active_session_id != session_id:
                    break

                await ws_manager.broadcast(ws_frame_msg)
                await ws_broadcaster.broadcast(ws_frame_msg)

                del annotated_img, raw_frame, preprocessed_frame, buffer
                # Natural playback pacing for real-time visualization
                frame_delay = max(0.02, min(0.05, 0.8 / max(processor.fps or 30.0, 1.0)))
                await asyncio.sleep(frame_delay)

            # Check if processing was cancelled before writing final report
            if cancel_event.is_set() or global_session_manager.active_session_id != session_id:
                print(f"🛑 [Session {session_id}] Video {video_id} loop exited early due to cancellation.")
                return

            if video_writer:
                video_writer.release()
                video_writer = None
                video.processed_file_path = output_mp4_path

            if processor:
                processor.close()
                processor = None

            await send_ws_update("Generating Report", 80, "FastAPI WS: Computing Road Health Index & GPS coordinates...")

            # Compute Road Health Index
            analytics_res = SeverityAnalysisService.calculate_road_health_index(
                all_detections_list,
                video_duration_seconds=video.duration_seconds
            )

            # Generate GPS Trajectory
            trajectory = GPSExtractionService.generate_interpolated_trajectory(
                total_frames=video.total_frames,
                fps=video.fps
            )
            for point in trajectory:
                db_gps = GPSData(
                    video_id=video.id,
                    frame_number=point["frame_number"],
                    latitude=point["latitude"],
                    longitude=point["longitude"],
                    altitude_meters=point["altitude_meters"],
                    speed_kmh=point["speed_kmh"],
                    road_name=point["road_name"]
                )
                db.add(db_gps)

            # ORM Analytics Record
            db_analytics = RoadAnalytics(
                video_id=video.id,
                road_health_score=analytics_res["road_health_score"],
                total_detections=analytics_res["total_detections"],
                pothole_count=analytics_res["pothole_count"],
                crack_count=analytics_res["crack_count"],
                critical_count=analytics_res["critical_count"],
                damage_density_per_km=analytics_res["damage_density_per_km"],
                overall_severity=analytics_res["overall_severity"]
            )
            db.add(db_analytics)

            await send_ws_update("Saving Results", 95, f"FastAPI WS: Persisting {len(all_detections_list)} detections to database...")

            video.status = ProcessingStatus.COMPLETED
            await db.commit()

            if global_session_manager.active_session_id == session_id:
                processing_progress_state["is_processing"] = False
                processing_progress_state["progress_percent"] = 100
                processing_progress_state["status"] = "Completed"

            await send_ws_update("Finished", 100, "FastAPI WS: Processing pipeline finished successfully!")
            finished_msg = {
                "type": "finished",
                "session_id": session_id,
                "video_id": video.id,
                "progress": 100,
                "message": "AI Processing pipeline completed successfully."
            }
            await ws_manager.broadcast(finished_msg)
            await ws_broadcaster.broadcast(finished_msg)

        except asyncio.CancelledError:
            print(f"🛑 [Session {session_id}] Background task cancelled cleanly.")
        except Exception as e:
            print(f"[Processing Pipeline Error]: {e}")
            if video:
                try:
                    video.status = ProcessingStatus.FAILED
                    await db.commit()
                except Exception:
                    pass
            await send_ws_update("Finished", 0, f"FastAPI WS Error: {str(e)}")
        finally:
            if video_writer:
                try:
                    video_writer.release()
                except Exception:
                    pass
            if processor:
                try:
                    processor.close()
                except Exception:
                    pass
            # Force garbage collection to purge memory and frame buffers
            gc.collect()


@router.post("/run", response_model=ProcessVideoResponse)
async def process_video_pipeline(
    req: ProcessVideoRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Trigger AI Computer Vision Processing on an uploaded video.
    Stops any previous video session, frees memory/buffers, initializes a fresh isolated session,
    and runs real-time YOLO detection.
    """
    target_video_id = req.video_id
    if not target_video_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required field: 'video_id'"
        )

    stmt = select(Video).where(Video.id == target_video_id)
    video = (await db.execute(stmt)).scalar_one_or_none()

    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video with ID '{target_video_id}' not found."
        )

    # Mark video status as processing
    video.status = ProcessingStatus.PROCESSING
    await db.commit()

    # 1. Terminate any previous session, clear resources, create new session
    session_id, cancel_event = await global_session_manager.start_new_session(video.id)

    # 2. Launch background task with session isolation
    task = asyncio.create_task(
        execute_video_processing_task(
            session_id=session_id,
            cancel_event=cancel_event,
            video_id=video.id,
            confidence_threshold=float(req.confidence_threshold if req.confidence_threshold is not None else 0.35),
            frame_skip=int(req.frame_skip if req.frame_skip is not None else 2),
            enable_histogram_equalization=bool(req.enable_histogram_equalization if req.enable_histogram_equalization is not None else True),
            enable_gaussian_blur=bool(req.enable_gaussian_blur if req.enable_gaussian_blur is not None else True)
        )
    )
    global_session_manager.active_task = task

    return {
        "video_id": video.id,
        "status": ProcessingStatus.PROCESSING,
        "message": f"AI detection session initialized: {session_id}",
        "total_frames_processed": 0,
        "total_detections_found": 0,
        "road_health_score": 100.0
    }


@router.post("/pause")
async def pause_video_processing():
    """
    Pauses the active video detection stream and holds frame position.
    """
    await global_session_manager.pause_session()
    return {
        "status": "paused",
        "message": "AI detection session paused."
    }


@router.post("/resume")
async def resume_video_processing():
    """
    Resumes the paused video detection stream.
    """
    await global_session_manager.resume_session()
    return {
        "status": "resumed",
        "message": "AI detection session resumed."
    }


@router.post("/cancel")
@router.post("/stop")
async def stop_video_processing():
    """
    Explicitly stops and cancels any active video detection session, frees OpenCV video capture,
    clears frame queues, and releases system memory.
    """
    await global_session_manager.cancel_current_session()
    return {
        "status": "stopped",
        "message": "Previous video processing session stopped, frame buffers cleared, and memory freed."
    }


@router.get("/status")
async def get_pipeline_processing_status():
    """
    Returns the live status of the AI video processing pipeline.
    """
    return {
        "is_processing": processing_progress_state.get("is_processing", False),
        "session_id": global_session_manager.active_session_id,
        "video_id": processing_progress_state.get("video_id"),
        "current_frame": processing_progress_state.get("current_frame", 0),
        "total_frames": processing_progress_state.get("total_frames", 0),
        "progress_percent": processing_progress_state.get("progress_percent", 0),
        "current_fps": processing_progress_state.get("current_fps", 30.0),
        "estimated_time_remaining_sec": processing_progress_state.get("estimated_time_remaining_sec", 0),
        "status": processing_progress_state.get("status", "idle")
    }
