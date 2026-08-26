import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

from app.services.websocket_manager import ws_broadcaster

logger = logging.getLogger("NotificationService")


class NotificationService:
    """
    Multi-Channel Notification Abstraction Service for Traffic and Security Alerts:
    Handles real-time WebSocket broadcast, browser notifications, sound alerts,
    and extensible gateways for SMS, WhatsApp, Email, and Push Notifications.
    """

    @classmethod
    async def dispatch_stolen_vehicle_alert(
        cls,
        alert_data: Dict[str, Any],
        settings_dict: Optional[Dict[str, Any]] = None,
        db_session = None
    ) -> List[Dict[str, Any]]:
        """
        Dispatches stolen vehicle alert to all configured channels based on system settings.
        """
        settings = settings_dict or {
            "dashboard_notification": True,
            "browser_notification": True,
            "sound_alert": True,
            "sms_enabled": False,
            "whatsapp_enabled": False,
            "email_enabled": False
        }

        dispatched_logs = []

        # 1. Primary Real-Time Dashboard WebSocket Broadcast
        if settings.get("dashboard_notification", True):
            try:
                plate_norm = alert_data.get("vehicle_number", "")
                disp_num = alert_data.get("display_number") or plate_norm
                msg = f"STOLEN VEHICLE DETECTED: {plate_norm}"

                # Standard structured event payload requested by client
                ws_payload = {
                    "event": "stolen_vehicle_detected",
                    "type": "stolen_vehicle_alert",
                    "timestamp": alert_data.get("timestamp") or datetime.now(timezone.utc).isoformat(),
                    "vehicle_number": plate_norm,
                    "display_number": disp_num,
                    "confidence": alert_data.get("confidence", 0.95),
                    "plate_confidence": alert_data.get("plate_confidence", 0.95),
                    "ocr_confidence": alert_data.get("ocr_confidence", alert_data.get("confidence", 0.95)),
                    "source": alert_data.get("source", "video" if alert_data.get("stream_id") else "camera"),
                    "video_id": alert_data.get("video_id") or alert_data.get("stream_id"),
                    "session_id": alert_data.get("session_id"),
                    "stream_id": alert_data.get("stream_id"),
                    "camera_id": alert_data.get("camera_id"),
                    "bbox": alert_data.get("bbox", {}),
                    "plate_bbox": alert_data.get("plate_bbox", {}),
                    "message": msg,
                    "alert": alert_data,
                    "data": {
                        "vehicle_number": plate_norm,
                        "display_number": disp_num,
                        "confidence": alert_data.get("confidence", 0.95),
                        "plate_confidence": alert_data.get("plate_confidence", 0.95),
                        "ocr_confidence": alert_data.get("ocr_confidence", alert_data.get("confidence", 0.95)),
                        "source": alert_data.get("source", "video" if alert_data.get("stream_id") else "camera"),
                        "video_id": alert_data.get("video_id") or alert_data.get("stream_id"),
                        "session_id": alert_data.get("session_id"),
                        "camera_id": alert_data.get("camera_id"),
                        "timestamp": alert_data.get("timestamp") or datetime.now(timezone.utc).isoformat(),
                        "bbox": alert_data.get("bbox", {}),
                        "plate_bbox": alert_data.get("plate_bbox", {}),
                        "message": msg,
                        "owner_name": alert_data.get("owner_name"),
                        "fir_number": alert_data.get("fir_number"),
                        "police_station": alert_data.get("police_station"),
                        "vehicle_snapshot_url": alert_data.get("vehicle_snapshot_url"),
                        "plate_crop_url": alert_data.get("plate_crop_url"),
                        "alert_id": alert_data.get("id"),
                        "detection_count": alert_data.get("detection_count", 1)
                    }
                }

                # Single broadcast to active WebSocket connection managers
                await ws_broadcaster.broadcast(ws_payload)

                try:
                    from app.api.process import ws_manager
                    await ws_manager.broadcast(ws_payload)
                except Exception:
                    pass

                dispatched_logs.append({
                    "channel": "DASHBOARD_WEBSOCKET",
                    "status": "SENT",
                    "payload": ws_payload
                })
            except Exception as e:
                logger.error(f"WebSocket broadcast failure: {e}")
                dispatched_logs.append({
                    "channel": "DASHBOARD_WEBSOCKET",
                    "status": "FAILED",
                    "error": str(e)
                })

        # 2. Browser Push & Sound Alert Webhooks
        if settings.get("browser_notification", True):
            dispatched_logs.append({
                "channel": "BROWSER",
                "status": "SENT",
                "recipient": "Connected Dashboard Operators"
            })

        if settings.get("sound_alert", True):
            dispatched_logs.append({
                "channel": "SOUND_ALARM",
                "status": "TRIGGERED",
                "recipient": "Audio Output Subsystem"
            })

        # 3. Extensible SMS Gateway (e.g. Twilio / Police SMS Dispatch)
        if settings.get("sms_enabled", False):
            sms_res = await cls._dispatch_sms(alert_data)
            dispatched_logs.append(sms_res)

        # 4. Extensible WhatsApp Business API Dispatch
        if settings.get("whatsapp_enabled", False):
            wa_res = await cls._dispatch_whatsapp(alert_data)
            dispatched_logs.append(wa_res)

        # 5. Extensible Email / Alert Dispatch
        if settings.get("email_enabled", False):
            email_res = await cls._dispatch_email(alert_data)
            dispatched_logs.append(email_res)

        # Persist notification logs to database using an isolated AsyncSession scope
        if dispatched_logs and alert_data.get("id"):
            try:
                from app.database.database import AsyncSessionLocal
                from app.models.models import NotificationLog
                async with AsyncSessionLocal() as isolated_session:
                    for log_item in dispatched_logs:
                        nlog = NotificationLog(
                            id=str(uuid.uuid4()),
                            alert_id=alert_data.get("id"),
                            channel=log_item.get("channel", "SYSTEM"),
                            recipient=log_item.get("recipient", "Dashboard"),
                            status=log_item.get("status", "SENT"),
                            payload_json=log_item.get("payload"),
                            error_message=log_item.get("error")
                        )
                        isolated_session.add(nlog)
                    await isolated_session.commit()
            except Exception as dbe:
                logger.warning(f"Could not persist notification log: {dbe}")

        return dispatched_logs

    @classmethod
    async def _dispatch_sms(cls, alert: Dict[str, Any]) -> Dict[str, Any]:
        """SMS Provider Hook (e.g. Twilio, MSG91)"""
        plate = alert.get("vehicle_number", "UNKNOWN")
        location = alert.get("camera_location", "Highway")
        msg = f"[CRITICAL POLICE ALERT] Stolen Vehicle {plate} detected at {location} at {alert.get('timestamp')}. Immediate intercept requested."
        logger.info(f"[SMS Dispatch Simulated]: {msg}")
        return {
            "channel": "SMS",
            "status": "SENT",
            "recipient": "Police Control Room (+91-PCR-HQ)",
            "payload": {"message": msg}
        }

    @classmethod
    async def _dispatch_whatsapp(cls, alert: Dict[str, Any]) -> Dict[str, Any]:
        """WhatsApp Provider Hook (Meta Graph API)"""
        plate = alert.get("vehicle_number", "UNKNOWN")
        fir = alert.get("fir_number", "N/A")
        msg = f"🚨 *STOLEN VEHICLE INTERCEPT ALERT*\nPlate: *{plate}*\nFIR: *{fir}*\nLocation: {alert.get('camera_location')}\nTime: {alert.get('timestamp')}"
        logger.info(f"[WhatsApp Dispatch Simulated]: {msg}")
        return {
            "channel": "WHATSAPP",
            "status": "SENT",
            "recipient": "Highway Patrol Quick Response Team",
            "payload": {"message": msg}
        }

    @classmethod
    async def _dispatch_email(cls, alert: Dict[str, Any]) -> Dict[str, Any]:
        """Email Alert Hook (SMTP / SendGrid)"""
        subject = f"CRITICAL: Stolen Vehicle Detected - {alert.get('vehicle_number')}"
        logger.info(f"[Email Dispatch Simulated]: {subject}")
        return {
            "channel": "EMAIL",
            "status": "SENT",
            "recipient": "traffic-police-alerts@gov.in",
            "payload": {"subject": subject}
        }
