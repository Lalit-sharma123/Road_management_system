import { apiClient } from './apiClient';
import { PotholeHeatmapResponse, PotholeHeatmapPoint } from '../types/inspection';

export const heatmapService = {
  /**
   * Fetch historical pothole density heatmap data from backend database
   */
  async getPotholeHeatmap(params?: {
    category?: string;
    min_severity?: string;
    days?: number;
  }): Promise<PotholeHeatmapResponse> {
    try {
      const response = await apiClient.get<PotholeHeatmapResponse>('/driver/heatmap', {
        params: {
          category: params?.category || 'all',
          min_severity: params?.min_severity || 'low',
          days: params?.days || 30
        }
      });
      return response.data;
    } catch (err) {
      console.warn('Direct /driver/heatmap endpoint fallback to /analytics/pothole-heatmap', err);
      try {
        const fallbackRes = await apiClient.get<PotholeHeatmapResponse>('/analytics/pothole-heatmap');
        return fallbackRes.data;
      } catch (fallbackErr) {
        console.warn('Fallback to local database density calculation', fallbackErr);
        throw fallbackErr;
      }
    }
  }
};
