# Smart Road Damage Detection and Analysis System — Backend Architecture & API Guide

A high-performance Python FastAPI backend integrated with Ultralytics YOLOv11/YOLOv8, OpenCV, PostgreSQL (asyncpg + SQLAlchemy 2.0), Celery, and WebSocket real-time event streaming for automated highway distress detection, traffic violation management, ANPR license plate recognition, and stolen vehicle interception.

---

## 🏛️ System Architecture

```
                               ┌────────────────────────────────────────┐
                               │       Frontend / PWA / Edge Feeds      │
                               └───────────────────┬────────────────────┘
                                                   │ REST / WebSockets / JWT
                                                   ▼
                               ┌────────────────────────────────────────┐
                               │         FastAPI Gateway Layer          │
                               └───────────────────┬────────────────────┘
                                                   │
        ┌───────────────────┬──────────────────────┼──────────────────────┬───────────────────┐
        ▼                   ▼                      ▼                      ▼                   ▼
┌───────────────┐   ┌───────────────┐      ┌───────────────┐      ┌───────────────┐   ┌───────────────┐
│ Auth & RBAC   │   │ CV & Video    │      │ Multi-Model AI│      │ Citizen Griev.│   │ Traffic &     │
│ (JWT, bcrypt) │   │ Pipeline      │      │ Engine        │      │ & Driver Mode │   │ Stolen Vehicle│
│ Admin/Inspect │   │ (OpenCV+CLAHE)│      │ (YOLOv11/ANPR)│      │ (Voice/Routing│   │ Intercept Svc │
└───────────────┘   └───────┬───────┘      └───────┬───────┘      └───────┬───────┘   └───────┬───────┘
                            │                      │                      │                   │
                            └──────────────────────┼──────────────────────┴───────────────────┘
                                                   ▼
                                    ┌────────────────────────────┐
                                    │ PostgreSQL / PostGIS DB    │
                                    │ (SQLAlchemy 2.0 Asyncpg)   │
                                    └────────────────────────────┘
```

---

## 🚀 Core Backend Capabilities & Features

### 1. Multi-Model AI Inference Pipeline
- **YOLOv11x Road Distress Specialist**: Localizes and classifies 6 distress classes:
  - `pothole`
  - `alligator_crack`
  - `longitudinal_crack`
  - `transverse_crack`
  - `broken_road`
  - `missing_asphalt`
- **Helmet Compliance Detector (`helmet.pt`)**: Detects two-wheeler motorcyclists and pillion riders without safety helmets at highway speeds.
- **ANPR & OCR Plate Localization (`numberplate-yolo-v26n.pt`)**: Extracts vehicle registration plates, standardizes font representations, and queries the national motor vehicle database.
- **Adaptive Frame Skip Controller**: Monitors GPU/CPU utilization and dynamically adjusts inference frame skipping to guarantee continuous real-time 30+ FPS ingestion.

### 2. Traffic Violations & Automated E-Challan Engine
- Generates official e-challans with unique citation numbers (`ECH-YYYY-XXXXXX`).
- Computes statutory fines based on traffic regulation catalogs (e.g., ₹1,000 for helmet violations).
- Embeds encrypted verification QR codes and payment gateway verification links.
- Deduplication filter prevents redundant citations for the same vehicle in a configurable time window.

### 3. Stolen Vehicle Registry & Real-Time Intercept Network
- Central hotlist registry for reported stolen vehicles with FIR registration details and owner contacts.
- Real-time cross-referencing during camera ANPR ingestion.
- Instant WebSocket event dispatch (`/ws/alerts`) triggering automated highway toll barrier interception and visual audio siren alerts.

### 4. Driver Assistance & Citizen Redressal Portal
- Voice-assisted proximity alerts via Google TTS and Web Speech synthesis.
- Citizen pothole reporting with reverse-geocoded road names and automatic administrative routing (NHAI vs. State PWD).
- Official grievance tracking system (`GRV-YYYY-XXXXX`) with resolution lifecycle audits.

### 5. GIS Geotagging & Survey Telemetry
- Supports native GeoJSON FeatureCollections and CSV coordinate schemas.
- Interactive GIS pinning and surveyor GPS coordinate extraction (`navigator.geolocation`).
- Heatmap density rendering using kernel density estimation for high-risk crash clusters.

### 6. Automated Audit & Compliance Export
- **Executive PDF Inspection Reports**: Built with ReportLab, including road health metrics, high-resolution damage crops, and official signatures.
- **Multi-Sheet Excel Workbooks**: Formatted with pandas and openpyxl with cell styling and severity breakdowns.
- **GIS GeoJSON / Shapefile / CSV**: Standard formats for civil contractor work orders.

---

## 📡 REST API Specification

### Authentication & RBAC (`/api/v1/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new user account | No |
| `POST` | `/api/v1/auth/login` | Authenticate credentials and issue JWT bearer token | No |
| `GET` | `/api/v1/auth/me` | Retrieve profile and assigned role (`admin`, `inspector`, `viewer`) | Bearer JWT |

### Video Management & Processing (`/api/v1/videos` & `/api/v1/process`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/videos/upload` | Upload MP4, AVI, MOV, or MKV inspection files |
| `GET` | `/api/v1/videos/` | List all uploaded videos with processing statuses |
| `GET` | `/api/v1/videos/{id}` | Fetch specific video metadata, telemetry, and frame detections |
| `GET` | `/api/v1/videos/{id}/dashboard` | Detailed analytics breakdown with severity charts |
| `POST` | `/api/v1/process/run` | Execute OpenCV + YOLOv11 deep learning inference pipeline |
| `POST` | `/api/v1/process/stop` | Terminate or pause an active inference pipeline worker |

### Traffic Violations & E-Challans (`/api/v1/violations`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/violations` | Query all traffic citations with plate and date filtering |
| `POST` | `/api/v1/violations/manual` | Manually issue e-challan with photographic evidence |
| `GET` | `/api/v1/violations/{id}` | Fetch violation details and printable e-challan PDF metadata |
| `PATCH`| `/api/v1/violations/{id}/status` | Update fine status (`ISSUED`, `PAID`, `DISPUTED`) |
| `GET` | `/api/v1/violations/stats/summary` | Aggregate revenue, violation counts, and compliance rates |

### Stolen Vehicle Registry & Intercept (`/api/v1/stolen-vehicles`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/stolen-vehicles` | Query stolen vehicles hotlist |
| `POST` | `/api/v1/stolen-vehicles` | Register reported stolen vehicle with FIR documentation |
| `GET` | `/api/v1/stolen-alerts` | List live interception alerts triggered by ANPR cameras |
| `POST` | `/api/v1/stolen-alerts/resolve` | Mark interception as actioned by highway police unit |

### Driver Mode & Citizen Redressal (`/api/v1/driver`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/driver/potholes` | Query geo-referenced pothole coordinates for driver HUD |
| `POST` | `/api/v1/driver/complaints` | File citizen road complaint with automated authority routing |
| `GET` | `/api/v1/driver/heatmap` | Retrieve heat clusters for driver navigation avoidance |

### WebSocket Real-Time Endpoints
| Protocol | Endpoint | Description |
| :--- | :--- | :--- |
| `WS` | `/ws/live-detections` | Real-time bounding box and detection telemetry stream |
| `WS` | `/ws/dashboard` | Live dashboard telemetry metrics and FPS counters |
| `WS` | `/ws/alerts` | Instant push notifications for stolen vehicle intercepts |

---

## 🛠️ Installation & Setup

### Option 1: Docker Compose (Recommended)
```bash
cd backend
docker-compose up --build -d
```
The FastAPI documentation will be accessible at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc UI**: `http://localhost:8000/redoc`

### Option 2: Local Python Environment
1. **Prerequisites**: Python 3.10+, PostgreSQL 14+, FFmpeg, Redis (optional for Celery).
2. **Setup virtual environment**:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. **Configure Environment Variables (`.env`)**:
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres:postgrespassword@localhost:5432/road_damage_db
   SECRET_KEY=supersecretjwtkey_road_damage_detection_system_2026
   YOLO_MODEL_PATH=weights/yolov11x-pothole.pt
   UPLOAD_DIR=./uploads
   PROCESSED_DIR=./processed
   REPORTS_DIR=./reports
   ```
4. **Launch Development Server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

---

## 🧪 Testing & Quality Assurance

The backend includes comprehensive test suites covering syntax, abstract syntax tree (AST) integrity, distance calculations, and end-to-end integration:

```bash
# 1. Run Python Backend Integrity Test Suite (16 Automated Tests)
python3 tests/test_backend_integrity.py

# 2. Run TypeScript Full-Stack E2E Integration Suite (36 Automated Tests)
npx tsx tests/e2e_integration_test.ts

# 3. Verify Python bytecode compilation across all modules
python3 -m py_compile backend/app/*.py backend/app/**/*.py
```

### Verified Test Results:
- **Backend AST & Integrity Suite**: 16/16 passed (`OK`)
- **Full-Stack E2E Integration Suite**: 36/36 passed (`OK`)
- **Python Syntax Compilation**: 0 errors
- **TypeScript Static Analysis (`tsc --noEmit`)**: 0 errors
