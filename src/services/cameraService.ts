import { apiClient } from './apiClient';
import { CameraDevice } from '../types/inspection';

export interface CameraTestResult {
  connected: boolean;
  status: 'online' | 'failed' | 'timeout' | 'error';
  resolution?: string;
  fps?: number;
  latency_ms?: number;
  message?: string;
  error?: string;
}

export interface CameraConnectResult {
  status: string;
  camera_id: string;
  camera_name: string;
  camera_type: string;
  stream_url: string;
  websocket_url: string;
  message: string;
}

export const cameraService = {
  async listCameras(): Promise<CameraDevice[]> {
    try {
      const response = await apiClient.get<CameraDevice[]>('/cameras');
      return response.data;
    } catch {
      return [];
    }
  },

  async testConnection(streamUrl: string, cameraType: string = 'rtsp', timeoutSeconds: number = 6.0): Promise<CameraTestResult> {
    const response = await apiClient.post<CameraTestResult>('/cameras/test-connection', {
      stream_url: streamUrl,
      camera_type: cameraType,
      timeout_seconds: timeoutSeconds
    });
    return response.data;
  },

  async connectCamera(streamUrl: string, cameraName?: string, cameraId?: string, cameraType: string = 'rtsp'): Promise<CameraConnectResult> {
    const response = await apiClient.post<CameraConnectResult>('/cameras/connect', {
      stream_url: streamUrl,
      camera_name: cameraName || 'Live CCTV Feed',
      camera_id: cameraId,
      camera_type: cameraType
    });
    return response.data;
  },

  async disconnectCamera(cameraId: string): Promise<{ status: string; message: string }> {
    const response = await apiClient.post<{ status: string; message: string }>('/cameras/disconnect', {
      camera_id: cameraId
    });
    return response.data;
  },

  connectCameraWebSocket(
    cameraId: string,
    onMessage: (data: any) => void,
    onError?: (error: Event) => void,
    onClose?: (event: CloseEvent) => void,
    onOpen?: () => void
  ): WebSocket {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const wsProtocol = isHttps ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
    const wsURL = `${wsProtocol}//${host}/api/v1/cameras/ws/live/${cameraId}`;

    const ws = new WebSocket(wsURL);

    if (onOpen) {
      ws.onopen = onOpen;
    }

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onMessage(parsed);
      } catch (err) {
        console.warn('Non-JSON camera websocket message:', event.data);
      }
    };

    if (onError) {
      ws.onerror = onError;
    }

    if (onClose) {
      ws.onclose = onClose;
    }

    return ws;
  }
};
