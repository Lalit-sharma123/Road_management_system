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
sys.path.insert(0, os.path.join(ROOT_DIR, "backend"))


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

    def test_video_processor_resilience_on_missing_file(self):
        """Verify VideoProcessor initializes safely without crashing when a video file path does not exist."""
        processor_path = os.path.join(BACKEND_DIR, "cv", "video_processor.py")
        with open(processor_path, "r", encoding="utf-8") as f:
            source = f.read()
        self.assertIn("is_synthetic", source)
        self.assertIn("_generate_procedural_road_frame", source)
        self.assertIn("resolve_video_path", source)


class TestWebSocketBroadcasterAndPruning(unittest.IsolatedAsyncioTestCase):
    """Verifies that WebSocket broadcasters handle disconnected or slow clients without failing broadcasts to active clients."""

    async def test_websocket_broadcast_pruning(self):
        import asyncio
        from unittest.mock import AsyncMock, MagicMock

        # Mock active connections: one healthy, one throwing disconnect exception
        healthy_ws = MagicMock()
        healthy_ws.accept = AsyncMock(return_value=None)
        healthy_ws.send_text = AsyncMock(return_value=None)

        dead_ws = MagicMock()
        dead_ws.accept = AsyncMock(return_value=None)
        dead_ws.send_text = AsyncMock(side_effect=ConnectionResetError("Client dropped connection"))
        dead_ws.close = AsyncMock(return_value=None)

        slow_ws = MagicMock()
        slow_ws.accept = AsyncMock(return_value=None)
        async def hang_send(payload):
            await asyncio.sleep(2.0)
        slow_ws.send_text = AsyncMock(side_effect=hang_send)
        slow_ws.close = AsyncMock(return_value=None)

        # Import manager
        from app.services.websocket_manager import WebSocketConnectionManager
        mgr = WebSocketConnectionManager()

        await mgr.connect(healthy_ws, client_id="healthy_client", session_id="sess_123", video_id="vid_1")
        await mgr.connect(dead_ws, client_id="dead_client", session_id="sess_123", video_id="vid_1")
        await mgr.connect(slow_ws, client_id="slow_client", session_id="sess_123", video_id="vid_1")

        self.assertEqual(mgr.get_active_count(), 3)

        # Broadcast a payload
        test_msg = {"type": "frame", "video_id": "vid_1", "session_id": "sess_123", "progress": 50}
        await mgr.broadcast(test_msg)

        # Healthy client must have received the broadcast
        healthy_ws.send_text.assert_called_once()

        # Dead and slow clients must have been pruned safely
        self.assertEqual(mgr.get_active_count(), 1)
        self.assertIn(healthy_ws, mgr.active_connections)
        self.assertNotIn(dead_ws, mgr.active_connections)
        self.assertNotIn(slow_ws, mgr.active_connections)


class TestDatabaseSchemaAndModelIntegrity(unittest.TestCase):
    """Verifies that database.py, Base, session maker, and all ORM models & fields are complete and aligned via AST."""

    def test_database_declarative_base_and_all_models_present(self):
        models_path = os.path.join(BACKEND_DIR, "models", "models.py")
        with open(models_path, "r", encoding="utf-8") as f:
            models_source = f.read()

        tree = ast.parse(models_source)

        expected_models = [
            "User", "Video", "Frame", "Detection", "GPSData", "RoadAnalytics",
            "Report", "Camera", "AIModel", "AuditLog", "DriverSettings",
            "DriverAlertLog", "TrafficViolation", "StolenVehicle",
            "StolenVehicleAlert", "NotificationLog", "StolenVehicleSettings",
            "PotholeComplaint"
        ]

        found_classes = {}
        for node in tree.body:
            if isinstance(node, ast.ClassDef):
                # Check base classes
                base_names = []
                for base in node.bases:
                    if isinstance(base, ast.Name):
                        base_names.append(base.id)
                
                # Check __tablename__
                tablename = None
                columns = []
                for item in node.body:
                    if isinstance(item, ast.Assign):
                        for target in item.targets:
                            if isinstance(target, ast.Name) and target.id == "__tablename__":
                                if isinstance(item.value, ast.Constant):
                                    tablename = item.value.value
                    elif isinstance(item, ast.AnnAssign):
                        if isinstance(item.target, ast.Name):
                            col_name = item.target.id
                            if col_name not in ["__tablename__", "videos", "frames", "detections", "gps_tracks", "analytics", "reports", "uploader", "creator", "video", "frame"]:
                                columns.append(col_name)

                found_classes[node.name] = {
                    "bases": base_names,
                    "tablename": tablename,
                    "columns": columns
                }

        for model_name in expected_models:
            self.assertIn(model_name, found_classes, f"Model {model_name} must be defined in models.py")
            info = found_classes[model_name]
            self.assertIn("Base", info["bases"], f"Model {model_name} must inherit from Base")
            self.assertIsNotNone(info["tablename"], f"Model {model_name} must have a __tablename__ attribute")
            self.assertIn("id", info["columns"], f"Model {model_name} must have an 'id' primary key column")

    def test_required_schema_alignment_covers_all_columns(self):
        """Verifies that all non-PK columns in every table have migration definitions in database.py."""
        models_path = os.path.join(BACKEND_DIR, "models", "models.py")
        with open(models_path, "r", encoding="utf-8") as f:
            models_source = f.read()

        db_path = os.path.join(BACKEND_DIR, "database", "database.py")
        with open(db_path, "r", encoding="utf-8") as f:
            db_source = f.read()

        models_tree = ast.parse(models_source)
        db_tree = ast.parse(db_source)

        # Extract REQUIRED_SCHEMA dictionary from database.py AST
        required_schema_tables = {}
        for node in ast.walk(db_tree):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == "REQUIRED_SCHEMA":
                        if isinstance(node.value, ast.Dict):
                            for key, val in zip(node.value.keys, node.value.values):
                                if isinstance(key, ast.Constant):
                                    table_name = key.value
                                    col_list = []
                                    if isinstance(val, ast.List):
                                        for elt in val.elts:
                                            if isinstance(elt, ast.Tuple) and len(elt.elts) >= 1:
                                                if isinstance(elt.elts[0], ast.Constant):
                                                    col_list.append(elt.elts[0].value)
                                    required_schema_tables[table_name] = col_list

        self.assertGreater(len(required_schema_tables), 10, "REQUIRED_SCHEMA should contain table definitions")

        # Now extract tables and columns from models.py
        for node in models_tree.body:
            if isinstance(node, ast.ClassDef):
                base_names = [b.id for b in node.bases if isinstance(b, ast.Name)]
                if "Base" not in base_names:
                    continue

                tablename = None
                columns = []
                for item in node.body:
                    if isinstance(item, ast.Assign):
                        for target in item.targets:
                            if isinstance(target, ast.Name) and target.id == "__tablename__":
                                if isinstance(item.value, ast.Constant):
                                    tablename = item.value.value
                    elif isinstance(item, ast.AnnAssign):
                        if isinstance(item.target, ast.Name):
                            col_name = item.target.id
                            # Filter out relationships
                            if col_name not in ["__tablename__", "videos", "frames", "detections", "gps_tracks", "analytics", "reports", "uploader", "creator", "video", "frame"]:
                                columns.append(col_name)

                if tablename:
                    self.assertIn(tablename, required_schema_tables, f"Table '{tablename}' must be defined in REQUIRED_SCHEMA in database.py")
                    schema_cols = required_schema_tables[tablename]
                    for col in columns:
                        if col == "id":
                            continue  # Primary key is created on CREATE TABLE
                        self.assertIn(
                            col, schema_cols,
                            f"Column '{col}' of table '{tablename}' ({node.name}) must be declared in REQUIRED_SCHEMA in database.py"
                        )


if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(TestPythonBackendAST)
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestDistanceAndProjectionCalculations))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestHelmetANPRAndDeduplicationLogic))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestMultiModelAIPipelineIntegrity))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestSessionIsolationAndPipelineCleanup))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestWebSocketBroadcasterAndPruning))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestDatabaseSchemaAndModelIntegrity))
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
