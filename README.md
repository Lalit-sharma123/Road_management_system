# Smart Road Damage Detection and Traffic Monitoring System

<div align="center">

![System Banner](https://img.shields.io/badge/System-Smart%20Road%20Inspection%20%26%20Traffic%20AI-0284c7?style=for-the-badge&logo=shield&logoColor=white)
![Build Status](https://img.shields.io/badge/Build-Passing-10b981?style=for-the-badge&logo=githubactions&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![PyTorch](https://img.shields.io/badge/PyTorch-2.3.0-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)
![YOLOv8](https://img.shields.io/badge/YOLO-v8%20%26%20v11-00FFFF?style=for-the-badge&logo=yolo&logoColor=black)
![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)

**An enterprise-grade, end-to-end computer vision and intelligent transportation platform for automated road infrastructure inspection, real-time traffic surveillance, helmet compliance enforcement, automatic number plate recognition (ANPR), and stolen vehicle intercept alerts.**

[Features](#features) • [System Architecture](#system-architecture) • [AI Models](#ai-model-section) • [Processing Pipeline](#processing-pipeline) • [Database](#database) • [API Documentation](#api-documentation) • [Installation](#installation) • [Deployment](#deployment)

</div>

---

## Table of Contents

- [Project Overview](#project-overview)
  - [Objective](#objective)
  - [Real-World Problem](#real-world-problem)
  - [Proposed AI Solution](#proposed-ai-solution)
  - [End-to-End Workflow](#end-to-end-workflow)
  - [Technologies Used](#technologies-used)
  - [Why Multiple AI Models Are Used](#why-multiple-ai-models-are-used)
- [Features](#features)
  - [1. Real-Time Video & Stream Processing](#1-real-time-video--stream-processing)
  - [2. Multi-Camera CCTV Grid & Live Matrix](#2-multi-camera-cctv-grid--live-matrix)
  - [3. Road Damage & Surface Defect Detection](#3-road-damage--surface-defect-detection)
  - [4. Traffic Volume & Vehicle Classification](#4-traffic-volume--vehicle-classification)
  - [5. Rider & Motorcycle Detection](#5-rider--motorcycle-detection)
  - [6. Helmet Compliance & Safety Verification](#6-helmet-compliance--safety-verification)
  - [7. License Plate Localization & High-Precision Crop](#7-license-plate-localization--high-precision-crop)
  - [8. Neural OCR & Automatic ANPR Engine](#8-neural-ocr--automatic-anpr-engine)
  - [9. Automated Helmet Violation Citation & Evidence Capture](#9-automated-helmet-violation-citation--evidence-capture)
  - [10. Official E-Challan Generation & Printable Citations](#10-official-e-challan-generation--printable-citations)
  - [11. Stolen Vehicle Registry & Real-Time Intercept Alerts](#11-stolen-vehicle-registry--real-time-intercept-alerts)
  - [12. Real-Time GPS Mapping & Defect Geotagging](#12-real-time-gps-mapping--defect-geotagging)
  - [13. Driver Assistance Mode with Audio-Visual Alerts](#13-driver-assistance-mode-with-audio-visual-alerts)
  - [14. Live Violations & Enforcement Dashboard](#14-live-violations--enforcement-dashboard)
  - [15. Road Health Index & Telemetry Analytics](#15-road-health-index--telemetry-analytics)
  - [16. Inspection Reports Builder (PDF, Excel, CSV)](#16-inspection-reports-builder-pdf-excel-csv)
  - [17. User Management, RBAC & Security Audit Logs](#17-user-management-rbac--security-audit-logs)
  - [18. YOLO Model Registry & Latency Monitoring](#18-yolo-model-registry--latency-monitoring)
- [System Architecture](#system-architecture)
  - [High-Level Architecture](#high-level-architecture)
  - [Video & Frame Pipeline Architecture](#video--frame-pipeline-architecture)
  - [Violation & ANPR Subsystem](#violation--anpr-subsystem)
  - [Stolen Vehicle Alert Subsystem](#stolen-vehicle-alert-subsystem)
- [Project Structure](#project-structure)
- [AI Model Section](#ai-model-section)
  - [Road Damage Model (`best.pt`)](#1-road-damage-model-bestpt)
  - [Vehicle & Pedestrian Model (`yolov8n.pt`)](#2-vehicle--pedestrian-model-yolov8npt)
  - [Helmet Compliance Model (`helmet.pt`)](#3-helmet-compliance-model-helmetpt)
  - [License Plate Model (`numberplate.pt`)](#4-license-plate-model-numberplatept)
  - [Neural OCR & Morphological ANPR Engine](#5-neural-ocr--morphological-anpr-engine)
- [Processing Pipeline](#processing-pipeline)
- [Real-Time Logic & Optimization](#real-time-logic--optimization)
  - [WebSocket Streaming Protocol](#websocket-streaming-protocol)
  - [JPEG Encoding & Dynamic Pacing](#jpeg-encoding--dynamic-pacing)
  - [Session Isolation & Zero-Leak Memory Cleaners](#session-isolation--zero-leak-memory-cleaners)
  - [Pinhole Camera Math & Distance Estimation](#pinhole-camera-math--distance-estimation)
  - [Road Health Score Math](#road-health-score-math)
- [Database](#database)
  - [Database Schema & Entity Relationship Diagram](#database-schema--entity-relationship-diagram)
  - [Complete Table Reference](#complete-table-reference)
- [API Documentation](#api-documentation)
- [Dashboard Sections](#dashboard-sections)
- [Real-Time Analytics](#real-time-analytics)
- [Performance Optimization](#performance-optimization)
- [File Reference](#file-reference)
- [Configuration](#configuration)
- [Installation & Setup](#installation--setup)
- [Deployment](#deployment)
- [Future Improvements & Roadmap](#future-improvements--roadmap)
- [License & Acknowledgments](#license--acknowledgments)

---

## Project Overview

### Objective
The **Smart Road Damage Detection and Traffic Monitoring System** is an intelligent vision system designed to modernize road infrastructure maintenance, streamline traffic enforcement, and empower law enforcement. It delivers an autonomous, high-throughput software platform capable of detecting civil road defects, identifying safety violations, reading vehicle license plates, and intercepting flagged/stolen vehicles in real time.

### Real-World Problem
1. **Manual Road Audits**: Municipal surveys rely on slow, dangerous, and subjective manual road walkthroughs, leading to neglected potholes, delayed repairs, vehicle accidents, and ballooning civil repair budgets.
2. **Traffic Safety Non-Compliance**: Helmet compliance enforcement is typically manual, intermittent, and difficult to scale across major metropolitan highways, resulting in high two-wheeler fatality rates.
3. **Delayed Stolen Vehicle Interception**: Police checkpoints struggle to cross-reference thousands of daily passing vehicles against criminal First Information Report (FIR) registries in real time.

### Proposed AI Solution
An integrated multi-model vision pipeline that:
- Ingests raw video files, dashcam streams, mobile surveys, and live IP/CCTV camera feeds.
- Concurrently runs specialized, quantized YOLO neural networks to isolate road surface defects and classify traffic actors.
- Cascades region-of-interest (ROI) crops into dedicated safety models to detect rider helmet non-compliance.
- Localizes license plates and executes Neural Optical Character Recognition (OCR) to extract alphanumeric registration tags.
- Cross-references plates against a low-latency **Stolen Vehicle Registry** with sub-millisecond in-memory hash lookups.
- Automatically generates auditable **E-Challans** with dual evidentiary snapshots (full frame and plate crop).
- Computes mathematical **Road Health Index (RHI)** scores, severity heatmaps, and exportable civil engineering audit reports.

### End-to-End Workflow

```mermaid
graph LR
    A[Camera Feed / Video Upload] --> B[FastAPI Session Ingestion]
    B --> C[Multi-Model Inference Pipeline]
    C --> D1[Road Damage Detection]
    C --> D2[Vehicle Classification]
    D2 --> E[Rider Helmet Crop Inspection]
    E -->|No Helmet| F[Number Plate Localization]
    F --> G[Neural OCR Engine]
    G --> H[E-Challan Generator]
    G --> I[Stolen Vehicle Registry Check]
    I -->|Match| J[Instant Police Alert & Siren]
    D1 --> K[Road Health & Severity Engine]
    K --> L[Interactive Dashboard & GIS Map]
    H --> L
    J --> L
```

### Technologies Used

#### Frontend Architecture
- **React 19 & TypeScript 5.8**: Modern functional component architecture with strict type safety.
- **Vite 6.2**: Next-generation development runtime and optimized asset builder.
- **Tailwind CSS 4.1**: High-performance, low-runtime utility styling system.
- **Leaflet & React-Leaflet**: Geospatial rendering engine for GPS routes, defect pins, and heatmaps.
- **Recharts**: Responsive SVG charting library for time-series and categorical analytics.
- **Lucide React**: Clean, lightweight iconography system.

#### Backend Architecture
- **FastAPI 0.111**: Ultra-fast asynchronous ASGI framework built on Starlette and Pydantic.
- **Python 3.12**: Core runtime environment.
- **Ultralytics YOLO (v8 / v11)**: Deep learning object detection runtime.
- **PyTorch 2.3 & TorchVision**: Accelerated tensor computations with CUDA/MPS/CPU support.
- **OpenCV (cv2) 4.9**: Frame transformation, morphology, scaling, and bounding box rendering.
- **EasyOCR & Tesseract**: Dual-engine OCR pipeline with regular expression cleaning.
- **SQLAlchemy 2.0 & AsyncPG / aiosqlite**: Asynchronous ORM with connection pooling.
- **ReportLab & openpyxl**: Automated generation of enterprise PDF, Excel (`.xlsx`), and CSV reports.
- **Uvicorn 0.30**: Production-ready ASGI web server with WebSocket protocol support.

### Why Multiple AI Models Are Used
A single general-purpose object detection model trained on dozens of disparate classes suffers from feature dilution, lower mAP scores, and inflexible deployment. By decomposing the vision challenge into a **modular, multi-model ensemble**, each neural network excels at its dedicated domain:

| Model | Weight File | Domain Specialization | Optimization Benefit |
| :--- | :--- | :--- | :--- |
| **Road Damage Detector** | `best.pt` | Surface defects (potholes, alligator cracks, asphalt erosion) | High spatial sensitivity to pavement texture and road depth |
| **Vehicle Classifier** | `yolov8n.pt` | Multi-class traffic volume (car, truck, bus, motorcycle) | Ultra-lightweight backbone for fast scene grounding |
| **Safety Compliance** | `helmet.pt` | Rider head ROI classification (`helmet`, `no_helmet`) | High-resolution cropped evaluation invariant to vehicle scale |
| **Plate Localizer** | `numberplate.pt` | License plate bounding boxes | Tight aspect ratio localization optimized for angled plates |
| **OCR Engine** | EasyOCR | Alphanumeric character recognition | Neural sequence extraction with Indian/International plate syntax |

---

## Features

### 1. Real-Time Video & Stream Processing
- **Purpose**: Ingest pre-recorded inspection videos or continuous IP streams with frame-by-frame overlay.
- **Logic**: Reads frames via OpenCV, runs parallel inference, renders color-coded bounding boxes, and streams frames via WebSockets.
- **Input**: MP4, AVI, MOV, MKV files or RTSP/HLS stream URLs.
- **Output**: Annotated video stream, timestamped telemetry, and detection records.
- **Files Involved**: `backend/app/api/process.py`, `backend/app/cv/video_processor.py`, `src/components/LiveProcessing.tsx`.
- **Models Involved**: `best.pt`, `yolov8n.pt`, `helmet.pt`, `numberplate.pt`.
- **Database Usage**: Updates `videos`, `frames`, and `detections` tables.
- **API Usage**: `POST /api/v1/process/run`, `POST /api/v1/process/stop`, `WS /api/v1/process/ws/{client_id}`.
- **Frontend Page**: Video Inspection & Processing View.
- **Backend Module**: `app.cv.video_processor`.
- **Example**: Uploading an iPhone 4K road survey video parses 1800 frames at 32 FPS with live defect overlay.

### 2. Multi-Camera CCTV Grid & Live Matrix
- **Purpose**: Centralized command-center surveillance monitoring up to 16 simultaneous camera feeds.
- **Logic**: Multi-grid camera manager with independent inference loops, frame rates, and alert overlays.
- **Input**: RTSP URLs, webcam streams, or live HTTP feeds.
- **Output**: Multi-tile live video grid with real-time detection counters and health badges.
- **Files Involved**: `backend/app/api/cameras.py`, `src/components/CameraLiveGridView.tsx`, `src/components/CameraManagementView.tsx`.
- **Database Usage**: `cameras` table.
- **API Usage**: `GET /api/v1/cameras`, `POST /api/v1/cameras`, `POST /api/v1/cameras/detect-frame`.
- **Frontend Page**: Live Matrix & Camera Management.
- **Backend Module**: `app.api.cameras`.
- **Example**: A 4x4 matrix displaying feeds from NH-48 Gateway, Ring Road Flyover, and Cyber Hub with live violation badges.

### 3. Road Damage & Surface Defect Detection
- **Purpose**: Identify, localize, and classify road surface degradation.
- **Logic**: Classifies bounding boxes into 6 damage types:
  - **Pothole** (`pothole`)
  - **Longitudinal Crack** (`longitudinal_crack`)
  - **Transverse Crack** (`transverse_crack`)
  - **Alligator Crack** (`alligator_crack`)
  - **Missing Asphalt** (`missing_asphalt`)
  - **Broken Road** (`broken_road`)
- **Input**: RGB frame tensor (640x640).
- **Output**: Normalized bounding coordinates `(x1, y1, x2, y2)`, confidence score, defect class, and estimated distance.
- **Files Involved**: `backend/app/yolo/detector.py`, `src/components/ResultsDashboard.tsx`.
- **Models Involved**: `best.pt`.
- **Database Usage**: `detections` table.
- **Frontend Page**: Inspection Results & Dashboard Overview.
- **Backend Module**: `app.yolo.detector.YOLODamageDetector.detect_damage`.
- **Example**: A deep 0.8m pothole detected at 14.2 meters ahead with 94.6% confidence.

### 4. Traffic Volume & Vehicle Classification
- **Purpose**: Continuous traffic counting, flow density estimation, and actor classification.
- **Logic**: Runs general vehicle detection on classes `car`, `truck`, `bus`, `motorcycle`, `bicycle`, and `person`.
- **Input**: Full RGB frame.
- **Output**: Vehicle counts, speed estimations, and traffic density metrics.
- **Files Involved**: `backend/app/yolo/detector.py`, `src/components/StatsCards.tsx`.
- **Models Involved**: `yolov8n.pt`.
- **Database Usage**: Aggregated into `road_analytics.summary_json`.
- **Frontend Page**: Dashboard Overview & Analytics View.
- **Backend Module**: `app.yolo.detector.YOLODamageDetector.detect_vehicles`.
- **Example**: Counting 142 cars, 28 trucks, and 45 motorcycles along a 2-kilometer surveyed corridor.

### 5. Rider & Motorcycle Detection
- **Purpose**: Isolate two-wheeler riders for targeted traffic safety enforcement.
- **Logic**: Detects `motorcycle` instances and identifies rider coordinates using vertical overlap and spatial proximity.
- **Input**: Detected motorcycle bounding box within video frame.
- **Output**: Cropped upper-body region of interest (Rider ROI).
- **Files Involved**: `backend/app/services/helmet_anpr_service.py`.
- **Models Involved**: `yolov8n.pt`.
- **Backend Module**: `app.services.helmet_anpr_service.HelmetANPRService`.
- **Example**: A rider detected on a two-wheeler at frame #342 triggering helmet verification.

### 6. Helmet Compliance & Safety Verification
- **Purpose**: Verify if motorcycle operators and pillion riders are wearing safety helmets.
- **Logic**: Feeds the Rider ROI into `helmet.pt` to classify head region as `helmet` or `no_helmet`.
- **Input**: Cropped Rider Head/Upper Torso Image.
- **Output**: Boolean compliance status (`is_violating = True` if `no_helmet`).
- **Files Involved**: `backend/app/yolo/detector.py`, `backend/app/services/helmet_anpr_service.py`.
- **Models Involved**: `helmet.pt`.
- **Database Usage**: `traffic_violations` table.
- **Frontend Page**: Violations & E-Challan Inspector.
- **Backend Module**: `app.yolo.detector.YOLODamageDetector.detect_helmets`.
- **Example**: Rider detected without helmet with 96.2% confidence triggers automatic license plate pipeline.

### 7. License Plate Localization & High-Precision Crop
- **Purpose**: Localize vehicle registration plates with sub-pixel precision.
- **Logic**: Executes `numberplate.pt` over vehicle bounding box to extract the plate bounding rectangle.
- **Input**: Motorcycle or Vehicle Image Crop.
- **Output**: Plate bounding coordinates `(px1, py1, px2, py2)` and cropped plate image.
- **Files Involved**: `backend/app/yolo/detector.py`, `backend/app/services/helmet_anpr_service.py`.
- **Models Involved**: `numberplate.pt`.
- **Database Usage**: Stored in `traffic_violations.plate_crop_url`.
- **Backend Module**: `app.yolo.detector.YOLODamageDetector.detect_plates`.
- **Example**: High-resolution 240x80 crop extracted from vehicle rear.

### 8. Neural OCR & Automatic ANPR Engine
- **Purpose**: Transcribe alphanumeric registration numbers from plate crops.
- **Logic**: Applies grayscale conversion, Bilateral Filter noise reduction, Otsu adaptive thresholding, and morphological opening before passing to EasyOCR/Tesseract. Normalized via regex pattern `^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$`.
- **Input**: Preprocessed plate crop image.
- **Output**: Clean alphanumeric plate string (e.g., `HR26DQ5519`, `DL01AB1234`).
- **Files Involved**: `backend/app/services/helmet_anpr_service.py`.
- **Models Involved**: EasyOCR / Tesseract OCR.
- **Database Usage**: `traffic_violations.license_plate_number`, `stolen_vehicle_alerts.vehicle_number`.
- **Backend Module**: `app.services.helmet_anpr_service.HelmetANPRService.extract_plate_ocr`.
- **Example**: Low-contrast plate image cleaned and recognized as `HR26DQ5519` with 98.4% confidence.

### 9. Automated Helmet Violation Citation & Evidence Capture
- **Purpose**: Automatically assemble indisputable violation records.
- **Logic**: Bundles rider status, plate OCR, timestamps, GPS coordinates, and saves dual photographic evidence:
  1. Full Scene Citation Evidence Snapshot.
  2. High-Resolution License Plate Crop.
- **Input**: Processed violation frame.
- **Output**: Permanent evidence images on disk and citation database record.
- **Files Involved**: `backend/app/api/violations.py`, `src/components/ViolationsView.tsx`.
- **Database Usage**: `traffic_violations` table.
- **API Usage**: `GET /api/v1/violations`, `GET /api/v1/violations/{id}`.
- **Frontend Page**: E-Challans & Violations View.
- **Backend Module**: `app.services.helmet_anpr_service`.
- **Example**: Citation created with generated evidence saved to `/processed/violations/ech_2026_001.jpg`.

### 10. Official E-Challan Generation & Printable Citations
- **Purpose**: Produce legal, verifiable traffic violation notices.
- **Logic**: Assigns unique challan code (`ECH-2026-XXXXXX`), calculates statutory fine amount (₹1,000 / $15), sets 300-second per-plate deduplication cooldown, and generates printable/PDF formats.
- **Input**: Verified violation record.
- **Output**: Printable visual modal and downloadable official citation notice.
- **Files Involved**: `src/components/ViolationsView.tsx`, `backend/app/api/violations.py`.
- **Database Usage**: `traffic_violations.fine_status` (`ISSUED`, `PAID`, `DISPUTED`).
- **API Usage**: `POST /api/v1/violations/{id}/pay`, `PUT /api/v1/violations/{id}/status`.
- **Frontend Page**: Violations Modal & Challan Inspector.
- **Example**: Printable E-Challan with QR code, police seal, evidence images, and payment portal links.

### 11. Stolen Vehicle Registry & Real-Time Intercept Alerts
- **Purpose**: Alert law enforcement immediately when a stolen or wanted vehicle passes an ANPR camera.
- **Logic**:
  - Maintains a centralized registry of flagged plates, FIR cases, and police station records.
  - Features an **$O(1)$ in-memory hash map index** loaded during startup for zero-latency lookups during live video inference.
  - Automatically compares every OCR-transcribed plate against the registry.
  - When matched:
    1. Triggers real-time WebSocket broadcast (`stolen_alert`).
    2. Opens high-visibility **Emergency Intercept Modal** in the UI.
    3. Plays a synthesized two-tone audio siren via the Web Audio API.
    4. Dispatches desktop browser notifications.
    5. Applies a 300-second per-camera cooldown to prevent duplicate alert flooding.
- **Input**: Live OCR text string from any camera feed or video.
- **Output**: Critical intercept alert with owner info, FIR number, GPS coordinates, and photographic crops.
- **Files Involved**:
  - Backend: `backend/app/api/stolen_vehicles.py`, `backend/app/api/stolen_alerts.py`, `backend/app/services/helmet_anpr_service.py`.
  - Frontend: `src/components/StolenVehicleRegistryView.tsx`, `src/components/StolenVehicleAlertsView.tsx`, `src/components/StolenVehicleAlertModal.tsx`, `src/utils/stolenSoundAlert.ts`.
- **Database Usage**: `stolen_vehicles`, `stolen_vehicle_alerts`, `notification_logs`, `stolen_vehicle_settings`.
- **API Usage**: `GET /api/v1/stolen-vehicles`, `POST /api/v1/stolen-vehicles`, `GET /api/v1/stolen-alerts`, `POST /api/v1/stolen-alerts/resolve`, `POST /api/v1/stolen-alerts/simulate`.
- **Frontend Page**: Stolen Alerts Center (`/stolen_alerts`) & Stolen Vehicle Registry (`/stolen_registry`).
- **Example**: Stolen SUV `HR26DQ5519` (FIR-2026-HR-8821) detected on NH-48 Gateway, instantly alerting control room operators.

### 12. Real-Time GPS Mapping & Defect Geotagging
- **Purpose**: Geographically visualize inspection routes and road defect hot spots.
- **Logic**: Interpolates GPS coordinates across video timestamps, plotting color-coded interactive markers and heatmaps on Leaflet maps.
- **Input**: Synchronized GPS track points `(latitude, longitude, speed, timestamp)`.
- **Output**: Interactive map with clickable defect pins, popups showing crop snapshots, and severity filters.
- **Files Involved**: `src/components/GpsMappingView.tsx`, `backend/app/services/gps_service.py`.
- **Database Usage**: `gps_data`, `detections.latitude`, `detections.longitude`.
- **Frontend Page**: Interactive GPS Mapping View.
- **Example**: 4.8 km highway survey displaying 24 potholes color-coded by severity (Red: Critical, Orange: High, Yellow: Medium).

### 13. Driver Assistance Mode with Audio-Visual Alerts
- **Purpose**: Provide real-time heads-up forward hazard warnings for vehicle operators and survey vehicles.
- **Logic**: Uses pinhole camera distance estimation to calculate distance to potholes and cracks in the vehicle's forward trajectory. Emits voice alerts via Web Speech Synthesis (e.g., *"Warning: Deep pothole 15 meters ahead in center lane"*).
- **Input**: Front dashcam / smartphone camera stream.
- **Output**: HUD overlay with collision distance, lane guidance, and audible alerts.
- **Files Involved**: `src/components/DriverModeView.tsx`, `backend/app/driver/camera.py`.
- **Database Usage**: `driver_settings`, `driver_alert_logs`.
- **Frontend Page**: Driver Mode HUD.
- **Example**: Driver alerted to critical pothole 22 meters ahead at 45 km/h, preventing vehicle suspension damage.

### 14. Live Violations & Enforcement Dashboard
- **Purpose**: Centralized traffic enforcement and citation management interface.
- **Logic**: Filter violations by status (`ISSUED`, `PENDING`, `PAID`, `DISPUTED`), date range, vehicle type, and search by plate or challan ID.
- **Input**: Filter parameters and search queries.
- **Output**: Paginated data grid with evidence preview, payment action buttons, and status chips.
- **Files Involved**: `src/components/ViolationsView.tsx`.
- **API Usage**: `GET /api/v1/violations`, `PUT /api/v1/violations/{id}/status`.
- **Frontend Page**: E-Challans & Violations View.

### 15. Road Health Index & Telemetry Analytics
- **Purpose**: Compute holistic civil engineering pavement quality ratings.
- **Logic**: Evaluates defect density, severity weighting, and road length to calculate a 0–100 **Road Health Score**.
- **Input**: Total inspection detections and distance traveled.
- **Output**: Road Health Score (e.g., `84.2/100`), defect density per kilometer, and historical trend lines.
- **Files Involved**: `src/components/AnalyticsCharts.tsx`, `src/components/AnalyticsView.tsx`, `backend/app/services/severity_service.py`.
- **Database Usage**: `road_analytics` table.
- **API Usage**: `GET /api/v1/analytics/trends`, `GET /api/v1/analytics/severity-distribution`.
- **Frontend Page**: Road Health Analytics View.

### 16. Inspection Reports Builder (PDF, Excel, CSV)
- **Purpose**: Generate executive audit reports for municipal public works departments.
- **Logic**: Assembles inspection statistics, defect distributions, severity breakdowns, and GPS coordinates into formatted ReportLab PDFs or openpyxl Excel spreadsheets.
- **Input**: Video ID or date range filter.
- **Output**: Downloadable `.pdf`, `.xlsx`, or `.csv` files.
- **Files Involved**: `src/components/ReportsView.tsx`, `backend/app/services/report_generator.py`, `backend/app/api/reports.py`.
- **Database Usage**: `reports` table.
- **API Usage**: `POST /api/v1/reports/generate`, `GET /api/v1/reports/download/{id}`.
- **Frontend Page**: Reports & Export Center.

### 17. User Management, RBAC & Security Audit Logs
- **Purpose**: Enterprise role-based access control and security compliance tracking.
- **Logic**: Supports 5 user roles: `super_admin`, `admin`, `operator`, `inspector`, and `viewer`. Logs every administrative action with IP address and timestamp.
- **Input**: User credentials and administrative actions.
- **Output**: JWT access tokens, role-restricted navigation, and audit log tables.
- **Files Involved**: `src/components/UserManagementView.tsx`, `backend/app/api/auth.py`, `backend/app/api/users_api.py`, `backend/app/api/logs.py`.
- **Database Usage**: `users`, `audit_logs`.
- **API Usage**: `POST /api/v1/auth/login`, `GET /api/v1/users`, `GET /api/v1/logs`.
- **Frontend Page**: User Management & Audit Logs View.

### 18. YOLO Model Registry & Latency Monitoring
- **Purpose**: Monitor AI inference health, execution latencies, and active model weights.
- **Logic**: Tracks running average latency (ms), throughput (FPS), total inference counts, and confidence thresholds for all 4 models and OCR.
- **Input**: Real-time inference timestamps.
- **Output**: Live hardware monitor charts and model switching toggles.
- **Files Involved**: `src/components/YOLOModelMonitor.tsx`, `src/components/ModelManagementView.tsx`, `backend/app/api/models_api.py`.
- **Database Usage**: `ai_models` table.
- **API Usage**: `GET /api/v1/models`, `GET /api/v1/models/telemetry`.
- **Frontend Page**: Model Configuration & Telemetry Monitor.

---

## System Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph Client Layer [Frontend - React 19 / TypeScript / Vite]
        UI[Modern Dark/Light Web UI]
        Canvas[Annotation & Video Canvas]
        Leaflet[Leaflet GPS GIS Mapping]
        WS_Client[WebSocket Telemetry Client]
        SoundEngine[Web Audio Siren Synthesizer]
    end

    subgraph Gateway Layer [FastAPI ASGI Server]
        Auth[JWT / RBAC Middleware]
        Router[REST API Endpoints /api/v1]
        WS_Hub[WebSocket Broadcast Hub]
        SessionMgr[Video Session Manager]
    end

    subgraph AI Engine [Multi-Model Inference Pipeline]
        Pool[ThreadPoolExecutor Parallel Pipeline]
        M1[best.pt - Road Damage]
        M2[yolov8n.pt - Vehicle Classifier]
        M3[helmet.pt - Safety Compliance]
        M4[numberplate.pt - Plate Localizer]
        OCR[EasyOCR / Morphological ANPR]
    end

    subgraph Business Logic [Services Layer]
        ViolationSvc[Helmet & E-Challan Service]
        StolenSvc[Stolen Vehicle Registry & Cache]
        SeveritySvc[Pinhole Distance & Road Health]
        ReportSvc[PDF & Excel Generator]
        NotifySvc[Multi-Channel Notification Dispatcher]
    end

    subgraph Data Layer [PostgreSQL / SQLite Storage]
        DB[(Async SQLAlchemy Database)]
        Disk[Filesystem: /uploads & /processed]
        MemCache[(In-Memory Stolen Plate Hash Map)]
    end

    UI <--> Router
    Canvas <--> WS_Hub
    WS_Client <--> WS_Hub
    Router --> Gateway Layer
    Gateway Layer --> Business Logic
    Business Logic --> AI Engine
    AI Engine --> Business Logic
    Business Logic --> Data Layer
    StolenSvc <--> MemCache
```

### Video & Frame Pipeline Architecture

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant API as FastAPI Video Router
    participant SM as Session Manager
    participant VP as Video Processor (cv2)
    participant AI as Multi-Model YOLO Engine
    participant WS as WebSocket Manager
    participant DB as SQLAlchemy Database

    User->>API: POST /api/v1/videos/upload (video file)
    API->>SM: cancel_previous_session()
    SM->>VP: release_handles() & gc.collect()
    API->>DB: create_video_record(status="PENDING")
    API-->>User: { video_id, session_id }

    User->>API: POST /api/v1/process/run { video_id }
    API->>SM: start_session(video_id)
    loop Every Video Frame
        VP->>VP: Read Frame (cv2.VideoCapture)
        VP->>AI: Parallel Inference (best.pt + yolov8n.pt)
        AI-->>VP: Bounding Boxes (Damage + Vehicles)
        opt Motorcycle Detected
            VP->>AI: Crop Rider Head -> helmet.pt
            opt No Helmet Detected
                VP->>AI: Crop Vehicle -> numberplate.pt
                AI->>AI: Preprocess Crop -> EasyOCR
                AI-->>VP: Plate String (e.g. HR26DQ5519)
                VP->>DB: Save E-Challan & Evidence Crops
                VP->>AI: Check Stolen Vehicle Registry
                opt Stolen Match
                    VP->>WS: Broadcast Emergency Stolen Alert
                end
            end
        end
        VP->>VP: Draw Color-Coded Bounding Boxes
        VP->>WS: Send Base64 JPEG Frame + Telemetry JSON
        WS-->>User: Render Video Canvas & Live Counters
    end
    VP->>DB: Save Road Analytics & Complete Session
```

### Violation & ANPR Subsystem

```mermaid
graph TD
    A[Detected Motorcycle in Frame] --> B[Calculate Rider Head Coordinates]
    B --> C[Crop Rider ROI Image]
    C --> D{helmet.pt Inference}
    D -->|Helmet Present| E[Log Compliant Traffic Record]
    D -->|No Helmet Detected| F[Extract Vehicle Lower ROI]
    F --> G{numberplate.pt Inference}
    G -->|Plate Found| H[Crop License Plate Image]
    H --> I[OpenCV Morphological Filtering & Denoising]
    I --> J[EasyOCR Neural Transcribe]
    J --> K[Regex Pattern Normalization]
    K --> L[Save Dual Evidence: Full Frame + Plate Crop]
    L --> M[Generate E-Challan ECH-2026-XXXXXX]
    M --> N[Store in traffic_violations Table]
    N --> O[Push Real-Time Notification to Dashboard]
```

### Stolen Vehicle Alert Subsystem

```mermaid
graph TD
    A[OCR Transcribed Plate String] --> B[Normalize String: Uppercase & AlphaNumeric Strip]
    B --> C{Lookup In-Memory Hash Map Cache}
    C -->|No Match| D[Normal Traffic Flow]
    C -->|Match Found| E{Check Camera Cooldown 300s}
    E -->|Within Cooldown| F[Suppress Duplicate Dispatch]
    E -->|Cooldown Elapsed| G[Create StolenVehicleAlert Record]
    G --> H[Broadcast WebSocket Event: stolen_alert]
    G --> I[Trigger Multi-Channel Dispatch]
    I --> I1[Dashboard Emergency Modal]
    I --> I2[Web Audio Police Siren]
    I --> I3[HTML5 Browser Notification]
    I --> I4[SMS / WhatsApp Dispatch]
```

---

## Project Structure

```text
smart-road-damage-system/
├── backend/
│   ├── app/
│   │   ├── api/                     # REST API Endpoint Routers
│   │   │   ├── analytics.py         # Road health analytics & defect trends API
│   │   │   ├── auth.py              # JWT authentication & profile API
│   │   │   ├── cameras.py           # Multi-camera registry & frame inference API
│   │   │   ├── dashboard.py         # Dashboard KPI summary aggregator API
│   │   │   ├── logs.py              # System activity & audit logging API
│   │   │   ├── models_api.py        # YOLO model registry & telemetry monitor API
│   │   │   ├── process.py           # Video pipeline & SessionManager API
│   │   │   ├── reports.py           # PDF, Excel, and CSV audit report API
│   │   │   ├── stolen_alerts.py     # Stolen vehicle intercept alerts API
│   │   │   ├── stolen_vehicles.py   # Stolen vehicle registry CRUD API
│   │   │   ├── users_api.py         # User accounts & RBAC management API
│   │   │   ├── videos.py            # Video upload, metadata, and cleanup API
│   │   │   ├── violations.py        # Traffic violations & E-Challan API
│   │   │   └── ws_routes.py         # Live WebSocket telemetry routes
│   │   ├── config/
│   │   │   └── config.py            # Pydantic BaseSettings, paths & model configs
│   │   ├── cv/
│   │   │   └── video_processor.py   # OpenCV video decoding, filtering & annotation
│   │   ├── database/
│   │   │   └── database.py          # SQLAlchemy async engine & session maker
│   │   ├── driver/
│   │   │   └── camera.py            # Driver assistance forward camera module
│   │   ├── models/
│   │   │   └── models.py            # SQLAlchemy 2.0 database ORM entities
│   │   ├── schemas/
│   │   │   └── schemas.py           # Pydantic request/response validation schemas
│   │   ├── services/
│   │   │   ├── gps_service.py       # GPS trajectory & interpolation engine
│   │   │   ├── helmet_anpr_service.py # Helmet compliance, ANPR & E-Challan service
│   │   │   ├── notification_service.py# Multi-channel alert dispatcher (SMS/Email/WS)
│   │   │   ├── report_generator.py  # ReportLab PDF & openpyxl report builder
│   │   │   ├── severity_service.py  # Pinhole camera math & Road Health Index scoring
│   │   │   ├── stolen_vehicle_service.py # Stolen vehicle registry & in-memory cache
│   │   │   └── websocket_manager.py # Broadcast manager for live WebSocket clients
│   │   ├── yolo/
│   │   │   └── detector.py          # Unified Multi-Model AI pipeline engine
│   │   └── main.py                  # FastAPI application factory & startup hooks
│   ├── tests/
│   │   └── test_backend_integrity.py# Automated backend unit & integration test suite
│   ├── Dockerfile                   # Production multi-stage container build
│   ├── docker-compose.yml           # Orchestration for FastAPI + DB services
│   └── requirements.txt             # Python dependencies
├── src/
│   ├── components/                  # React UI Components
│   │   ├── AnalyticsCharts.tsx      # Recharts defect breakdown & trend visualizers
│   │   ├── AnalyticsView.tsx        # Road health & historical analytics view
│   │   ├── BackendCodeViewer.tsx    # Built-in source code viewer
│   │   ├── CameraLiveGridView.tsx   # Multi-camera 2x2/3x3/4x4 CCTV matrix
│   │   ├── CameraManagementView.tsx # CCTV camera registry and stream editor
│   │   ├── CVPipelineView.tsx       # Interactive computer vision workflow diagram
│   │   ├── DashboardOverview.tsx    # Main KPI metrics & summary cards
│   │   ├── DetectionSvgOverlay.tsx  # Interactive SVG bounding box visualizer
│   │   ├── DetectionTable.tsx       # Paginated detection records data table
│   │   ├── DetectionTimeline.tsx    # Chronological detection event stream
│   │   ├── DriverModeView.tsx       # Heads-up driver hazard assistance view
│   │   ├── ErrorBoundary.tsx        # React runtime error boundary catcher
│   │   ├── ExportButtons.tsx        # PDF/Excel/CSV quick export triggers
│   │   ├── GpsMappingView.tsx       # Interactive Leaflet GPS map with defect pins
│   │   ├── LiveProcessing.tsx       # Live video stream and webcam canvas view
│   │   ├── ModelManagementView.tsx  # YOLO model configuration & activation view
│   │   ├── ModelMetricsMonitor.tsx  # Real-time inference latency & FPS meters
│   │   ├── Navbar.tsx               # Navigation header, role switcher & active pills
│   │   ├── ReportsView.tsx          # Comprehensive PDF/XLSX report builder
│   │   ├── ResultsDashboard.tsx     # Inspection results and damage summary view
│   │   ├── SettingsView.tsx         # System configuration & threshold adjustments
│   │   ├── StatsCards.tsx           # Real-time counter widgets
│   │   ├── StolenVehicleAlertModal.tsx # Emergency stolen vehicle intercept modal
│   │   ├── StolenVehicleAlertsView.tsx # Stolen vehicle alert history & resolution view
│   │   ├── StolenVehicleRegistryView.tsx # Stolen vehicle registry CRUD manager
│   │   ├── UserManagementView.tsx   # User RBAC & audit log manager
│   │   ├── VideoComparison.tsx      # Side-by-side original vs processed comparison
│   │   ├── VideoUploadAndProcessor.tsx # Video uploader with stage tracker
│   │   ├── ViolationsView.tsx       # Traffic violations & E-Challan inspector
│   │   ├── YOLODetectorView.tsx     # Single image inference playground
│   │   └── YOLOModelMonitor.tsx     # Model throughput & latency telemetry monitor
│   ├── data/
│   │   └── mockData.ts              # Sample inspection videos & demo datasets
│   ├── services/                    # Frontend HTTP & WebSocket Service Layer
│   │   ├── apiClient.ts             # Axios HTTP client configuration & interceptors
│   │   ├── authService.ts           # Authentication & user profile client
│   │   ├── stolenVehicleService.ts  # Stolen vehicle registry & alert client
│   │   ├── systemService.ts         # System settings, logs & camera client
│   │   ├── videoService.ts          # Video upload & WebSocket streaming client
│   │   └── violationService.ts      # E-Challan & violations client service
│   ├── types/                       # Shared TypeScript Interfaces
│   │   ├── inspection.ts            # Video, detection, telemetry & user types
│   │   └── stolenVehicle.ts         # Stolen vehicle & alert data contracts
│   ├── utils/
│   │   └── stolenSoundAlert.ts      # Web Audio API siren & notification utility
│   ├── App.tsx                      # Main React application shell & tab routing
│   ├── index.css                    # Global styling & Tailwind CSS v4 setup
│   └── main.tsx                     # React DOM entrypoint
├── tests/
│   └── test_e2e_frontend_flow.ts    # Frontend workflow test suite
├── best.pt                          # Road damage YOLO model weights
├── yolov8n.pt                       # Vehicle YOLO model weights
├── helmet.pt                        # Helmet compliance YOLO model weights
├── numberplate.pt                   # License plate YOLO model weights
├── metadata.json                    # Application metadata & permissions
├── package.json                     # Frontend dependencies & scripts
├── tsconfig.json                    # TypeScript compiler configuration
├── vite.config.ts                   # Vite build configuration & proxy rules
└── README.md                        # Complete system documentation
```

---

## AI Model Section

### 1. Road Damage Model (`best.pt`)
- **Purpose**: High-precision localization and classification of asphalt degradation.
- **Architecture**: Fine-tuned YOLOv8 / YOLOv11 Convolutional Neural Network.
- **Input Size**: `640 x 640 x 3` (RGB normalized float32/float16 tensor).
- **Confidence Threshold**: `0.35` (configurable in settings).
- **Classes**:
  - `0: pothole`: Cavities and structural surface depressions.
  - `1: longitudinal_crack`: Cracks running parallel to the direction of travel.
  - `2: transverse_crack`: Cracks running perpendicular across the roadway.
  - `3: alligator_crack`: Interconnected fatigue cracking resembling reptile skin.
  - `4: missing_asphalt`: Stripped surface wearing courses exposing road base.
  - `5: broken_road`: Severe multi-fracture structural failure.
- **ROI**: Road surface pavement area (lower 65% of camera frame).
- **Bounding Box Color**: 🔴 **Red** (`#FF3B30` / `#EF4444`).

### 2. Vehicle & Pedestrian Model (`yolov8n.pt`)
- **Purpose**: General traffic actor detection, volume counting, and scene grounding.
- **Architecture**: Ultralytics YOLOv8 Nano (optimized for sub-10ms edge inference).
- **Input Size**: `640 x 640 x 3`.
- **Confidence Threshold**: `0.40`.
- **Classes**: `car`, `truck`, `bus`, `motorcycle`, `bicycle`, `person`.
- **Bounding Box Color**: 🔵 **Blue / Cyan** (`#2563EB` / `#3B82F6`).

### 3. Helmet Compliance Model (`helmet.pt`)
- **Purpose**: Safety compliance inspection on detected two-wheeler riders.
- **Architecture**: Custom YOLOv8 head-region classifier.
- **Input Size**: `320 x 320 x 3` (Cropped Rider Head ROI).
- **Confidence Threshold**: `0.50`.
- **Classes**:
  - `0: helmet`: Rider wearing compliant protective headgear.
  - `1: no_helmet`: Rider without helmet (triggers violation workflow).
- **Bounding Box Color**: 🟡 **Yellow / Gold** (`#FFD60A` / `#F59E0B`).

### 4. License Plate Model (`numberplate.pt`)
- **Purpose**: Localization of front and rear vehicle registration plates.
- **Architecture**: High-resolution specialized YOLOv8 object detector.
- **Input Size**: `640 x 640 x 3` or Vehicle Bounding Crop.
- **Confidence Threshold**: `0.45`.
- **Classes**: `0: number_plate`, `1: plate`.
- **Bounding Box Color**: 🟢 **Green** (`#34C759` / `#10B981`).

### 5. Neural OCR & Morphological ANPR Engine
- **Purpose**: Extraction of clean alphanumeric text strings from plate bounding crops.
- **Engine**: EasyOCR (PyTorch CRNN) with optional Tesseract fallback.
- **Preprocessing Pipeline**:
  1. Crop extraction with 5% padding.
  2. Grayscale conversion via `cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)`.
  3. Noise suppression via `cv2.bilateralFilter(gray, 11, 17, 17)`.
  4. Adaptive thresholding / Otsu binarization.
  5. Morphological opening with rectangular structuring element `cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))`.
- **Post-Processing**: Alphanumeric filtering and regex pattern validation against standard motor vehicle schemas (`[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}`).

---

## Processing Pipeline

The end-to-end execution flow for every incoming frame:

```mermaid
flowchart TD
    A[Camera / Video Stream] --> B[Frame Capture cv2.VideoCapture]
    B --> C[Frame Downscaling & Optimization 640x640]
    C --> D[Parallel Inference ThreadPoolExecutor]
    
    subgraph Parallel AI Inference
        D --> E1[best.pt: Road Damage]
        D --> E2[yolov8n.pt: Vehicles & Traffic]
    end
    
    E1 --> F1[Compute Pinhole Distance & Damage Area]
    E2 --> F2{Is Motorcycle Detected?}
    
    F2 -- No --> G1[Aggregate Traffic Statistics]
    F2 -- Yes --> H[Crop Rider Upper Torso ROI]
    
    H --> I[helmet.pt: Helmet vs No-Helmet]
    I --> J{Is Helmet Missing?}
    
    J -- No (Compliant) --> G1
    J -- Yes (Violation) --> K[numberplate.pt: Plate Localization]
    
    K --> L[Crop Number Plate Sub-Image]
    L --> M[Morphological Filtering & EasyOCR]
    M --> N[Regex Normalization: e.g. HR26DQ5519]
    
    N --> O1[Generate E-Challan Record]
    N --> O2[Stolen Vehicle Registry Cache Lookup]
    
    O2 --> P{Plate Flagged in Registry?}
    P -- Yes --> Q[Emergency Intercept Alert + Audio Siren + WS Broadcast]
    P -- No --> R[Standard Violation Citation Flow]
    
    F1 --> S[Road Health Score Calculator]
    O1 --> T[Persist in Database]
    Q --> T
    
    S --> U[WebSocket Manager Base64 Frame + JSON Broadcast]
    T --> U
    U --> V[Client Dashboard & Real-Time Canvas]
```

---

## Real-Time Logic & Optimization

### WebSocket Streaming Protocol
The system uses persistent WebSockets (`/api/v1/process/ws/{client_id}` and `/ws/dashboard`) to stream annotated frames and telemetry simultaneously. Frames are transmitted as Base64-encoded JPEGs alongside a structured JSON metadata payload:

```json
{
  "type": "frame_update",
  "session_id": "sess_vid01_1740000000_abc123",
  "frame_number": 482,
  "timestamp": 16.06,
  "detections_count": 4,
  "detections": [
    {
      "category": "pothole",
      "confidence": 0.94,
      "bbox": [180, 320, 240, 390],
      "distance_meters": 12.4,
      "severity": "critical"
    }
  ],
  "telemetry": {
    "fps": 31.4,
    "latency_ms": 18.2,
    "road_health_score": 88.5
  },
  "frame_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
}
```

### JPEG Encoding & Dynamic Pacing
- **Quality Factor**: Frame JPEG encoding is dynamically tuned to `quality=70` (balancing image fidelity with network bandwidth).
- **Resolution**: Stream frames are resized to a maximum width of 640px for browser rendering.
- **Dynamic Pacing**: When backend inference outpaces client consumption, the pipeline adjusts frame pacing dynamically to maintain smooth 30 FPS delivery without queuing lag.

### Session Isolation & Zero-Leak Memory Cleaners
When a user uploads a new video or terminates an existing run:
1. Active background processing threads are flagged for cooperative cancellation.
2. OpenCV `VideoCapture` and `VideoWriter` handles are explicitly closed via `.release()`.
3. PyTorch CUDA cache is freed:
   ```python
   if torch.cuda.is_available():
       torch.cuda.empty_cache()
   ```
4. Temporary video artifacts and disk caches are purged.
5. Python garbage collection (`gc.collect()`) is explicitly invoked.
6. The frontend receives a `session_reset` WebSocket event to flush its state immediately.

### Pinhole Camera Math & Distance Estimation
Road damage distance is computed using an optical pinhole camera projection model:

$$D = \frac{f \times H}{(y_{bottom} - y_{horizon}) \times \tan(\theta)}$$

Where:
- $f$: Camera focal length in pixels.
- $H$: Camera mounting height above road surface (typically $1.3\text{ m}$).
- $\theta$: Camera downward pitch angle ($\sim 15^\circ$).
- $y_{bottom}$: Bottom pixel row of the damage bounding box.
- $y_{horizon}$: Optical horizon row.

### Road Health Score Math
The overall Road Health Index (RHI) is calculated out of 100:

$$RHI = \max\left(0, 100 - \sum_{i=1}^{N} \left(w_i \times S_i \times \frac{1}{\text{Distance}_{\text{km}}}\right)\right)$$

Where:
- $w_i$: Defect category weight (Pothole = $1.0$, Broken Road = $1.2$, Alligator Crack = $0.8$, Longitudinal Crack = $0.4$).
- $S_i$: Severity multiplier (Low = $1.0$, Medium = $1.5$, High = $2.0$, Critical = $3.0$).
- $\text{Distance}_{\text{km}}$: Total surveyed inspection distance in kilometers.

---

## Database

### Database Schema & Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ videos : "uploads"
    users ||--o{ reports : "creates"
    videos ||--o{ frames : "contains"
    videos ||--o{ detections : "records"
    videos ||--o{ gps_data : "tracks"
    videos ||--o| road_analytics : "computes"
    videos ||--o{ traffic_violations : "generates"
    
    cameras ||--o{ detections : "captures"
    cameras ||--o{ traffic_violations : "observes"
    cameras ||--o{ stolen_vehicle_alerts : "triggers"
    
    frames ||--o{ detections : "contains"
    frames ||--o{ traffic_violations : "evidence_in"
    
    stolen_vehicles ||--o{ stolen_vehicle_alerts : "matches"
    stolen_vehicle_alerts ||--o{ notification_logs : "dispatches"

    users {
        string id PK
        string email UK
        string username UK
        string hashed_password
        string full_name
        enum role
        boolean is_active
        datetime created_at
    }

    videos {
        string id PK
        string title
        string filename
        string file_path
        string processed_file_path
        string thumbnail_path
        int file_size_bytes
        float duration_seconds
        int total_frames
        float fps
        string resolution
        enum status
        string uploader_id FK
        datetime created_at
    }

    detections {
        string id PK
        string video_id FK
        string camera_id FK
        string frame_id FK
        int frame_number
        float timestamp_seconds
        string category
        float confidence
        float x_min
        float y_min
        float x_max
        float y_max
        float area_pixels
        string severity
        float severity_score
        float distance_meters
        float latitude
        float longitude
        datetime created_at
    }

    traffic_violations {
        string id PK
        string challan_number UK
        string violation_type
        string license_plate_number
        float confidence
        float rider_confidence
        float fine_amount
        string fine_status
        string video_id FK
        string camera_id FK
        string evidence_image_url
        string plate_crop_url
        string rider_crop_url
        string vehicle_type
        datetime created_at
    }

    stolen_vehicles {
        string id PK
        string vehicle_number UK
        string owner_name
        string vehicle_type
        string fir_number
        string police_station
        datetime date_reported
        string reason
        string priority
        string status
        string notes
        datetime created_at
    }

    stolen_vehicle_alerts {
        string id PK
        string stolen_vehicle_id FK
        string vehicle_number
        string owner_name
        string fir_number
        string camera_id FK
        string camera_name
        string camera_location
        float latitude
        float longitude
        datetime timestamp
        string vehicle_snapshot_url
        string plate_crop_url
        string ocr_text
        float confidence
        string status
        string resolved_by
        string remarks
    }
```

### Complete Table Reference

| Table Name | Primary Key | Description & Responsibilities | Key Foreign Keys |
| :--- | :--- | :--- | :--- |
| `users` | `id` (UUID) | User authentication, password hashes, and RBAC roles | None |
| `videos` | `id` (UUID) | Uploaded inspection video metadata, status, file paths | `uploader_id -> users.id` |
| `frames` | `id` (UUID) | Extracted video frame references and damage flags | `video_id -> videos.id` |
| `detections` | `id` (UUID) | Individual localized bounding boxes, categories, confidence, distance | `video_id`, `camera_id`, `frame_id` |
| `gps_data` | `id` (UUID) | Synchronized geospatial track points (latitude, longitude, speed) | `video_id -> videos.id` |
| `road_analytics` | `id` (UUID) | Aggregated Road Health Scores (0-100), defect densities | `video_id -> videos.id` |
| `reports` | `id` (UUID) | Generated audit report records (PDF, Excel, CSV) | `created_by -> users.id` |
| `cameras` | `id` (UUID) | CCTV, RTSP, and webcam device registry | None |
| `ai_models` | `id` (UUID) | Model metadata, active states, accuracy, and mAP scores | None |
| `audit_logs` | `id` (UUID) | Administrative and security action logs with IP tracking | None |
| `driver_settings` | `id` (UUID) | HUD driver assistance warning distance and audio config | None |
| `driver_alert_logs`| `id` (UUID) | Logs of forward hazard alerts triggered during driver mode | None |
| `traffic_violations`| `id` (UUID) | Helmet safety citations, challan codes, fine statuses, crop URLs | `video_id`, `camera_id` |
| `stolen_vehicles` | `id` (UUID) | Central database of reported stolen and wanted vehicles | None |
| `stolen_vehicle_alerts`| `id` (UUID) | Real-time ANPR match intercept logs and resolution notes | `stolen_vehicle_id`, `camera_id` |
| `notification_logs` | `id` (UUID) | Multi-channel dispatch audit records (WS, Browser, SMS, Email) | `alert_id -> stolen_vehicle_alerts.id` |
| `stolen_vehicle_settings`| `id` (UUID) | Cooldowns, thresholds, and notification channel switches | None |

---

## API Documentation

All API endpoints are prefixed with `/api/v1`. Interactive Swagger/OpenAPI documentation is available at `http://localhost:8000/docs`.

### Authentication & Users
- `POST /api/v1/auth/login` - Authenticate user credentials and return JWT bearer token.
- `POST /api/v1/auth/register` - Create a new user account.
- `GET /api/v1/auth/me` - Retrieve authenticated user profile and permissions.
- `GET /api/v1/users` - List all registered user accounts (Admin only).
- `POST /api/v1/users` - Create user with specific RBAC role (Admin only).
- `DELETE /api/v1/users/{id}` - Delete user account (Super Admin only).

### Video Management & Processing
- `GET /api/v1/videos` - Retrieve list of uploaded inspection videos.
- `POST /api/v1/videos/upload` - Upload video file (`multipart/form-data`), cancels previous sessions and cleans caches.
- `GET /api/v1/videos/{video_id}` - Fetch video details, frame stats, and processing status.
- `DELETE /api/v1/videos/{video_id}` - Delete video record and associated filesystem files.
- `POST /api/v1/process/run` - Start asynchronous multi-model YOLO detection pipeline on a video.
- `POST /api/v1/process/stop` - Halt running pipeline, release video handles, and clear memory.
- `GET /api/v1/process/status` - Query current progress, FPS, and frame counters.
- `WS /api/v1/process/ws/{client_id}` - Bi-directional WebSocket stream for annotated frames and telemetry.

### Traffic Violations & E-Challans
- `GET /api/v1/violations` - Query paginated traffic violations (filters: `status`, `plate_number`, `search`).
- `GET /api/v1/violations/stats` - Summary counts of total, issued, paid, and disputed citations.
- `GET /api/v1/violations/{id}` - Retrieve specific violation record with dual evidence snapshot URLs.
- `PUT /api/v1/violations/{id}/status` - Update violation status (`ISSUED`, `PENDING`, `PAID`, `DISPUTED`).
- `POST /api/v1/violations/{id}/pay` - Record fine payment for an issued challan.
- `POST /api/v1/violations/manual` - Manually register a traffic violation (Inspector/Admin).

### Stolen Vehicle Registry & Alerts
- `GET /api/v1/stolen-vehicles` - List registered stolen vehicles (filters: `search`, `status`, `priority`, `vehicle_type`).
- `POST /api/v1/stolen-vehicles` - Add a new stolen vehicle record to registry and update in-memory lookup cache.
- `GET /api/v1/stolen-vehicles/{id}` - Fetch stolen vehicle details by ID.
- `PUT /api/v1/stolen-vehicles/{id}` - Update vehicle metadata or status (`ACTIVE`, `RECOVERED`).
- `DELETE /api/v1/stolen-vehicles/{id}` - Remove vehicle from registry.
- `GET /api/v1/stolen-alerts` - Query real-time stolen vehicle detection alerts.
- `GET /api/v1/stolen-alerts/live` - Retrieve the latest active intercept alerts.
- `GET /api/v1/stolen-alerts/stats` - Total stolen vehicles, active alerts, recovery counts, and daily trends.
- `POST /api/v1/stolen-alerts/resolve` - Update alert status (`INVESTIGATING`, `INTERCEPTED`, `RESOLVED`, `FALSE_POSITIVE`).
- `POST /api/v1/stolen-alerts/simulate` - Trigger a simulated stolen plate detection for testing.
- `GET /api/v1/stolen-alerts/export/csv` - Download CSV export of stolen alert logs.
- `GET /api/v1/stolen-vehicles/config/settings` - Fetch alert cooldown and notification settings.
- `PUT /api/v1/stolen-vehicles/config/settings` - Update alert cooldown and notification settings.

### Cameras & Live Inference
- `GET /api/v1/cameras` - Fetch registered CCTV/webcam devices.
- `POST /api/v1/cameras` - Register a new camera stream.
- `PUT /api/v1/cameras/{id}` - Update camera settings, resolution, or stream URL.
- `DELETE /api/v1/cameras/{id}` - Delete camera device.
- `POST /api/v1/cameras/detect-frame` - Single base64 image multi-model inference.
- `WS /api/v1/cameras/ws/detect-frame` - Real-time camera frame inference WebSocket stream.

### Analytics, Reports & Models
- `GET /api/v1/dashboard/summary` - Aggregate summary metrics (inspections, distance, road health, defects).
- `GET /api/v1/analytics/trends` - Time-series defect counts and severity distributions.
- `GET /api/v1/analytics/severity-distribution` - Defect severity percentage breakdown.
- `POST /api/v1/reports/generate` - Generate audit report (`PDF`, `XLSX`, `CSV`).
- `GET /api/v1/reports/download/{id}` - Download generated report file.
- `GET /api/v1/models` - List loaded YOLO models and runtime statuses.
- `GET /api/v1/models/telemetry` - Latency history (ms), throughput (FPS), and total inference metrics.
- `GET /api/v1/logs` - Retrieve paginated security and system audit logs.

---

## Dashboard Sections

<div align="center">

| Section | Route Tab | Description |
| :--- | :--- | :--- |
| **Executive Overview** | `dashboard` | KPI counter cards, Road Health Index gauge, live defect charts, and system status |
| **Stolen Alerts Center** | `stolen_alerts` | Real-time police intercept feed, target plate details, and triage resolution controls |
| **Stolen Vehicle Registry** | `stolen_registry` | Administrative registry manager for flagged vehicles, FIR records, and search |
| **E-Challans & Violations** | `violations` | Automated helmet safety citations, dual evidentiary snapshots, and printable notices |
| **Live Matrix** | `camera_grid` | Multi-camera CCTV grid (2x2 / 3x3 / 4x4) with individual inference overlays |
| **Video Inspection** | `upload` / `live` | Video upload pipeline, frame-by-frame player, side-by-side comparison, and canvas |
| **GPS GIS Mapping** | `gps_map` | Leaflet geospatial map with color-coded defect markers, GPS route tracks, and popups |
| **Driver Mode HUD** | `driver_mode` | Heads-up driver hazard assistance view with collision distance and voice warnings |
| **Road Health Analytics** | `analytics` | Historical trends, defect density per km, and severity distribution charts |
| **Reports Builder** | `reports` | Comprehensive PDF, Excel, and CSV export configuration and download center |
| **YOLO Model Monitor** | `models` | Live latency (ms), throughput (FPS), and confidence threshold manager |
| **Camera Manager** | `cameras` | CCTV and IP camera registration, RTSP test connector, and resolution editor |
| **User & Access Control** | `users` | User accounts, role-based access control (RBAC), and security audit logs |
| **System Settings** | `settings` | Global confidence thresholds, notification channels, and backend configuration |

</div>

---

## Real-Time Analytics

The analytics engine computes real-time operational metrics across all detection streams:
- **Vehicle Flow & Volume**: Real-time traffic volume categorized by vehicle type (cars, trucks, motorcycles, buses).
- **Helmet Compliance Rate**: Percentage of two-wheeler riders wearing safety helmets across inspected corridors.
- **Defect Density per Kilometer**: Normalized metric $\frac{\text{Total Defects}}{\text{Distance (km)}}$ enabling objective road comparison.
- **Severity Heatmaps**: Geographical clustering of critical potholes and alligator cracks requiring urgent municipal intervention.
- **Violation Trends**: Daily, weekly, and monthly citations issued, paid fines, and revenue collections.
- **Stolen Intercept Success Rate**: Tracking resolution times from initial ANPR optical match to field intercept.

---

## Performance Optimization

The system implements multiple hardware and algorithmic optimizations to ensure real-time execution:

1. **Parallel Multi-Model Inference (`ThreadPoolExecutor`)**:
   Full-frame models (`best.pt` and `yolov8n.pt`) execute concurrently on worker threads, reducing total per-frame inference time from ~32ms to ~16ms.
2. **Conditional Cascade Execution**:
   `helmet.pt`, `numberplate.pt`, and the OCR engine are only evaluated when relevant parent objects (motorcycles/riders) are detected, eliminating unnecessary compute on 85%+ of frames.
3. **Half-Precision (FP16) Inference**:
   When running on NVIDIA GPUs, PyTorch executes with FP16 tensor cores, doubling throughput while reducing VRAM usage by 50%.
4. **Optimized Input Resizing**:
   Frames are normalized to $640\times 640$ with bilinear interpolation, matching YOLO native anchor grids.
5. **In-Memory Hash Index for Stolen Plates**:
   Normalized plate strings are indexed in an $O(1)$ Python dictionary/hash map, resulting in sub-millisecond lookup times during live ANPR streaming.
6. **OpenCV Video Buffer Management**:
   Decodes frames directly in BGR NumPy arrays without intermediate disk writes, minimizing I/O bottlenecks.
7. **WebSocket Frame Throttling**:
   Transmits Base64 frames at controlled intervals (25–30 FPS) with dynamic drop policies for slow clients, preventing memory leaks and browser UI freeze.
8. **Explicit Memory Deallocation**:
   Automated PyTorch cache flushing (`torch.cuda.empty_cache()`) and garbage collection (`gc.collect()`) after video session completions.

---

## File Reference

| Major File | Responsibility | Primary Component / Used By |
| :--- | :--- | :--- |
| `backend/app/main.py` | FastAPI application factory, CORS, router mounting, and startup events | Backend ASGI Entrypoint |
| `backend/app/yolo/detector.py` | Multi-model YOLO loading, parallel execution, and telemetry tracking | Video Processor & Camera APIs |
| `backend/app/cv/video_processor.py` | OpenCV video decoding, bounding box drawing, and WebSocket streaming | `backend/app/api/process.py` |
| `backend/app/services/helmet_anpr_service.py`| Helmet compliance evaluation, plate localization, OCR, and citation creation | Video Processor & Violations API |
| `backend/app/services/stolen_vehicle_service.py`| In-memory plate cache, stolen vehicle CRUD, and cooldown tracking | Video Processor & Stolen APIs |
| `backend/app/services/severity_service.py` | Pinhole camera distance estimation and Road Health Index scoring | Video Processor & Analytics API |
| `backend/app/services/websocket_manager.py` | WebSocket client connection management and broadcast dispatching | `backend/app/api/ws_routes.py` |
| `src/App.tsx` | Main React application shell, active tab router, and alert modal triggers | Frontend Application Root |
| `src/components/DashboardOverview.tsx` | Main KPI overview, live counters, defect charts, and stolen alert banner | Main Navigation View |
| `src/components/ViolationsView.tsx` | Traffic violation inspector, E-Challan viewer, and printable citation modal | Violations Navigation View |
| `src/components/StolenVehicleAlertsView.tsx` | Stolen vehicle alert history, triage controls, and CSV export | Stolen Alerts Navigation View |
| `src/components/StolenVehicleRegistryView.tsx`| Stolen vehicle database CRUD manager with modal forms | Stolen Registry Navigation View |
| `src/components/LiveProcessing.tsx` | Real-time video player canvas, bounding box overlay, and live counters | Video Inspection Navigation View |
| `src/components/GpsMappingView.tsx` | Leaflet geospatial interactive mapping with defect pins and route tracks | GPS Map Navigation View |
| `src/components/DriverModeView.tsx` | Heads-up driver hazard HUD with distance warnings and voice alerts | Driver Mode Navigation View |
| `src/services/apiClient.ts` | Centralized Axios HTTP client with auth token interceptors | All Frontend Services |
| `src/services/stolenVehicleService.ts` | Client-side stolen vehicle API and local storage persistence layer | Stolen Alerts & Registry Views |
| `src/utils/stolenSoundAlert.ts` | Web Audio API two-tone police siren synthesis and browser notifications | Global Alert Modal & App.tsx |

---

## Configuration

Configuration settings are managed through `backend/app/config/config.py` using Pydantic `BaseSettings` and environment variables:

```env
# Application Settings
PROJECT_NAME="Smart Road Damage Detection and Traffic Monitoring System"
DEBUG=True
API_V1_STR="/api/v1"
SECRET_KEY="super-secret-jwt-key-change-in-production"
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Database Configuration (PostgreSQL or SQLite)
DATABASE_URL="sqlite+aiosqlite:///./road_damage.db"
# For PostgreSQL: "postgresql+asyncpg://user:password@localhost:5432/road_damage"

# AI Model Paths
DAMAGE_MODEL_PATH="best.pt"
VEHICLE_MODEL_PATH="yolov8n.pt"
HELMET_MODEL_PATH="helmet.pt"
PLATE_MODEL_PATH="numberplate.pt"

# Inference Parameters
DEFAULT_CONFIDENCE_THRESHOLD=0.35
VEHICLE_CONFIDENCE_THRESHOLD=0.40
HELMET_CONFIDENCE_THRESHOLD=0.50
PLATE_CONFIDENCE_THRESHOLD=0.45
NUM_INFERENCE_THREADS=4
USE_CUDA=True
USE_FP16=True

# Video & Storage Paths
UPLOAD_DIR="./uploads"
PROCESSED_DIR="./processed"
MAX_UPLOAD_SIZE_MB=500

# Stolen Vehicle Alert Settings
STOLEN_ALERT_COOLDOWN_SECONDS=300
ENABLE_AUDIO_SIREN=True
ENABLE_BROWSER_NOTIFICATIONS=True
```

---

## Installation & Setup

### Prerequisites
- **Node.js**: `v18.0+` & `npm`
- **Python**: `v3.10+` (Python 3.11 or 3.12 recommended)
- **NVIDIA GPU** (Optional): CUDA 11.8+ / 12.1+ for hardware acceleration

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/smart-road-damage-system.git
cd smart-road-damage-system
```

### 2. Model Weights Setup
Ensure all 4 YOLO model weights are placed in the project root directory or in `backend/`:
```text
smart-road-damage-system/
├── best.pt
├── yolov8n.pt
├── helmet.pt
└── numberplate.pt
```

### 3. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# On Linux / macOS:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Run database migrations / initialization
# (Database tables are auto-created on application startup)
```

### 4. Frontend Setup
```bash
# Return to root directory
cd ..

# Install npm dependencies
npm install
```

### 5. Running the Application

#### Start Backend Server
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*Backend API docs will be live at `http://localhost:8000/docs`.*

#### Start Frontend Application
```bash
# In another terminal window:
npm run dev
```
*Frontend application will be accessible at `http://localhost:3000`.*

---

## Deployment

### Linux Production Deployment (systemd + Gunicorn)
Create a systemd service file `/etc/systemd/system/road-damage-backend.service`:
```ini
[Unit]
Description=Smart Road Damage FastAPI Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/var/www/smart-road-damage-system/backend
ExecStart=/var/www/smart-road-damage-system/backend/venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Build the React frontend for production:
```bash
npm run build
```
Serve the generated `dist/` directory via Nginx with reverse proxy to `http://localhost:8000/api/` and `http://localhost:8000/ws/`.

### Docker Deployment
Build and run using Docker Compose:
```bash
docker-compose up --build -d
```

### Hardware Recommendations
- **CPU**: Intel Core i7 / AMD Ryzen 7 (8+ cores)
- **RAM**: 16 GB DDR4/DDR5
- **GPU (Recommended for Real-Time 30+ FPS)**: NVIDIA RTX 3060 / 4060 / A4000 (8GB+ VRAM with CUDA support)
- **Storage**: 100 GB NVMe SSD for fast video I/O caching

---

## Future Improvements & Roadmap

- [ ] **Speed Estimation Engine**: Optical flow and homography projection to calculate vehicle velocity (km/h) for automated speeding tickets.
- [ ] **Wrong-Way Driver Detection**: Trajectory vector analysis to flag vehicles traveling opposite to designated traffic flow.
- [ ] **Red-Light Violation Detection**: Virtual stop-line bounding geometry with traffic light state tracking.
- [ ] **Triple Riding Detection**: Pillion passenger count models to identify overloaded two-wheelers.
- [ ] **Automated Accident & Collision Detection**: Sudden deceleration and trajectory intersection triggers for emergency response dispatch.
- [ ] **Emergency Vehicle Acoustic & Visual Priority**: Detection of ambulances and fire trucks to trigger green wave corridor signals.
- [ ] **Predictive Road Deterioration AI**: Time-series LSTM modeling forecasting pavement degradation rates based on traffic density and weather.
- [ ] **Multi-Camera Re-Identification (ReID)**: Deep feature embeddings to track flagged vehicles across non-overlapping camera networks.

---

## License & Acknowledgments

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### Acknowledgments
- **Ultralytics**: For the YOLOv8 and YOLOv11 deep learning object detection frameworks.
- **JaidedAI**: For the EasyOCR optical character recognition engine.
- **OpenCV Team**: For the open-source computer vision library.
- **FastAPI & Starlette**: For the high-performance asynchronous Python web framework.
- **Leaflet & OpenStreetMap**: For open-source geospatial mapping tiles and libraries.

<div align="center">

**Smart Road Damage Detection and Traffic Monitoring System** — *Empowering Safer Roads and Smarter Cities.*

</div>
