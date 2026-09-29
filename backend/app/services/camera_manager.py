import asyncio
import base64
import os
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Set, Optional
import cv2
import numpy as np
from fastapi import WebSocket, WebSocketDisconnect

from app.models.models import CameraStatus, CameraType
from app.yolo.detector import YOLODamageDetector
from app.cv.video_processor import VideoProcessor
from app.config.config import Settings

# Instantiate global settings and multi-model YOLO detector
settings = Settings()
detector_instance = YOLODamageDetector()

# Configure OpenCV FFmpeg capture environment options for resilient RTSP streaming
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = f"rtsp_transport;{getattr(settings, 'RTSP_TRANSPORT', 'tcp')}|stimeout;{getattr(settings, 'CAMERA_CONNECT_TIMEOUT_SECONDS', 10) * 1000000}"


class CameraConnectionManager:
    """
    Enterprise Multi-Camera Streaming & Ingestion Manager.
    Handles background capture tasks, RTSP/CCTV connection lifecycle,
    multi-model YOLO inference loops, and WebSocket broadcasting.
    """

    def __init__(self):
        # Map of camera_id -> Set[WebSocket]
        self.active_websockets: Dict[str, Set[WebSocket]] = {}
        # Map of camera_id -> asyncio.Task
        self.camera_tasks: Dict[str, asyncio.Task] = {}
        # Camera runtime state cache
        self.camera_states: Dict[str, Dict[str, Any]] = {}
        # Last detection signatures for deduplication (camera_id -> (signature, timestamp))
        self.last_detection_signatures: Dict[str, tuple[str, float]] = {}

    async def connect_websocket(self, camera_id: str, websocket: WebSocket):
        await websocket.accept()
        if camera_id not in self.active_websockets:
            self.active_websockets[camera_id] = set()
        self.active_websockets[camera_id].add(websocket)

        # Immediately send current camera status to new subscriber
        if camera_id in self.camera_states:
            try:
                await websocket.send_json({
                    "type": "camera_status_update",
                    "camera_id": camera_id,
                    "state": self.camera_states[camera_id]
                })
            except Exception:
                pass

    def disconnect_websocket(self, camera_id: str, websocket: WebSocket):
        if camera_id in self.active_websockets:
            self.active_websockets[camera_id].discard(websocket)
            if not self.active_websockets[camera_id]:
                del self.active_websockets[camera_id]

    async def broadcast_to_camera(self, camera_id: str, data: dict):
        if camera_id in self.active_websockets:
            disconnected = set()
            for ws in self.active_websockets[camera_id]:
                try:
                    await ws.send_json(data)
                except Exception:
                    disconnected.add(ws)
            for ws in disconnected:
                self.disconnect_websocket(camera_id, ws)

    async def test_camera_connection(self, stream_url: str, timeout_seconds: float = 6.0) -> Dict[str, Any]:
        """
        Tests connection to an RTSP/HTTP URL or local webcam device index.
        Executes non-blocking in an executor thread.
        """
        def _test_sync():
            start_t = time.time()
            source: Any = stream_url.strip()
            if source.isdigit():
                source = int(source)

            cap = cv2.VideoCapture(source)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

            if not cap.isOpened():
                return {
                    "connected": False,
                    "status": "failed",
                    "error": "Failed to open camera stream. Verify RTSP URL, credentials, and network reachability.",
                    "latency_ms": round((time.time() - start_t) * 1000, 1)
                }

            ret, frame = cap.read()
            cap.release()

            if not ret or frame is None or frame.size == 0:
                return {
                    "connected": False,
                    "status": "failed",
                    "error": "Stream opened but failed to read initial video frame. Check codec compatibility.",
                    "latency_ms": round((time.time() - start_t) * 1000, 1)
                }

            h, w = frame.shape[:2]
            return {
                "connected": True,
                "status": "online",
                "resolution": f"{w}x{h}",
                "latency_ms": round((time.time() - start_t) * 1000, 1),
                "message": f"Successfully connected to camera feed ({w}x{h})"
            }

        try:
            loop = asyncio.get_running_loop()
            result = await asyncio.wait_for(loop.run_in_executor(None, _test_sync), timeout=timeout_seconds)
            return result
        except asyncio.TimeoutError:
            return {
                "connected": False,
                "status": "timeout",
                "error": f"Connection timed out after {timeout_seconds}s. Verify IP address, port (default 554), and firewall rules.",
                "latency_ms": round(timeout_seconds * 1000, 1)
            }
        except Exception as e:
            return {
                "connected": False,
                "status": "error",
                "error": f"Unexpected camera connection error: {str(e)}",
                "latency_ms": 0
            }

    async def start_camera_stream(self, camera_id: str, camera_name: str, camera_type: str, stream_url: str):
        """
        Starts a background capture worker for a specific camera.
        Runs independently on its own loop and OpenCV capture context.
        """
        if camera_id in self.camera_tasks and not self.camera_tasks[camera_id].done():
            return  # Already running

        task = asyncio.create_task(
            self._camera_worker_loop(camera_id, camera_name, camera_type, stream_url)
        )
        self.camera_tasks[camera_id] = task

    async def stop_camera_stream(self, camera_id: str):
        if camera_id in self.camera_tasks:
            task = self.camera_tasks[camera_id]
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            del self.camera_tasks[camera_id]
        if camera_id in self.camera_states:
            self.camera_states[camera_id]["status"] = CameraStatus.OFFLINE.value

        await self.broadcast_to_camera(camera_id, {
            "type": "camera_status_update",
            "camera_id": camera_id,
            "camera_status": CameraStatus.OFFLINE.value,
            "message": "Camera stream stopped cleanly by operator.",
            "timestamp": time.time()
        })

    def _generate_detection_signature(self, detections: List[Dict[str, Any]]) -> str:
        """Discretized spatial signature of detections to prevent consecutive duplicate notifications."""
        sig_parts = []
        for d in detections:
            cat = str(d.get("category", "")).lower()
            bbox = d.get("bbox") or {}
            x_min = bbox.get("x_min") if isinstance(bbox, dict) else d.get("x_min", 0)
            y_min = bbox.get("y_min") if isinstance(bbox, dict) else d.get("y_min", 0)
            # Discretize position to ignore minor pixel jitter
            grid_x = round(float(x_min or 0) / 40.0)
            grid_y = round(float(y_min or 0) / 40.0)
            sig_parts.append(f"{cat}@{grid_x},{grid_y}")
        return ";".join(sorted(sig_parts))

    async def _camera_worker_loop(self, camera_id: str, camera_name: str, camera_type: str, stream_url: str):
        """
        Independent background processing task running real-time multi-model YOLO inference.
        Supports RTSP, CCTV, Webcams, and resilient auto-reconnect with frame-skip optimization.
        """
        self.camera_states[camera_id] = {
            "camera_id": camera_id,
            "camera_name": camera_name,
            "camera_type": camera_type,
            "stream_url": stream_url,
            "status": "connecting",
            "frame_number": 0,
            "fps": 30.0,
            "road_damage_count": 0,
            "vehicle_count": 0,
            "number_plate_count": 0,
            "road_health": 85.0,
            "reconnect_attempts": 0,
            "last_active": datetime.now(timezone.utc).isoformat()
        }

        # Source parsing (numeric index for webcam, URL string for RTSP/CCTV/HTTP)
        source: Any = stream_url.strip() if stream_url else ""
        if camera_type.lower() == "webcam" and (source == "0" or not source):
            source = 0
        elif source.isdigit():
            source = int(source)

        frame_count = 0
        reconnect_attempts = 0
        max_reconnect_attempts = getattr(settings, 'CAMERA_MAX_RECONNECT_ATTEMPTS', 10)
        reconnect_delay = getattr(settings, 'CAMERA_RECONNECT_DELAY_SECONDS', 3)
        frame_skip = max(1, getattr(settings, 'CAMERA_FRAME_SKIP', 2))
        display_only_detections = getattr(settings, 'CAMERA_DISPLAY_ONLY_DETECTIONS', True)

        while True:
            cap: Optional[cv2.VideoCapture] = None
            try:
                self.camera_states[camera_id]["status"] = "connecting"
                await self.broadcast_to_camera(camera_id, {
                    "type": "camera_status_update",
                    "camera_id": camera_id,
                    "camera_status": "connecting",
                    "message": f"Establishing RTSP connection to {camera_name}...",
                    "reconnect_attempt": reconnect_attempts,
                    "timestamp": time.time()
                })

                # Open video stream
                cap = cv2.VideoCapture(source)
                # Minimize buffering latency so OpenCV yields the latest presentation frame
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

                if not cap.isOpened():
                    raise ConnectionError(f"Could not open RTSP/CCTV camera stream '{stream_url}'")

                # Verify first frame read
                ret, initial_frame = cap.read()
                if not ret or initial_frame is None:
                    raise ConnectionError("Connected to stream but failed to read initial frame.")

                # Connection successful!
                reconnect_attempts = 0
                self.camera_states[camera_id]["status"] = CameraStatus.ONLINE.value
                self.camera_states[camera_id]["reconnect_attempts"] = 0
                await self.broadcast_to_camera(camera_id, {
                    "type": "camera_status_update",
                    "camera_id": camera_id,
                    "camera_status": CameraStatus.ONLINE.value,
                    "message": f"Camera stream connected: {camera_name} [Real-time AI Active]",
                    "timestamp": time.time()
                })

                last_heartbeat_time = time.time()

                while True:
                    frame_count += 1
                    timestamp = time.time()

                    ret, frame = cap.read()
                    if not ret or frame is None or frame.size == 0:
                        # Stream interrupted!
                        raise ConnectionResetError("RTSP stream interrupted or frame retrieval timed out.")

                    # Frame-skip strategy: Skip intermediate frames to optimize inference latency
                    if frame_count % frame_skip != 0:
                        await asyncio.sleep(0.01)
                        continue

                    # Execute existing multi-model YOLO inference
                    detections = detector_instance.detect(frame)
                    has_detections = len(detections) > 0

                    # Separate counts by model class
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

                    health_score = max(30.0, round(100.0 - (road_damage_count * 7.5), 1))
                    avg_confidence = round(
                        sum(d.get("confidence", 0.0) for d in detections) / len(detections), 2
                    ) if detections else 0.88

                    # Update cached state
                    self.camera_states[camera_id].update({
                        "frame_number": frame_count,
                        "road_damage_count": road_damage_count,
                        "vehicle_count": vehicle_count,
                        "helmet_count": helmet_count,
                        "number_plate_count": number_plate_count,
                        "road_health": health_score,
                        "last_active": datetime.now(timezone.utc).isoformat()
                    })

                    # Stolen vehicle registry check
                    stolen_alerts = []
                    if vehicle_count > 0 or number_plate_count > 0:
                        try:
                            from app.services.stolen_vehicle_service import StolenVehicleService
                            stolen_alerts = await StolenVehicleService.evaluate_frame_stolen_vehicles(
                                raw_frame=frame,
                                detections=detections,
                                frame_number=frame_count,
                                timestamp_sec=timestamp,
                                camera_id=camera_id,
                                camera_name=camera_name,
                                camera_location=f"Live Feed: {camera_name}"
                            )
                        except Exception:
                            pass

                    # Requirement: Display only frames/results where detections are actually found
                    if display_only_detections and not has_detections:
                        # Do NOT encode or transfer heavy base64 image data for frames without detections!
                        # Send periodic lightweight heartbeat every 1 second so UI knows stream is live
                        if time.time() - last_heartbeat_time >= 1.0:
                            last_heartbeat_time = time.time()
                            await self.broadcast_to_camera(camera_id, {
                                "camera_id": camera_id,
                                "camera_name": camera_name,
                                "camera_type": camera_type,
                                "frame_number": frame_count,
                                "timestamp": timestamp,
                                "has_detections": False,
                                "detections": [],
                                "total_detections": 0,
                                "road_health": health_score,
                                "camera_status": CameraStatus.ONLINE.value,
                                "fps": 30.0
                            })
                        await asyncio.sleep(0.015)
                        continue

                    # Consecutive duplicate detection prevention
                    # Consecutive duplicate detection prevention
                    current_sig = self._generate_detection_signature(detections)
                    last_sig_info = self.last_detection_signatures.get(camera_id, ("", 0.0))
                    is_consecutive_duplicate = (
                        current_sig == last_sig_info[0] and
                        (timestamp - last_sig_info[1]) < 2.0
                    )

                    # Update last signature
                    self.last_detection_signatures[camera_id] = (current_sig, timestamp)

                    # Requirement: Avoid sending consecutive duplicate detection results
                    if is_consecutive_duplicate:
                        await asyncio.sleep(0.02)
                        continue

                    # Annotate frame with color-coded bounding boxes
                    annotated_frame = VideoProcessor.draw_detections(frame, detections)

                    # Encode to Base64 JPEG only for frames with verified, non-duplicate detections
                    _, buffer = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 72])
                    jpg_as_text = base64.b64encode(buffer).decode('utf-8')
                    image_base64 = f"data:image/jpeg;base64,{jpg_as_text}"

                    payload = {
                        "camera_id": camera_id,
                        "camera_name": camera_name,
                        "camera_type": camera_type,
                        "frame_number": frame_count,
                        "timestamp": timestamp,
                        "has_detections": True,
                        "is_duplicate": False,
                        "image_base64": image_base64,
                        "detections": detections,
                        "total_detections": len(detections),
                        "stolen_alerts": stolen_alerts,
                        "road_damage_count": road_damage_count,
                        "vehicle_count": vehicle_count,
                        "helmet_count": helmet_count,
                        "number_plate_count": number_plate_count,
                        "damage_by_type": damage_by_type,
                        "vehicles_by_type": vehicles_by_type,
                        "helmet_detections": helmet_count,
                        "number_plate_detections": number_plate_count,
                        "average_confidence": avg_confidence,
                        "road_health": health_score,
                        "camera_status": CameraStatus.ONLINE.value,
                        "fps": 30.0
                    }

                    last_heartbeat_time = time.time()
                    await self.broadcast_to_camera(camera_id, payload)
                    await asyncio.sleep(0.03)

            except asyncio.CancelledError:
                break
            except Exception as e:
                reconnect_attempts += 1
                error_msg = str(e)
                
                # Check if max reconnect attempts reached
                if reconnect_attempts >= max_reconnect_attempts:
                    self.camera_states[camera_id]["status"] = "failed"
                    self.camera_states[camera_id]["reconnect_attempts"] = reconnect_attempts
                    await self.broadcast_to_camera(camera_id, {
                        "type": "camera_status_update",
                        "camera_id": camera_id,
                        "camera_status": "failed",
                        "error": f"Connection failed after {reconnect_attempts} attempts: {error_msg}",
                        "message": f"Camera offline. Maximum retry limit reached ({max_reconnect_attempts}). Please verify RTSP URL, credentials, and camera power.",
                        "reconnect_attempt": reconnect_attempts,
                        "timestamp": time.time()
                    })
                    break

                self.camera_states[camera_id]["status"] = "reconnecting"
                self.camera_states[camera_id]["reconnect_attempts"] = reconnect_attempts

                await self.broadcast_to_camera(camera_id, {
                    "type": "camera_status_update",
                    "camera_id": camera_id,
                    "camera_status": "reconnecting",
                    "error": error_msg,
                    "message": f"Connection lost to camera: {error_msg}. Retrying in {min(10, reconnect_attempts * reconnect_delay)}s (attempt {reconnect_attempts}/{max_reconnect_attempts})...",
                    "reconnect_attempt": reconnect_attempts,
                    "timestamp": time.time()
                })

                delay = min(10.0, reconnect_attempts * reconnect_delay)
                await asyncio.sleep(delay)
            finally:
                if cap is not None:
                    cap.release()


# Global Singleton Camera Connection Manager
camera_manager = CameraConnectionManager()
