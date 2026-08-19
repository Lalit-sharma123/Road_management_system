import { apiClient } from './apiClient';
import { InspectionVideo } from '../types/inspection';

export interface ProcessVideoParams {
  video_id: string;
  confidence_threshold?: number;
  frame_skip?: number;
  enable_histogram_equalization?: boolean;
  enable_gaussian_blur?: boolean;
}

export interface ProcessVideoResponse {
  video_id: string;
  status: string;
  message: string;
  total_frames_processed: number;
  total_detections_found: number;
  road_health_score: number;
}

export const videoService = {
  async uploadVideo(
    file: File,
    title: string,
    onProgress?: (progressPercentage: number) => void
  ): Promise<InspectionVideo> {
    const formData = new FormData();
    formData.append('title', title || file.name);
    formData.append('file', file);

    const response = await apiClient.post<InspectionVideo>('/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });

    return response.data;
  },

  async runProcessingPipeline(params: ProcessVideoParams): Promise<ProcessVideoResponse> {
    const response = await apiClient.post<ProcessVideoResponse>('/process/run', {
      video_id: params.video_id,
      confidence_threshold: params.confidence_threshold ?? 0.35,
      frame_skip: params.frame_skip ?? 2,
      enable_histogram_equalization: params.enable_histogram_equalization ?? true,
      enable_gaussian_blur: params.enable_gaussian_blur ?? true,
    });
    return response.data;
  },

  async stopProcessingPipeline(): Promise<{ status: string; message: string }> {
    const response = await apiClient.post<{ status: string; message: string }>('/process/stop');
    return response.data;
  },

  async getVideoDetails(videoId: string): Promise<InspectionVideo> {
    const response = await apiClient.get<InspectionVideo>(`/videos/${videoId}`);
    return response.data;
  },

  async getVideoDashboard(videoId: string): Promise<any> {
    const response = await apiClient.get<any>(`/videos/${videoId}/dashboard`);
    return response.data;
  },

  async listVideos(): Promise<InspectionVideo[]> {
    try {
      const response = await apiClient.get<any>('/videos');
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (response.data && Array.isArray(response.data.items)) {
        return response.data.items;
      }
      if (response.data && Array.isArray(response.data.videos)) {
        return response.data.videos;
      }
      return [];
    } catch {
      return [];
    }
  },

  connectWebSocket(
    clientId: string,
    onMessage: (data: any) => void,
    onError?: (error: Event) => void
  ): WebSocket {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const defaultBase = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}/api/v1` : 'http://localhost:8000/api/v1';
    const baseURL = apiClient.defaults.baseURL || defaultBase;
    
    let wsURL: string;
    if (baseURL.startsWith('http://') || baseURL.startsWith('https://')) {
      wsURL = baseURL.replace(/^http/, 'ws').replace(/^https/, 'wss') + `/process/ws/${clientId}`;
    } else {
      const wsProtocol = isHttps ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsURL = `${wsProtocol}//${host}${baseURL}/process/ws/${clientId}`;
    }
    
    const ws = new WebSocket(wsURL);

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onMessage(parsed);
      } catch (err) {
        console.warn('Non-JSON WebSocket message received:', event.data);
      }
    };

    if (onError) {
      ws.onerror = onError;
    }

    return ws;
  },
};
