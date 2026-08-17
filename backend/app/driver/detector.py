import cv2
import numpy as np
import time
from typing import List, Dict, Any, Tuple

from app.yolo.detector import YOLODamageDetector
from app.driver.distance import distance_estimator
from app.driver.tracker import driver_tracker
from app.driver.alerts import alert_evaluator
from app.driver.tts import driver_tts


class DriverAssistancePipeline:
    """
    Integrated Driver Assistance Processing Engine.
    Executes real-time YOLOv11 road damage detection, optical distance estimation,
    lane corridor tracking, hazard severity evaluation, and HUD visual overlays.
    """

    COLOR_MAP = {
        "low": (129, 185, 16),      # Green (BGR)
        "medium": (11, 158, 245),   # Yellow (BGR)
        "high": (22, 115, 249),     # Orange (BGR)
        "critical": (68, 68, 239)   # Red (BGR)
    }

    def __init__(self, yolo_detector: YOLODamageDetector = None):
        from app.services.camera_manager import detector_instance
        self.yolo_engine = yolo_detector or detector_instance
        self.last_process_time = time.time()
        self.fps = 30.0

    def process_driver_frame(
        self,
        frame: np.ndarray,
        alert_distance_m: float = 30.0,
        min_confidence: float = 0.35,
        min_severity: str = "low",
        draw_overlays: bool = True
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Process single camera frame for Driver Assistance Mode.
        """
        t0 = time.perf_counter()
        h, w = frame.shape[:2]

        # 1. Run YOLO Multi-Model Detection
        raw_detections = self.yolo_engine.detect(frame, conf_threshold=min_confidence)

        # 2. Filter Road Damage Detections
        damage_detections = [d for d in raw_detections if d.get("category_type") == "damage" or d.get("category") in alert_evaluator.SEVERITY_MAPPING]

        # 3. Estimate Distance & Lane Position for each damage detection
        enriched_detections = []
        for det in damage_detections:
            bbox = {
                "x_min": det["x_min"],
                "y_min": det["y_min"],
                "x_max": det["x_max"],
                "y_max": det["y_max"]
            }
            dist = distance_estimator.estimate_distance(bbox, frame_width=w, frame_height=h)
            lane, is_center = distance_estimator.determine_lane_position(bbox, frame_width=w)

            det["distance_meters"] = dist
            det["lane_position"] = lane
            det["is_in_driving_path"] = is_center
            det["bbox"] = bbox
            enriched_detections.append(det)

        # 4. Update Object Tracker
        tracked_obstacles = driver_tracker.update(enriched_detections)

        # 5. Evaluate Primary Driver Warning
        primary_warning = alert_evaluator.select_primary_warning(
            active_tracked_obstacles=tracked_obstacles,
            alert_distance_threshold=alert_distance_m,
            min_confidence=min_confidence
        )

        # 6. Build Audio / Voice Payload if warning active
        tts_payload = None
        if primary_warning and primary_warning.get("should_speak_voice"):
            tts_payload = driver_tts.get_speech_payload(
                voice_message=primary_warning["voice_message"],
                alert_level=primary_warning["level"]
            )

        # 7. Draw OpenCV Visual HUD Overlay if requested
        output_frame = frame.copy() if draw_overlays else frame
        if draw_overlays:
            self._draw_hud_overlays(output_frame, tracked_obstacles, primary_warning, w, h)

        dt_ms = (time.perf_counter() - t0) * 1000.0
        self.fps = round(1000.0 / max(dt_ms, 1.0), 1)

        result_payload = {
            "fps": self.fps,
            "latency_ms": round(dt_ms, 1),
            "total_hazards_detected": len(tracked_obstacles),
            "primary_warning": primary_warning,
            "tts_payload": tts_payload,
            "tracked_hazards": [
                {
                    "track_id": t.track_id,
                    "category": t.category,
                    "distance_meters": t.current_distance,
                    "lane_position": t.lane,
                    "confidence": t.confidence,
                    "bbox": t.bbox
                }
                for t in tracked_obstacles
            ]
        }

        return output_frame, result_payload

    def _draw_hud_overlays(
        self,
        frame: np.ndarray,
        tracked_obstacles: List[Any],
        primary_warning: Dict[str, Any],
        w: int,
        h: int
    ):
        """
        Draw heads-up display (HUD) visual overlay:
        - Driving lane Corridor guide
        - Damage Bounding boxes with Severity Color + Distance + Lane labels
        - Top Warning Banner if hazard active
        """
        # Draw Driving Path Corridor Guide Lines
        cv2.line(frame, (int(w * 0.38), h), (int(w * 0.44), int(h * 0.55)), (255, 255, 255), 1, cv2.LINE_AA)
        cv2.line(frame, (int(w * 0.62), h), (int(w * 0.56), int(h * 0.55)), (255, 255, 255), 1, cv2.LINE_AA)

        # Draw Bounding Boxes for all tracked obstacles
        for track in tracked_obstacles:
            bbox = track.bbox
            x_min = int(bbox["x_min"] if bbox["x_min"] > 1.0 else bbox["x_min"] * w)
            y_min = int(bbox["y_min"] if bbox["y_min"] > 1.0 else bbox["y_min"] * h)
            x_max = int(bbox["x_max"] if bbox["x_max"] > 1.0 else bbox["x_max"] * w)
            y_max = int(bbox["y_max"] if bbox["y_max"] > 1.0 else bbox["y_max"] * h)

            eval_res = alert_evaluator.evaluate_hazard(track.category, track.current_distance, track.lane)
            level = eval_res["level"]
            bgr_color = self.COLOR_MAP.get(level, (0, 255, 0))

            # Bounding box
            cv2.rectangle(frame, (x_min, y_min), (x_max, y_max), bgr_color, 2)

            # Label text
            label_str = f"{eval_res['title']} | {track.category.upper()} | {track.current_distance}m"
            (tw, th), _ = cv2.getTextSize(label_str, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)

            cv2.rectangle(frame, (x_min, y_min - th - 8), (x_min + tw + 6, y_min), bgr_color, -1)
            cv2.putText(frame, label_str, (x_min + 3, y_min - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)

        # Top HUD Warning Banner
        if primary_warning:
            level = primary_warning["level"]
            bgr_color = self.COLOR_MAP.get(level, (0, 0, 255))
            
            banner_h = 60
            overlay = frame.copy()
            cv2.rectangle(overlay, (0, 0), (w, banner_h), bgr_color, -1)
            cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)

            msg_title = f"{primary_warning['title']}: {primary_warning['category_display'].upper()} AHEAD"
            msg_sub = f"Distance: {primary_warning['distance_meters']} meters  |  Lane: {primary_warning['lane_position']}"

            cv2.putText(frame, msg_title, (20, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)
            cv2.putText(frame, msg_sub, (20, 48), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (230, 230, 230), 1, cv2.LINE_AA)


# Global Pipeline Instance
driver_pipeline = DriverAssistancePipeline()
