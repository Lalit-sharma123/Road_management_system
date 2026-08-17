# Smart Road Damage Detection and Analysis System — Backend Architecture

A production-grade Python FastAPI backend powered by Ultralytics YOLOv11, OpenCV, PostgreSQL, SQLAlchemy 2.0, and Celery for real-time road distress detection, severity scoring, GPS trajectory mapping, and automated audit reporting.

---

## 🏛️ System Architecture

```
                       ┌─────────────────────────┐
                       │   REST API / Web UI     │
                       └────────────┬────────────┘
                                    │ HTTP / JWT
                                    ▼
                       ┌─────────────────────────┐
                       │  FastAPI Router Layer   │
                       └────────────┬────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
   │ Auth & Security │     │ CV & Video Engine│    │ Analytics & RHI │
   │ (JWT + bcrypt)  │     │ OpenCV + CLAHE  │    │  Formula Engine │
   └─────────────────┘     └────────┬────────┘     └─────────────────┘
                                    │
                                    ▼
                           ┌─────────────────┐
                           │ YOLOv11 Detector│
                           │(Potholes/Cracks)│
                           └────────┬────────┘
                                    │
                                    ▼
                           ┌─────────────────┐
                           │ PostgreSQL DB   │
                           │ (SQLAlchemy 2)  │
                           └─────────────────┘
```

---

## 🚀 Key Features

1. **Authentication & Role-Based Access Control (RBAC)**:
   - **Admin**: Full system management, user role modification, deletion permissions.
   - **Inspector**: Video upload, computer vision processing execution, report export.
   - **Viewer**: Read-only access to inspection dashboards, maps, and reports.

2. **Computer Vision & Image Processing Pipeline**:
   - **OpenCV Engine**: Video decoding, frame skipping, image resizing.
   - **CLAHE**: Contrast Limited Adaptive Histogram Equalization for shadowed asphalt roads.
   - **Gaussian Denoising**: Smooths high-frequency asphalt gravel noise.
   - **Perspective Transformation**: Bird's-eye view projection matrix for spatial area calibration.

3. **YOLOv11 Object Detection**:
   - Classifies 6 road distress categories: `pothole`, `longitudinal_crack`, `transverse_crack`, `alligator_crack`, `missing_asphalt`, `broken_road`.
   - Generates normalized bounding box coordinates and pixel area metrics.

4. **Mathematical Severity Engine**:
   - Formula: $Score = (W_{area} \times Area) + (W_{conf} \times Confidence) + (W_{hazard} \times ClassHazard) + (W_{density} \times Cluster Density)$
   - Categorizes damage into **Low**, **Medium**, **High**, and **Critical**.
   - Derives section **Road Health Index (RHI)** on a 0–100 quality scale.

5. **GPS Telemetry Integration**:
   - Extracts NMEA / EXIF geotags or generates interpolated trajectory coordinates with speed and altitude.

6. **Automated Export Engine**:
   - Generates Executive PDF audits with ReportLab, multi-sheet Excel workbooks with pandas/openpyxl, and CSV logs.

---

## 🛠️ Quick Start with Docker Compose

1. **Clone the repository and launch stack**:
   ```bash
   docker-compose up --build -d
   ```

2. **Access Interactive API Documentation**:
   - OpenAPI Swagger UI: `http://localhost:8000/docs`
   - ReDoc Documentation: `http://localhost:8000/redoc`

---

## ⚡ Manual Local Setup (Python 3.12)

1. **Create virtual environment & install dependencies**:
   ```bash
   python3.12 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Configure environment variables in `.env`**:
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres:postgrespassword@localhost:5432/road_damage_db
   SECRET_KEY=supersecretjwtkey_road_damage_detection_system_2026
   YOLO_MODEL_PATH=weights/yolov11x-pothole.pt
   ```

3. **Start PostgreSQL database and run FastAPI dev server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

---

## 📡 REST API Endpoint Summary

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/register` | Register new user account |
| **Auth** | `POST` | `/api/v1/auth/login` | Login and receive JWT access token |
| **Auth** | `GET` | `/api/v1/auth/me` | Fetch active profile |
| **Videos** | `POST` | `/api/v1/videos/upload` | Upload MP4, AVI, MOV, MKV inspection video |
| **Videos** | `GET` | `/api/v1/videos/` | List all uploaded videos |
| **Videos** | `GET` | `/api/v1/videos/{id}` | Get detailed video metadata & status |
| **Process**| `POST` | `/api/v1/process/run` | Execute OpenCV + YOLOv11 AI detection pipeline |
| **Reports**| `POST` | `/api/v1/reports/generate`| Generate PDF, Excel, or CSV report |
| **Reports**| `GET` | `/api/v1/reports/download/{id}`| Download generated report file |
| **Dashboard**| `GET` | `/api/v1/dashboard/summary`| Fetch executive dashboard KPIs |
| **Analytics**| `GET` | `/api/v1/analytics/road-health-score`| Fetch average Road Health Index |
