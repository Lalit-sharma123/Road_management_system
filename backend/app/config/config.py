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
    
    # YOLO Model Filenames
    DAMAGE_MODEL_NAME: str = "best.pt"
    VEHICLE_MODEL_NAME: str = "yolov8n.pt"
    HELMET_PLATE_MODEL_NAME: str = "helmet_numberplate.pt"
    
    # Backwards compatibility attributes
    YOLO_MODEL_PATH: str = str(ROOT_DIR / "best.pt")
    FALLBACK_YOLO_MODEL: str = str(ROOT_DIR / "yolov8n.pt")
    
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
        Centralized model path resolver.
        Searches candidate locations in order:
        1. PROJECT_ROOT / model_filename
        2. BACKEND_DIR / model_filename
        3. WEIGHTS_DIR / model_filename
        4. Current working directory / model_filename
        Returns the first existing Path, or candidate path 1.
        """
        candidates = [
            self.PROJECT_ROOT / model_filename,
            self.BASE_DIR / model_filename,
            Path(self.WEIGHTS_DIR) / model_filename,
            Path.cwd() / model_filename,
        ]
        for candidate in candidates:
            if candidate.is_file():
                return candidate
        return candidates[0]


settings = Settings()

# Ensure required local directories exist
for dir_path in [settings.UPLOAD_DIR, settings.PROCESSED_DIR, settings.REPORTS_DIR, settings.WEIGHTS_DIR]:
    Path(dir_path).mkdir(parents=True, exist_ok=True)
