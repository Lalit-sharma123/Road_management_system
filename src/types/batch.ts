import { PipelineStage } from '../components/VideoUploadAndProcessor';
import { InspectionVideo, SeverityLevel } from './inspection';

export interface BatchItemStats {
  totalFrames: number;
  potholesCount: number;
  cracksCount: number;
  criticalCount: number;
  roadHealthScore: number;
  severity: SeverityLevel;
  damageDensity: number;
  avgInferenceMs: number;
}

export interface BatchQueueItem {
  id: string;
  file?: File;
  isSample?: boolean;
  sampleVideoUrl?: string;
  title: string;
  filename: string;
  fileSizeBytes: number;
  previewUrl: string;
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'failed' | 'paused';
  currentStage: PipelineStage;
  progress: number; // 0 to 100%
  uploadProgress: number;
  inferProgress: number;
  stageMessage?: string;
  error?: string;
  stats?: BatchItemStats;
  resultVideo?: InspectionVideo;
  startedAt?: number;
  completedAt?: number;
}

export interface BatchCollectiveStats {
  totalItems: number;
  queuedCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  overallProgress: number; // 0 to 100%
  totalDefectsFound: number;
  totalPotholesFound: number;
  totalCracksFound: number;
  totalCriticalHazards: number;
  averageRoadHealth: number;
  totalBytesProcessed: number;
  totalFramesProcessed: number;
  elapsedSeconds: number;
  estimatedRemainingSeconds: number;
}
