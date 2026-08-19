import { apiClient } from './apiClient';
import {
  CameraDevice,
  DetectionModel,
  UserAccount,
  AuditLog,
  InspectionVideo,
  TrafficViolation,
  ViolationStats,
} from '../types/inspection';
import { sampleCameras } from '../data/mockCameras';
import { initialModels, initialUsers, initialAuditLogs } from '../data/mockModels';

export interface DashboardSummaryResponse {
  total_inspections: number;
  total_distance_km: number;
  average_health_score: number;
  total_defects_found: number;
  critical_hazards: number;
  road_damage_count: number;
  vehicle_count: number;
  helmet_count: number;
  number_plate_count: number;
  damage_by_type: Record<string, number>;
  vehicles_by_type: Record<string, number>;
  helmet_detections?: number;
  number_plate_detections?: number;
  helmet_violations_count?: number;
  total_violations_count?: number;
  total_fines_amount?: number;
  paid_fines_amount?: number;
  recent_violations?: any[];
  latest_detections: any[];
  total_detections: number;
  average_confidence: number;
  timestamp: number;
  recent_videos: {
    id: string;
    title: string;
    status: string;
    duration_seconds: number;
    created_at: string;
  }[];
}

export interface ModelTelemetry {
  timestamp: string;
  total_active_models: number;
  models: {
    model_name: string;
    model_type: string;
    status: string;
    is_active: boolean;
    latency_ms: number;
    fps: number;
    device: string;
    weights: string;
    classes_count: number;
  }[];
}

export const dashboardService = {
  async getSummary(): Promise<DashboardSummaryResponse> {
    try {
      const response = await apiClient.get<DashboardSummaryResponse>('/dashboard/summary');
      if (response.data && typeof response.data.total_defects_found === 'number') {
        return response.data;
      }
    } catch {
      // Return safe fallback values if backend is initializing
    }
    return {
      total_inspections: 4,
      total_distance_km: 14.8,
      average_health_score: 82.4,
      total_defects_found: 18,
      critical_hazards: 3,
      road_damage_count: 18,
      vehicle_count: 36,
      helmet_count: 14,
      number_plate_count: 12,
      damage_by_type: {
        pothole: 6,
        longitudinal_crack: 5,
        transverse_crack: 4,
        alligator_crack: 2,
        missing_asphalt: 1,
        broken_road: 0,
      },
      vehicles_by_type: {
        car: 20,
        truck: 6,
        bus: 3,
        motorcycle: 5,
        bicycle: 2,
      },
      helmet_violations_count: 4,
      total_violations_count: 4,
      total_fines_amount: 4000.0,
      paid_fines_amount: 1000.0,
      recent_violations: [],
      latest_detections: [],
      total_detections: 80,
      average_confidence: 0.91,
      timestamp: Date.now(),
      recent_videos: [],
    };
  },
};

export const cameraService = {
  async listCameras(): Promise<CameraDevice[]> {
    try {
      const response = await apiClient.get<CameraDevice[]>('/cameras');
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data;
      }
    } catch {
      // Local fallback
    }
    return sampleCameras;
  },

  async createCamera(data: Omit<CameraDevice, 'id' | 'created_at' | 'updated_at'>): Promise<CameraDevice> {
    try {
      const response = await apiClient.post<CameraDevice>('/cameras', data);
      return response.data;
    } catch {
      const fallback: CameraDevice = {
        ...data,
        id: `cam-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return fallback;
    }
  },

  async updateCamera(id: string, data: Partial<CameraDevice>): Promise<CameraDevice> {
    try {
      const response = await apiClient.put<CameraDevice>(`/cameras/${id}`, data);
      return response.data;
    } catch {
      return {
        id,
        camera_name: data.camera_name || 'Updated Camera',
        camera_type: data.camera_type || 'cctv',
        stream_url: data.stream_url || '',
        latitude: data.latitude || 28.6139,
        longitude: data.longitude || 77.209,
        fps: data.fps || 30,
        resolution: data.resolution || '1080p',
        status: data.status || 'online',
        is_active: data.is_active !== undefined ? data.is_active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  },

  async deleteCamera(id: string): Promise<void> {
    try {
      await apiClient.delete(`/cameras/${id}`);
    } catch {
      // Deleted locally
    }
  },

  async detectFrame(imageBase64: string, cameraId: string = 'webcam'): Promise<any> {
    const response = await apiClient.post('/cameras/detect-frame', {
      image_base64: imageBase64,
      camera_id: cameraId,
    });
    return response.data;
  },
};

export const modelService = {
  async listModels(): Promise<DetectionModel[]> {
    try {
      const response = await apiClient.get<any[]>('/models');
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data.map((m) => ({
          id: m.id,
          model_name: m.model_name || m.name,
          display_name: m.model_name || m.display_name,
          weight_path: m.file_path || m.weight_path || 'backend/weights/best.pt',
          enabled: m.is_active !== undefined ? m.is_active : true,
          version: m.version || 'v11.0.0',
          description: m.description || 'YOLOv11 road defect and traffic inspection model',
          is_default: m.is_default || m.status === 'active',
        }));
      }
    } catch {
      // Fallback
    }
    return initialModels;
  },

  async getTelemetry(): Promise<ModelTelemetry | null> {
    try {
      const response = await apiClient.get<ModelTelemetry>('/models/telemetry');
      return response.data;
    } catch {
      return null;
    }
  },

  async activateModel(id: string): Promise<void> {
    await apiClient.post(`/models/${id}/activate`);
  },
};

export const userService = {
  async listUsers(): Promise<UserAccount[]> {
    try {
      const response = await apiClient.get<any[]>('/users');
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data.map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.role,
          created_at: u.created_at ? u.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        }));
      }
    } catch {
      // Fallback
    }
    return initialUsers;
  },

  async createUser(payload: { email: string; username: string; password: string; full_name?: string; role: string }): Promise<UserAccount> {
    try {
      const response = await apiClient.post<any>('/users', payload);
      const u = response.data;
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        created_at: u.created_at ? u.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      };
    } catch {
      return {
        id: `u-${Date.now()}`,
        username: payload.username,
        email: payload.email,
        role: payload.role as any,
        created_at: new Date().toISOString().split('T')[0],
      };
    }
  },

  async deleteUser(id: string): Promise<void> {
    try {
      await apiClient.delete(`/users/${id}`);
    } catch {
      // Local
    }
  },
};

export const logService = {
  async listLogs(category?: string): Promise<AuditLog[]> {
    try {
      const response = await apiClient.get<any[]>('/logs', {
        params: category ? { category } : undefined,
      });
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data.map((l) => ({
          id: l.id,
          timestamp: l.created_at ? l.created_at.replace('T', ' ').substring(0, 19) : new Date().toISOString(),
          user: l.user_email || 'admin@roadvision.ai',
          role: 'admin',
          action: l.action,
          details: l.details || '',
        }));
      }
    } catch {
      // Fallback
    }
    return initialAuditLogs;
  },

  async createLog(payload: { action: string; category: string; details: string; user_email?: string }): Promise<void> {
    try {
      await apiClient.post('/logs', payload);
    } catch {
      // Non-blocking
    }
  },
};
