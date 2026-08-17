import cv2
import time
import math
import threading
import numpy as np
from typing import Optional, Dict, Any


class DriverCameraManager:
    """
    Multi-Source Camera Ingestion Engine for Driver Assistance System.
    Supports:
    - USB Camera / Laptop Camera (index integer or device string e.g., '0', '1')
    - Dash Camera / IP RTSP Camera (`rtsp://...` or `http://...`)
    - Mobile Camera Stream (HTTP video feed)
    - Pre-recorded Dashcam Video File
    
    Operates a background thread for non-blocking frame retrieval at 20-30 FPS.
    """

    def __init__(self):
        self.camera_source: str = "0"
        self.cap: Optional[cv2.VideoCapture] = None
        self.is_running: bool = False
        self.lock = threading.Lock()
        self.latest_frame: Optional[np.ndarray] = None
        self.frame_count: int = 0
        self.start_time: float = 0.0
        self.current_fps: float = 0.0
        self.thread: Optional[threading.Thread] = None
        self.error_message: Optional[str] = None

    def start_camera(self, camera_source: str = "0") -> bool:
        """
        Initialize and launch driver camera stream thread.
        """
        self.stop_camera()

        self.camera_source = str(camera_source).strip()
        
        # Parse camera index if numeric string
        if self.camera_source.isdigit():
            src_val: Any = int(self.camera_source)
        else:
            src_val = self.camera_source

        try:
            self.cap = cv2.VideoCapture(src_val)
            if not self.cap.isOpened():
                # Fallback to test video or synthetic generator if camera unavailable
                print(f"[DriverCamera] Notice: Could not open camera source '{self.camera_source}'. Running in simulation mode.")
                self.cap = None

            self.is_running = True
            self.start_time = time.time()
            self.frame_count = 0
            self.error_message = None

            self.thread = threading.Thread(target=self._capture_loop, daemon=True)
            self.thread.start()
            return True
        except Exception as e:
            self.error_message = str(e)
            print(f"[DriverCamera] Error starting camera: {e}")
            return False

    def _capture_loop(self):
        """Continuous background thread capturing video frames."""
        last_calc = time.time()
        calc_frames = 0

        while self.is_running:
            frame = None
            if self.cap is not None and self.cap.isOpened():
                ret, frame = self.cap.read()
                if not ret or frame is None:
                    # Loop video if pre-recorded file reached EOF
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ret, frame = self.cap.read()

            if frame is None:
                # Generate synthetic road scene for testing when physical camera detached
                frame = self._generate_synthetic_road_frame()

            with self.lock:
                self.latest_frame = frame
                self.frame_count += 1
                calc_frames += 1

            # FPS calculation over 1-second window
            now = time.time()
            if now - last_calc >= 1.0:
                self.current_fps = round(calc_frames / (now - last_calc), 1)
                calc_frames = 0
                last_calc = now

            time.sleep(0.03)  # Target ~30 FPS

    def get_latest_frame(self) -> Optional[np.ndarray]:
        """Retrieve latest captured frame thread-safely."""
        with self.lock:
            if self.latest_frame is not None:
                return self.latest_frame.copy()
            return None

    def stop_camera(self):
        """Safely shutdown camera stream and clean resources."""
        self.is_running = False
        if self.thread is not None:
            self.thread.join(timeout=1.0)
            self.thread = None

        if self.cap is not None:
            self.cap.release()
            self.cap = None

    def get_status(self) -> Dict[str, Any]:
        """Get driver camera health telemetry."""
        return {
            "is_running": self.is_running,
            "camera_source": self.camera_source,
            "fps": self.current_fps,
            "total_frames_captured": self.frame_count,
            "uptime_seconds": round(time.time() - self.start_time, 1) if self.is_running else 0.0,
            "error": self.error_message
        }

    def _generate_synthetic_road_frame(self) -> np.ndarray:
        """Synthetic road scene generator for driver mode demonstration when camera hardware unattached."""
        h, w = 720, 1280
        img = np.zeros((h, w, 3), dtype=np.uint8)

        # Sky
        img[0:int(h * 0.45), :] = [80, 50, 30]  # Dark twilight sky BGR

        # Road surface
        img[int(h * 0.45):, :] = [50, 50, 50]

        # Perspective Lane Lines
        cv2.line(img, (int(w * 0.1), h), (int(w * 0.45), int(h * 0.45)), (255, 255, 255), 3)
        cv2.line(img, (int(w * 0.9), h), (int(w * 0.55), int(h * 0.45)), (255, 255, 255), 3)
        cv2.line(img, (int(w * 0.5), h), (int(w * 0.5), int(h * 0.6)), (0, 255, 255), 2)  # Yellow center line

        # Synthetic Pothole moving towards windshield
        t = (time.time() * 0.8) % 3.0
        progress = t / 3.0  # 0.0 to 1.0

        py = int(h * 0.5 + progress * (h * 0.42))
        px = int(w * 0.5 - 20 + math.sin(t) * 15)
        pw = int(30 + progress * 140)
        ph = int(15 + progress * 70)

        # Draw dark pothole defect on synthetic road
        cv2.ellipse(img, (px, py), (pw // 2, ph // 2), 0, 0, 360, (20, 20, 20), -1)
        cv2.ellipse(img, (px, py), (pw // 2, ph // 2), 0, 0, 360, (80, 80, 80), 2)

        return img


# Global Camera Manager Instance
driver_camera_manager = DriverCameraManager()
