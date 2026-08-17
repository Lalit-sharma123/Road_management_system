import json
import asyncio
from typing import List, Dict, Any, Set
from fastapi import WebSocket

class WebSocketConnectionManager:
    """
    Centralized Real-Time WebSocket Broadcaster for Smart Road Damage Detection.
    Broadcasting live frame detections, camera telemetry, dashboard stats, and video progress.
    """

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast payload to all active WebSocket connections."""
        if not self.active_connections:
            return
        
        payload = json.dumps(message)
        dead_connections = []

        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception:
                dead_connections.append(connection)

        for conn in dead_connections:
            self.disconnect(conn)

# Global Manager Instance
ws_broadcaster = WebSocketConnectionManager()
