import os
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from app.config.config import settings
from app.database.database import init_db
from app.api.auth import router as auth_router
from app.api.videos import router as video_router
from app.api.process import router as process_router
from app.api.reports import router as report_router
from app.api.analytics import router as analytics_router
from app.api.dashboard import router as dashboard_router
from app.api.cameras import router as cameras_router
from app.api.models_api import router as models_router
from app.api.users_api import router as users_router
from app.api.logs import router as logs_router
from app.driver.routes import router as driver_router
from app.api.ws_routes import router as ws_router
from app.api.violations import router as violations_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application Lifecycle Context Manager.
    Initializes PostgreSQL tables on startup.
    """
    print("Initializing Smart Road Damage Detection Database Schema...")
    try:
        await init_db()
        print("Database schema successfully synchronized.")
    except Exception as e:
        print(f"Database initialization note: {e}. Ensure PostgreSQL is running.")
    yield
    print("Shutting down Smart Road Damage Backend Application.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
    ## Production Backend API for Smart Road Damage Detection and Analysis System

    ### Core Capabilities:
    * **JWT Authentication & RBAC**: Admin, Inspector, Viewer roles.
    * **Video Ingestion & Processing**: OpenCV frame extraction, frame skipping, CLAHE histogram equalization, Gaussian blur.
    * **YOLOv11 Detection**: Deep learning bounding box localization for Potholes, Cracks, Missing Asphalt, Broken Road.
    * **Severity Formula Engine**: Area ratio, confidence, density, and class hazard weighting into Low, Medium, High, Critical ratings.
    * **GPS Telemetry Integration**: Geotagging and route trajectory plotting.
    * **Automated Audit Reports**: PDF, Excel (.xlsx), and CSV exports.
    * **Analytics & Road Health Index**: Section quality scoring (0-100) and defect density tracking.
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS != ["*"] else [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|.*)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# Global Execution Time & Middleware Logger
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    req_path = request.url.path
    # Intercept requests for media files located in upload/processed directories
    if "/uploads/" in req_path or "/processed/" in req_path:
        filename = os.path.basename(req_path)
        upload_cand = os.path.join(settings.UPLOAD_DIR, filename)
        processed_cand = os.path.join(settings.PROCESSED_DIR, filename)
        violation_cand = os.path.join(settings.PROCESSED_DIR, "violations", filename)
        if os.path.exists(violation_cand) and os.path.isfile(violation_cand):
            return FileResponse(violation_cand)
        if os.path.exists(upload_cand) and os.path.isfile(upload_cand):
            return FileResponse(upload_cand)
        if os.path.exists(processed_cand) and os.path.isfile(processed_cand):
            return FileResponse(processed_cand)
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    return response


from sqlalchemy.exc import SQLAlchemyError, IntegrityError

# Global Database Exception Handlers
@app.exception_handler(IntegrityError)
async def integrity_exception_handler(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "status": "error",
            "error_type": "DatabaseIntegrityError",
            "message": "Database constraint violation or duplicate record.",
            "detail": str(exc.orig) if hasattr(exc, "orig") else str(exc),
            "path": request.url.path
        },
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    err_str = str(exc)
    # Catch UndefinedColumn or schema mismatch errors gracefully
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY if "undefined" in err_str.lower() or "column" in err_str.lower() else status.HTTP_400_BAD_REQUEST
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "error",
            "error_type": "DatabaseQueryError",
            "message": "A database query or schema alignment exception occurred.",
            "detail": str(exc.orig) if hasattr(exc, "orig") else str(exc),
            "path": request.url.path
        },
    )


# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "message": "An internal server error occurred.",
            "detail": str(exc),
            "path": request.url.path
        },
    )


# Mount Static Media Files (Uploads, Processed frames, Reports)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads_direct")
app.mount("/processed", StaticFiles(directory=settings.PROCESSED_DIR), name="processed_direct")
app.mount("/static/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/static/processed", StaticFiles(directory=settings.PROCESSED_DIR), name="processed")
app.mount("/static/reports", StaticFiles(directory=settings.REPORTS_DIR), name="reports")

# Include API Routers under /api/v1
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(video_router, prefix=settings.API_V1_STR)
app.include_router(video_router)  # Allow direct /videos/upload
app.include_router(process_router, prefix=settings.API_V1_STR)
app.include_router(process_router)  # Allow direct /process/run
app.include_router(report_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(cameras_router, prefix=settings.API_V1_STR)
app.include_router(models_router, prefix=settings.API_V1_STR)
app.include_router(users_router, prefix=settings.API_V1_STR)
app.include_router(logs_router, prefix=settings.API_V1_STR)
app.include_router(driver_router, prefix=settings.API_V1_STR)
app.include_router(driver_router)  # Allow direct /driver/start-camera & /driver/stop-camera
app.include_router(ws_router, prefix=settings.API_V1_STR)
app.include_router(ws_router)  # Allow direct /ws/live-detections, /ws/dashboard, /processing/status, /processing/live
app.include_router(violations_router, prefix=settings.API_V1_STR)
app.include_router(violations_router)  # Allow direct /violations


@app.get("/", tags=["Health Check"])
async def root_health_check():
    """System Health Check Endpoint."""
    return {
        "status": "online",
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timestamp": time.time(),
        "docs": "/docs"
    }
