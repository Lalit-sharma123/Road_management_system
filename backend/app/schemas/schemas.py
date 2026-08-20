from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.models import UserRole, ProcessingStatus, DamageCategory, SeverityLevel, CameraType, CameraStatus


# Camera Schemas
class CameraBase(BaseModel):
    camera_name: str
    camera_type: CameraType = CameraType.CCTV
    stream_url: str
    latitude: float = 0.0
    longitude: float = 0.0
    location_name: Optional[str] = None
    description: Optional[str] = None
    fps: float = 30.0
    resolution: str = "1920x1080"


class CameraCreate(CameraBase):
    status: CameraStatus = CameraStatus.ONLINE


class CameraUpdate(BaseModel):
    camera_name: Optional[str] = None
    camera_type: Optional[CameraType] = None
    stream_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    description: Optional[str] = None
    fps: Optional[float] = None
    resolution: Optional[str] = None
    status: Optional[CameraStatus] = None
    is_active: Optional[bool] = None


class CameraStatusPatch(BaseModel):
    status: CameraStatus


class CameraStreamPatch(BaseModel):
    stream_url: str


class CameraResponse(CameraBase):
    id: str
    status: CameraStatus
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_connected: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# AI Model Schemas
class AIModelBase(BaseModel):
    model_name: str
    version: str = "v1.0"
    model_type: str = "YOLOv11"
    classes_json: Optional[dict] = None
    accuracy: float = 0.92
    map_score: float = 0.88
    status: str = "ready"

    model_config = ConfigDict(protected_namespaces=())


class AIModelCreate(AIModelBase):
    file_path: str = "backend/weights/yolov11x-road.pt"
    is_active: bool = False


class AIModelResponse(AIModelBase):
    id: str
    is_active: bool
    file_path: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Audit Log Schemas
class AuditLogCreate(BaseModel):
    action: str
    category: str = "SYSTEM"
    details: Optional[str] = None
    user_email: Optional[str] = None
    ip_address: Optional[str] = None


class AuditLogResponse(AuditLogCreate):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# User Management Schemas
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserResetPassword(BaseModel):
    new_password: str = Field(..., min_length=6)



# Authentication & User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    full_name: Optional[str] = None
    role: UserRole = UserRole.INSPECTOR


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserResponse(UserBase):
    id: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    user_id: Optional[str] = None
    role: Optional[UserRole] = None


# Detection Schemas
class BoundingBox(BaseModel):
    x_min: float
    y_min: float
    x_max: float
    y_max: float
    area_pixels: float


class DetectionCreate(BaseModel):
    category: DamageCategory
    confidence: float
    x_min: float
    y_min: float
    x_max: float
    y_max: float
    area_pixels: float
    severity: SeverityLevel
    severity_score: float


class DetectionResponse(DetectionCreate):
    id: str
    video_id: str
    frame_id: str

    model_config = ConfigDict(from_attributes=True)


# Frame Schemas
class FrameResponse(BaseModel):
    id: str
    frame_number: int
    timestamp_seconds: float
    image_path: str
    has_damage: bool
    detections: List[DetectionResponse] = []

    model_config = ConfigDict(from_attributes=True)


# GPS Schemas
class GPSDataCreate(BaseModel):
    frame_number: int
    latitude: float
    longitude: float
    altitude_meters: Optional[float] = None
    speed_kmh: Optional[float] = None
    road_name: Optional[str] = None


class GPSDataResponse(GPSDataCreate):
    id: str
    video_id: str

    model_config = ConfigDict(from_attributes=True)


# Analytics Schemas
class RoadAnalyticsResponse(BaseModel):
    id: str
    video_id: str
    road_health_score: float
    total_detections: int
    pothole_count: int
    crack_count: int
    critical_count: int
    damage_density_per_km: float
    overall_severity: SeverityLevel
    summary_json: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)


# Video Schemas
class VideoUploadResponse(BaseModel):
    id: str
    title: str
    filename: str
    file_size_bytes: int
    status: ProcessingStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VideoDetailResponse(VideoUploadResponse):
    file_path: str
    processed_file_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    duration_seconds: float
    total_frames: int
    fps: float
    resolution: str
    analytics: Optional[RoadAnalyticsResponse] = None
    gps_tracks: List[GPSDataResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ProcessVideoRequest(BaseModel):
    video_id: Optional[str] = Field(None, alias="videoId")
    confidence_threshold: Optional[float] = Field(0.35, alias="confidence")
    frame_skip: Optional[int] = Field(5, alias="frameSkip")
    enable_histogram_equalization: Optional[bool] = True
    enable_gaussian_blur: Optional[bool] = True

    model_config = ConfigDict(extra="ignore", populate_by_name=True)


class ProcessVideoResponse(BaseModel):
    video_id: str
    status: ProcessingStatus
    message: str
    total_frames_processed: int
    total_detections_found: int
    road_health_score: float


# Dashboard Summary Schema
class DashboardSummary(BaseModel):
    total_inspections: int
    total_distance_km: float
    average_health_score: float
    critical_sections: int
    category_distribution: dict
    severity_distribution: dict
    recent_videos: List[VideoUploadResponse]


# Report Request & Response
class VideoDashboardResponse(BaseModel):
    video_metadata: dict
    analytics: Optional[dict] = None
    detection_summary: dict
    road_health: dict
    gps: List[dict]
    timeline: List[dict]
    detection_counts: dict


class ReportGenerateRequest(BaseModel):
    video_ids: List[str]
    format: str = Field(..., pattern="^(pdf|csv|xlsx)$")
    include_images: bool = True


class ReportResponse(BaseModel):
    id: str
    title: str
    report_type: str
    file_path: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Stolen Vehicle Alert System Schemas
# ==========================================

class StolenVehicleBase(BaseModel):
    vehicle_number: str
    owner_name: Optional[str] = None
    vehicle_type: str = "CAR"
    fir_number: str
    police_station: str
    date_reported: Optional[datetime] = None
    reason: str = "Vehicle Theft"
    priority: str = "HIGH"
    status: str = "ACTIVE"
    notes: Optional[str] = None


class StolenVehicleCreate(StolenVehicleBase):
    pass


class StolenVehicleUpdate(BaseModel):
    vehicle_number: Optional[str] = None
    owner_name: Optional[str] = None
    vehicle_type: Optional[str] = None
    fir_number: Optional[str] = None
    police_station: Optional[str] = None
    date_reported: Optional[datetime] = None
    reason: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class StolenVehicleResponse(StolenVehicleBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StolenVehicleAlertBase(BaseModel):
    vehicle_number: str
    owner_name: Optional[str] = None
    fir_number: Optional[str] = None
    camera_id: Optional[str] = None
    camera_name: Optional[str] = None
    camera_location: Optional[str] = None
    latitude: float = 28.4595
    longitude: float = 77.0266
    ocr_text: str
    confidence: float = 0.95
    vehicle_snapshot_url: Optional[str] = None
    plate_crop_url: Optional[str] = None
    stream_id: Optional[str] = None
    frame_number: Optional[int] = None
    tracking_id: Optional[str] = None
    status: str = "ACTIVE"
    resolved_by: Optional[str] = None
    remarks: Optional[str] = None


class StolenVehicleAlertCreate(StolenVehicleAlertBase):
    stolen_vehicle_id: Optional[str] = None


class StolenVehicleAlertResolveRequest(BaseModel):
    alert_id: str
    status: str = "RESOLVED"  # ACTIVE, INVESTIGATING, INTERCEPTED, RESOLVED, FALSE_POSITIVE
    resolved_by: str = "Officer"
    remarks: Optional[str] = None


class StolenVehicleAlertResponse(StolenVehicleAlertBase):
    id: str
    stolen_vehicle_id: Optional[str] = None
    timestamp: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StolenVehicleStatsResponse(BaseModel):
    total_stolen_vehicles: int
    active_alerts: int
    alerts_today: int
    recovered_vehicles: int
    total_alerts_all_time: int
    critical_alerts_count: int
    status_breakdown: dict
    priority_breakdown: dict
    camera_breakdown: List[dict]
    daily_trend: List[dict]


class StolenVehicleSettingsSchema(BaseModel):
    enabled: bool = True
    alert_cooldown_seconds: int = 300
    duplicate_interval_seconds: int = 300
    dashboard_notification: bool = True
    browser_notification: bool = True
    sound_alert: bool = True
    sms_enabled: bool = False
    whatsapp_enabled: bool = False
    email_enabled: bool = False

    model_config = ConfigDict(from_attributes=True)

