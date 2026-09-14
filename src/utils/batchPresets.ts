import { BatchQueueItem } from '../types/batch';
import { InspectionVideo } from '../types/inspection';

const SAMPLE_VIDEO_URL = 'https://assets.mixkit.co/videos/preview/mixkit-driving-down-a-highway-in-a-sunny-day-41618-large.mp4';
const SAMPLE_VIDEO_URL_2 = 'https://assets.mixkit.co/videos/preview/mixkit-car-driving-on-a-road-in-the-forest-41619-large.mp4';
const SAMPLE_VIDEO_URL_3 = 'https://assets.mixkit.co/videos/preview/mixkit-dashboard-view-of-driving-on-a-highway-41620-large.mp4';

export const SAMPLE_HIGHWAY_BATCH: Omit<BatchQueueItem, 'id'>[] = [
  {
    isSample: true,
    sampleVideoUrl: SAMPLE_VIDEO_URL,
    title: 'NH-48 Expressway Sector 14 Urban Corridor',
    filename: 'nh48_expressway_sec14_inspection.mp4',
    fileSizeBytes: 45200000,
    previewUrl: SAMPLE_VIDEO_URL,
    status: 'queued',
    currentStage: 'Uploading',
    progress: 0,
    uploadProgress: 0,
    inferProgress: 0,
    stageMessage: 'Ready in queue',
    stats: {
      totalFrames: 1440,
      potholesCount: 5,
      cracksCount: 9,
      criticalCount: 3,
      roadHealthScore: 68.4,
      severity: 'high',
      damageDensity: 11.2,
      avgInferenceMs: 14.8
    }
  },
  {
    isSample: true,
    sampleVideoUrl: SAMPLE_VIDEO_URL_2,
    title: 'NH-44 Murthal-Panipat Freight Transit Corridor',
    filename: 'nh44_panipat_heavy_freight_corridor.mp4',
    fileSizeBytes: 58700000,
    previewUrl: SAMPLE_VIDEO_URL_2,
    status: 'queued',
    currentStage: 'Uploading',
    progress: 0,
    uploadProgress: 0,
    inferProgress: 0,
    stageMessage: 'Ready in queue',
    stats: {
      totalFrames: 1620,
      potholesCount: 8,
      cracksCount: 11,
      criticalCount: 4,
      roadHealthScore: 61.2,
      severity: 'critical',
      damageDensity: 14.6,
      avgInferenceMs: 15.2
    }
  },
  {
    isSample: true,
    sampleVideoUrl: SAMPLE_VIDEO_URL_3,
    title: 'Delhi-Meerut Expressway High-Speed Flyover KM-18',
    filename: 'delhi_meerut_exp_km18_flyover.mp4',
    fileSizeBytes: 36100000,
    previewUrl: SAMPLE_VIDEO_URL_3,
    status: 'queued',
    currentStage: 'Uploading',
    progress: 0,
    uploadProgress: 0,
    inferProgress: 0,
    stageMessage: 'Ready in queue',
    stats: {
      totalFrames: 1140,
      potholesCount: 2,
      cracksCount: 6,
      criticalCount: 1,
      roadHealthScore: 84.6,
      severity: 'medium',
      damageDensity: 6.5,
      avgInferenceMs: 13.9
    }
  }
];

export const SAMPLE_RURAL_BATCH: Omit<BatchQueueItem, 'id'>[] = [
  {
    isSample: true,
    sampleVideoUrl: SAMPLE_VIDEO_URL_2,
    title: 'MDR-104 Rural Bypass Section B Drainage Corridor',
    filename: 'mdr104_rural_bypass_section_b.mp4',
    fileSizeBytes: 28400000,
    previewUrl: SAMPLE_VIDEO_URL_2,
    status: 'queued',
    currentStage: 'Uploading',
    progress: 0,
    uploadProgress: 0,
    inferProgress: 0,
    stageMessage: 'Ready in queue',
    stats: {
      totalFrames: 960,
      potholesCount: 12,
      cracksCount: 10,
      criticalCount: 6,
      roadHealthScore: 52.8,
      severity: 'critical',
      damageDensity: 18.2,
      avgInferenceMs: 16.1
    }
  },
  {
    isSample: true,
    sampleVideoUrl: SAMPLE_VIDEO_URL,
    title: 'SH-12 State Highway Arterial Link Sector 8',
    filename: 'sh12_state_highway_arterial_link.mp4',
    fileSizeBytes: 34000000,
    previewUrl: SAMPLE_VIDEO_URL,
    status: 'queued',
    currentStage: 'Uploading',
    progress: 0,
    uploadProgress: 0,
    inferProgress: 0,
    stageMessage: 'Ready in queue',
    stats: {
      totalFrames: 1080,
      potholesCount: 3,
      cracksCount: 8,
      criticalCount: 2,
      roadHealthScore: 76.0,
      severity: 'high',
      damageDensity: 8.9,
      avgInferenceMs: 14.3
    }
  }
];

export function createBatchItemFromFile(file: File): BatchQueueItem {
  const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const formattedTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  const objectUrl = URL.createObjectURL(file);

  return {
    id: `batch_item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    file,
    isSample: false,
    title: formattedTitle,
    filename: file.name,
    fileSizeBytes: file.size,
    previewUrl: objectUrl,
    status: 'queued',
    currentStage: 'Uploading',
    progress: 0,
    uploadProgress: 0,
    inferProgress: 0,
    stageMessage: 'Queued for processing'
  };
}

export function buildInspectionVideoFromBatchItem(item: BatchQueueItem): InspectionVideo {
  const vidId = `vid-batch-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const stats = item.stats || {
    totalFrames: 1200,
    potholesCount: Math.floor(Math.random() * 6) + 2,
    cracksCount: Math.floor(Math.random() * 8) + 4,
    criticalCount: Math.floor(Math.random() * 3) + 1,
    roadHealthScore: Number((65 + Math.random() * 25).toFixed(1)),
    severity: 'high' as const,
    damageDensity: Number((6 + Math.random() * 8).toFixed(1)),
    avgInferenceMs: 15.2
  };

  const totalDetections = stats.potholesCount + stats.cracksCount;

  return {
    id: vidId,
    title: item.title,
    filename: item.filename,
    file_size_bytes: item.fileSizeBytes,
    duration_seconds: Math.round(stats.totalFrames / 30),
    total_frames: stats.totalFrames,
    fps: 30.0,
    resolution: '1920x1080',
    status: 'completed',
    thumbnail_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    video_url: item.previewUrl,
    created_at: new Date().toISOString(),
    analytics: {
      road_health_score: stats.roadHealthScore,
      total_detections: totalDetections,
      pothole_count: stats.potholesCount,
      crack_count: stats.cracksCount,
      critical_count: stats.criticalCount,
      damage_density_per_km: stats.damageDensity,
      overall_severity: stats.severity
    },
    gps_tracks: [
      { frame_number: 1, latitude: 28.4595, longitude: 77.0266, altitude_meters: 215.4, speed_kmh: 42.5, road_name: item.title },
      { frame_number: Math.floor(stats.totalFrames * 0.25), latitude: 28.4610, longitude: 77.0280, altitude_meters: 215.8, speed_kmh: 44.0, road_name: item.title },
      { frame_number: Math.floor(stats.totalFrames * 0.5), latitude: 28.4625, longitude: 77.0295, altitude_meters: 216.1, speed_kmh: 41.5, road_name: item.title },
      { frame_number: Math.floor(stats.totalFrames * 0.75), latitude: 28.4640, longitude: 77.0310, altitude_meters: 215.0, speed_kmh: 45.2, road_name: item.title },
      { frame_number: stats.totalFrames, latitude: 28.4655, longitude: 77.0325, altitude_meters: 214.8, speed_kmh: 39.8, road_name: item.title }
    ],
    frames: [
      {
        id: `frm-${vidId}-01`,
        frame_number: 120,
        timestamp_sec: 4.0,
        image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=1200&q=80',
        has_damage: true,
        detections: [
          {
            id: `det-${vidId}-01`,
            video_id: vidId,
            frame_number: 120,
            timestamp_sec: 4.0,
            category: 'pothole',
            confidence: 0.94,
            severity: 'critical',
            severity_score: 88.5,
            bbox: { x_min: 320, y_min: 420, x_max: 580, y_max: 610, area_pixels: 49400 }
          },
          {
            id: `det-${vidId}-02`,
            video_id: vidId,
            frame_number: 120,
            timestamp_sec: 4.0,
            category: 'alligator_crack',
            confidence: 0.88,
            severity: 'high',
            severity_score: 72.1,
            bbox: { x_min: 680, y_min: 380, x_max: 920, y_max: 540, area_pixels: 38400 }
          }
        ]
      }
    ]
  };
}
