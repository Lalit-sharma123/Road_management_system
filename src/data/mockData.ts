import { InspectionVideo } from '../types/inspection';

export const sampleVideos: InspectionVideo[] = [
  {
    id: 'vid-001',
    title: 'NH-48 Expressway Sector 14 Inspection',
    filename: 'nh48_highway_inspection_2026.mp4',
    file_size_bytes: 45200000,
    duration_seconds: 48.0,
    total_frames: 1440,
    fps: 30.0,
    resolution: '1920x1080',
    status: 'completed',
    thumbnail_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-driving-down-a-highway-in-a-sunny-day-41618-large.mp4',
    processed_video_url: 'https://assets.mixkit.co/videos/preview/mixkit-driving-down-a-highway-in-a-sunny-day-41618-large.mp4',
    created_at: '2026-07-28T02:15:00Z',
    analytics: {
      road_health_score: 68.4,
      total_detections: 14,
      pothole_count: 5,
      crack_count: 7,
      critical_count: 3,
      damage_density_per_km: 11.2,
      overall_severity: 'high'
    },
    gps_tracks: [
      { frame_number: 1, latitude: 28.4520, longitude: 77.0420, altitude_meters: 214.2, speed_kmh: 48.5, road_name: 'NH-48 Rajiv Chowk Underpass' },
      { frame_number: 120, latitude: 28.4595, longitude: 77.0266, altitude_meters: 215.4, speed_kmh: 42.5, road_name: 'NH-48 Sector 14 Link A' },
      { frame_number: 280, latitude: 28.4612, longitude: 77.0282, altitude_meters: 215.8, speed_kmh: 44.1, road_name: 'NH-48 Sector 14 Link B' },
      { frame_number: 468, latitude: 28.4635, longitude: 77.0305, altitude_meters: 216.2, speed_kmh: 41.8, road_name: 'NH-48 Sector 14 North' },
      { frame_number: 663, latitude: 28.4720, longitude: 77.0515, altitude_meters: 215.1, speed_kmh: 52.0, road_name: 'NH-48 IFFCO Chowk Flyover' },
      { frame_number: 954, latitude: 28.4810, longitude: 77.0690, altitude_meters: 214.7, speed_kmh: 54.2, road_name: 'NH-48 Signature Tower Segment' },
      { frame_number: 1150, latitude: 28.4900, longitude: 77.0880, altitude_meters: 216.0, speed_kmh: 55.0, road_name: 'NH-48 Cyber City Gateway' },
      { frame_number: 1260, latitude: 28.4980, longitude: 77.0930, altitude_meters: 216.4, speed_kmh: 49.8, road_name: 'NH-48 Shankar Chowk Flyover' },
      { frame_number: 1440, latitude: 28.5080, longitude: 77.1020, altitude_meters: 217.1, speed_kmh: 45.0, road_name: 'NH-48 Sirhaul Toll Plaza' }
    ],
    frames: [
      {
        id: 'frm-001',
        frame_number: 120,
        timestamp_sec: 4.0,
        image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=1200&q=80',
        has_damage: true,
        detections: [
          {
            id: 'det-001',
            video_id: 'vid-001',
            frame_number: 120,
            timestamp_sec: 4.0,
            category: 'pothole',
            confidence: 0.94,
            severity: 'critical',
            severity_score: 88.5,
            bbox: { x_min: 320, y_min: 420, x_max: 580, y_max: 610, area_pixels: 49400 },
            model_name: 'best.pt',
            latitude: 28.4595,
            longitude: 77.0266,
            road_name: 'NH-48 Sector 14 Link A',
            road_authority: 'National Highways Authority of India (NHAI)',
            depth_cm: 6.8,
            width_cm: 45.0
          },
          {
            id: 'det-002',
            video_id: 'vid-001',
            frame_number: 120,
            timestamp_sec: 4.0,
            category: 'alligator_crack',
            confidence: 0.88,
            severity: 'high',
            severity_score: 72.1,
            bbox: { x_min: 680, y_min: 380, x_max: 920, y_max: 540, area_pixels: 38400 },
            model_name: 'best.pt',
            latitude: 28.4598,
            longitude: 77.0269,
            road_name: 'NH-48 Sector 14 Link A',
            road_authority: 'National Highways Authority of India (NHAI)',
            depth_cm: 2.2,
            width_cm: 60.0
          }
        ]
      },
      {
        id: 'frm-002',
        frame_number: 280,
        timestamp_sec: 9.3,
        image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
        has_damage: true,
        detections: [
          {
            id: 'det-003',
            video_id: 'vid-001',
            frame_number: 280,
            timestamp_sec: 9.3,
            category: 'longitudinal_crack',
            confidence: 0.82,
            severity: 'medium',
            severity_score: 48.0,
            bbox: { x_min: 450, y_min: 250, x_max: 510, y_max: 650, area_pixels: 24000 },
            model_name: 'best.pt',
            latitude: 28.4612,
            longitude: 77.0282,
            road_name: 'NH-48 Sector 14 Link B',
            road_authority: 'National Highways Authority of India (NHAI)',
            depth_cm: 1.8,
            width_cm: 32.0
          }
        ]
      },
      {
        id: 'frm-003',
        frame_number: 468,
        timestamp_sec: 15.6,
        image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=1200&q=80',
        has_damage: true,
        detections: [
          {
            id: 'det-004',
            video_id: 'vid-001',
            frame_number: 468,
            timestamp_sec: 15.6,
            category: 'broken_road',
            confidence: 0.91,
            severity: 'critical',
            severity_score: 92.0,
            bbox: { x_min: 200, y_min: 400, x_max: 800, y_max: 680, area_pixels: 168000 },
            model_name: 'best.pt',
            latitude: 28.4635,
            longitude: 77.0305,
            road_name: 'NH-48 Sector 14 North',
            road_authority: 'National Highways Authority of India (NHAI)',
            depth_cm: 8.5,
            width_cm: 95.0
          }
        ]
      },
      {
        id: 'frm-004',
        frame_number: 663,
        timestamp_sec: 22.1,
        image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
        has_damage: true,
        detections: [
          {
            id: 'det-005',
            video_id: 'vid-001',
            frame_number: 663,
            timestamp_sec: 22.1,
            category: 'transverse_crack',
            confidence: 0.76,
            severity: 'low',
            severity_score: 24.1,
            bbox: { x_min: 150, y_min: 520, x_max: 1100, y_max: 560, area_pixels: 38000 },
            model_name: 'best.pt',
            latitude: 28.4720,
            longitude: 77.0515,
            road_name: 'NH-48 IFFCO Chowk Flyover',
            road_authority: 'National Highways Authority of India (NHAI)',
            depth_cm: 1.2,
            width_cm: 75.0
          }
        ]
      },
      {
        id: 'frm-005',
        frame_number: 954,
        timestamp_sec: 31.8,
        image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=1200&q=80',
        has_damage: true,
        detections: [
          {
            id: 'det-006',
            video_id: 'vid-001',
            frame_number: 954,
            timestamp_sec: 31.8,
            category: 'pothole',
            confidence: 0.89,
            severity: 'high',
            severity_score: 78.4,
            bbox: { x_min: 500, y_min: 450, x_max: 780, y_max: 620, area_pixels: 47600 },
            model_name: 'best.pt',
            latitude: 28.4810,
            longitude: 77.0690,
            road_name: 'NH-48 Signature Tower Segment',
            road_authority: 'State PWD Division',
            depth_cm: 5.4,
            width_cm: 42.0
          }
        ]
      },
      {
        id: 'frm-006',
        frame_number: 1260,
        timestamp_sec: 42.0,
        image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
        has_damage: true,
        detections: [
          {
            id: 'det-007',
            video_id: 'vid-001',
            frame_number: 1260,
            timestamp_sec: 42.0,
            category: 'missing_asphalt',
            confidence: 0.85,
            severity: 'medium',
            severity_score: 55.2,
            bbox: { x_min: 300, y_min: 480, x_max: 650, y_max: 620, area_pixels: 49000 },
            model_name: 'best.pt',
            latitude: 28.4980,
            longitude: 77.0930,
            road_name: 'NH-48 Shankar Chowk Flyover',
            road_authority: 'National Highways Authority of India (NHAI)',
            depth_cm: 4.1,
            width_cm: 50.0
          }
        ]
      }
    ]
  },
  {
    id: 'vid-002',
    title: 'NH-44 Delhi-Agra Expressway Corridor B',
    filename: 'nh44_expressway_corridor_b.mp4',
    file_size_bytes: 32800000,
    duration_seconds: 35.0,
    total_frames: 1050,
    fps: 30.0,
    resolution: '1920x1080',
    status: 'completed',
    thumbnail_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-driving-down-a-highway-in-a-sunny-day-41618-large.mp4',
    processed_video_url: 'https://assets.mixkit.co/videos/preview/mixkit-driving-down-a-highway-in-a-sunny-day-41618-large.mp4',
    created_at: '2026-07-27T16:40:00Z',
    analytics: {
      road_health_score: 84.2,
      total_detections: 6,
      pothole_count: 1,
      crack_count: 4,
      critical_count: 0,
      damage_density_per_km: 4.8,
      overall_severity: 'medium'
    },
    gps_tracks: [
      { frame_number: 1, latitude: 28.6139, longitude: 77.2090, altitude_meters: 198.2, speed_kmh: 51.0, road_name: 'NH-44 Express Km 12' },
      { frame_number: 350, latitude: 28.6180, longitude: 77.2140, altitude_meters: 198.6, speed_kmh: 53.4, road_name: 'NH-44 Express Km 13' },
      { frame_number: 700, latitude: 28.6220, longitude: 77.2200, altitude_meters: 199.1, speed_kmh: 50.2, road_name: 'NH-44 Express Km 14' },
      { frame_number: 1050, latitude: 28.6260, longitude: 77.2260, altitude_meters: 199.5, speed_kmh: 52.0, road_name: 'NH-44 Express Km 15' }
    ],
    frames: [
      {
        id: 'frm-007',
        frame_number: 180,
        timestamp_sec: 6.0,
        image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
        has_damage: true,
        detections: [
          {
            id: 'det-008',
            video_id: 'vid-002',
            frame_number: 180,
            timestamp_sec: 6.0,
            category: 'transverse_crack',
            confidence: 0.79,
            severity: 'low',
            severity_score: 22.5,
            bbox: { x_min: 300, y_min: 500, x_max: 900, y_max: 530, area_pixels: 18000 },
            model_name: 'best.pt',
            latitude: 28.6160,
            longitude: 77.2115,
            road_name: 'NH-44 Express Km 12.5',
            road_authority: 'National Highways Authority of India (NHAI)',
            depth_cm: 1.0,
            width_cm: 30.0
          }
        ]
      }
    ]
  }
];
