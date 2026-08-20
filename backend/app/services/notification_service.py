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
                ws_payload = {
                    "type": "stolen_vehicle_alert",
                    "event": "STOLEN_VEHICLE_DETECTED",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "alert": alert_data
                }
                await ws_broadcaster.broadcast(ws_payload)
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

        # Persist notification logs to database if session provided
        if db_session:
            try:
                from app.models.models import NotificationLog
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
                    db_session.add(nlog)
                await db_session.commit()
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
