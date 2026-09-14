import React from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Upload, 
  Sparkles, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Activity, 
  Clock, 
  HardDrive, 
  Cpu, 
  ShieldAlert,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { BatchCollectiveStats } from '../../types/batch';
import { UserRole } from '../../types/inspection';

interface BatchQueueHeaderProps {
  stats: BatchCollectiveStats;
  isProcessing: boolean;
  isPaused: boolean;
  currentRole: UserRole;
  onStartBatch: () => void;
  onPauseBatch: () => void;
  onResumeBatch: () => void;
  onCancelBatch: () => void;
  onClearCompleted: () => void;
  onClearAll: () => void;
  onOpenAddFiles: () => void;
  onLoadHighwayPreset: () => void;
  onLoadRuralPreset: () => void;
  activeItemTitle?: string;
  activeItemStage?: string;
}

export const BatchQueueHeader: React.FC<BatchQueueHeaderProps> = ({
  stats,
  isProcessing,
  isPaused,
  currentRole,
  onStartBatch,
  onPauseBatch,
  onResumeBatch,
  onCancelBatch,
  onClearCompleted,
  onClearAll,
  onOpenAddFiles,
  onLoadHighwayPreset,
  onLoadRuralPreset,
  activeItemTitle,
  activeItemStage
}) => {
  const canStart = stats.queuedCount > 0 && currentRole !== 'viewer' && (!isProcessing || isPaused);

  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xs space-y-6">
      {/* Top Title & Status Matrix */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Batch Inspection Engine
            </span>
            {isProcessing && !isPaused && (
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                Processing
              </span>
            )}
            {isPaused && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-1.5">
                Paused
              </span>
            )}
            {stats.completedCount > 0 && stats.queuedCount === 0 && !isProcessing && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Batch Complete
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Video Processing Queue
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Run automated YOLO defect detection and geo-tagging across queued road corridor videos.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {(!isProcessing || isPaused) ? (
            <button
              onClick={isPaused ? onResumeBatch : onStartBatch}
              disabled={!canStart}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm ${
                canStart
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 active:scale-98 cursor-pointer'
                  : 'bg-slate-800/80 text-slate-500 border border-slate-700/40 cursor-not-allowed'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isPaused ? 'Resume Processing' : `Process Queue (${stats.queuedCount})`}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onPauseBatch}
                className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-98"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </button>
              <button
                onClick={onCancelBatch}
                className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-98"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            </div>
          )}

          <button
            onClick={onOpenAddFiles}
            disabled={isProcessing && !isPaused}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Add Videos</span>
          </button>

          {stats.completedCount > 0 && (
            <button
              onClick={onClearCompleted}
              disabled={isProcessing && !isPaused}
              className="px-3 py-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 border border-slate-700/50 text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-50"
              title="Remove finished videos from the queue"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Done</span>
            </button>
          )}

          {stats.totalItems > 0 && (
            <button
              onClick={onClearAll}
              disabled={isProcessing && !isPaused}
              className="px-3 py-2.5 rounded-xl bg-slate-800/50 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 text-slate-400 border border-slate-700/50 text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-50"
              title="Reset entire batch queue"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Collective Progress Bar */}
      <div className="space-y-3 bg-slate-950/40 border border-slate-800/80 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-medium">
              Overall Batch Progress:
            </span>
            <span className="text-indigo-400 font-semibold text-sm font-mono">
              {stats.overallProgress.toFixed(1)}%
            </span>
            {isProcessing && activeItemTitle && (
              <span className="text-slate-400 truncate max-w-xs hidden md:inline">
                • Current: <span className="text-white font-medium">{activeItemTitle}</span> ({activeItemStage})
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400">
            <span className="text-white font-semibold">{stats.completedCount}</span> of <span className="text-white font-semibold">{stats.totalItems}</span> Videos Processed
          </div>
        </div>

        {/* Clean Rounded Progress Bar */}
        <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden relative">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${stats.overallProgress}%` }}
          />
        </div>

        {/* Mini Stage Ticker */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Queued: <strong className="text-white font-medium">{stats.queuedCount}</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span>In Progress: <strong className="text-white font-medium">{stats.processingCount}</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Finished: <strong className="text-white font-medium">{stats.completedCount}</strong></span>
            </span>
            {stats.failedCount > 0 && (
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Failed: <strong>{stats.failedCount}</strong></span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Elapsed: {Math.floor(stats.elapsedSeconds / 60)}m {stats.elapsedSeconds % 60}s</span>
          </div>
        </div>
      </div>

      {/* Collective Telemetry Stats 4-Card HUD */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Metric 1: Total Defects */}
        <div className="bg-slate-950/40 border border-slate-800/70 rounded-xl p-3.5 space-y-1.5 hover:border-slate-700/60 transition-colors">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Discovered Hazards</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white flex items-baseline gap-1.5">
            <span>{stats.totalDefectsFound}</span>
            <span className="text-xs font-normal text-slate-400">Defects</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
            <span>Potholes: <strong className="text-rose-400 font-semibold">{stats.totalPotholesFound}</strong></span>
            <span>Cracks: <strong className="text-amber-400 font-semibold">{stats.totalCracksFound}</strong></span>
          </div>
        </div>

        {/* Metric 2: Mean Road Health */}
        <div className="bg-slate-950/40 border border-slate-800/70 rounded-xl p-3.5 space-y-1.5 hover:border-slate-700/60 transition-colors">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Batch Health Index</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white flex items-baseline gap-1.5">
            <span className={
              stats.averageRoadHealth >= 75 ? 'text-emerald-400' :
              stats.averageRoadHealth >= 60 ? 'text-amber-400' :
              stats.averageRoadHealth > 0 ? 'text-rose-400' : 'text-slate-400'
            }>
              {stats.completedCount > 0 ? `${stats.averageRoadHealth.toFixed(1)}%` : '--'}
            </span>
            <span className="text-xs font-normal text-slate-400">Average</span>
          </div>
          <div className="text-xs text-slate-400 pt-1 border-t border-slate-800/60 truncate">
            Critical Hotspots: <strong className="text-rose-400 font-semibold">{stats.totalCriticalHazards}</strong>
          </div>
        </div>

        {/* Metric 3: Processed Frames & Volume */}
        <div className="bg-slate-950/40 border border-slate-800/70 rounded-xl p-3.5 space-y-1.5 hover:border-slate-700/60 transition-colors">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Processed Frames</span>
            <HardDrive className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white flex items-baseline gap-1.5">
            <span>{stats.totalFramesProcessed.toLocaleString()}</span>
            <span className="text-xs font-normal text-slate-400">Frames</span>
          </div>
          <div className="text-xs text-slate-400 pt-1 border-t border-slate-800/60">
            Data: <strong className="text-slate-200 font-semibold">{(stats.totalBytesProcessed / (1024 * 1024)).toFixed(1)} MB</strong>
          </div>
        </div>

        {/* Metric 4: Inference Rate */}
        <div className="bg-slate-950/40 border border-slate-800/70 rounded-xl p-3.5 space-y-1.5 hover:border-slate-700/60 transition-colors">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Tensor Latency</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white flex items-baseline gap-1.5">
            <span>~14.8</span>
            <span className="text-xs font-normal text-slate-400">ms/frame</span>
          </div>
          <div className="text-xs text-emerald-400 pt-1 border-t border-slate-800/60 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>CUDA TensorRT Engine</span>
          </div>
        </div>
      </div>

      {/* Quick Presets Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/70 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 text-xs font-medium">Quick Presets:</span>
          <button
            type="button"
            onClick={onLoadHighwayPreset}
            disabled={isProcessing && !isPaused}
            className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/70 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Highway Corridor (3 Videos)</span>
          </button>

          <button
            type="button"
            onClick={onLoadRuralPreset}
            disabled={isProcessing && !isPaused}
            className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/70 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Rural Arterial (2 Videos)</span>
          </button>
        </div>

        <div className="text-xs text-slate-500">
          Supported files: MP4, AVI, MOV, MKV
        </div>
      </div>
    </div>
  );
};
