from typing import List, Dict, Any, Optional
from app.driver.tracker import TrackedObstacle


class AlertEvaluator:
    """
    Driver Assistance Alert & Severity Decision Module.
    Classifies road damage hazards into 4 warning tiers:
    - Low: "Road damage ahead" (Green / Safe)
    - Medium: "Slow down. Road damage ahead" (Yellow / Caution)
    - High: "Danger. Large pothole ahead. Reduce speed immediately" (Orange / High Risk)
    - Critical: "Emergency. Dangerous pothole ahead. Brake carefully" (Red / Critical)
    """

    ALERT_LEVELS = {
        "low": {
            "title": "LOW RISK",
            "voice_message": "Road damage ahead",
            "color": "#10B981", # Green
            "badge_bg": "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
            "priority": 1
        },
        "medium": {
            "title": "CAUTION",
            "voice_message": "Slow down. Road damage ahead",
            "color": "#F59E0B", # Yellow
            "badge_bg": "bg-amber-500/20 text-amber-400 border-amber-500/40",
            "priority": 2
        },
        "high": {
            "title": "HIGH RISK",
            "voice_message": "Danger. Large pothole ahead. Reduce speed immediately",
            "color": "#F97316", # Orange
            "badge_bg": "bg-orange-500/20 text-orange-400 border-orange-500/40",
            "priority": 3
        },
        "critical": {
            "title": "CRITICAL EMERGENCY",
            "voice_message": "Emergency. Dangerous pothole ahead. Brake carefully",
            "color": "#EF4444", # Red
            "badge_bg": "bg-rose-500/20 text-rose-400 border-rose-500/40",
            "priority": 4
        }
    }

    SEVERITY_MAPPING = {
        "pothole": "high",
        "missing_asphalt": "critical",
        "broken_road": "critical",
        "alligator_crack": "medium",
        "longitudinal_crack": "low",
        "transverse_crack": "low"
    }

    def evaluate_hazard(
        self,
        category: str,
        distance_meters: float,
        lane_position: str,
        confidence: float = 0.8
    ) -> Dict[str, Any]:
        """
        Evaluate single hazard instance and return warning tier metadata.
        """
        base_level = self.SEVERITY_MAPPING.get(category.lower(), "medium")
        is_center_lane = lane_position.lower() == "center lane"

        # Escalate risk if obstacle is close and directly in driving corridor
        if distance_meters <= 12.0 and is_center_lane:
            level = "critical"
        elif distance_meters <= 20.0 and (is_center_lane or base_level in ["high", "critical"]):
            level = "high"
        elif distance_meters <= 28.0:
            level = "medium" if base_level != "critical" else "high"
        else:
            level = "low"

        info = self.ALERT_LEVELS[level]
        
        # Build category display name
        category_clean = category.replace("_", " ").title()

        return {
            "level": level,
            "title": info["title"],
            "voice_message": info["voice_message"],
            "color": info["color"],
            "badge_bg": info["badge_bg"],
            "priority": info["priority"],
            "category": category,
            "category_display": category_clean,
            "distance_meters": distance_meters,
            "lane_position": lane_position,
            "is_center_lane": is_center_lane,
            "confidence": confidence
        }

    def select_primary_warning(
        self,
        active_tracked_obstacles: List[TrackedObstacle],
        alert_distance_threshold: float = 30.0,
        min_confidence: float = 0.35
    ) -> Optional[Dict[str, Any]]:
        """
        Select highest-priority active hazard ahead of vehicle within alert distance.
        """
        candidates = []

        for obstacle in active_tracked_obstacles:
            if obstacle.passed or obstacle.confidence < min_confidence:
                continue
            if obstacle.current_distance > alert_distance_threshold:
                continue

            eval_res = self.evaluate_hazard(
                category=obstacle.category,
                distance_meters=obstacle.current_distance,
                lane_position=obstacle.lane,
                confidence=obstacle.confidence
            )
            eval_res["track_id"] = obstacle.track_id
            eval_res["bbox"] = obstacle.bbox
            eval_res["alert_triggered"] = obstacle.alert_triggered
            candidates.append(eval_res)

        if not candidates:
            return None

        # Sort candidates by Priority (desc) then Distance (asc)
        candidates.sort(key=lambda x: (-x["priority"], x["distance_meters"]))
        primary = candidates[0]

        # Check if voice alert should play (only ONCE per tracked obstacle)
        should_speak = False
        for obstacle in active_tracked_obstacles:
            if obstacle.track_id == primary["track_id"] and not obstacle.alert_triggered:
                obstacle.alert_triggered = True
                should_speak = True
                break

        primary["should_speak_voice"] = should_speak
        return primary


# Global Alert Evaluator Instance
alert_evaluator = AlertEvaluator()
