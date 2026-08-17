import math
from typing import Dict, Any, Tuple


class DistanceEstimator:
    """
    Real-Time Optical Distance Estimation & Lane Alignment Module.
    Estimates distance (in meters) from camera to road surface defects using pinhole geometry,
    camera mounting parameters (height, pitch angle), and bounding box coordinates.
    Also determines vehicle lane alignment (Left lane, Center lane, Right lane).
    """

    def __init__(
        self,
        camera_height_meters: float = 1.3,
        pitch_angle_degrees: float = 15.0,
        focal_length_px: float = 800.0,
        default_frame_width: int = 1280,
        default_frame_height: int = 720
    ):
        self.camera_height = camera_height_meters
        self.pitch_angle_rad = math.radians(pitch_angle_degrees)
        self.focal_length = focal_length_px
        self.default_width = default_frame_width
        self.default_height = default_frame_height

    def update_calibration(
        self,
        camera_height_meters: float = None,
        pitch_angle_degrees: float = None,
        focal_length_px: float = None
    ):
        if camera_height_meters is not None:
            self.camera_height = camera_height_meters
        if pitch_angle_degrees is not None:
            self.pitch_angle_rad = math.radians(pitch_angle_degrees)
        if focal_length_px is not None:
            self.focal_length = focal_length_px

    def estimate_distance(
        self,
        bbox: Dict[str, float],
        frame_width: int = 1280,
        frame_height: int = 720
    ) -> float:
        """
        Estimate ground plane distance in meters from camera to road damage.
        
        Using road surface projection geometry:
        y_max is the bottom edge of the bounding box on the road surface.
        theta = pitch_angle + arctan((y_max - y_center) / focal_length)
        distance = camera_height / tan(theta)
        """
        y_max = bbox.get("y_max", 0.0)
        y_min = bbox.get("y_min", 0.0)
        
        # Normalize y_max if provided in relative coordinates (0.0 to 1.0)
        if y_max <= 1.0:
            y_max_px = y_max * frame_height
            y_min_px = y_min * frame_height
        else:
            y_max_px = y_max
            y_min_px = y_min

        # Optical center y-coordinate (principal point)
        cy = frame_height / 2.0
        
        # Vertical pixel offset from horizon
        v_offset = y_max_px - cy
        
        # Subtended vertical angle
        angle_offset = math.atan2(v_offset, self.focal_length)
        total_angle = self.pitch_angle_rad + angle_offset

        # Prevent division by zero / negative angles (horizon or sky detections)
        if total_angle <= 0.05:
            # Fallback estimation based on bounding box height ratio
            box_h_px = max(1.0, y_max_px - y_min_px)
            # Physical pothole height ~ 0.5m
            estimated_dist = (0.5 * self.focal_length) / box_h_px
            return round(max(2.0, min(80.0, estimated_dist)), 1)

        distance_meters = self.camera_height / math.tan(total_angle)
        
        # Refine distance using bounding box area/height heuristics if extremely close/far
        box_h_px = max(1.0, y_max_px - y_min_px)
        secondary_dist = (0.6 * self.focal_length) / box_h_px
        
        # Weighted fusion of trigonometric projection and bounding box size
        fused_distance = 0.75 * distance_meters + 0.25 * secondary_dist

        # Clamp distance between 1.5m and 75m for road safety alerts
        fused_distance = max(1.5, min(75.0, fused_distance))
        return round(fused_distance, 1)

    def determine_lane_position(
        self,
        bbox: Dict[str, float],
        frame_width: int = 1280
    ) -> Tuple[str, bool]:
        """
        Determine which vehicle lane corridor the road defect occupies:
        - Left lane  (x_center < 38%)
        - Center lane (38% <= x_center <= 62%) -> Direct Vehicle Path
        - Right lane (x_center > 62%)
        
        Returns: (lane_name, is_in_driving_path)
        """
        x_min = bbox.get("x_min", 0.0)
        x_max = bbox.get("x_max", 0.0)

        if x_max <= 1.0:
            x_center_ratio = (x_min + x_max) / 2.0
        else:
            x_center_ratio = ((x_min + x_max) / 2.0) / max(1.0, frame_width)

        if x_center_ratio < 0.38:
            return "Left lane", False
        elif x_center_ratio <= 0.62:
            return "Center lane", True
        else:
            return "Right lane", False


# Global Singleton Instance
distance_estimator = DistanceEstimator()
