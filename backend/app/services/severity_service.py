from typing import Dict, Any, List, Tuple
from app.models.models import SeverityLevel, DamageCategory
from app.config.config import settings


class SeverityAnalysisService:
    """
    Mathematical Severity Scoring Engine for Road Damage.
    Formula integrates:
    1. Bounding Box Area relative to total road frame area (W_area = 0.40)
    2. Category Hazard Multiplier (W_category = 0.15)
    3. Model Confidence (W_conf = 0.20)
    4. Local Cluster Density (W_density = 0.25)
    """

    # Category Risk Weights (1.0 = standard, 2.5 = critical structural hazard)
    CATEGORY_WEIGHTS: Dict[DamageCategory, float] = {
        DamageCategory.POTHOLE: 2.5,
        DamageCategory.BROKEN_ROAD: 2.2,
        DamageCategory.ALLIGATOR_CRACK: 1.8,
        DamageCategory.MISSING_ASPHALT: 1.6,
        DamageCategory.LONGITUDINAL_CRACK: 1.2,
        DamageCategory.TRANSVERSE_CRACK: 1.0,
    }

    @classmethod
    def calculate_detection_severity(
        cls,
        detection: Dict[str, Any],
        frame_width: int = 1280,
        frame_height: int = 720,
        cluster_count: int = 1
    ) -> Tuple[SeverityLevel, float]:
        """
        Calculates severity score (0.0 to 100.0) and level for an individual bounding box.
        """
        x_min = detection["x_min"]
        y_min = detection["y_min"]
        x_max = detection["x_max"]
        y_max = detection["y_max"]
        confidence = detection.get("confidence", 0.5)
        category = detection.get("category", DamageCategory.POTHOLE)

        # 1. Area Ratio (Normalized relative to road visual canvas)
        box_area = max(1.0, (x_max - x_min) * (y_max - y_min))
        total_frame_area = frame_width * frame_height
        area_ratio = min(1.0, box_area / (total_frame_area * 0.15))  # 15% of frame = max scale

        # 2. Hazard Multiplier based on Category
        if isinstance(category, str):
            try:
                cat_enum = DamageCategory(category)
            except ValueError:
                cat_enum = DamageCategory.POTHOLE
        else:
            cat_enum = category

        category_multiplier = cls.CATEGORY_WEIGHTS.get(cat_enum, 1.5)

        # 3. Density Factor
        density_factor = min(2.0, 1.0 + (cluster_count - 1) * 0.2)

        # Mathematical Severity Formula
        score = (
            (area_ratio * 100 * settings.WEIGHT_AREA) +
            (confidence * 100 * settings.WEIGHT_CONFIDENCE) +
            ((category_multiplier / 2.5) * 100 * settings.WEIGHT_CLASS_SEVERITY) +
            (density_factor * 50 * settings.WEIGHT_DENSITY)
        )

        score = min(100.0, max(0.0, round(score, 2)))

        # Level Classification
        if score < 25.0:
            level = SeverityLevel.LOW
        elif score < 50.0:
            level = SeverityLevel.MEDIUM
        elif score < 75.0:
            level = SeverityLevel.HIGH
        else:
            level = SeverityLevel.CRITICAL

        return level, score

    @classmethod
    def calculate_road_health_index(
        cls,
        detections: List[Dict[str, Any]],
        video_duration_seconds: float,
        road_length_km: float = 1.0
    ) -> Dict[str, Any]:
        """
        Calculates the overall Road Health Index (RHI) on a 0 - 100 scale.
        100 = Pristine Condition, 0 = Hazardous / Needs Immediate Reconstruction.
        """
        if not detections:
            return {
                "road_health_score": 98.5,
                "overall_severity": SeverityLevel.LOW,
                "total_detections": 0,
                "pothole_count": 0,
                "crack_count": 0,
                "critical_count": 0,
                "damage_density_per_km": 0.0
            }

        pothole_count = 0
        crack_count = 0
        critical_count = 0
        total_severity_sum = 0.0

        for det in detections:
            cat = det.get("category", "")
            sev = det.get("severity", "low")
            score = det.get("severity_score", 10.0)

            if "pothole" in cat or "broken" in cat:
                pothole_count += 1
            else:
                crack_count += 1

            if sev == SeverityLevel.CRITICAL or score >= 75.0:
                critical_count += 1

            total_severity_sum += score

        total_detections = len(detections)
        avg_severity = total_severity_sum / total_detections if total_detections > 0 else 0.0

        # Estimate distance covered if road_length_km is default
        distance_km = max(0.2, road_length_km if road_length_km > 0 else (video_duration_seconds * 0.015))
        damage_density = round(total_detections / distance_km, 2)

        # Deduce health deduction penalty
        deduction = (avg_severity * 0.5) + (damage_density * 2.5) + (critical_count * 12.0)
        health_score = max(0.0, min(100.0, round(100.0 - deduction, 1)))

        if health_score >= 80.0:
            overall_severity = SeverityLevel.LOW
        elif health_score >= 60.0:
            overall_severity = SeverityLevel.MEDIUM
        elif health_score >= 40.0:
            overall_severity = SeverityLevel.HIGH
        else:
            overall_severity = SeverityLevel.CRITICAL

        return {
            "road_health_score": health_score,
            "overall_severity": overall_severity,
            "total_detections": total_detections,
            "pothole_count": pothole_count,
            "crack_count": crack_count,
            "critical_count": critical_count,
            "damage_density_per_km": damage_density
        }

    @classmethod
    def estimate_perspective_distance(
        cls,
        detection: Dict[str, Any],
        frame_height: int = 720
    ) -> float:
        """
        Estimates perspective distance in meters based on bounding box vertical position.
        Lower Y coordinate (closer to horizon/top of road view) = farther away.
        Higher Y coordinate (near bottom of image/vehicle bumper) = close proximity.
        """
        y_max = float(detection.get("y_max", frame_height * 0.8))
        norm_y = min(1.0, max(0.1, y_max / max(1, frame_height)))
        
        # Approximate distance formula (50m at horizon, 3m at vehicle bumper)
        estimated_dist = 3.0 + (1.0 - norm_y) * 47.0
        return round(float(estimated_dist), 1)
