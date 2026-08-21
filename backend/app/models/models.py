import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import List, Optional

from sqlalchemy import (
    String, DateTime, Float, Integer, ForeignKey, Enum, Text, Boolean, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base


class UserRole(str, PyEnum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    OPERATOR = "operator"
    INSPECTOR = "inspector"
    VIEWER = "viewer"


class CameraType(str, PyEnum):
    CCTV = "cctv"
    RTSP = "rtsp"
    WEBCAM = "webcam"
    DASHCAM = "dashcam"
    DRONE = "drone"
    MOBILE = "mobile"


class CameraStatus(str, PyEnum):
    ONLINE = "online"
    OFFLINE = "offline"
    BUSY = "busy"
    MAINTENANCE = "maintenance"


class ProcessingStatus(str, PyEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class DamageCategory(str, PyEnum):
    POTHOLE = "pothole"
    LONGITUDINAL_CRACK = "longitudinal_crack"
    TRANSVERSE_CRACK = "transverse_crack"
    ALLIGATOR_CRACK = "alligator_crack"
    MISSING_ASPHALT = "missing_asphalt"
    BROKEN_ROAD = "broken_road"


class SeverityLevel(str, PyEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.INSPECTOR, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    videos: Mapped[List["Video"]] = relationship("Video", back_populates="uploader", cascade="all, delete-orphan")
    reports: Mapped[List["Report"]] = relationship("Report", back_populates="creator")


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    processed_file_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    thumbnail_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    total_frames: Mapped[int] = mapped_column(Integer, default=0)
    fps: Mapped[float] = mapped_column(Float, default=30.0)
    resolution: Mapped[str] = mapped_column(String(50), default="1920x1080")
    status: Mapped[ProcessingStatus] = mapped_column(
        Enum(ProcessingStatus), default=ProcessingStatus.PENDING, nullable=False
    )
    uploader_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    uploader: Mapped["User"] = relationship("User", back_populates="videos")
    frames: Mapped[List["Frame"]] = relationship("Frame", back_populates="video", cascade="all, delete-orphan")
    detections: Mapped[List["Detection"]] = relationship("Detection", back_populates="video", cascade="all, delete-orphan")
    gps_tracks: Mapped[List["GPSData"]] = relationship("GPSData", back_populates="video", cascade="all, delete-orphan")
    analytics: Mapped[Optional["RoadAnalytics"]] = relationship(
        "RoadAnalytics", back_populates="video", uselist=False, cascade="all, delete-orphan"
    )


class Frame(Base):
    __tablename__ = "frames"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    video_id: Mapped[str] = mapped_column(String(36), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False)
    frame_number: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    timestamp_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    image_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default=None)
    has_damage: Mapped[bool] = mapped_column(Boolean, default=False)

    video: Mapped["Video"] = relationship("Video", back_populates="frames")
    detections: Mapped[List["Detection"]] = relationship("Detection", back_populates="frame", cascade="all, delete-orphan")


class Detection(Base):
    __tablename__ = "detections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    video_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("videos.id", ondelete="CASCADE"), nullable=True)
    camera_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("cameras.id", ondelete="SET NULL"), nullable=True)
    frame_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("frames.id", ondelete="CASCADE"), nullable=True)
    frame_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    timestamp_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    
    # Bounding Box Coordinates
    x_min: Mapped[float] = mapped_column(Float, nullable=False)
    y_min: Mapped[float] = mapped_column(Float, nullable=False)
    x_max: Mapped[float] = mapped_column(Float, nullable=False)
    y_max: Mapped[float] = mapped_column(Float, nullable=False)
    area_pixels: Mapped[float] = mapped_column(Float, default=0.0)
    
    severity: Mapped[str] = mapped_column(String(50), default="low", nullable=False)
    severity_score: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    distance_meters: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    video: Mapped[Optional["Video"]] = relationship("Video", back_populates="detections")
    frame: Mapped[Optional["Frame"]] = relationship("Frame", back_populates="detections")


class GPSData(Base):
    __tablename__ = "gps_data"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    video_id: Mapped[str] = mapped_column(String(36), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False)
    frame_number: Mapped[int] = mapped_column(Integer, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    altitude_meters: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    speed_kmh: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    road_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    video: Mapped["Video"] = relationship("Video", back_populates="gps_tracks")


class RoadAnalytics(Base):
    __tablename__ = "road_analytics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    video_id: Mapped[str] = mapped_column(String(36), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, unique=True)
    road_health_score: Mapped[float] = mapped_column(Float, nullable=False)  # 0 to 100
    total_detections: Mapped[int] = mapped_column(Integer, default=0)
    pothole_count: Mapped[int] = mapped_column(Integer, default=0)
    crack_count: Mapped[int] = mapped_column(Integer, default=0)
    critical_count: Mapped[int] = mapped_column(Integer, default=0)
    damage_density_per_km: Mapped[float] = mapped_column(Float, default=0.0)
    overall_severity: Mapped[SeverityLevel] = mapped_column(Enum(SeverityLevel), default=SeverityLevel.LOW)
    summary_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    video: Mapped["Video"] = relationship("Video", back_populates="analytics")


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    report_type: Mapped[str] = mapped_column(String(50), nullable=False)  # PDF, CSV, Excel
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    creator: Mapped[Optional["User"]] = relationship("User", back_populates="reports")


class Camera(Base):
    __tablename__ = "cameras"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    camera_name: Mapped[str] = mapped_column(String(255), nullable=False)
    camera_type: Mapped[CameraType] = mapped_column(Enum(CameraType), default=CameraType.CCTV, nullable=False)
    stream_url: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, default=0.0)
    longitude: Mapped[float] = mapped_column(Float, default=0.0)
    location_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fps: Mapped[float] = mapped_column(Float, default=30.0)
    resolution: Mapped[str] = mapped_column(String(50), default="1920x1080")
    status: Mapped[CameraStatus] = mapped_column(Enum(CameraStatus), default=CameraStatus.OFFLINE, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )
    last_connected: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class AIModel(Base):
    __tablename__ = "ai_models"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[str] = mapped_column(String(50), default="v1.0")
    model_type: Mapped[str] = mapped_column(String(50), default="YOLOv11")
    classes_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    accuracy: Mapped[float] = mapped_column(Float, default=0.92)
    map_score: Mapped[float] = mapped_column(Float, default=0.88)
    status: Mapped[str] = mapped_column(String(50), default="ready")
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="SYSTEM")
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    user_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class DriverSettings(Base):
    __tablename__ = "driver_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    alert_distance_meters: Mapped[float] = mapped_column(Float, default=30.0, nullable=False)
    voice_alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    min_confidence: Mapped[float] = mapped_column(Float, default=0.35, nullable=False)
    min_severity: Mapped[str] = mapped_column(String(50), default="low", nullable=False)
    camera_source: Mapped[str] = mapped_column(String(255), default="0", nullable=False)
    fps: Mapped[float] = mapped_column(Float, default=25.0, nullable=False)
    frame_skip: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    camera_height_meters: Mapped[float] = mapped_column(Float, default=1.3, nullable=False)
    camera_pitch_degrees: Mapped[float] = mapped_column(Float, default=15.0, nullable=False)
    speed_kmh: Mapped[float] = mapped_column(Float, default=45.0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )


class DriverAlertLog(Base):
    __tablename__ = "driver_alert_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    damage_category: Mapped[str] = mapped_column(String(100), nullable=False)
    alert_level: Mapped[str] = mapped_column(String(50), nullable=False)  # low, medium, high, critical
    distance_meters: Mapped[float] = mapped_column(Float, nullable=False)
    lane_position: Mapped[str] = mapped_column(String(50), default="Center lane", nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.85)
    severity_score: Mapped[float] = mapped_column(Float, default=0.7)
    voice_message: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, default=37.7749)
    longitude: Mapped[float] = mapped_column(Float, default=-122.4194)
    speed_kmh: Mapped[float] = mapped_column(Float, default=45.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class TrafficViolation(Base):
    __tablename__ = "traffic_violations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    challan_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    violation_type: Mapped[str] = mapped_column(String(50), default="NO_HELMET", index=True, nullable=False)
    license_plate_number: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.92, nullable=False)
    rider_confidence: Mapped[float] = mapped_column(Float, default=0.88, nullable=False)
    fine_amount: Mapped[float] = mapped_column(Float, default=1000.0, nullable=False)
    fine_status: Mapped[str] = mapped_column(String(50), default="ISSUED", index=True, nullable=False)  # ISSUED, PENDING, PAID, DISPUTED, CANCELLED
    
    video_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("videos.id", ondelete="SET NULL"), nullable=True)
    camera_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("cameras.id", ondelete="SET NULL"), nullable=True)
    frame_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("frames.id", ondelete="SET NULL"), nullable=True)
    frame_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    timestamp_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    evidence_image_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidence_image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    plate_crop_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rider_crop_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    vehicle_type: Mapped[str] = mapped_column(String(50), default="MOTORCYCLE", nullable=False)
    latitude: Mapped[Optional[float]] = mapped_column(Float, default=28.4595, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, default=77.0266, nullable=True)
    location_name: Mapped[Optional[str]] = mapped_column(String(255), default="National Highway 48", nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )


class StolenVehicle(Base):
    """
    Stolen Vehicle Registry:
    Centralized database of stolen, flagged, and wanted motor vehicles for real-time ANPR matching.
    """
    __tablename__ = "stolen_vehicles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    vehicle_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)  # Normalized uppercase
    owner_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    vehicle_type: Mapped[str] = mapped_column(String(50), default="CAR", nullable=False)  # CAR, MOTORCYCLE, SCOOTER, TRUCK, BUS, SUV, VAN
    fir_number: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    police_station: Mapped[str] = mapped_column(String(255), nullable=False)
    date_reported: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    reason: Mapped[str] = mapped_column(String(255), default="Vehicle Theft", nullable=False)  # Theft, Robbery, Hit & Run, Kidnapping, Carjacking
    priority: Mapped[str] = mapped_column(String(50), default="HIGH", index=True, nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", index=True, nullable=False)  # ACTIVE, RECOVERED
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )


class StolenVehicleAlert(Base):
    """
    Real-Time Stolen Vehicle Detection Alert Records:
    Instant logs generated when an ANPR OCR plate matches the Stolen Vehicle Registry.
    """
    __tablename__ = "stolen_vehicle_alerts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    stolen_vehicle_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("stolen_vehicles.id", ondelete="SET NULL"), nullable=True)
    vehicle_number: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    owner_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    fir_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    camera_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("cameras.id", ondelete="SET NULL"), nullable=True)
    camera_name: Mapped[Optional[str]] = mapped_column(String(255), default="Surveillance Camera", nullable=True)
    camera_location: Mapped[Optional[str]] = mapped_column(String(255), default="Highway Junction", nullable=True)
    latitude: Mapped[float] = mapped_column(Float, default=28.4595, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, default=77.0266, nullable=False)
    
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
    
    vehicle_snapshot_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    vehicle_snapshot_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    plate_crop_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    plate_crop_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    ocr_text: Mapped[str] = mapped_column(String(100), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.95, nullable=False)
    
    stream_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    frame_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    tracking_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", index=True, nullable=False)  # ACTIVE, INVESTIGATING, INTERCEPTED, RESOLVED, FALSE_POSITIVE
    resolved_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )


class NotificationLog(Base):
    """
    Audit and Dispatch Log for Multi-Channel Stolen Vehicle Alert Notifications:
    Supports Dashboard, Browser, Sound, SMS, WhatsApp, Email, and Push Notifications.
    """
    __tablename__ = "notification_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    alert_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("stolen_vehicle_alerts.id", ondelete="CASCADE"), nullable=True)
    channel: Mapped[str] = mapped_column(String(50), nullable=False)  # DASHBOARD, BROWSER, SOUND, SMS, WHATSAPP, EMAIL, PUSH
    recipient: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="SENT", nullable=False)  # SENT, DELIVERED, FAILED, SIMULATED
    payload_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )


class StolenVehicleSettings(Base):
    """
    System Configuration for Stolen Vehicle Alert System.
    """
    __tablename__ = "stolen_vehicle_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    alert_cooldown_seconds: Mapped[int] = mapped_column(Integer, default=300, nullable=False)  # 5 minutes
    duplicate_interval_seconds: Mapped[int] = mapped_column(Integer, default=300, nullable=False)
    dashboard_notification: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    browser_notification: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sound_alert: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sms_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    whatsapp_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )



