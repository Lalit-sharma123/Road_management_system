# Smart Road Damage Detection and Traffic Monitoring System

## Project Overview

Smart Road Damage Detection and Traffic Monitoring System is an end-to-end computer vision and web-based analytical platform designed for automated road surface inspection and live traffic surveillance.

The system ingests live camera feeds, uploaded video files, and static images to perform real-time multi-model YOLO inference. It detects road surface defects (potholes, cracks, broken roads, missing asphalt), classifies vehicles, and identifies traffic compliance objects (helmets and vehicle number plates). The processed detections are visualized through a real-time web dashboard featuring live counters, trend charts, and exportable inspection reports.

---

## Features

- **Live Camera Detection**: Stream live webcam or network CCTV video feeds with real-time multi-model inference and sub-30ms overlay rendering.
- **Video Upload & Analysis**: Upload video files (MP4, AVI, MOV) for frame-by-frame analysis and detection logging.
- **Image Inspection**: Drag-and-drop single or batch image upload workspace for instant detection and coordinate extraction.
- **Multi-Model Inference Pipeline**: Concurrent execution of three distinct YOLO models in memory per frame without model reload overhead.
- **Color-Coded Visual Bounding Boxes**:
  - 🔴 **Red**: Road Damage Defects (`#FF3B30`)
  - 🔵 **Blue**: Vehicles (`#2563EB`)
  - 🟡 **Yellow**: Helmets (`#FFD60A`)
  - 🟢 **Green**: Number Plates (`#34C759`)
- **Real-time Dashboard**: Live telemetry metrics displaying total detections, road damage count, vehicle count, helmet count, number plate count, processing FPS, and latency.
- **Interactive Analytics & Charts**: Real-time distribution and time-series charts visualizing defect categories and vehicle density.
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
| **Lucide React** | Dashboard iconography |

### Backend

| Technology | Role |
| :--- | :--- |
| **FastAPI (0.111)** | Asynchronous Python web framework |
| **Python (3.12)** | Core backend runtime language |
| **Ultralytics YOLO (8.2)** | Deep learning object detection engine |
| **OpenCV (4.9)** | Video frame extraction, image decoding, and bounding box drawing |
| **PyTorch (2.3)** | Tensor computing library for deep neural network execution |
| **Uvicorn (0.30)** | ASGI web server runtime |

### Libraries

| Category | Libraries |
| :--- | :--- |
| **Data & Reports** | NumPy, Pandas, ReportLab, openpyxl |
| **Database & ORM** | SQLAlchemy, AsyncPG, Alembic |
| **Frontend Visualization** | Recharts, Leaflet, Motion |

---

## YOLO Models

The detection engine concurrently runs three trained YOLO models loaded once during server initialization:

### Model 1: `best.pt`

- **Purpose**: Road Damage Detection
- **Classes**:
  - `pothole`
  - `longitudinal_crack`
  - `transverse_crack`
  - `alligator_crack`
  - `missing_asphalt`
  - `broken_road`

---

### Model 2: `yolov8n.pt`

- **Purpose**: Vehicle Detection
- **Classes**:
  - `car`
  - `truck`
  - `bus`
  - `motorcycle`
  - `bicycle`
  - `person`

---

### Model 3: `helmet_numberplate.pt`

- **Purpose**: Helmet Detection and Number Plate Detection
- **Classes**:
  - `helmet`
  - `number_plate`

---

### Model File Location

All model weight files must be placed directly in the project root directory or inside the `backend/` directory:

```text
smart-road-damage-system/
├── best.pt
├── yolov8n.pt
└── helmet_numberplate.pt
```

**Exact Folder Paths**:
- `/best.pt` (or `/backend/best.pt`)
- `/yolov8n.pt` (or `/backend/yolov8n.pt`)
- `/helmet_numberplate.pt` (or `/backend/helmet_numberplate.pt`)

### Model Loader Implementation

All three models are initialized and managed by the `YOLODamageDetector` class located in:

```text
/backend/app/yolo/detector.py
```

The `_load_all_models()` method loads `best.pt`, `yolov8n.pt`, and `helmet_numberplate.pt` into memory at server startup to ensure zero per-frame reloading latency.

---

## Installation

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm

### Backend Setup

1. Navigate to the root directory and create a Python virtual environment:
   ```bash
   python -m venv venv
   ```

2. Activate the virtual environment:
   - **Linux / macOS**:
     ```bash
     source venv/bin/activate
     ```
   - **Windows**:
     ```cmd
     venv\Scripts\activate
     ```

3. Install required Python packages:
   ```bash
   pip install -r backend/requirements.txt
   ```

### Frontend Setup

1. Install frontend npm dependencies from the root directory:
   ```bash
   npm install
   ```

---

## Running the Project

### Starting the Backend

From the project root directory with the virtual environment activated:

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The FastAPI interactive documentation will be available at `http://localhost:8000/docs`.

### Starting the Frontend

From the root directory in a separate terminal:

```bash
npm run dev
```

The React frontend interface will be available at `http://localhost:3000`.

### Camera Stream Verification

To test live camera detection:
1. Open `http://localhost:3000` in your browser.
2. Grant browser camera permissions when prompted.
3. Switch to the **Hardware Webcam** or **CCTV Stream** tab under the Live Processing view.

---

## Project Structure

```text
smart-road-damage-system/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analytics.py        # Analytics trends & severity distribution API
│   │   │   ├── auth.py             # Auth endpoints
│   │   │   ├── cameras.py          # Real-time webcam & CCTV frame inference API
│   │   │   ├── dashboard.py        # Dashboard KPI summary aggregator API
│   │   │   ├── logs.py             # Inference activity logs API
│   │   │   ├── models_api.py       # YOLO model metadata API
│   │   │   ├── process.py          # Video pipeline processing API
│   │   │   ├── reports.py          # PDF, Excel, CSV report generation API
│   │   │   ├── users_api.py        # User management API
│   │   │   └── videos.py           # Video upload & CRUD management API
│   │   ├── config/
│   │   │   └── config.py           # Central application settings
│   │   ├── cv/
│   │   │   └── video_processor.py  # OpenCV frame drawing and bounding box overlays
│   │   ├── database/
│   │   │   └── database.py         # Database connection session manager
│   │   ├── models/
│   │   │   └── models.py           # Database entities schema
│   │   ├── schemas/
│   │   │   └── schemas.py          # Pydantic data validation models
│   │   ├── services/
│   │   │   ├── camera_manager.py   # Live camera background stream manager
│   │   │   └── report_generator.py # ReportLab PDF and Excel report builder
│   │   ├── yolo/
│   │   │   └── detector.py         # Multi-model YOLO detector engine
│   │   └── main.py                 # FastAPI application entrypoint
│   ├── Dockerfile                  # Container definition
│   ├── docker-compose.yml          # Multi-container service configuration
│   └── requirements.txt            # Backend Python dependencies
├── src/
│   ├── components/
│   │   ├── AnalyticsCharts.tsx     # Recharts defect breakdown & trend visualizers
│   │   ├── AnalyticsView.tsx       # Overall analytics tab view
│   │   ├── BackendCodeViewer.tsx   # Integrated source code viewer
│   │   ├── CameraLiveGridView.tsx  # Multi-camera live grid feed
│   │   ├── CameraManagementView.tsx# Camera management list
│   │   ├── CVPipelineView.tsx      # Computer vision workflow diagram view
│   │   ├── DashboardOverview.tsx   # Primary KPI cards dashboard
│   │   ├── DetectionTable.tsx      # Tabular list of active detections
│   │   ├── DetectionTimeline.tsx   # Chronological event timeline
│   │   ├── ExportButtons.tsx       # Report export triggers
│   │   ├── GpsMappingView.tsx      # Map view for geotagged detections
│   │   ├── LiveProcessing.tsx      # Live webcam and camera processing view
│   │   ├── ModelManagementView.tsx # Model status overview
│   │   ├── Navbar.tsx              # Application header navigation
│   │   ├── ReportsView.tsx         # Report generation workspace
│   │   ├── ResultsDashboard.tsx    # Processing result metrics summary
│   │   ├── SettingsView.tsx        # System configuration panel
│   │   ├── StatsCards.tsx          # Real-time counter cards
│   │   ├── UserManagementView.tsx  # User account management
│   │   ├── VideoComparison.tsx     # Original vs Processed video view
│   │   ├── VideoUploadAndProcessor.tsx # Video file uploader and processor
│   │   └── YOLODetectorView.tsx    # Single image upload workspace
│   ├── App.tsx                     # Main React application component
│   ├── index.css                   # Global styles and Tailwind imports
│   ├── main.tsx                    # React application entrypoint
│   └── types.ts                    # Frontend TypeScript interface definitions
├── best.pt                         # Road damage YOLO model weights
├── yolov8n.pt                      # Vehicle YOLO model weights
├── helmet_numberplate.pt           # Helmet & Number plate YOLO model weights
├── package.json                    # Node.js dependencies and scripts
├── vite.config.ts                  # Vite build configuration
└── README.md                       # Project documentation
```

---

## API Documentation

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | System health check and API version info |
| `POST` | `/api/v1/auth/login` | User login authentication |
| `POST` | `/api/v1/auth/register` | User account registration |
| `GET` | `/api/v1/auth/me` | Retrieve current authenticated user profile |
| `GET` | `/api/v1/videos` | Fetch list of uploaded inspection videos |
| `POST` | `/api/v1/videos/upload` | Upload video file (MP4, AVI, MOV) for processing |
| `GET` | `/api/v1/videos/{video_id}` | Retrieve video details and processing status |
| `DELETE` | `/api/v1/videos/{video_id}` | Delete inspection video record |
| `POST` | `/api/v1/process/run` | Execute YOLO video detection pipeline |
| `WS` | `/api/v1/process/ws/{client_id}` | WebSocket stream for live video processing progress |
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

## Real-time Detection Flow

```text
Camera (Webcam / CCTV)
       │
       ▼
Backend (FastAPI & OpenCV Frame Extractor)
       │
       ▼
YOLO Models (best.pt + yolov8n.pt + helmet_numberplate.pt)
       │
       ▼
Frontend (React Overlay Canvas & State Store)
       │
       ▼
Dashboard (Live Counters, FPS, Latency & Charts)
```

---

## Dashboard

The Dashboard components fetch data directly from the backend API endpoints:

- **Summary Cards (Total Detections, Damages, Vehicles, Helmets, Number Plates)**: Data is fetched via `GET /api/v1/dashboard/summary` or updated via live WebSocket streams (`/api/v1/cameras/ws/detect-frame`).
- **Defect Trends & Category Breakdown**: Charts rendered in `AnalyticsCharts.tsx` consume structured data from `GET /api/v1/analytics/trends` and `GET /api/v1/analytics/severity-distribution`.
- **Live Latency & FPS Monitor**: Measured in real-time on incoming WebSocket and REST responses from `/api/v1/cameras/detect-frame`.

---

## Troubleshooting

### 1. Model Weights File Not Found
- **Issue**: Log message shows weights file not found or running in heuristic mode.
- **Solution**: Ensure `best.pt`, `yolov8n.pt`, and `helmet_numberplate.pt` are saved in the project root directory (`/`) or inside `backend/`.

### 2. Camera Access Denied
- **Issue**: Webcam fails to start in browser.
- **Solution**: Check browser permissions and grant access to media devices. Ensure the site is running on `localhost` or HTTPS.

### 3. PyTorch CUDA Acceleration
- **Issue**: Low FPS during live stream inference.
- **Solution**: Verify GPU availability in PyTorch. Install PyTorch with CUDA support if an NVIDIA GPU is available:
  ```bash
  pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
  ```

### 4. Port Conflicts
- **Issue**: `Address already in use` error when starting FastAPI or Vite.
- **Solution**: Free ports 8000 (Backend) or 3000 (Frontend) or change port flags in Uvicorn / Vite scripts.

### 5. Missing Dependencies
- **Issue**: `ModuleNotFoundError` during backend execution or `Module not found` in frontend.
- **Solution**: Re-run `pip install -r backend/requirements.txt` inside the Python virtual environment and `npm install` in the root folder.

### 6. Backend Startup Failures
- **Issue**: Backend crashes on startup.
- **Solution**: Check standard console logs. Verify folder permissions for `uploads/`, `processed/`, and `reports/` directories.

---

## License

This project is licensed under the **MIT License**.
