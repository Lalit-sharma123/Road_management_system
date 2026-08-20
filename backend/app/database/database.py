import os
import asyncio
from pathlib import Path
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import select, text
from app.config.config import settings

# Determine fallback SQLite path
SQLITE_DB_PATH = Path(settings.BASE_DIR) / "road_damage.db"
SQLITE_FALLBACK_URL = f"sqlite+aiosqlite:///{SQLITE_DB_PATH}"

# Global active engine and session factory
active_database_url = settings.DATABASE_URL

def _create_engine_for_url(url: str):
    if "postgresql" in url.lower():
        return create_async_engine(
            url,
            echo=False,
            future=True,
            pool_size=10,
            max_overflow=5,
            pool_pre_ping=True
        )
    else:
        return create_async_engine(
            url,
            echo=False,
            future=True,
            connect_args={"check_same_thread": False}
        )

engine = _create_engine_for_url(active_database_url)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)


class Base(DeclarativeBase):
    """Base ORM declarative class"""
    pass


def _switch_to_sqlite():
    global engine, AsyncSessionLocal, active_database_url
    print(f"🔄 Switching database engine to local SQLite: {SQLITE_DB_PATH}")
    active_database_url = SQLITE_FALLBACK_URL
    engine = _create_engine_for_url(active_database_url)
    AsyncSessionLocal = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False
    )


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI Dependency to yield Async Database Sessions.
    Guarantees automatic session cleanup, rollback on errors, and resilient connection fallback.
    """
    global AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            # If connection failed due to PostgreSQL auth / network error, switch to SQLite
            err_msg = str(e).lower()
            if "password authentication failed" in err_msg or "connection refused" in err_msg or "cannot connect" in err_msg:
                _switch_to_sqlite()
            raise


async def ensure_schema_alignment(conn) -> None:
    """
    Auto-Migration / Safe Schema Alignment:
    Verifies that all columns required by SQLAlchemy ORM models exist in the target database.
    Executes non-destructive ALTER TABLE ADD COLUMN statements for any newly added model fields.
    Supports both PostgreSQL (via information_schema & ADD COLUMN IF NOT EXISTS) and SQLite (via PRAGMA table_info).
    """
    # Schema definition dictionary: table -> list of (column_name, postgres_type_ddl, sqlite_type_ddl)
    REQUIRED_SCHEMA = {
        "detections": [
            ("video_id", "VARCHAR(36)", "VARCHAR(36)"),
            ("camera_id", "VARCHAR(36)", "VARCHAR(36)"),
            ("frame_id", "VARCHAR(36)", "VARCHAR(36)"),
            ("frame_number", "INTEGER", "INTEGER"),
            ("timestamp_seconds", "DOUBLE PRECISION", "FLOAT"),
            ("category", "VARCHAR(50)", "VARCHAR(50)"),
            ("confidence", "DOUBLE PRECISION", "FLOAT"),
            ("x_min", "DOUBLE PRECISION", "FLOAT"),
            ("y_min", "DOUBLE PRECISION", "FLOAT"),
            ("x_max", "DOUBLE PRECISION", "FLOAT"),
            ("y_max", "DOUBLE PRECISION", "FLOAT"),
            ("area_pixels", "DOUBLE PRECISION DEFAULT 0.0", "FLOAT DEFAULT 0.0"),
            ("severity", "VARCHAR(50) DEFAULT 'low'", "VARCHAR(50) DEFAULT 'low'"),
            ("severity_score", "DOUBLE PRECISION DEFAULT 0.5", "FLOAT DEFAULT 0.5"),
            ("distance_meters", "DOUBLE PRECISION", "FLOAT"),
            ("latitude", "DOUBLE PRECISION", "FLOAT"),
            ("longitude", "DOUBLE PRECISION", "FLOAT"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        ],
        "videos": [
            ("title", "VARCHAR(255)", "VARCHAR(255)"),
            ("filename", "VARCHAR(255)", "VARCHAR(255)"),
            ("file_path", "TEXT", "TEXT"),
            ("processed_file_path", "TEXT", "TEXT"),
            ("thumbnail_path", "TEXT", "TEXT"),
            ("file_size_bytes", "INTEGER DEFAULT 0", "INTEGER DEFAULT 0"),
            ("duration_seconds", "DOUBLE PRECISION DEFAULT 0.0", "FLOAT DEFAULT 0.0"),
            ("total_frames", "INTEGER DEFAULT 0", "INTEGER DEFAULT 0"),
            ("fps", "DOUBLE PRECISION DEFAULT 30.0", "FLOAT DEFAULT 30.0"),
            ("resolution", "VARCHAR(50) DEFAULT '1920x1080'", "VARCHAR(50) DEFAULT '1920x1080'"),
            ("status", "VARCHAR(50) DEFAULT 'pending'", "VARCHAR(50) DEFAULT 'pending'"),
            ("uploader_id", "VARCHAR(36)", "VARCHAR(36)"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        ],
        "cameras": [
            ("camera_name", "VARCHAR(255)", "VARCHAR(255)"),
            ("camera_type", "VARCHAR(50) DEFAULT 'cctv'", "VARCHAR(50) DEFAULT 'cctv'"),
            ("stream_url", "TEXT", "TEXT"),
            ("latitude", "DOUBLE PRECISION DEFAULT 0.0", "FLOAT DEFAULT 0.0"),
            ("longitude", "DOUBLE PRECISION DEFAULT 0.0", "FLOAT DEFAULT 0.0"),
            ("location_name", "VARCHAR(255)", "VARCHAR(255)"),
            ("description", "TEXT", "TEXT"),
            ("fps", "DOUBLE PRECISION DEFAULT 30.0", "FLOAT DEFAULT 30.0"),
            ("resolution", "VARCHAR(50) DEFAULT '1920x1080'", "VARCHAR(50) DEFAULT '1920x1080'"),
            ("status", "VARCHAR(50) DEFAULT 'offline'", "VARCHAR(50) DEFAULT 'offline'"),
            ("is_active", "BOOLEAN DEFAULT TRUE", "BOOLEAN DEFAULT 1"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            ("last_connected", "TIMESTAMP WITH TIME ZONE", "TIMESTAMP")
        ],
        "driver_settings": [
            ("alert_distance_meters", "DOUBLE PRECISION DEFAULT 30.0", "FLOAT DEFAULT 30.0"),
            ("voice_alerts_enabled", "BOOLEAN DEFAULT TRUE", "BOOLEAN DEFAULT 1"),
            ("min_confidence", "DOUBLE PRECISION DEFAULT 0.35", "FLOAT DEFAULT 0.35"),
            ("min_severity", "VARCHAR(50) DEFAULT 'low'", "VARCHAR(50) DEFAULT 'low'"),
            ("camera_source", "VARCHAR(255) DEFAULT '0'", "VARCHAR(255) DEFAULT '0'"),
            ("fps", "DOUBLE PRECISION DEFAULT 25.0", "FLOAT DEFAULT 25.0"),
            ("frame_skip", "INTEGER DEFAULT 2", "INTEGER DEFAULT 2"),
            ("camera_height_meters", "DOUBLE PRECISION DEFAULT 1.3", "FLOAT DEFAULT 1.3"),
            ("camera_pitch_degrees", "DOUBLE PRECISION DEFAULT 15.0", "FLOAT DEFAULT 15.0"),
            ("speed_kmh", "DOUBLE PRECISION DEFAULT 45.0", "FLOAT DEFAULT 45.0"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        ],
        "driver_alert_logs": [
            ("damage_category", "VARCHAR(100)", "VARCHAR(100)"),
            ("alert_level", "VARCHAR(50)", "VARCHAR(50)"),
            ("distance_meters", "DOUBLE PRECISION", "FLOAT"),
            ("lane_position", "VARCHAR(50) DEFAULT 'Center lane'", "VARCHAR(50) DEFAULT 'Center lane'"),
            ("confidence", "DOUBLE PRECISION DEFAULT 0.85", "FLOAT DEFAULT 0.85"),
            ("severity_score", "DOUBLE PRECISION DEFAULT 0.7", "FLOAT DEFAULT 0.7"),
            ("voice_message", "TEXT", "TEXT"),
            ("latitude", "DOUBLE PRECISION DEFAULT 37.7749", "FLOAT DEFAULT 37.7749"),
            ("longitude", "DOUBLE PRECISION DEFAULT -122.4194", "FLOAT DEFAULT -122.4194"),
            ("speed_kmh", "DOUBLE PRECISION DEFAULT 45.0", "FLOAT DEFAULT 45.0"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        ],
        "traffic_violations": [
            ("challan_number", "VARCHAR(50)", "VARCHAR(50)"),
            ("violation_type", "VARCHAR(50) DEFAULT 'NO_HELMET'", "VARCHAR(50) DEFAULT 'NO_HELMET'"),
            ("license_plate_number", "VARCHAR(50)", "VARCHAR(50)"),
            ("confidence", "DOUBLE PRECISION DEFAULT 0.92", "FLOAT DEFAULT 0.92"),
            ("rider_confidence", "DOUBLE PRECISION DEFAULT 0.88", "FLOAT DEFAULT 0.88"),
            ("fine_amount", "DOUBLE PRECISION DEFAULT 1000.0", "FLOAT DEFAULT 1000.0"),
            ("fine_status", "VARCHAR(50) DEFAULT 'ISSUED'", "VARCHAR(50) DEFAULT 'ISSUED'"),
            ("video_id", "VARCHAR(36)", "VARCHAR(36)"),
            ("camera_id", "VARCHAR(36)", "VARCHAR(36)"),
            ("frame_id", "VARCHAR(36)", "VARCHAR(36)"),
            ("frame_number", "INTEGER", "INTEGER"),
            ("timestamp_seconds", "DOUBLE PRECISION", "FLOAT"),
            ("evidence_image_path", "TEXT", "TEXT"),
            ("evidence_image_url", "TEXT", "TEXT"),
            ("plate_crop_url", "TEXT", "TEXT"),
            ("rider_crop_url", "TEXT", "TEXT"),
            ("vehicle_type", "VARCHAR(50) DEFAULT 'MOTORCYCLE'", "VARCHAR(50) DEFAULT 'MOTORCYCLE'"),
            ("latitude", "DOUBLE PRECISION DEFAULT 28.4595", "FLOAT DEFAULT 28.4595"),
            ("longitude", "DOUBLE PRECISION DEFAULT 77.0266", "FLOAT DEFAULT 77.0266"),
            ("location_name", "VARCHAR(255) DEFAULT 'National Highway 48'", "VARCHAR(255) DEFAULT 'National Highway 48'"),
            ("notes", "TEXT", "TEXT"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        ],
        "stolen_vehicles": [
            ("vehicle_number", "VARCHAR(50) NOT NULL", "VARCHAR(50) NOT NULL"),
            ("owner_name", "VARCHAR(255)", "VARCHAR(255)"),
            ("vehicle_type", "VARCHAR(50) DEFAULT 'CAR'", "VARCHAR(50) DEFAULT 'CAR'"),
            ("fir_number", "VARCHAR(100) NOT NULL", "VARCHAR(100) NOT NULL"),
            ("police_station", "VARCHAR(255) NOT NULL", "VARCHAR(255) NOT NULL"),
            ("date_reported", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            ("reason", "VARCHAR(255) DEFAULT 'Vehicle Theft'", "VARCHAR(255) DEFAULT 'Vehicle Theft'"),
            ("priority", "VARCHAR(50) DEFAULT 'HIGH'", "VARCHAR(50) DEFAULT 'HIGH'"),
            ("status", "VARCHAR(50) DEFAULT 'ACTIVE'", "VARCHAR(50) DEFAULT 'ACTIVE'"),
            ("notes", "TEXT", "TEXT"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        ],
        "stolen_vehicle_alerts": [
            ("stolen_vehicle_id", "VARCHAR(36)", "VARCHAR(36)"),
            ("vehicle_number", "VARCHAR(50) NOT NULL", "VARCHAR(50) NOT NULL"),
            ("owner_name", "VARCHAR(255)", "VARCHAR(255)"),
            ("fir_number", "VARCHAR(100)", "VARCHAR(100)"),
            ("camera_id", "VARCHAR(36)", "VARCHAR(36)"),
            ("camera_name", "VARCHAR(255) DEFAULT 'Surveillance Camera'", "VARCHAR(255) DEFAULT 'Surveillance Camera'"),
            ("camera_location", "VARCHAR(255) DEFAULT 'Highway Junction'", "VARCHAR(255) DEFAULT 'Highway Junction'"),
            ("latitude", "DOUBLE PRECISION DEFAULT 28.4595", "FLOAT DEFAULT 28.4595"),
            ("longitude", "DOUBLE PRECISION DEFAULT 77.0266", "FLOAT DEFAULT 77.0266"),
            ("timestamp", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            ("vehicle_snapshot_url", "TEXT", "TEXT"),
            ("vehicle_snapshot_path", "TEXT", "TEXT"),
            ("plate_crop_url", "TEXT", "TEXT"),
            ("plate_crop_path", "TEXT", "TEXT"),
            ("ocr_text", "VARCHAR(100) NOT NULL", "VARCHAR(100) NOT NULL"),
            ("confidence", "DOUBLE PRECISION DEFAULT 0.95", "FLOAT DEFAULT 0.95"),
            ("stream_id", "VARCHAR(100)", "VARCHAR(100)"),
            ("frame_number", "INTEGER", "INTEGER"),
            ("tracking_id", "VARCHAR(50)", "VARCHAR(50)"),
            ("status", "VARCHAR(50) DEFAULT 'ACTIVE'", "VARCHAR(50) DEFAULT 'ACTIVE'"),
            ("resolved_by", "VARCHAR(255)", "VARCHAR(255)"),
            ("remarks", "TEXT", "TEXT"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        ],
        "notification_logs": [
            ("alert_id", "VARCHAR(36)", "VARCHAR(36)"),
            ("channel", "VARCHAR(50) NOT NULL", "VARCHAR(50) NOT NULL"),
            ("recipient", "VARCHAR(255)", "VARCHAR(255)"),
            ("status", "VARCHAR(50) DEFAULT 'SENT'", "VARCHAR(50) DEFAULT 'SENT'"),
            ("payload_json", "JSON", "JSON"),
            ("error_message", "TEXT", "TEXT"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        ],
        "stolen_vehicle_settings": [
            ("enabled", "BOOLEAN DEFAULT TRUE", "BOOLEAN DEFAULT 1"),
            ("alert_cooldown_seconds", "INTEGER DEFAULT 300", "INTEGER DEFAULT 300"),
            ("duplicate_interval_seconds", "INTEGER DEFAULT 300", "INTEGER DEFAULT 300"),
            ("dashboard_notification", "BOOLEAN DEFAULT TRUE", "BOOLEAN DEFAULT 1"),
            ("browser_notification", "BOOLEAN DEFAULT TRUE", "BOOLEAN DEFAULT 1"),
            ("sound_alert", "BOOLEAN DEFAULT TRUE", "BOOLEAN DEFAULT 1"),
            ("sms_enabled", "BOOLEAN DEFAULT FALSE", "BOOLEAN DEFAULT 0"),
            ("whatsapp_enabled", "BOOLEAN DEFAULT FALSE", "BOOLEAN DEFAULT 0"),
            ("email_enabled", "BOOLEAN DEFAULT FALSE", "BOOLEAN DEFAULT 0"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        ]
    }

    try:
        # Check dialect
        dialect_name = conn.dialect.name
        is_pg = "postgres" in dialect_name

        for table_name, columns in REQUIRED_SCHEMA.items():
            if is_pg:
                # PostgreSQL: Query existing column names, data types and udt_names
                query = text("""
                    SELECT column_name, data_type, udt_name 
                    FROM information_schema.columns 
                    WHERE table_name = :table_name
                """)
                res = await conn.execute(query, {"table_name": table_name})
                col_info = {row[0].lower(): (row[1].lower(), row[2].lower()) for row in res.fetchall()}

                if col_info:  # Table exists
                    for col_name, pg_ddl, _ in columns:
                        col_lower = col_name.lower()
                        if col_lower not in col_info:
                            alter_stmt = text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {col_name} {pg_ddl}")
                            await conn.execute(alter_stmt)
                            print(f"🔧 [PostgreSQL Auto-Migration] Added column '{col_name}' to '{table_name}'")
                        else:
                            curr_type, udt_type = col_info[col_lower]
                            # Detect data type mismatches for string UUIDs (e.g. camera_id, video_id, frame_id, uploader_id) and enums
                            if "varchar" in pg_ddl.lower() and ("int" in curr_type or "int" in udt_type or "numeric" in curr_type or "user-defined" in curr_type or curr_type == "user-defined"):
                                try:
                                    # Drop default if any
                                    await conn.execute(text(f"ALTER TABLE {table_name} ALTER COLUMN {col_name} DROP DEFAULT"))
                                    # Alter column type to VARCHAR
                                    col_len = "50" if ("category" in col_name or "severity" in col_name) else "36"
                                    await conn.execute(text(f"ALTER TABLE {table_name} ALTER COLUMN {col_name} TYPE VARCHAR({col_len}) USING {col_name}::VARCHAR"))
                                    print(f"🔧 [PostgreSQL Auto-Migration] Converted '{table_name}.{col_name}' from {curr_type}/{udt_type} to VARCHAR({col_len})")
                                except Exception as type_err:
                                    print(f"⚠️ Note migrating {table_name}.{col_name} type: {type_err}")
            else:
                # SQLite: Query existing column names via PRAGMA
                try:
                    res = await conn.execute(text(f"PRAGMA table_info({table_name})"))
                    existing_cols = {row[1].lower() for row in res.fetchall()}
                    
                    if existing_cols:  # Table exists
                        for col_name, _, sqlite_ddl in columns:
                            if col_name.lower() not in existing_cols:
                                alter_stmt = text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {sqlite_ddl}")
                                await conn.execute(alter_stmt)
                                print(f"🔧 [SQLite Auto-Migration] Added column '{col_name}' to '{table_name}'")
                except Exception:
                    pass
    except Exception as e:
        print(f"Note during schema compatibility check: {e}")


async def init_db() -> None:
    """
    Create database tables if they do not exist and verify column alignment.
    If PostgreSQL credentials fail, automatically fall back to SQLite and seed defaults.
    """
    global engine
    try:
        async with engine.begin() as conn:
            # Test connection with a quick select
            await conn.execute(text("SELECT 1"))
            await conn.run_sync(Base.metadata.create_all)
            await ensure_schema_alignment(conn)
    except Exception as e:
        print(f"⚠️ PostgreSQL connection notice: {e}")
        _switch_to_sqlite()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await ensure_schema_alignment(conn)

    # Seed Default Users & Initial Settings
    await _seed_initial_data()


async def _seed_initial_data():
    """Seed default Administrator, Inspector, and System settings if empty."""
    from passlib.context import CryptContext
    from app.models.models import User, UserRole, DriverSettings, AIModel, Camera, CameraType, CameraStatus, TrafficViolation
    
    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

    async with AsyncSessionLocal() as session:
        try:
            # 1. Seed Admin User
            stmt = select(User).where((User.username == "admin") | (User.email == "admin@roadvision.ai"))
            admin_user = (await session.execute(stmt)).scalar_one_or_none()
            if not admin_user:
                admin_user = User(
                    username="admin",
                    email="admin@roadvision.ai",
                    full_name="System Administrator",
                    hashed_password=pwd_ctx.hash("admin123"),
                    role=UserRole.ADMIN,
                    is_active=True
                )
                session.add(admin_user)

            # 2. Seed Inspector User
            stmt_insp = select(User).where((User.username == "inspector") | (User.email == "inspector@roadvision.ai"))
            insp_user = (await session.execute(stmt_insp)).scalar_one_or_none()
            if not insp_user:
                insp_user = User(
                    username="inspector",
                    email="inspector@roadvision.ai",
                    full_name="Field Inspector",
                    hashed_password=pwd_ctx.hash("inspector123"),
                    role=UserRole.INSPECTOR,
                    is_active=True
                )
                session.add(insp_user)

            # 3. Seed Driver Settings
            stmt_ds = select(DriverSettings)
            ds = (await session.execute(stmt_ds)).scalar_one_or_none()
            if not ds:
                session.add(DriverSettings(
                    alert_distance_meters=30.0,
                    voice_alerts_enabled=True,
                    min_confidence=0.35,
                    min_severity="low",
                    camera_source="0",
                    fps=25.0,
                    frame_skip=2,
                    camera_height_meters=1.3,
                    camera_pitch_degrees=15.0,
                    speed_kmh=45.0
                ))

            # 4. Seed Default Camera
            stmt_cam = select(Camera)
            cam = (await session.execute(stmt_cam)).scalar_one_or_none()
            if not cam:
                session.add(Camera(
                    camera_name="Highway Dashcam A1",
                    camera_type=CameraType.DASHCAM,
                    stream_url="0",
                    latitude=28.4595,
                    longitude=77.0266,
                    location_name="National Highway 48 - Sector 29",
                    description="Front bumper mounted inspection dashcam",
                    fps=30.0,
                    resolution="1920x1080",
                    status=CameraStatus.ONLINE,
                    is_active=True
                ))

            # 5. Seed Default AI Model Registry
            stmt_model = select(AIModel)
            model_rec = (await session.execute(stmt_model)).scalar_one_or_none()
            if not model_rec:
                session.add(AIModel(
                    model_name="YOLOv11-RoadDamage-best",
                    version="v11.4",
                    model_type="YOLOv11",
                    accuracy=0.942,
                    map_score=0.895,
                    status="ready",
                    is_active=True,
                    file_path=str(settings.resolve_model_path("best.pt")),
                    classes_json={
                        "0": "pothole",
                        "1": "longitudinal_crack",
                        "2": "transverse_crack",
                        "3": "alligator_crack",
                        "4": "missing_asphalt",
                        "5": "broken_road"
                    }
                ))

            # 6. Seed Sample Helmet Traffic Violations with Generated E-Challans
            stmt_tv = select(TrafficViolation)
            tv_rec = (await session.execute(stmt_tv)).scalars().first()
            if not tv_rec:
                from datetime import timedelta
                now = datetime.now(timezone.utc)
                sample_violations = [
                    TrafficViolation(
                        challan_number="ECH-2026-892401",
                        violation_type="NO_HELMET",
                        license_plate_number="DL01AB1234",
                        confidence=0.96,
                        rider_confidence=0.94,
                        fine_amount=1000.0,
                        fine_status="ISSUED",
                        frame_number=42,
                        timestamp_seconds=2.8,
                        vehicle_type="MOTORCYCLE",
                        latitude=28.4595,
                        longitude=77.0266,
                        location_name="National Highway 48 - Sector 29",
                        notes="Rider detected without helmet on Honda CB Shine motorcycle. ANPR high-confidence plate OCR extract.",
                        created_at=now - timedelta(minutes=45)
                    ),
                    TrafficViolation(
                        challan_number="ECH-2026-892402",
                        violation_type="NO_HELMET",
                        license_plate_number="MH12DE1432",
                        confidence=0.93,
                        rider_confidence=0.91,
                        fine_amount=1000.0,
                        fine_status="PENDING",
                        frame_number=88,
                        timestamp_seconds=5.9,
                        vehicle_type="SCOOTER",
                        latitude=28.4612,
                        longitude=77.0285,
                        location_name="Golf Course Road Junction",
                        notes="Two-wheeler rider without protective headgear. Captured via CCTV surveillance feed.",
                        created_at=now - timedelta(hours=2, minutes=15)
                    ),
                    TrafficViolation(
                        challan_number="ECH-2026-892403",
                        violation_type="NO_HELMET",
                        license_plate_number="KA05MK9821",
                        confidence=0.95,
                        rider_confidence=0.96,
                        fine_amount=1000.0,
                        fine_status="PAID",
                        frame_number=135,
                        timestamp_seconds=9.0,
                        vehicle_type="MOTORCYCLE",
                        latitude=28.4630,
                        longitude=77.0305,
                        location_name="Cyber City Underpass",
                        notes="Helmet violation resolved online via citizen portal payment gateway.",
                        created_at=now - timedelta(hours=5, minutes=30)
                    ),
                    TrafficViolation(
                        challan_number="ECH-2026-892404",
                        violation_type="NO_HELMET",
                        license_plate_number="HR26DQ5519",
                        confidence=0.94,
                        rider_confidence=0.89,
                        fine_amount=1000.0,
                        fine_status="ISSUED",
                        frame_number=190,
                        timestamp_seconds=12.7,
                        vehicle_type="MOTORCYCLE",
                        latitude=28.4655,
                        longitude=77.0330,
                        location_name="MG Road Metro Pillar 142",
                        notes="Automatic citation dispatched via SMS/Vahan registry notification.",
                        created_at=now - timedelta(hours=8, minutes=10)
                    )
                ]
                for v in sample_violations:
                    session.add(v)

            # 7. Seed Default Stolen Vehicle Registry
            from app.models.models import StolenVehicle, StolenVehicleAlert, StolenVehicleSettings
            from datetime import timedelta
            now = datetime.now(timezone.utc)

            stmt_sv = select(StolenVehicle)
            sv_rec = (await session.execute(stmt_sv)).scalars().first()
            if not sv_rec:
                sample_stolen_vehicles = [
                    StolenVehicle(
                        vehicle_number="DL01AB1234",
                        owner_name="Rajesh Kumar Sharma",
                        vehicle_type="MOTORCYCLE",
                        fir_number="FIR-2026-DEL-88912",
                        police_station="Connaught Place PS, New Delhi",
                        date_reported=now - timedelta(days=4),
                        reason="Vehicle Theft (Parked outside Metro Station)",
                        priority="HIGH",
                        status="ACTIVE",
                        notes="Black Honda CB Shine motorcycle. Stolen on 16-Aug-2026. Suspect fled towards Outer Ring Road."
                    ),
                    StolenVehicle(
                        vehicle_number="HR26DQ5519",
                        owner_name="Vikramaditya Singh",
                        vehicle_type="CAR",
                        fir_number="FIR-2026-GGN-44120",
                        police_station="Sector 29 PS, Gurugram",
                        date_reported=now - timedelta(days=2),
                        reason="Armed Carjacking / Grand Theft",
                        priority="CRITICAL",
                        status="ACTIVE",
                        notes="White Hyundai Creta SUV. Armed robbery reported near Cyber City Underpass. High Priority Intercept."
                    ),
                    StolenVehicle(
                        vehicle_number="MH12DE1432",
                        owner_name="Pooja Deshmukh",
                        vehicle_type="SCOOTER",
                        fir_number="FIR-2026-PUN-33109",
                        police_station="Shivaji Nagar PS, Pune",
                        date_reported=now - timedelta(days=7),
                        reason="Vehicle Theft",
                        priority="MEDIUM",
                        status="ACTIVE",
                        notes="Red Activa 6G scooter. Key left in ignition."
                    ),
                    StolenVehicle(
                        vehicle_number="KA05MK9821",
                        owner_name="Anand Murthy",
                        vehicle_type="MOTORCYCLE",
                        fir_number="FIR-2026-BLR-12093",
                        police_station="Indiranagar PS, Bengaluru",
                        date_reported=now - timedelta(days=12),
                        reason="Hit & Run Felony",
                        priority="HIGH",
                        status="RECOVERED",
                        notes="Royal Enfield Classic 350. Recovered by Highway Patrol Unit 4."
                    )
                ]
                for sv in sample_stolen_vehicles:
                    session.add(sv)

            # 8. Seed Default Stolen Vehicle Settings
            stmt_svs = select(StolenVehicleSettings)
            svs_rec = (await session.execute(stmt_svs)).scalars().first()
            if not svs_rec:
                session.add(StolenVehicleSettings(
                    enabled=True,
                    alert_cooldown_seconds=300,
                    duplicate_interval_seconds=300,
                    dashboard_notification=True,
                    browser_notification=True,
                    sound_alert=True,
                    sms_enabled=False,
                    whatsapp_enabled=False,
                    email_enabled=False
                ))

            # 9. Seed Initial Stolen Vehicle Alert Records
            stmt_sva = select(StolenVehicleAlert)
            sva_rec = (await session.execute(stmt_sva)).scalars().first()
            if not sva_rec:
                sample_alerts = [
                    StolenVehicleAlert(
                        vehicle_number="HR26DQ5519",
                        owner_name="Vikramaditya Singh",
                        fir_number="FIR-2026-GGN-44120",
                        camera_name="Highway ANPR Camera 02",
                        camera_location="NH-48 Rajiv Chowk Flyover",
                        latitude=28.4595,
                        longitude=77.0266,
                        timestamp=now - timedelta(minutes=15),
                        ocr_text="HR 26 DQ 5519",
                        confidence=0.98,
                        frame_number=142,
                        status="ACTIVE",
                        remarks="Instant ANPR camera match against State Police Crime Database. Alert dispatched to Patrol Intercept Squad."
                    ),
                    StolenVehicleAlert(
                        vehicle_number="DL01AB1234",
                        owner_name="Rajesh Kumar Sharma",
                        fir_number="FIR-2026-DEL-88912",
                        camera_name="City Surveillance Dome C4",
                        camera_location="MG Road Metro Intersection",
                        latitude=28.4655,
                        longitude=77.0330,
                        timestamp=now - timedelta(hours=1, minutes=30),
                        ocr_text="DL01AB1234",
                        confidence=0.96,
                        frame_number=290,
                        status="INVESTIGATING",
                        resolved_by="Inspector Sharma",
                        remarks="Surveillance unit tracking movement heading towards Mehrauli-Gurgaon border."
                    )
                ]
                for sa in sample_alerts:
                    session.add(sa)

            await session.commit()
            print("✅ Default Database Seeds (Admin, Inspector, Settings, Violations, Stolen Vehicles) checked.")
        except Exception as seed_err:
            await session.rollback()
            print(f"Note on seeding database: {seed_err}")

