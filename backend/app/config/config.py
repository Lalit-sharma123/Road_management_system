import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directories using pathlib
# __file__ is /backend/app/config/config.py -> parent.parent.parent is /backend
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    """
    Central Application Settings using Pydantic Settings.
    Reads environment variables with fallbacks.
    """
    PROJECT_NAME: str = "Smart Road Damage Detection and Analysis System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security & Auth
    SECRET_KEY: str = "supersecretjwtkey_road_damage_detection_system_2026_change_in_prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/road_damage_db"
    
    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Base Path Objects
    BASE_DIR: Path = BACKEND_DIR
    PROJECT_ROOT: Path = ROOT_DIR
    
    # File Paths & Directories
    UPLOAD_DIR: str = str(BACKEND_DIR / "uploads")
    PROCESSED_DIR: str = str(BACKEND_DIR / "processed")
    REPORTS_DIR: str = str(BACKEND_DIR / "reports")
    WEIGHTS_DIR: str = str(BACKEND_DIR / "weights")
    
    # YOLO Model Filenames (4 Dedicated Specialized Models)
    DAMAGE_MODEL_NAME: str = "best.pt"
    VEHICLE_MODEL_NAME: str = "yolov8n.pt"
    HELMET_MODEL_NAME: str = "helmet.pt"
    NUMBERPLATE_MODEL_NAME: str = "numberplate.pt"
    HELMET_PLATE_MODEL_NAME: str = "helmet_numberplate.pt"  # backwards compatibility alias
    
    # Backwards compatibility attributes
    YOLO_MODEL_PATH: str = str(ROOT_DIR / "best.pt")
    FALLBACK_YOLO_MODEL: str = str(ROOT_DIR / "yolov8n.pt")
    
    # Performance & Inference Optimization
    USE_FP16: bool = True
    USE_CUDA_IF_AVAILABLE: bool = True
    NUM_INFERENCE_THREADS: int = 4
    CONFIDENCE_THRESHOLD: float = 0.35
    IOU_THRESHOLD: float = 0.45
    FRAME_SKIP: int = 5  # Process every 5th frame for performance
    
    # Severity Formula Weights
    WEIGHT_AREA: float = 0.40
    WEIGHT_CONFIDENCE: float = 0.20
    WEIGHT_DENSITY: float = 0.25
    WEIGHT_CLASS_SEVERITY: float = 0.15

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def resolve_model_path(self, model_filename: str) -> Path:
        """
        Centralized model path resolver using pathlib.Path.
        Ensures YOLO models are loaded from backend/weights/ regardless of working directory.
        """
        if not model_filename:
            return Path(self.WEIGHTS_DIR) / "best.pt"

        # If already an existing absolute or direct path
        direct_path = Path(model_filename)
        if direct_path.is_file():
            return direct_path.resolve()

        # Clean filename from any redundant directory prefixes
        clean_name = direct_path.name

        weights_dir_path = Path(self.WEIGHTS_DIR).resolve()
        backend_dir_path = self.BASE_DIR.resolve()
        project_root_path = self.PROJECT_ROOT.resolve()
        cwd_path = Path.cwd().resolve()

        candidates: List[Path] = [
            weights_dir_path / clean_name,
            backend_dir_path / "weights" / clean_name,
            project_root_path / "backend" / "weights" / clean_name,
            project_root_path / "weights" / clean_name,
            cwd_path / "backend" / "weights" / clean_name,
            cwd_path / "weights" / clean_name,
            backend_dir_path / clean_name,
            project_root_path / clean_name,
            cwd_path / clean_name,
        ]

        for candidate in candidates:
            if candidate.is_file():
                return candidate

        # Default fallback to primary backend/weights location
        return weights_dir_path / clean_name


    def resolve_video_path(self, video_path: Optional[str], video_id: Optional[str] = None) -> Optional[Path]:
        """
        Centralized video path resolver.
        Handles relative, absolute, cross-machine, or moved video file paths.
        Returns the resolved existing Path if found, otherwise None.
        """
        if not video_path and not video_id:
            return None

        # 1. Direct path check if provided
        if video_path:
            p = Path(video_path)
            if p.is_file():
                return p.resolve()

            clean_name = p.name
            candidates = [
                Path(self.UPLOAD_DIR).resolve() / clean_name,
                self.BASE_DIR.resolve() / "uploads" / clean_name,
                self.PROJECT_ROOT.resolve() / "backend" / "uploads" / clean_name,
                self.PROJECT_ROOT.resolve() / "uploads" / clean_name,
                Path.cwd().resolve() / "backend" / "uploads" / clean_name,
                Path.cwd().resolve() / "uploads" / clean_name,
                Path(self.PROCESSED_DIR).resolve() / clean_name,
            ]
            for candidate in candidates:
                if candidate.is_file():
                    return candidate.resolve()

        # 2. Check candidate filenames by video_id
        if video_id:
            for ext in [".mp4", ".avi", ".mov", ".mkv", ".webm"]:
                fname = f"{video_id}{ext}"
                candidates = [
                    Path(self.UPLOAD_DIR).resolve() / fname,
                    self.BASE_DIR.resolve() / "uploads" / fname,
                    self.PROJECT_ROOT.resolve() / "backend" / "uploads" / fname,
                    self.PROJECT_ROOT.resolve() / "uploads" / fname,
                    Path.cwd().resolve() / "backend" / "uploads" / fname,
                    Path.cwd().resolve() / "uploads" / fname,
                    Path(self.PROCESSED_DIR).resolve() / fname,
                    Path(self.PROCESSED_DIR).resolve() / f"processed_{fname}",
                ]
                for candidate in candidates:
                    if candidate.is_file():
                        return candidate.resolve()

        # 3. Check all existing files in UPLOAD_DIR for substring match
        for search_dir in [Path(self.UPLOAD_DIR), self.BASE_DIR / "uploads", self.PROJECT_ROOT / "backend" / "uploads", Path.cwd() / "backend" / "uploads"]:
            if search_dir.is_dir():
                try:
                    for f in search_dir.iterdir():
                        if f.is_file():
                            if video_id and video_id in f.name:
                                return f.resolve()
                            if video_path and Path(video_path).name in f.name:
                                return f.resolve()
                except Exception:
                    pass

        return None


settings = Settings()

# Ensure required local directories exist
for dir_path in [settings.UPLOAD_DIR, settings.PROCESSED_DIR, settings.REPORTS_DIR, settings.WEIGHTS_DIR]:
    Path(dir_path).mkdir(parents=True, exist_ok=True)
