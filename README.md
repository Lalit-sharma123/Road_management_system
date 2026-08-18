# Smart Road Damage Detection and Traffic Monitoring System

## Project Overview

Smart Road Damage Detection and Traffic Monitoring System is an end-to-end computer vision and web-based analytical platform designed for automated road surface inspection, live traffic surveillance, and safety compliance enforcement.

The system ingests live camera feeds, uploaded video files, and static images to perform real-time multi-model YOLO inference. It detects road surface defects (potholes, cracks, broken roads, missing asphalt), classifies vehicles, evaluates rider helmet safety, localizes license plates, and extracts vehicle registration numbers via OCR. The processed detections are visualized through a real-time web dashboard featuring live counters, interactive Leaflet GPS mapping, automated E-Challan citation generation, and exportable inspection reports.

---

## Key Features

- **Live Camera Detection**: Stream live webcam or network CCTV video feeds with real-time multi-model inference and sub-30ms overlay rendering.
- **Robust Video Upload & Isolated Processing Pipeline**:
  - Full session isolation: uploading a new video cancels previous processing, purges old frame buffers, flushes GPU memory, releases OpenCV video handles, and resets all telemetry.
  - Unique session ID tracking ensuring zero frame bleed between consecutive uploads.
- **High-Performance Multi-Model AI Inference Pipeline**:
  - `best.pt`: Dedicated road surface damage detection.
  - `yolov8n.pt`: Traffic volume and vehicle classification.
  - `helmet.pt`: Rider helmet safety compliance verification.
  - `numberplate.pt`: High-precision vehicle license plate localization.
  - **Neural OCR Engine**: EasyOCR / OpenCV Morphological ANPR triggered specifically on license plate crops.
- **Automatic Helmet Violation & E-Challan Engine**:
  - Detects non-helmet motorcycle riders and correlates them with vehicle license plates.
  - Generates official E-Challans (`ECH-2026-XXXXXX`) with cooldown deduplication.
  - Saves dual evidence snapshots: full citation snapshot and high-resolution license plate crop.
- **Color-Coded Visual Bounding Boxes**:
  - 🔴 **Red**: Road Damage Defects (`#FF3B30`)
  - 🔵 **Blue / Cyan**: Vehicles (`#2563EB`)
  - 🟡 **Yellow / Gold**: Helmets & Safety (`#FFD60A`)
  - 🟢 **Green**: License Plates (`#34C759`)
- **Real-Time GPS Trajectory & Interactive Map**: Live vehicle tracking and geotagged damage markers with severity classification.
- **Real-Time Dashboard & Telemetry**: Live counters, road health index calculation, processing FPS, latency monitors, and time-series defect charts.
- **Audit Report Export**: Export detailed inspection records and detection analytics in PDF, Excel (`.xlsx`), and CSV formats.

---

## Tech Stack

### Frontend

| Technology | Role |
| :--- | :--- |
| **React (19.0)** | Component-based UI framework |
| **TypeScript (5.8)** | Type safety and component interface definitions |
| **Vite (6.2)** | Frontend development server and asset bundler |
| **Tailwind CSS (4.1)** | Utility-first responsive UI styling engine |
| **Leaflet (1.9)** | Interactive mapping for GPS trajectories and damage markers |
| **Recharts (2.15)** | Analytics, defect distribution, and telemetry trend charts |
| **Lucide React** | Dashboard iconography |

### Backend

| Technology | Role |
| :--- | :--- |
| **FastAPI (0.111)** | Asynchronous Python web framework |
| **Python (3.12)** | Core backend runtime language |
| **Ultralytics YOLO (8.2)** | Deep learning object detection engine |
| **EasyOCR / PyTesseract** | Neural Optical Character Recognition for ANPR |
| **OpenCV (4.9)** | Video frame extraction, image decoding, and bounding box drawing |
| **PyTorch (2.3)** | Tensor computing library for deep neural network execution |
| **SQLAlchemy (2.0) & AsyncPG** | Asynchronous ORM and PostgreSQL / SQLite database driver |
| **Uvicorn (0.30)** | ASGI web server runtime |

---

## AI Multi-Model Inference Architecture

The detection engine concurrently executes dedicated models loaded once during server initialization:

```text
                               ┌─► [best.pt] ─────────► Road Damage (Potholes, Cracks, Asphalt)
                               │
[Incoming Video / Camera Frame]─┼─► [yolov8n.pt] ──────► Vehicles & Pedestrians (Motorcycle, Car, Truck)
                               │
                               └─► [Rider ROI] ───────► [helmet.pt] ──► Safety Compliance (Helmet vs No-Helmet)
                                                               │
                                                               ▼ (If No Helmet Detected)
                                                        [numberplate.pt] ──► Plate ROI Crop
                                                               │
                                                               ▼
                                                        [OCR Engine] ────► Alphanumeric Plate Text & E-Challan
```

### Models & Strict Responsibilities

1. **`best.pt`**: Road Damage Detection
   - Classes: `pothole`, `longitudinal_crack`, `transverse_crack`, `alligator_crack`, `missing_asphalt`, `broken_road`
2. **`yolov8n.pt`**: Vehicle & Pedestrian Detection
   - Classes: `car`, `truck`, `bus`, `motorcycle`, `bicycle`, `person`
3. **`helmet.pt`**: Safety Compliance
   - Classes: `helmet`, `no_helmet`
4. **`numberplate.pt`**: Vehicle Registration Localization
   - Classes: `number_plate`, `plate`
5. **OCR Engine (EasyOCR / Morphological ANPR)**:
   - Extracted text: Standard registration codes (e.g., `DL01AB1234`, `MH12DE1432`, `HR26DQ5519`)

### Model Weight File Placement

Place model weight files directly in the project root directory or inside `backend/`:

```text
smart-road-damage-system/
├── best.pt
├── yolov8n.pt
├── helmet.pt
└── numberplate.pt
```

---

## Video Processing & Session Isolation Pipeline

To guarantee that previous frames never bleed into newly uploaded videos:

1. **Automatic Old Session Cancellation**: Uploading a new video or calling `POST /api/v1/process/stop` terminates active background tasks.
2. **Resource Release & Memory Flushing**:
   - Releases OpenCV `VideoCapture` and `VideoWriter` file handles immediately.
   - Flushes PyTorch CUDA memory (`torch.cuda.empty_cache()`).
   - Cleans old temporary videos and thumbnails from `/uploads` and `/processed`.
   - Executes Python garbage collection (`gc.collect()`).
3. **Session ID Tagging**: Every session is assigned a unique identifier (`sess_<video_id>_<timestamp>_<uuid>`).
4. **WebSocket Session Filtering**: The backend WebSocket manager and frontend client drop any messages or frames that do not match the active `session_id`.
5. **Frontend State Reset**: Receives `session_reset` broadcasts to instantly clear video canvas, overlays, GPS routes, and counters.

---

## Installation & Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm

### Backend Setup

1. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Linux / macOS
   source venv/bin/activate
   # Windows
   venv\Scripts\activate
   ```

2. Install Python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

### Frontend Setup

1. Install frontend dependencies:
   ```bash
   npm install
   ```

---

## Running the Application

### 1. Start the Backend API Server

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

FastAPI interactive OpenAPI documentation is available at `http://localhost:8000/docs`.

### 2. Start the Frontend Development Server

```bash
npm run dev
```

The web dashboard interface will be accessible at `http://localhost:3000`.

---

## Project Directory Structure

```text
smart-road-damage-system/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analytics.py        # Analytics trends & severity distribution API
│   │   │   ├── auth.py             # JWT authentication & user roles API
│   │   │   ├── cameras.py          # Real-time webcam & CCTV frame inference API
│   │   │   ├── dashboard.py        # Dashboard KPI summary aggregator API
│   │   │   ├── logs.py             # System activity & audit logging API
│   │   │   ├── models_api.py       # YOLO model registry & telemetry API
│   │   │   ├── process.py          # Video pipeline processing & SessionManager API
│   │   │   ├── reports.py          # PDF, Excel, CSV report generation API
│   │   │   ├── users_api.py        # User account management API
│   │   │   ├── videos.py           # Video upload, metadata, and cleanup API
│   │   │   ├── violations.py       # Traffic violations & E-Challan management API
│   │   │   └── ws_routes.py        # Live WebSocket telemetry routes
│   │   ├── config/
│   │   │   └── config.py           # Central application settings & paths
│   │   ├── cv/
│   │   │   └── video_processor.py  # OpenCV video decoding, filtering & annotation
│   │   ├── database/
│   │   │   └── database.py         # SQLAlchemy async engine & session maker
│   │   ├── driver/
│   │   │   └── camera.py           # Driver assistance forward camera module
│   │   ├── models/
│   │   │   └── models.py           # SQLAlchemy database ORM entities
│   │   ├── schemas/
│   │   │   └── schemas.py          # Pydantic data schemas & DTOs
│   │   ├── services/
│   │   │   ├── gps_service.py      # GPS trajectory & interpolation engine
│   │   │   ├── helmet_anpr_service.py # Helmet compliance, ANPR & E-Challan service
│   │   │   ├── report_generator.py # ReportLab PDF & openpyxl report generator
│   │   │   ├── severity_service.py # Perspective distance & Road Health Index
│   │   │   └── websocket_manager.py # Broadcast manager for live subscribers
│   │   ├── yolo/
│   │   │   └── detector.py         # Unified Multi-Model AI pipeline engine
│   │   └── main.py                 # FastAPI application factory
│   ├── Dockerfile                  # Production container specification
│   ├── docker-compose.yml          # Multi-service container orchestrator
│   └── requirements.txt            # Python dependencies
├── src/
│   ├── components/
│   │   ├── AnalyticsCharts.tsx     # Recharts defect breakdown & trend visualizers
│   │   ├── AnalyticsView.tsx       # Road health analytics view
│   │   ├── BackendCodeViewer.tsx   # Built-in source code viewer
│   │   ├── CameraLiveGridView.tsx  # Multi-camera CCTV grid
│   │   ├── CameraManagementView.tsx# CCTV camera registry
│   │   ├── CVPipelineView.tsx      # Computer vision workflow visualizer
│   │   ├── DashboardOverview.tsx   # Main KPI metrics & summary cards
│   │   ├── DetectionTable.tsx      # Paginated detection records table
│   │   ├── DetectionTimeline.tsx   # Chronological detection event stream
│   │   ├── DriverModeView.tsx      # Heads-up driver hazard assistance view
│   │   ├── ExportButtons.tsx       # PDF/Excel/CSV export action triggers
│   │   ├── GpsMappingView.tsx      # Interactive Leaflet GPS map
│   │   ├── LiveProcessing.tsx      # Live video stream and webcam detection canvas
│   │   ├── ModelManagementView.tsx # YOLO model configuration view
│   │   ├── Navbar.tsx              # System navigation bar & user switcher
│   │   ├── ReportsView.tsx         # Comprehensive PDF/XLSX report builder
│   │   ├── ResultsDashboard.tsx    # Inspection results and damage summary
│   │   ├── SettingsView.tsx        # System configuration & threshold adjustments
│   │   ├── StatsCards.tsx          # Real-time counter widgets
│   │   ├── UserManagementView.tsx  # User RBAC & audit log manager
│   │   ├── VideoComparison.tsx     # Side-by-side original vs processed comparison
│   │   ├── VideoUploadAndProcessor.tsx # Video uploader with stage tracker
│   │   ├── ViolationsView.tsx      # Traffic violations & E-Challan inspector
│   │   ├── YOLODetectorView.tsx    # Single image inference playground
│   │   └── YOLOModelMonitor.tsx    # Model latency & throughput monitor
│   ├── services/
│   │   ├── apiClient.ts            # Axios HTTP client configuration
│   │   ├── authService.ts          # Authentication service
│   │   ├── violationService.ts     # E-Challan & violations client service
│   │   └── videoService.ts         # Video upload & WebSocket service
│   ├── types/
│   │   └── inspection.ts           # Shared TypeScript type definitions
│   ├── App.tsx                     # Main React application shell
│   ├── index.css                   # Global styles & Tailwind CSS imports
│   └── main.tsx                    # React DOM entrypoint
├── tests/
│   ├── test_backend_integrity.py   # Backend unit & integration test suite
│   └── test_e2e_frontend_flow.ts   # Frontend workflow tests
├── best.pt                         # Road damage YOLO model weights
├── yolov8n.pt                      # Vehicle YOLO model weights
├── helmet.pt                       # Helmet compliance YOLO model weights
├── numberplate.pt                  # License plate YOLO model weights
├── package.json                    # Frontend dependencies & scripts
├── vite.config.ts                  # Vite build configuration
└── README.md                       # System documentation
```

---

## API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | System health check and API version info |
| `POST` | `/api/v1/auth/login` | User login authentication |
| `POST` | `/api/v1/auth/register` | User account registration |
| `GET` | `/api/v1/auth/me` | Retrieve current authenticated user profile |
| `GET` | `/api/v1/videos` | Fetch list of uploaded inspection videos |
| `POST` | `/api/v1/videos/upload` | Upload video file (MP4, AVI, MOV), cancels old sessions and cleans cache |
| `GET` | `/api/v1/videos/{video_id}` | Retrieve video details, analytics, and processing status |
| `DELETE` | `/api/v1/videos/{video_id}` | Delete inspection video record |
| `POST` | `/api/v1/process/run` | Execute YOLO multi-model video detection pipeline |
| `POST` | `/api/v1/process/stop` | Stop running video processing and release all resources |
| `GET` | `/api/v1/process/status` | Get live status and frame counters of active pipeline |
| `WS` | `/api/v1/process/ws/{client_id}` | WebSocket stream for real-time video frames and telemetry |
| `GET` | `/api/v1/violations` | List recorded helmet violations and E-Challan citations |
| `GET` | `/api/v1/violations/{id}` | Get specific violation details and evidence snapshot URLs |
| `POST` | `/api/v1/violations/{id}/pay` | Update fine payment status for a challan |
| `GET` | `/api/v1/cameras` | Fetch active CCTV/camera streams |
| `POST` | `/api/v1/cameras/detect-frame` | Real-time base64 webcam frame multi-model inference |
| `WS` | `/api/v1/cameras/ws/detect-frame` | WebSocket stream for camera frame inference |
| `GET` | `/api/v1/dashboard/summary` | Retrieve live dashboard summary KPIs and defect counts |
| `GET` | `/api/v1/analytics/trends` | Fetch detection trend analytics |
| `GET` | `/api/v1/analytics/severity-distribution` | Fetch defect severity distribution breakdown |
| `POST` | `/api/v1/reports/generate` | Generate inspection audit report (PDF, XLSX, CSV) |
| `GET` | `/api/v1/reports/download/{id}` | Download generated report file |
| `GET` | `/api/v1/models` | List active YOLO model instances and operational status |

---

## Verification & Testing

To run the automated backend integrity test suite:

```bash
python3 tests/test_backend_integrity.py
```

Tests verify:
- Python AST syntax and module imports
- Distance estimation and pinhole camera math
- Helmet compliance, license plate regex, and citation deduplication
- Multi-model pipeline telemetry and inference targets
- Video upload session isolation, cancellation, and resource cleanup

---

## License

This project is licensed under the **MIT License**.