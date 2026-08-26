import json
import asyncio
import logging
from typing import List, Dict, Any, Set, Optional

try:
    from fastapi import WebSocket, WebSocketDisconnect
except ImportError:
    class WebSocket:
        pass
    class WebSocketDisconnect(Exception):
        pass

logger = logging.getLogger("WebSocketConnectionManager")


class WebSocketConnectionManager:
    """
    Centralized Real-Time WebSocket Broadcaster for Smart Road Damage Detection.
    Broadcasting live frame detections, camera telemetry, dashboard stats, and video progress.
    Wrapped in isolated safe error handlers to ensure one slow, disconnected, or malformed client
    never blocks, hangs, or crashes the streaming pipeline for other active viewers.
    """

    def __init__(self):
        # Map connection -> metadata dict {"client_id": str, "session_id": Optional[str], "video_id": Optional[str]}
        self.active_connections: Dict[WebSocket, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def connect(
        self,
        websocket: WebSocket,
        client_id: str = "default",
        session_id: Optional[str] = None,
        video_id: Optional[str] = None
    ):
        try:
            await websocket.accept()
            self.active_connections[websocket] = {
                "client_id": client_id,
                "session_id": session_id,
                "video_id": video_id
            }
            logger.info(f"🔌 [WS Broadcaster] Connected client '{client_id}' (session: {session_id}, video: {video_id}) | Active total: {len(self.active_connections)}")
        except Exception as e:
            logger.warning(f"⚠️ [WS Broadcaster] Error accepting WebSocket connection for client '{client_id}': {e}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            info = self.active_connections.pop(websocket, {})
            logger.info(f"🔌 [WS Broadcaster] Disconnected client '{info.get('client_id')}' | Remaining active: {len(self.active_connections)}")
            try:
                # Attempt graceful close if not already closed
                asyncio.create_task(websocket.close())
            except Exception:
                pass

    async def broadcast(self, message: Dict[str, Any]):
        """
        Safely broadcast JSON payload to active WebSocket connections.
        Each client send is isolated with a timeout and comprehensive try-except block.
        Disconnected or dead clients are collected and pruned without interrupting the broadcast
        to other active viewers.
        """
        if not self.active_connections:
            return

        try:
            payload = json.dumps(message)
        except Exception as e:
            logger.error(f"❌ Failed to serialize WebSocket broadcast payload: {e}")
            return

        msg_vid = message.get("video_id")
        msg_session = message.get("session_id")
        dead_connections: List[WebSocket] = []

        # Iterate over a snapshot of active connections to prevent concurrent modification issues
        for connection, info in list(self.active_connections.items()):
            try:
                # 1. Video-specific scoping filter
                conn_vid = info.get("video_id")
                if conn_vid and msg_vid and conn_vid not in ["default", "client", "", "live-detections", "dashboard", "all"]:
                    if conn_vid != msg_vid and conn_vid not in msg_vid and msg_vid not in conn_vid:
                        continue

                # 2. Optional Session-specific scoping filter
                conn_session = info.get("session_id")
                if conn_session and msg_session and conn_session not in ["default", "client", "", "all"]:
                    if conn_session != msg_session and conn_session not in msg_session and msg_session not in conn_session:
                        continue

                # 3. Isolated non-blocking frame dispatch with 0.8s timeout
                await asyncio.wait_for(connection.send_text(payload), timeout=0.8)
            except (asyncio.TimeoutError, WebSocketDisconnect, ConnectionResetError, RuntimeError, Exception) as send_err:
                logger.debug(f"⚠️ Removing unresponsive WebSocket client ({info.get('client_id')}): {send_err}")
                dead_connections.append(connection)

        # Prune all dead/unresponsive connections safely
        for conn in dead_connections:
            self.disconnect(conn)

    def get_active_count(self) -> int:
        return len(self.active_connections)


# Global Manager Instance
ws_broadcaster = WebSocketConnectionManager()

