import asyncio
import base64
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Set, Optional
import cv2
import numpy as np
from fastapi import WebSocket, WebSocketDisconnect

from app.models.models import CameraStatus, CameraType
from app.yolo.detector import YOLODamageDetector
from app.cv.video_processor import VideoProcessor

# Instantiate multi-model YOLO detector once for real-time camera inference
detector_instance = YOLODamageDetector()


class CameraConnectionManager:
    """
    Enterprise Multi-Camera Streaming & Ingestion Manager.
    Handles background capture tasks, multi-model YOLO inference loops, and WebSocket broadcasting.
    """

    def __init__(self):
        # Map of camera_id -> Set[WebSocket]
        self.active_websockets: Dict[str, Set[WebSocket]] = {}
        # Map of camera_id -> asyncio.Task
        self.camera_tasks: Dict[str, asyncio.Task] = {}
        # Camera runtime state cache
        self.camera_states: Dict[str, Dict[str, Any]] = {}

    async def connect_websocket(self, camera_id: str, websocket: WebSocket):
        await websocket.accept()
        if camera_id not in self.active_websockets:
            self.active_websockets[camera_id] = set()
        self.active_websockets[camera_id].add(websocket)

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

    async def _camera_worker_loop(self, camera_id: str, camera_name: str, camera_type: str, stream_url: str):
        """
        Independent background processing task running real-time multi-model YOLO inference.
        Supports RTSP, CCTV, Webcams, and synthetic test streams.
        """
        self.camera_states[camera_id] = {
            "camera_id": camera_id,
            "camera_name": camera_name,
            "camera_type": camera_type,
            "status": CameraStatus.ONLINE.value,
            "frame_number": 0,
            "fps": 30.0,
            "road_damage_count": 0,
            "vehicle_count": 0,
            "number_plate_count": 0,
            "road_health": 85.0,
            "last_active": datetime.now(timezone.utc).isoformat()
        }

        # Initialize stream source parsing
        source: Any = stream_url
        if camera_type.lower() == "webcam" and (stream_url == "0" or not stream_url):
            source = 0

        frame_count = 0
        reconnect_attempts = 0

        while True:
            try:
                cap = cv2.VideoCapture(source)
                use_synthetic = not cap.isOpened()

                while True:
                    frame_count += 1
                    timestamp = time.time()

                    if not use_synthetic and cap.isOpened():
                        ret, frame = cap.read()
                        if not ret:
                            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                            ret, frame = cap.read()
                            if not ret:
                                break
                    else:
                        # Synthetic video frame generation with moving simulated targets
                        frame = np.zeros((480, 640, 3), dtype=np.uint8)
                        frame[100:480, :] = [40, 40, 42]
                        cv2.line(frame, (320, 100), (120, 480), (255, 255, 255), 2)
                        cv2.line(frame, (320, 100), (520, 480), (255, 255, 255), 2)
                        cv2.line(frame, (320, 100), (320, 480), (255, 215, 0), 2)

                        # HUD Header
                        cv2.putText(
                            frame,
                            f"CAM: {camera_name.upper()} [{camera_type.upper()}]",
                            (15, 30),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.5,
                            (0, 255, 0),
                            1
                        )
                        cv2.putText(
                            frame,
                            f"TIME: {datetime.now(timezone.utc).strftime('%H:%M:%S.%f')[:-3]}",
                            (15, 55),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.4,
                            (200, 200, 200),
                            1
                        )

                    # Run Multi-Model YOLO Inference in memory
                    detections = detector_instance.detect(frame)

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

                    # Compute health score
                    health_score = max(30.0, round(100.0 - (road_damage_count * 7.5), 1))
                    avg_confidence = round(
                        sum(d.get("confidence", 0.0) for d in detections) / len(detections), 2
                    ) if detections else 0.92

                    # Draw annotated frame with exact color scheme (Red: Damage, Blue: Vehicle, Yellow: Helmet, Green: Plate)
                    annotated_frame = VideoProcessor.draw_detections(frame, detections)

                    # Encode to Base64 JPEG
                    _, buffer = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                    jpg_as_text = base64.b64encode(buffer).decode('utf-8')
                    image_base64 = f"data:image/jpeg;base64,{jpg_as_text}"

                    # Live Packet
                    payload = {
                        "camera_id": camera_id,
                        "camera_name": camera_name,
                        "camera_type": camera_type,
                        "frame_number": frame_count,
                        "timestamp": timestamp,
                        "image_base64": image_base64,
                        "detections": detections,
                        "total_detections": len(detections),
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

                    # Cache state
                    self.camera_states[camera_id].update({
                        "frame_number": frame_count,
                        "road_damage_count": road_damage_count,
                        "vehicle_count": vehicle_count,
                        "helmet_count": helmet_count,
                        "number_plate_count": number_plate_count,
                        "road_health": health_score,
                        "last_active": datetime.now(timezone.utc).isoformat()
                    })

                    # Broadcast packet to connected WebSocket subscribers
                    await self.broadcast_to_camera(camera_id, payload)

                    await asyncio.sleep(0.033)

            except asyncio.CancelledError:
                break
            except Exception as e:
                reconnect_attempts += 1
                if camera_id in self.camera_states:
                    self.camera_states[camera_id]["status"] = CameraStatus.BUSY.value
                await asyncio.sleep(min(5, reconnect_attempts * 2))


# Global Singleton Camera Connection Manager
camera_manager = CameraConnectionManager()
