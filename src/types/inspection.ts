export type UserRole = 'super_admin' | 'admin' | 'operator' | 'inspector' | 'viewer';

export type CameraType = 'cctv' | 'rtsp' | 'webcam' | 'dashcam' | 'drone' | 'mobile';

export type CameraStatus = 'online' | 'offline' | 'busy' | 'maintenance';

export interface CameraDevice {
  id: string;
  camera_name: string;
  camera_type: CameraType;
  stream_url: string;
  latitude: number;
  longitude: number;
  location_name?: string;
  description?: string;
  fps: number;
  resolution: string;
  status: CameraStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_connected?: string;
  detection_count?: number;
  road_health?: number;
  vehicle_count?: number;
}

export type DamageCategory = 
  | 'pothole'
  | 'longitudinal_crack'
  | 'transverse_crack'
  | 'alligator_crack'
  | 'missing_asphalt'
  | 'broken_road';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
  area_pixels: number;
}

export interface Detection {
  id: string;
  video_id: string;
  frame_number: number;
  timestamp_sec: number;
  category: DamageCategory;
  confidence: number; // 0.0 to 1.0
  severity: SeverityLevel;
  severity_score: number; // 0.0 to 100.0
  bbox: BoundingBox;
  model_name?: string;
  latitude?: number;
  longitude?: number;
  road_name?: string;
  road_authority?: string;
  depth_cm?: number;
  width_cm?: number;
}

export interface FrameData {
  id: string;
  frame_number: number;
  timestamp_sec: number;
  image_url: string;
  has_damage: boolean;
  detections: Detection[];
}

export interface GPSPoint {
  frame_number: number;
  latitude: number;
  longitude: number;
  altitude_meters: number;
  speed_kmh: number;
  road_name: string;
}

export interface RoadAnalyticsData {
  road_health_score: number; // 0.0 to 100.0
  total_detections: number;
  pothole_count: number;
  crack_count: number;
  critical_count: number;
  damage_density_per_km: number;
  overall_severity: SeverityLevel;
}

export interface InspectionVideo {
  id: string;
  title: string;
  filename: string;
  file_size_bytes: number;
  duration_seconds: number;
  total_frames: number;
  fps: number;
  resolution: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  thumbnail_url: string;
  video_url?: string;
  local_video_url?: string;
  processed_video_url?: string;
  file_path?: string;
  processed_file_path?: string;
  created_at: string;
  analytics?: RoadAnalyticsData;
  gps_tracks?: GPSPoint[];
  frames?: FrameData[];
}

export interface BackendFile {
  path: string;
  filename: string;
  purpose: string;
  language: 'python' | 'dockerfile' | 'yaml' | 'markdown' | 'text' | 'json';
  content: string;
}

export interface DetectionModel {
  id: string;
  model_name: string;
  display_name: string;
  weight_path: string;
  enabled: boolean;
  version: string;
  description: string;
  is_default?: boolean;
}

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: string;
  details: string;
}

export type ViolationFineStatus = 'ISSUED' | 'PENDING' | 'PAID' | 'DISPUTED' | 'CANCELLED';

export interface TrafficViolation {
  id: string;
  challan_number: string;
  violation_type: string;
  license_plate_number: string;
  confidence: number;
  rider_confidence?: number;
  fine_amount: number;
  fine_status: ViolationFineStatus;
  video_id?: string;
  camera_id?: string;
  frame_number?: number;
  timestamp_seconds?: number;
  evidence_image_url?: string;
  evidence_base64?: string;
  plate_crop_url?: string;
  rider_crop_url?: string;
  vehicle_type: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface ViolationStats {
  total_violations: number;
  helmet_violations_count: number;
  total_fines_amount: number;
  paid_fines_amount: number;
  unpaid_fines_amount: number;
  issued_count: number;
  pending_count: number;
  paid_count: number;
  unique_plates_count: number;
  recent_violations: TrafficViolation[];
}

export interface PotholeHeatmapPoint {
  id?: string;
  latitude: number;
  longitude: number;
  intensity: number; // 0.1 to 1.0
  severity?: SeverityLevel | string;
  category?: DamageCategory | string;
  confidence?: number;
  road_name?: string;
  road_authority?: string;
  source?: 'database' | 'detection' | 'driver_alert' | 'complaint' | 'historical_database';
  created_at?: string;
}

export interface HeatmapHotspot {
  corridor: string;
  center: [number, number];
  severity: string;
  pothole_count: number;
  hazard_index: number;
}

export interface PotholeHeatmapResponse {
  status: string;
  total_records: number;
  days_window: number;
  heatmap_points: PotholeHeatmapPoint[];
  density_summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  hotspots?: HeatmapHotspot[];
}

export interface PotholeComplaintItem {
  id: string;
  complaint_number: string;
  detection_id?: string;
  driver_id?: string;
  session_id?: string;
  road_name?: string;
  road_authority?: string;
  city?: string;
  state?: string;
  severity: string;
  description?: string;
  evidence_image_url?: string;
  status: 'Submitted' | 'Under Review' | 'In Progress' | 'Resolved' | string;
  assigned_department?: string;
  resolution_notes?: string;
  latitude: number;
  longitude: number;
  created_at?: string;
  updated_at?: string;
}

export interface DetectedPotholeItem {
  id?: string;
  pothole_id: string;
  detection_id?: string;
  track_id?: number;
  latitude: number;
  longitude: number;
  severity: string;
  confidence: number;
  distance_meters?: number;
  lane_position?: string;
  road_name?: string;
  road_authority?: string;
  timestamp: string;
  image_url?: string;
}

export interface DriverSettings {
  alert_distance_meters: number;
  voice_alerts_enabled: boolean;
  min_confidence: number;
  min_severity: string;
  camera_source: string;
  fps: number;
  frame_skip: number;
  camera_height_meters: number;
  camera_pitch_degrees: number;
  speed_kmh: number;
}

export interface AdaptiveFrameSkipTelemetry {
  mode: string;
  current_frame_skip: number;
  base_frame_skip: number;
  min_frame_skip: number;
  max_frame_skip: number;
  effective_inference_fps: number;
  target_stream_fps: number;
  pressure_score: number;
  load_status: string;
  adaptation_reason: string;
  cpu_utilization_pct: number;
  gpu_utilization_pct: number;
  gpu_memory_allocated_mb: number;
  avg_inference_latency_ms: number;
  traffic_density_objects: number;
  is_active: boolean;
}

export interface HardwareTelemetryData {
  is_cuda?: boolean;
  device_name?: string;
  gpu_allocated_mb?: number;
  gpu_reserved_mb?: number;
  gpu_total_mb?: number;
  gpu_utilization_pct?: number;
  fps: number;
  total_frames_processed?: number;
  avg_latency_ms: number;
  min_latency_ms?: number;
  max_latency_ms?: number;
  dropped_frames?: number;
  latency_history?: number[];
  pipeline_status?: 'optimal' | 'moderate' | 'degraded';
  adaptive_frame_skip?: AdaptiveFrameSkipTelemetry;
  p95_latency_ms?: number;
  p99_latency_ms?: number;
  cpu_percent?: number;
  gpu_percent?: number;
  memory_used_mb?: number;
  memory_total_mb?: number;
  active_streams?: number;
  frame_skip_ratio?: number;
}

export interface StageBreakdownMs {
  yolo_inference: number;
  distance_projection?: number;
  hazard_tracking?: number;
  hud_rendering?: number;
  capture?: number;
  preprocessing?: number;
  distance_depth?: number;
  postprocessing_tts?: number;
}



