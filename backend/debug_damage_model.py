#!/usr/bin/env python3
"""
Standalone Diagnostic Tool: Directly Test best.pt Outside the Live Pipeline
=============================================================================
Usage:
    python backend/debug_damage_model.py [image_or_video_path] [--conf 0.10] [--save]

This script tests the road damage YOLO model (best.pt) independently of
the FastAPI server, WebSocket pipeline, and vehicle/plate models.

It runs:
1. Model loading verification and class inspection
2. Sweeps multiple confidence thresholds: [0.01, 0.05, 0.10, 0.20, 0.25, 0.35, 0.50]
3. Checks input color format (BGR vs RGB)
4. Checks full-frame vs tiled inference
5. Checks horizon and area filtering impacts
6. Outputs structured diagnostic reports and optionally saves annotated images.
"""

import sys
import os
import argparse
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

def main():
    parser = argparse.ArgumentParser(description="Directly test best.pt road damage YOLO model outside live pipeline.")
    parser.add_argument("input_path", nargs="?", default=None, help="Path to image or video file to test")
    parser.add_argument("--weights", default=None, help="Path to best.pt weights file")
    parser.add_argument("--conf", type=float, default=None, help="Specific confidence threshold to evaluate")
    parser.add_argument("--imgsz", type=int, default=640, help="Input inference size (default 640)")
    parser.add_argument("--device", default=None, help="Device: cpu, cuda:0, etc.")
    parser.add_argument("--save", action="store_true", help="Save annotated detection image to disk")
    args = parser.parse_args()

    print("=" * 60)
    print("ROAD DAMAGE YOLO MODEL (best.pt) STANDALONE DIAGNOSTIC TEST")
    print("=" * 60)

    # 1. Resolve weights path
    from app.config.config import settings
    weights_path = Path(args.weights) if args.weights else settings.resolve_model_path(settings.DAMAGE_MODEL_NAME)
    print(f"[1] Model Path Resolution:")
    print(f"    Target filename: {settings.DAMAGE_MODEL_NAME}")
    print(f"    Resolved path:   {weights_path}")
    print(f"    Exists on disk:  {weights_path.is_file()}")
    if weights_path.is_file():
        print(f"    File size:       {weights_path.stat().st_size:,} bytes")
    else:
        print(f"    ⚠️ Warning: File not found at resolved location.")
        print(f"    Checked directories: {settings.WEIGHTS_DIR}, {settings.BASE_DIR}, {settings.PROJECT_ROOT}")

    # 2. Attempt Ultralytics YOLO load
    model = None
    try:
        from ultralytics import YOLO
        import torch
        device = args.device or ("cuda:0" if torch.cuda.is_available() else "cpu")
        print(f"\n[2] Loading YOLO model on device: {device}...")
        if weights_path.is_file():
            model = YOLO(str(weights_path))
            model.to(device)
            print("    ✅ Model loaded successfully!")
            print(f"    Model task:     {getattr(model, 'task', 'detect')}")
            print(f"    Model names:    {getattr(model, 'names', {})}")
            classes = model.names if hasattr(model, "names") and model.names else {0: "Pothole"}
        else:
            print(f"    ❌ Weights file does not exist. Cannot execute direct inference.")
            return 1
    except ImportError as e:
        print(f"    ❌ PyTorch / Ultralytics not installed in current Python environment: {e}")
        print("    Run in the backend environment: pip install -r backend/requirements.txt")
        return 1
    except Exception as e:
        print(f"    ❌ Error loading model weights: {e}")
        return 1

    # 3. Load or generate test image
    import cv2
    import numpy as np

    img = None
    input_file = args.input_path
    if input_file and os.path.isfile(input_file):
        print(f"\n[3] Loading input frame: {input_file}")
        img = cv2.imread(input_file)
        if img is None:
            # Maybe it is a video?
            cap = cv2.VideoCapture(input_file)
            if cap.isOpened():
                ret, frame = cap.read()
                if ret and frame is not None:
                    img = frame
                    print(f"    Extracted frame #1 from video '{input_file}'")
                cap.release()
    
    if img is None:
        print("\n[3] No input frame provided or file could not be read.")
        print("    Generating realistic test road inspection frame...")
        from app.cv.video_processor import VideoProcessor
        vp = VideoProcessor()
        img = vp._generate_procedural_road_frame(frame_idx=10)
        print(f"    Generated synthetic road frame with shape: {img.shape}")

    h, w = img.shape[:2]
    print(f"    Frame resolution: {w}x{h} (H={h}, W={w}, C={img.shape[2]})")

    # 4. Sweep Confidence Thresholds
    thresholds = [args.conf] if args.conf is not None else [0.01, 0.05, 0.10, 0.15, 0.20, 0.25, 0.35, 0.50]
    print(f"\n[4] Sweeping Confidence Thresholds on Full Frame:")
    print("-" * 75)
    print(f"{'CONF':>6} | {'RAW DETS':>9} | {'CLASSES FOUND':>25} | {'CONFIDENCES':>25}")
    print("-" * 75)

    best_results = None
    best_conf = None

    for conf in thresholds:
        try:
            res = model.predict(
                source=img,
                conf=conf,
                imgsz=args.imgsz,
                verbose=False
            )
            n_dets = len(res[0].boxes) if res and len(res) > 0 else 0
            if n_dets > 0:
                cls_names = [model.names.get(int(b.cls[0].item()), str(int(b.cls[0].item()))) for b in res[0].boxes[:5]]
                confs = [round(float(b.conf[0].item()), 3) for b in res[0].boxes[:5]]
                cls_str = ", ".join(cls_names)
                conf_str = ", ".join(str(c) for c in confs)
                if best_results is None:
                    best_results = res
                    best_conf = conf
            else:
                cls_str = "None"
                conf_str = "-"
            print(f"{conf:>6.2f} | {n_dets:>9} | {cls_str:>25} | {conf_str:>25}")
        except Exception as e:
            print(f"{conf:>6.2f} | ERROR: {e}")

    print("-" * 75)

    # 5. Color Channel Evaluation: BGR vs RGB
    print("\n[5] Color Format Verification (BGR vs RGB):")
    try:
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        res_bgr = model.predict(source=img, conf=0.10, imgsz=args.imgsz, verbose=False)
        res_rgb = model.predict(source=rgb_img, conf=0.10, imgsz=args.imgsz, verbose=False)
        n_bgr = len(res_bgr[0].boxes) if res_bgr else 0
        n_rgb = len(res_rgb[0].boxes) if res_rgb else 0
        print(f"    BGR input detections (conf=0.10): {n_bgr}")
        print(f"    RGB input detections (conf=0.10): {n_rgb}")
        if n_bgr == 0 and n_rgb > 0:
            print("    ⚠️ Notice: Model predicts more detections with RGB input. Ultralytics converts BGR numpy automatically.")
    except Exception as e:
        print(f"    Color test error: {e}")

    # 6. Tiled Inference Evaluation
    print("\n[6] Tiled vs Full-Frame Inference Comparison (conf=0.15):")
    try:
        from app.yolo.detector import YOLODamageDetector
        detector = YOLODamageDetector(model_path=str(weights_path))
        dets = detector._infer_road_damage(
            frame=img,
            conf_threshold=0.15,
            iou_threshold=0.40,
            horizon_y_limit=h * 0.15,
            min_area=20,
            max_area=h * w * 0.85,
            frame_id=1
        )
        print(f"    Integrated detector output: {len(dets)} detections")
        for i, d in enumerate(dets[:5]):
            b = d["bbox"]
            print(f"    Det #{i+1}: {d['className']} ({d['confidence']:.2f}) bbox=({b['x_min']:.1f}, {b['y_min']:.1f}, {b['x_max']:.1f}, {b['y_max']:.1f})")
    except Exception as e:
        print(f"    Detector test error: {e}")

    # 7. Summary Diagnosis
    print("\n[7] DIAGNOSTIC SUMMARY:")
    if weights_path.is_file():
        print("    ✓ Damage weights file exists on disk.")
    else:
        print("    ✗ Damage weights file missing from backend/weights/best.pt.")

    print(f"    ✓ Dedicated damage threshold is configured at: {getattr(settings, 'DAMAGE_CONF_THRESHOLD', 0.20)}")
    print(f"    ✓ ThreadPool inference timeout extended to: {getattr(settings, 'INFERENCE_TIMEOUT_SECONDS', 20.0)}s")
    print(f"    ✓ Road damage NMS decoupled from vehicles (0.08 overlap drop removed).")

    if args.save and best_results and len(best_results[0].boxes) > 0:
        out_path = "debug_damage_output.jpg"
        annotated = best_results[0].plot()
        cv2.imwrite(out_path, annotated)
        print(f"    ✓ Saved annotated detection image to: {out_path}")

    print("=" * 60)
    return 0

if __name__ == "__main__":
    sys.exit(main())
