export interface StolenVehicle {
  id: string;
  vehicle_number: string;
  owner_name?: string | null;
  vehicle_type: 'CAR' | 'MOTORCYCLE' | 'SCOOTER' | 'TRUCK' | 'BUS' | 'SUV' | 'VAN' | string;
  fir_number: string;
  police_station: string;
  date_reported: string;
  reason: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  status: 'ACTIVE' | 'RECOVERED' | string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StolenVehicleCreateInput {
  vehicle_number: string;
  owner_name?: string;
  vehicle_type: string;
  fir_number: string;
  police_station: string;
  date_reported?: string;
  reason: string;
  priority: string;
  status: string;
  notes?: string;
}

export interface StolenVehicleAlert {
  id: string;
  stolen_vehicle_id?: string | null;
  vehicle_number: string;
  owner_name?: string | null;
  fir_number?: string | null;
  camera_id?: string | null;
  camera_name?: string | null;
  camera_location?: string | null;
  latitude: number;
  longitude: number;
  timestamp: string;
  vehicle_snapshot_url?: string | null;
  vehicle_snapshot_path?: string | null;
  plate_crop_url?: string | null;
  plate_crop_path?: string | null;
  ocr_text: string;
  confidence: number;
  stream_id?: string | null;
  frame_number?: number | null;
  tracking_id?: string | null;
  status: 'ACTIVE' | 'INVESTIGATING' | 'INTERCEPTED' | 'RESOLVED' | 'FALSE_POSITIVE' | string;
  resolved_by?: string | null;
  remarks?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StolenVehicleStats {
  total_stolen_vehicles: number;
  active_alerts: number;
  alerts_today: number;
  recovered_vehicles: number;
  total_alerts_all_time: number;
  critical_alerts_count: number;
  status_breakdown: Record<string, number>;
  priority_breakdown: Record<string, number>;
  camera_breakdown: Array<{
    camera_name: string;
    location: string;
    count: number;
  }>;
  daily_trend: Array<{
    date: string;
    count: number;
  }>;
}

export interface StolenVehicleSettings {
  enabled: boolean;
  alert_cooldown_seconds: number;
  duplicate_interval_seconds: number;
  dashboard_notification: boolean;
  browser_notification: boolean;
  sound_alert: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
}
