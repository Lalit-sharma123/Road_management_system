import re
import time
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.models.models import StolenVehicle, StolenVehicleAlert, StolenVehicleSettings
from app.services.notification_service import NotificationService
from app.database.database import AsyncSessionLocal

logger = logging.getLogger("StolenVehicleService")


class StolenVehicleService:
    """
    High-Performance Stolen Vehicle Real-Time Detection & Alert Engine:
    
    1. Plate Normalization: Strips hyphens, spaces, dots, and special characters to uppercase.
    2. In-Memory Hash Map Cache: O(1) instantaneous lookup (<0.05ms) with zero inference latency.
    3. Cooldown & Deduplication: Prevents alert flooding when a vehicle stays in camera view.
    4. Multi-Channel Notification: Pushes instant alerts to WebSocket, UI modals, sound alarms, and SMS/WhatsApp hooks.
    """

    # In-memory O(1) hash map cache: normalized_plate -> StolenVehicle dict
    _registry_cache: Dict[str, Dict[str, Any]] = {}
    
    # Cooldown tracker: f"{camera_id}_{normalized_plate}" -> timestamp
    _cooldown_tracker: Dict[str, float] = {}

    # Cached settings
    _settings_cache: Dict[str, Any] = {
        "enabled": True,
        "alert_cooldown_seconds": 300,
        "duplicate_interval_seconds": 300,
        "dashboard_notification": True,
        "browser_notification": True,
        "sound_alert": True,
        "sms_enabled": False,
        "whatsapp_enabled": False,
        "email_enabled": False
    }

    _is_initialized: bool = False

    @classmethod
    def normalize_plate(cls, plate_str: Optional[str]) -> str:
        """
        Normalizes any vehicle license plate format:
        Examples:
        - "DL-01-AB-1234" -> "DL01AB1234"
        - "hr 26 dq 5519" -> "HR26DQ5519"
        - "MH.12.DE.1432" -> "MH12DE1432"
        """
        if not plate_str:
            return ""
        return re.sub(r'[^A-Z0-9]', '', plate_str.upper())

    @classmethod
    async def initialize_cache(cls):
        """Loads active stolen vehicles and settings from database into fast memory cache on startup."""
        try:
            async with AsyncSessionLocal() as session:
                await cls.reload_cache(session)
                cls._is_initialized = True
                logger.info(f"🚀 Stolen Vehicle In-Memory Registry initialized with {len(cls._registry_cache)} active records.")
        except Exception as e:
            logger.warning(f"Note on StolenVehicleService cache initialization: {e}")

    @classmethod
    async def reload_cache(cls, session: AsyncSession):
        """Refreshes the in-memory cache from database."""
        # 1. Load active stolen vehicles
        stmt = select(StolenVehicle).where(StolenVehicle.status == "ACTIVE")
        result = await session.execute(stmt)
        vehicles = result.scalars().all()

        new_cache = {}
        for v in vehicles:
            norm = cls.normalize_plate(v.vehicle_number)
            if norm:
                new_cache[norm] = {
                    "id": v.id,
                    "vehicle_number": v.vehicle_number,
                    "normalized_number": norm,
                    "owner_name": v.owner_name,
                    "vehicle_type": v.vehicle_type,
                    "fir_number": v.fir_number,
                    "police_station": v.police_station,
                    "date_reported": v.date_reported.isoformat() if v.date_reported else None,
                    "reason": v.reason,
                    "priority": v.priority,
                    "status": v.status,
                    "notes": v.notes
                }
        cls._registry_cache = new_cache

        # 2. Load system settings
        stmt_set = select(StolenVehicleSettings)
        set_res = (await session.execute(stmt_set)).scalars().first()
        if set_res:
            cls._settings_cache = {
                "enabled": set_res.enabled,
                "alert_cooldown_seconds": set_res.alert_cooldown_seconds,
                "duplicate_interval_seconds": set_res.duplicate_interval_seconds,
                "dashboard_notification": set_res.dashboard_notification,
                "browser_notification": set_res.browser_notification,
                "sound_alert": set_res.sound_alert,
                "sms_enabled": set_res.sms_enabled,
                "whatsapp_enabled": set_res.whatsapp_enabled,
                "email_enabled": set_res.email_enabled
            }

    @classmethod
    def is_stolen_in_memory(cls, plate_str: str) -> Optional[Dict[str, Any]]:
        """
        Ultra-fast O(1) synchronous in-memory lookup.
        Zero performance overhead on YOLO/ANPR inference loop.
        """
        if not cls._settings_cache.get("enabled", True):
            return None
        
        norm = cls.normalize_plate(plate_str)
        if not norm:
            return None
        
        return cls._registry_cache.get(norm)

    @classmethod
    def check_cooldown(cls, camera_id: Optional[str], normalized_plate: str) -> bool:
        """
        Returns True if cooldown is active (alert should be suppressed),
        False if alert is permitted (and updates cooldown timestamp).
        """
        cam_key = f"{camera_id or 'global'}_{normalized_plate}"
        now = time.time()
        cooldown_sec = cls._settings_cache.get("alert_cooldown_seconds", 300)

        if cam_key in cls._cooldown_tracker:
            elapsed = now - cls._cooldown_tracker[cam_key]
            if elapsed < cooldown_sec:
                return True  # Under active cooldown

        cls._cooldown_tracker[cam_key] = now
        return False

    @classmethod
    async def process_plate_detection(
        cls,
        plate_str: str,
        camera_id: Optional[str] = "CAM-01",
        camera_name: Optional[str] = "Surveillance Camera",
        camera_location: Optional[str] = "National Highway 48",
        latitude: float = 28.4595,
        longitude: float = 77.0266,
        vehicle_snapshot_url: Optional[str] = None,
        vehicle_snapshot_path: Optional[str] = None,
        plate_crop_url: Optional[str] = None,
        plate_crop_path: Optional[str] = None,
        ocr_confidence: float = 0.95,
        stream_id: Optional[str] = None,
        frame_number: Optional[int] = None,
        tracking_id: Optional[str] = None,
        db_session: Optional[AsyncSession] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Main Stolen Vehicle Evaluation & Alert Dispatch Pipeline:
        
        1. Checks O(1) in-memory cache.
        2. Evaluates camera cooldown.
        3. Persists StolenVehicleAlert to database.
        4. Broadcasts WebSocket event & notifies channels.
        """
        stolen_record = cls.is_stolen_in_memory(plate_str)
        if not stolen_record:
            return None

        norm_plate = stolen_record["normalized_number"]

        # Check duplicate cooldown per camera stream
        if cls.check_cooldown(camera_id, norm_plate):
            logger.info(f"Stolen vehicle {norm_plate} detected again on {camera_id} (suppressed by cooldown).")
            return None

        alert_id = str(uuid.uuid4())
        now_dt = datetime.now(timezone.utc)

        alert_dict = {
            "id": alert_id,
            "stolen_vehicle_id": stolen_record.get("id"),
            "vehicle_number": stolen_record.get("vehicle_number", norm_plate),
            "owner_name": stolen_record.get("owner_name"),
            "fir_number": stolen_record.get("fir_number"),
            "vehicle_type": stolen_record.get("vehicle_type", "VEHICLE"),
            "priority": stolen_record.get("priority", "HIGH"),
            "police_station": stolen_record.get("police_station"),
            "camera_id": camera_id,
            "camera_name": camera_name,
            "camera_location": camera_location,
            "latitude": latitude,
            "longitude": longitude,
            "timestamp": now_dt.isoformat(),
            "vehicle_snapshot_url": vehicle_snapshot_url,
            "vehicle_snapshot_path": vehicle_snapshot_path,
            "plate_crop_url": plate_crop_url,
            "plate_crop_path": plate_crop_path,
            "ocr_text": plate_str,
            "confidence": round(float(ocr_confidence), 2),
            "stream_id": stream_id,
            "frame_number": frame_number,
            "tracking_id": tracking_id,
            "status": "ACTIVE",
            "remarks": f"MATCH: Plate '{plate_str}' matches Stolen Vehicle Registry ({stolen_record.get('fir_number')}). Flagged by {camera_name}."
        }

        # 1. Save alert in DB (using provided session or new session)
        async def _save_alert(sess: AsyncSession):
            alert_db = StolenVehicleAlert(
                id=alert_id,
                stolen_vehicle_id=stolen_record.get("id"),
                vehicle_number=stolen_record.get("vehicle_number", norm_plate),
                owner_name=stolen_record.get("owner_name"),
                fir_number=stolen_record.get("fir_number"),
                camera_id=camera_id,
                camera_name=camera_name,
                camera_location=camera_location,
                latitude=latitude,
                longitude=longitude,
                timestamp=now_dt,
                vehicle_snapshot_url=vehicle_snapshot_url,
                vehicle_snapshot_path=vehicle_snapshot_path,
                plate_crop_url=plate_crop_url,
                plate_crop_path=plate_crop_path,
                ocr_text=plate_str,
                confidence=float(ocr_confidence),
                stream_id=stream_id,
                frame_number=frame_number,
                tracking_id=tracking_id,
                status="ACTIVE",
                remarks=alert_dict["remarks"]
            )
            sess.add(alert_db)
            await sess.commit()

        if db_session:
            try:
                await _save_alert(db_session)
            except Exception as e:
                logger.error(f"Error saving StolenVehicleAlert in existing session: {e}")
        else:
            try:
                async with AsyncSessionLocal() as session:
                    await _save_alert(session)
            except Exception as e:
                logger.error(f"Error saving StolenVehicleAlert in new session: {e}")

        # 2. Dispatch multi-channel notifications (WebSocket, Sound, Browser, SMS/WhatsApp)
        try:
            await NotificationService.dispatch_stolen_vehicle_alert(
                alert_data=alert_dict,
                settings_dict=cls._settings_cache
            )
        except Exception as ne:
            logger.error(f"Error dispatching stolen vehicle notifications: {ne}")

        logger.warning(f"🚨🚨 [STOLEN VEHICLE ALERT DISPATCHED]: Plate {norm_plate} at {camera_location} (FIR: {stolen_record.get('fir_number')})")
        return alert_dict
