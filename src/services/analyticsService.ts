import { apiClient } from './apiClient';
import { LiveTelemetryResponse, RecalculateSeverityRequest } from '../types/analytics';

export const analyticsService = {
  /**
   * Fetches unified live telemetry data from backend including pothole frequency,
   * severity scoring, stolen vehicle alerts, vehicle mobility, and violation enforcement.
   */
  async getLiveTelemetry(weights?: {
    weight_area?: number;
    weight_confidence?: number;
    weight_category?: number;
  }): Promise<LiveTelemetryResponse> {
    const params = new URLSearchParams();
    if (weights?.weight_area !== undefined) params.append('weight_area', weights.weight_area.toString());
    if (weights?.weight_confidence !== undefined) params.append('weight_confidence', weights.weight_confidence.toString());
    if (weights?.weight_category !== undefined) params.append('weight_category', weights.weight_category.toString());

    const queryString = params.toString();
    const endpoint = `/analytics/live-telemetry${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<LiveTelemetryResponse>(endpoint);
    return response.data;
  },

  /**
   * Recalculates severity scoring and budget estimation using custom weights.
   */
  async recalculateSeverity(request: RecalculateSeverityRequest) {
    const response = await apiClient.post('/analytics/recalculate-severity', request);
    return response.data;
  },

  /**
   * Fetches GIS heatmap data for potholes.
   */
  async getPotholeHeatmap() {
    const response = await apiClient.get('/analytics/pothole-heatmap');
    return response.data;
  },

  /**
   * Fetches damage statistics summary.
   */
  async getDamageStatistics() {
    const response = await apiClient.get('/analytics/damage-statistics');
    return response.data;
  },

  /**
   * Fetches road health score overview.
   */
  async getRoadHealthScore() {
    const response = await apiClient.get('/analytics/road-health-score');
    return response.data;
  }
};
