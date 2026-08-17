import time
import math
from typing import List, Dict, Any


class TrackedObstacle:
    """Represents an active tracked road obstacle ahead of the vehicle."""

    def __init__(self, track_id: int, category: str, bbox: Dict[str, float], distance: float, lane: str, confidence: float):
        self.track_id = track_id
        self.category = category
        self.bbox = bbox
        self.current_distance = distance
        self.min_distance = distance
        self.lane = lane
        self.confidence = confidence
        self.first_seen = time.time()
        self.last_updated = time.time()
        self.alert_triggered = False  # Ensured to speak voice alert ONLY ONCE
        self.passed = False
        self.frames_tracked = 1

    def update(self, bbox: Dict[str, float], distance: float, lane: str, confidence: float):
        self.bbox = bbox
        self.current_distance = distance
        if distance < self.min_distance:
            self.min_distance = distance
        self.lane = lane
        self.confidence = max(self.confidence, confidence)
        self.last_updated = time.time()
        self.frames_tracked += 1
        
        # Mark as passed if obstacle moves under vehicle (very close or below frame)
        if distance <= 2.0 or bbox.get("y_max", 0.0) >= 0.95:
            self.passed = True


class DriverDamageTracker:
    """
    Object tracking engine for Driver Assistance Mode.
    Associates road damage detections across sequential video frames,
    prevents alert spamming, and enforces single-alert policy per obstacle.
    """

    def __init__(self, max_disappeared_seconds: float = 1.5, max_distance_threshold: float = 8.0):
        self.next_id = 1
        self.tracked_obstacles: Dict[int, TrackedObstacle] = {}
        self.max_disappeared_seconds = max_disappeared_seconds
        self.max_distance_threshold = max_distance_threshold

    def _calculate_centroid(self, bbox: Dict[str, float]) -> tuple:
        x_min = bbox.get("x_min", 0.0)
        y_min = bbox.get("y_min", 0.0)
        x_max = bbox.get("x_max", 0.0)
        y_max = bbox.get("y_max", 0.0)
        return ((x_min + x_max) / 2.0, (y_min + y_max) / 2.0)

    def update(self, raw_detections: List[Dict[str, Any]]) -> List[TrackedObstacle]:
        """
        Update tracker with new frame detections.
        Matches existing tracks using Euclidean centroid proximity.
        """
        current_time = time.time()

        # Step 1: Filter active existing tracks
        active_tracks = [t for t in self.tracked_obstacles.values() if not t.passed]

        # Step 2: Match incoming detections to active tracks
        unmatched_detections = []

        for det in raw_detections:
            bbox = det.get("bbox", det)
            dist = det.get("distance_meters", 20.0)
            lane = det.get("lane_position", "Center lane")
            category = det.get("category", "pothole")
            conf = det.get("confidence", 0.8)

            det_centroid = self._calculate_centroid(bbox)

            best_track = None
            min_dist = float("inf")

            for track in active_tracks:
                track_centroid = self._calculate_centroid(track.bbox)
                # Euclidean distance in normalized coordinate space
                dx = (det_centroid[0] - track_centroid[0]) * 10.0
                dy = (det_centroid[1] - track_centroid[1]) * 10.0
                euc_dist = math.sqrt(dx * dx + dy * dy)

                if euc_dist < min_dist and euc_dist < self.max_distance_threshold:
                    min_dist = euc_dist
                    best_track = track

            if best_track is not None:
                best_track.update(bbox, dist, lane, conf)
            else:
                unmatched_detections.append(det)

        # Step 3: Create new tracks for unmatched detections
        for det in unmatched_detections:
            bbox = det.get("bbox", det)
            dist = det.get("distance_meters", 20.0)
            lane = det.get("lane_position", "Center lane")
            category = det.get("category", "pothole")
            conf = det.get("confidence", 0.8)

            new_track = TrackedObstacle(
                track_id=self.next_id,
                category=category,
                bbox=bbox,
                distance=dist,
                lane=lane,
                confidence=conf
            )
            self.tracked_obstacles[self.next_id] = new_track
            self.next_id += 1

        # Step 4: Cleanup stale tracks
        expired_ids = []
        for tid, track in self.tracked_obstacles.items():
            if current_time - track.last_updated > self.max_disappeared_seconds or track.passed:
                expired_ids.append(tid)

        for tid in expired_ids:
            # Keep up to 100 historical IDs in memory
            if len(self.tracked_obstacles) > 100:
                del self.tracked_obstacles[tid]

        return [t for t in self.tracked_obstacles.values() if current_time - t.last_updated <= self.max_disappeared_seconds]


# Global Tracker Instance
driver_tracker = DriverDamageTracker()
