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

