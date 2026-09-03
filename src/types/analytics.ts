export interface RoadHealthTelemetry {
  average_road_health_score: number;
  total_inspected_sections: number;
  rating: string;
}

export interface PotholeFrequencyInterval {
  interval: string;
  timestamp?: number | string;
  minutes_ago?: number;
  potholes: number;
  cracks: number;
  critical_count?: number;
  high_count?: number;
  medium_count?: number;
  low_count?: number;
  frequency_density: number;
  severity_index: number;
}

export interface PotholeTelemetry {
  pothole_count: number;
  crack_count: number;
  total_defects: number;
  density_per_km: number;
  current_frequency_per_min?: number;
  peak_frequency_per_min?: number;
  time_window_minutes?: number;
  categories: Record<string, number>;
  frequency_timeline: PotholeFrequencyInterval[];
}

export interface SeverityScoringTelemetry {
  severities: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  critical_count: number;
  formula_weights: {
    weight_area: number;
    weight_confidence: number;
    weight_category: number;
  };
  estimated_budget: {
    pothole_repairs: number;
    crack_sealing: number;
    critical_re_asphalt: number;
    total_estimated_budget: number;
  };
}

export interface StolenDailyPoint {
  day: string;
  alerts: number;
}

export interface StolenInterceptRecord {
  id: string;
  vehicle_number: string;
  owner_name: string;
  fir_number: string;
  camera_name: string;
  camera_location: string;
  status: string;
  confidence: number;
  detection_count: number;
  timestamp: string;
}

export interface StolenVehicleTelemetry {
  total_stolen_registered: number;
  active_alerts_count: number;
  intercepted_count: number;
  alerts_today_count: number;
  intercept_rate: number;
  timeline: StolenDailyPoint[];
  recent_intercepts: StolenInterceptRecord[];
}

export interface TrafficMobilityTelemetry {
  total_vehicles: number;
  vehicles_by_type: Record<string, number>;
}

export interface ViolationBreakdownItem {
  category: string;
  challans: number;
  fines: number;
  fill: string;
}

export interface ViolationsEnforcementTelemetry {
  total_violations: number;
  helmet_violations: number;
  total_fines_amount: number;
  paid_fines_amount: number;
  violations_breakdown: ViolationBreakdownItem[];
}

export interface MonthlyTrendsTelemetry {
  months: string[];
  potholes: number[];
  cracks: number[];
  stolen_alerts: number[];
  average_health_score: number[];
}

export interface LiveTelemetryResponse {
  status: string;
  timestamp: string;
  road_health: RoadHealthTelemetry;
  pothole_telemetry: PotholeTelemetry;
  severity_scoring: SeverityScoringTelemetry;
  stolen_vehicle_telemetry: StolenVehicleTelemetry;
  traffic_mobility: TrafficMobilityTelemetry;
  violations_enforcement: ViolationsEnforcementTelemetry;
  monthly_trends: MonthlyTrendsTelemetry;
}

export interface RecalculateSeverityRequest {
  weight_area: number;
  weight_confidence: number;
  weight_category: number;
}
