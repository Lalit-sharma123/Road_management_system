import os
import cv2
import numpy as np
from typing import List, Tuple, Generator, Dict, Any


class VideoProcessor:
    """
    Computer Vision Pipeline using OpenCV & FFmpeg.
    Performs frame decoding, pre-processing, filtering, and annotation overlay.
    """

    def __init__(self, video_path: str):
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found at path: {video_path}")
        self.video_path = video_path
        self.cap = cv2.VideoCapture(video_path)
        
        if not self.cap.isOpened():
            raise ValueError(f"Unable to open video file with OpenCV: {video_path}")
            
        self.total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.fps = self.cap.get(cv2.CAP_PROP_FPS) or 30.0
        self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.duration_seconds = self.total_frames / self.fps if self.fps > 0 else 0.0

    def get_metadata(self) -> Dict[str, Any]:
        """Return video properties"""
        return {
            "total_frames": self.total_frames,
            "fps": self.fps,
            "width": self.width,
            "height": self.height,
            "duration_seconds": self.duration_seconds,
            "resolution": f"{self.width}x{self.height}"
        }

    def generate_thumbnail(self, output_path: str, frame_num: int = 10) -> str:
        """Extract a single frame and save as JPEG thumbnail"""
        self.cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
        ret, frame = self.cap.read()
        if not ret or frame is None:
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = self.cap.read()
            
        if ret and frame is not None:
            cv2.imwrite(output_path, frame)
            return output_path
        raise RuntimeError("Failed to generate thumbnail from video frame")

    def extract_frames_generator(
        self,
        frame_skip: int = 5,
        target_size: Tuple[int, int] = (1280, 720),
        enable_histogram_eq: bool = True,
        enable_gaussian_blur: bool = True
    ) -> Generator[Tuple[int, float, np.ndarray, np.ndarray], None, None]:
        """
        Stream frames with skipping and optional pre-processing pipeline.
        Yields: (frame_number, timestamp_sec, original_frame, preprocessed_frame)
        """
        self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        current_frame = 0

        while self.cap.isOpened():
            ret, frame = self.cap.read()
            if not ret or frame is None:
                break

            current_frame += 1

            # Skip frames to optimize processing latency
            if current_frame % frame_skip != 0:
                continue

            timestamp_sec = current_frame / self.fps if self.fps > 0 else 0.0

            # Resize if required
            if (self.width, self.height) != target_size:
                frame_resized = cv2.resize(frame, target_size, interpolation=cv2.INTER_AREA)
            else:
                frame_resized = frame.copy()

            # Pre-processing pipeline
            processed_frame = frame_resized.copy()

            if enable_histogram_eq:
                # CLAHE (Contrast Limited Adaptive Histogram Equalization) on Y channel
                ycrcb = cv2.cvtColor(processed_frame, cv2.COLOR_BGR2YCrCb)
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                ycrcb[:, :, 0] = clahe.apply(ycrcb[:, :, 0])
                processed_frame = cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2BGR)

            if enable_gaussian_blur:
                # Denoise high-frequency texture noise on road surface
                processed_frame = cv2.GaussianBlur(processed_frame, (3, 3), 0)

            yield current_frame, timestamp_sec, frame_resized, processed_frame

        self.cap.release()

    @staticmethod
    def apply_perspective_transform(frame: np.ndarray) -> np.ndarray:
        """
        Bird's Eye View perspective transformation for road plane area calibration.
        """
        h, w = frame.shape[:2]
        # Define trapezoid source points on camera hood perspective
        src_pts = np.float32([
            [w * 0.25, h * 0.65],
            [w * 0.75, h * 0.65],
            [w * 0.95, h * 0.95],
            [w * 0.05, h * 0.95]
        ])
        # Define rectangle destination points
        dst_pts = np.float32([
            [0, 0],
            [w, 0],
            [w, h],
            [0, h]
        ])
        matrix = cv2.getPerspectiveTransform(src_pts, dst_pts)
        birds_eye = cv2.warpPerspective(frame, matrix, (w, h))
        return birds_eye

    @staticmethod
    def draw_detections(
        frame: np.ndarray,
        detections: List[Dict[str, Any]]
    ) -> np.ndarray:
        """
        Draw bounding boxes, confidence scores, and category labels.
        Color coding by detection category & type:
        - Road Damage: Red (0, 0, 255)
        - Vehicle: Blue (255, 0, 0)
        - Number Plate: Green (0, 255, 0)
        """
        annotated = frame.copy()

        DAMAGE_CLASSES = {
            "pothole", "longitudinal_crack", "transverse_crack",
            "alligator_crack", "missing_asphalt", "broken_road", "crack", "damage"
        }
        VEHICLE_CLASSES = {
            "car", "truck", "bus", "motorcycle", "bicycle", "person", "vehicle"
        }
        HELMET_CLASSES = {
            "helmet", "helmets"
        }
        PLATE_CLASSES = {
            "number_plate", "plate", "license_plate"
        }

        for det in detections:
            bbox = det.get("bbox", {})
            x_min = int(bbox.get("x_min", det.get("x_min", 0)))
            y_min = int(bbox.get("y_min", det.get("y_min", 0)))
            x_max = int(bbox.get("x_max", det.get("x_max", 0)))
            y_max = int(bbox.get("y_max", det.get("y_max", 0)))

            category = str(det.get("category", "damage")).lower()
            confidence = float(det.get("confidence", 0.0))
            det_type = str(det.get("type", "")).lower()

            # Color assignment in OpenCV BGR
            # Road Damage: Red (0, 0, 255)
            # Vehicle: Blue (255, 0, 0)
            # Helmet: Yellow (0, 255, 255)
            # Number Plate: Green (0, 255, 0)
            if det_type == "damage" or category in DAMAGE_CLASSES:
                color = (0, 0, 255)  # Red for Road Damage
            elif det_type == "vehicle" or category in VEHICLE_CLASSES:
                color = (255, 0, 0)  # Blue for Vehicle
            elif det_type == "helmet" or category in HELMET_CLASSES:
                color = (0, 255, 255)  # Yellow for Helmet
            elif det_type == "plate" or category in PLATE_CLASSES:
                color = (0, 255, 0)  # Green for Number Plate
            else:
                color = (0, 0, 255)  # Default Red

            # Draw Bounding Box
            cv2.rectangle(annotated, (x_min, y_min), (x_max, y_max), color, 2)

            # Header Label Text
            label = f"{category.upper()} {confidence*100:.1f}%"

            # Label background box
            (text_w, text_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(
                annotated,
                (x_min, max(0, y_min - text_h - 6)),
                (x_min + text_w + 4, max(text_h + 6, y_min)),
                color,
                -1
            )
            # Text string (black on Green/Yellow, white on Red/Blue)
            text_color = (0, 0, 0) if color in [(0, 255, 0), (0, 255, 255)] else (255, 255, 255)
            cv2.putText(
                annotated,
                label,
                (x_min + 2, max(text_h + 2, y_min - 4)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                text_color,
                1,
                cv2.LINE_AA
            )

        return annotated

    def close(self):
        if self.cap and self.cap.isOpened():
            self.cap.release()
