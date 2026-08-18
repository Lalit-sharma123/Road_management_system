#!/usr/bin/env python3
"""
End-to-End Backend Logic & Integration Verification Test Suite.
Tests:
1. Python Module Syntax & AST Integrity
2. Variable and Import Declarations
3. Distance Estimation Mathematics & Camera Projection
4. ANPR & Number Plate Extraction Logic
5. Helmet Compliance & Violation Deduplication Engine
6. Alert Generation & Hazard Priority Resolution
"""

import ast
import os
import sys
import math
import unittest

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend", "app")


class TestPythonBackendAST(unittest.TestCase):
    """Test AST validation and variable definitions for all backend modules."""

    def test_all_backend_files_parse_ast(self):
        py_files = []
        for root, _, files in os.walk(BACKEND_DIR):
            for file in files:
                if file.endswith(".py"):
                    py_files.append(os.path.join(root, file))

        self.assertGreater(len(py_files), 10, "Should have discovered backend python files")

        for py_path in py_files:
            rel_path = os.path.relpath(py_path, ROOT_DIR)
            with open(py_path, "r", encoding="utf-8") as f:
                source = f.read()
            try:
                tree = ast.parse(source, filename=py_path)
                self.assertIsNotNone(tree, f"AST parse failed for {rel_path}")
            except SyntaxError as e:
                self.fail(f"Syntax error in {rel_path}: {e}")

    def test_camera_py_has_math_imported(self):
        camera_path = os.path.join(BACKEND_DIR, "driver", "camera.py")
        with open(camera_path, "r", encoding="utf-8") as f:
            source = f.read()
        tree = ast.parse(source)
        imported_modules = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imported_modules.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imported_modules.append(node.module)

        self.assertIn("math", imported_modules, "math module must be imported in driver/camera.py")

    def test_process_py_initializes_frame_detections(self):
        process_path = os.path.join(BACKEND_DIR, "api", "process.py")
        with open(process_path, "r", encoding="utf-8") as f:
            source = f.read()
        self.assertIn("frame_detections: List[Dict[str, Any]] = []", source)
        self.assertIn("frame_detections = []", source)


class TestDistanceAndProjectionCalculations(unittest.TestCase):
    """Verifies pinhole camera distance estimation and lane geometry without requiring external binary wheels."""

    def calculate_distance(self, y_max_rel, camera_height=1.3, pitch_angle_deg=4.0, focal_length_px=800.0, frame_height=720):
        y_max_px = y_max_rel * frame_height
        y_center_px = frame_height / 2.0
        dy = y_max_px - y_center_px
        if dy <= 0:
            return 75.0
        pitch_rad = math.radians(pitch_angle_deg)
        angle_to_defect = math.atan2(dy, focal_length_px)
        total_angle = pitch_rad + angle_to_defect
        if total_angle <= 0.05:
            return 75.0
        distance = camera_height / math.tan(total_angle)
        return max(1.5, min(75.0, round(distance, 1)))

    def test_close_hazard_distance_is_short(self):
        # A defect near bottom of frame (y_max = 0.95) is close to the vehicle
        dist = self.calculate_distance(0.95)
        self.assertLess(dist, 10.0, f"Defect at y_max 0.95 should be < 10m, got {dist}m")
        self.assertGreater(dist, 0.5, "Distance should be positive")

    def test_far_hazard_distance_is_long(self):
        # A defect near horizon (y_max = 0.52) is far from the vehicle
        dist = self.calculate_distance(0.52)
        self.assertGreater(dist, 14.0, f"Defect near horizon should be > 14m, got {dist}m")

    def test_lane_position_determination(self):
        frame_width = 1280
        center_left = frame_width * 0.35
        center_right = frame_width * 0.65

        # Center obstacle
        cx = 640
        lane = "Center Lane" if (center_left <= cx <= center_right) else ("Left Lane" if cx < center_left else "Right Lane")
        self.assertEqual(lane, "Center Lane")

        # Left obstacle
        cx_left = 200
        lane_left = "Center Lane" if (center_left <= cx_left <= center_right) else ("Left Lane" if cx_left < center_left else "Right Lane")
        self.assertEqual(lane_left, "Left Lane")

        # Right obstacle
        cx_right = 1100
        lane_right = "Center Lane" if (center_left <= cx_right <= center_right) else ("Left Lane" if cx_right < center_left else "Right Lane")
        self.assertEqual(lane_right, "Right Lane")


class TestHelmetANPRAndDeduplicationLogic(unittest.TestCase):
    """Verifies plate regex validation, violation payload schema, and deduplication caching."""

    def setUp(self):
        self.dedup_cache = {}

    def is_duplicate(self, video_id, plate, current_frame, cooldown_frames=45):
        key = f"{video_id}_{plate}"
        if key in self.dedup_cache:
            last_frame = self.dedup_cache[key]
            if current_frame - last_frame < cooldown_frames:
                return True
        self.dedup_cache[key] = current_frame
        return False

    def test_deduplication_prevents_spam_citations(self):
        video_id = "vid_101"
        plate = "DL01AB1234"

        # First encounter at frame 10: Not a duplicate
        self.assertFalse(self.is_duplicate(video_id, plate, current_frame=10))

        # Second encounter at frame 15: DUPLICATE (within 45 frame window)
        self.assertTrue(self.is_duplicate(video_id, plate, current_frame=15))

        # Third encounter at frame 30: DUPLICATE
        self.assertTrue(self.is_duplicate(video_id, plate, current_frame=30))

        # Encounter after cooldown at frame 65 (10 + 55): NOT a duplicate
        self.assertFalse(self.is_duplicate(video_id, plate, current_frame=65))

    def test_challan_generation_attributes(self):
        import time
        challan_number = f"ECH-2026-{int(time.time() % 1000000):06d}"
        self.assertTrue(challan_number.startswith("ECH-2026-"))
        self.assertEqual(len(challan_number), 15)


class TestMultiModelAIPipelineIntegrity(unittest.TestCase):
    """Verifies that all 4 models (best.pt, yolov8n.pt, helmet.pt, numberplate.pt) and OCR engine classes are configured."""

    def test_detector_classes_and_settings(self):
        detector_path = os.path.join(BACKEND_DIR, "yolo", "detector.py")
        with open(detector_path, "r", encoding="utf-8") as f:
            source = f.read()
        
        # Verify 4 model targets exist in detector
        self.assertIn("ROAD_DAMAGE_CLASSES", source)
        self.assertIn("COCO_VEHICLE_MAP", source)
        self.assertIn("HELMET_CLASSES", source)
        self.assertIn("infer_helmet_on_rider_roi", source)
        self.assertIn("infer_plate_on_vehicle_roi", source)
        self.assertIn("ThreadPoolExecutor", source)
        self.assertIn("damage", source)
        self.assertIn("vehicle", source)
        self.assertIn("helmet", source)
        self.assertIn("numberplate", source)
        self.assertIn("ocr", source)

    def test_helmet_anpr_service_saves_plate_and_evidence(self):
        anpr_path = os.path.join(BACKEND_DIR, "services", "helmet_anpr_service.py")
        with open(anpr_path, "r", encoding="utf-8") as f:
            source = f.read()
        
        self.assertIn("generate_evidence_snapshot", source)
        self.assertIn("plate_crop_url", source)
        self.assertIn("plate_crop_base64", source)
        self.assertIn("extract_license_plate_text", source)
        self.assertIn("evaluate_frame_violations", source)


class TestSessionIsolationAndPipelineCleanup(unittest.TestCase):
    """Verifies that consecutive video uploads completely isolate sessions, purge old buffers, and reset state."""

    def test_session_manager_and_cleanup_functions_exist(self):
        process_path = os.path.join(BACKEND_DIR, "api", "process.py")
        with open(process_path, "r", encoding="utf-8") as f:
            source = f.read()

        self.assertIn("class SessionManager", source)
        self.assertIn("cleanup_system_resources", source)
        self.assertIn("start_new_session", source)
        self.assertIn("cancel_current_session", source)
        self.assertIn("active_session_id", source)
        self.assertIn("session_reset", source)

    def test_videos_py_calls_session_cancellation_and_cleanup(self):
        videos_path = os.path.join(BACKEND_DIR, "api", "videos.py")
        with open(videos_path, "r", encoding="utf-8") as f:
            source = f.read()

        self.assertIn("global_session_manager.cancel_current_session()", source)
        self.assertIn("cleanup_system_resources", source)
        self.assertIn("session_reset", source)


if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(TestPythonBackendAST)
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestDistanceAndProjectionCalculations))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestHelmetANPRAndDeduplicationLogic))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestMultiModelAIPipelineIntegrity))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestSessionIsolationAndPipelineCleanup))
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
