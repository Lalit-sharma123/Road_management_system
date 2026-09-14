import React, { useState } from 'react';
import { 
  Film, 
  CheckCircle2, 
  Loader2, 
  AlertTriangle, 
  Eye, 
  Trash2, 
  ArrowRight, 
  RotateCcw, 
  Edit2, 
  Check, 
  X, 
  Clock, 
  Sparkles,
  GripVertical,
  ChevronsUp,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { BatchQueueItem } from '../../types/batch';

interface BatchQueueItemCardProps {
  item: BatchQueueItem;
  index: number;
  isActiveProcessing: boolean;
  isSelectedForPreview: boolean;
  canReorder?: boolean;
  queuedPriorityIndex?: number;
  isFirstQueued?: boolean;
  isLastQueued?: boolean;
  isBeingDragged?: boolean;
  isDragOverTarget?: boolean;
  onSelectPreview: (item: BatchQueueItem) => void;
  onRemoveItem: (id: string) => void;
  onUpdateTitle: (id: string, newTitle: string) => void;
  onRetryItem: (id: string) => void;
  onViewResults?: (item: BatchQueueItem) => void;
  onMoveToTop?: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragOver?: (e: React.DragEvent, id: string) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, targetId: string) => void;
}

export const BatchQueueItemCard: React.FC<BatchQueueItemCardProps> = ({
  item,
  index,
  isActiveProcessing,
  isSelectedForPreview,
  canReorder = true,
  queuedPriorityIndex,
  isFirstQueued,
  isLastQueued,
  isBeingDragged = false,
  isDragOverTarget = false,
  onSelectPreview,
  onRemoveItem,
  onUpdateTitle,
  onRetryItem,
  onViewResults,
  onMoveToTop,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(item.title);

  const handleSaveTitle = () => {
    if (editedTitle.trim()) {
      onUpdateTitle(item.id, editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleCancelTitle = () => {
    setEditedTitle(item.title);
    setIsEditingTitle(false);
  };

  // Status Badge Styling
  const getStatusBadge = () => {
    switch (item.status) {
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Completed
          </span>
        );
      case 'processing':
        return (
          <span className="px-2.5 py-0.5 bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-medium flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
            Analyzing (YOLO)
          </span>
        );
      case 'uploading':
        return (
          <span className="px-2.5 py-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full text-xs font-medium flex items-center gap-1.5 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Uploading
          </span>
        );
      case 'failed':
        return (
          <span className="px-2.5 py-0.5 bg-rose-500/15 text-rose-300 border border-rose-500/30 rounded-full text-xs font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Failed
          </span>
        );
      case 'queued':
      default:
        return (
          <span className="px-2.5 py-0.5 bg-slate-800 text-slate-400 border border-slate-700/70 rounded-full text-xs font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Queued
          </span>
        );
    }
  };

  const isDraggable = canReorder && item.status === 'queued';

  return (
    <div 
      draggable={isDraggable}
      onDragStart={(e) => isDraggable && onDragStart && onDragStart(e, item.id)}
      onDragOver={(e) => {
        if (canReorder && onDragOver) {
          e.preventDefault();
          onDragOver(e, item.id);
        }
      }}
      onDragEnd={(e) => onDragEnd && onDragEnd(e)}
      onDrop={(e) => {
        if (canReorder && onDrop) {
          e.preventDefault();
          onDrop(e, item.id);
        }
      }}
      className={`p-4 rounded-xl border transition-all relative ${
        isBeingDragged
          ? 'opacity-40 border-dashed border-indigo-500 bg-indigo-950/20'
          : isDragOverTarget
          ? 'border-t-2 border-t-indigo-400 bg-indigo-500/10 shadow-md'
          : isSelectedForPreview
          ? 'bg-slate-900/90 border-sky-500/60 shadow-xs ring-1 ring-sky-500/30'
          : isActiveProcessing
          ? 'bg-slate-900/90 border-indigo-500/60 shadow-xs ring-1 ring-indigo-500/30'
          : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/70'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Drag Handle, Index, Icon, Title, and Meta */}
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          
          {/* Drag Handle (for queued items) */}
          {isDraggable && (
            <div 
              className="flex items-center justify-center pt-2 text-slate-500 hover:text-indigo-400 cursor-grab active:cursor-grabbing transition-colors p-1"
              title="Drag & drop to reorder processing priority"
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}

          <div className="flex flex-col items-center justify-center pt-0.5">
            <span className="text-xs font-mono text-slate-500 font-semibold">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className={`w-8 h-8 rounded-lg mt-1 flex items-center justify-center border ${
              item.status === 'completed'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : isActiveProcessing
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-400'
            }`}>
              <Film className="w-4 h-4" />
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            {/* Title Row with Priority Tag */}
            <div className="flex flex-wrap items-center gap-2">
              {isEditingTitle ? (
                <div className="flex items-center space-x-1.5 flex-1 max-w-md">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                    autoFocus
                    className="w-full bg-slate-800 border border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                  />
                  <button
                    onClick={handleSaveTitle}
                    className="p-1.5 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500"
                    title="Save title"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleCancelTitle}
                    className="p-1.5 bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                    title="Cancel edit"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2 truncate">
                  <h4 
                    onClick={() => onSelectPreview(item)}
                    className="text-sm font-semibold text-white truncate hover:text-indigo-400 cursor-pointer transition-colors"
                    title="Click to preview stream"
                  >
                    {item.title}
                  </h4>
                  {item.status === 'queued' && (
                    <button
                      onClick={() => setIsEditingTitle(true)}
                      className="text-slate-500 hover:text-slate-300 p-0.5 transition-colors"
                      title="Rename video section"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {item.isSample && (
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md text-[11px] font-medium">
                      Sample HD
                    </span>
                  )}
                </div>
              )}

              {/* Priority Indicator Badge for Queued Items */}
              {item.status === 'queued' && queuedPriorityIndex !== undefined && (
                queuedPriorityIndex === 1 ? (
                  <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    Processes Next
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-800/80 border border-slate-700/70 text-slate-300 text-xs font-medium rounded-full">
                    Priority #{queuedPriorityIndex}
                  </span>
                )
              )}
            </div>

            {/* Metadata Subline */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
              <span className="text-slate-300 truncate max-w-xs">{item.filename}</span>
              <span>•</span>
              <span>{(item.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
              <span>•</span>
              <span>1080p @ 30 FPS</span>
              {item.stageMessage && (
                <>
                  <span>•</span>
                  <span className={isActiveProcessing ? 'text-indigo-400 font-medium' : 'text-slate-400'}>
                    {item.stageMessage}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Priority Controls, Status Badge & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 pt-1 md:pt-0 border-t md:border-t-0 border-slate-800/60">
          
          {/* Priority Quick Reorder Controls (Move to Top / Up / Down) for Queued items */}
          {item.status === 'queued' && canReorder && (
            <div className="flex items-center space-x-1 mr-1">
              {/* Move to Top Button */}
              {queuedPriorityIndex !== 1 && onMoveToTop && (
                <button
                  onClick={() => onMoveToTop(item.id)}
                  title="Move to Top Priority - Backend worker will process this video next!"
                  className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-lg text-xs font-medium flex items-center gap-1 transition-all active:scale-95"
                >
                  <ChevronsUp className="w-3.5 h-3.5" />
                  <span>Move to Top</span>
                </button>
              )}

              {/* Move Up Button */}
              {!isFirstQueued && onMoveUp && (
                <button
                  onClick={() => onMoveUp(item.id)}
                  title="Move up one position in queue"
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/70 rounded-lg transition-all"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Move Down Button */}
              {!isLastQueued && onMoveDown && (
                <button
                  onClick={() => onMoveDown(item.id)}
                  title="Move down one position in queue"
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/70 rounded-lg transition-all"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <div>{getStatusBadge()}</div>

          <div className="flex items-center space-x-1.5">
            {/* Inspect Stream in Preview Player */}
            <button
              onClick={() => onSelectPreview(item)}
              title="Inspect Stream in Video Preview Player with Full-Screen"
              className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 border transition-all ${
                isSelectedForPreview
                  ? 'bg-sky-600 text-white border-sky-500 shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/70 hover:border-slate-600'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>{isSelectedForPreview ? 'Inspecting' : 'Preview'}</span>
            </button>

            {/* View Results in Dashboard (if completed) */}
            {item.status === 'completed' && onViewResults && (
              <button
                onClick={() => onViewResults(item)}
                title="View full AI defect analytics in Results Dashboard"
                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Retry Button (if failed) */}
            {item.status === 'failed' && (
              <button
                onClick={() => onRetryItem(item.id)}
                title="Retry processing this stream"
                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            )}

            {/* Remove from queue */}
            {item.status !== 'processing' && item.status !== 'uploading' && (
              <button
                onClick={() => onRemoveItem(item.id)}
                title="Remove video from queue"
                className="p-2 bg-slate-800/60 hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/30 rounded-lg transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Item Progress Bar (Visible during uploading or processing or completed) */}
      {(item.status === 'uploading' || item.status === 'processing' || item.status === 'completed') && (
        <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="text-white font-medium">{item.currentStage}</span>
              {isActiveProcessing && <span className="text-indigo-400 font-medium">Processing...</span>}
            </span>
            <span className="font-semibold text-indigo-400 font-mono">{item.progress}%</span>
          </div>

          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                item.status === 'completed' ? 'bg-emerald-400' : 'bg-gradient-to-r from-indigo-500 to-sky-400'
              }`}
              style={{ width: `${item.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Defect Finding Badges (When completed or actively detecting) */}
      {item.stats && (item.status === 'completed' || item.progress > 50) && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Defect Findings:</span>
          
          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 font-medium">
            Potholes: <strong className="text-white">{item.stats.potholesCount}</strong>
          </span>

          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium">
            Cracks: <strong className="text-white">{item.stats.cracksCount}</strong>
          </span>

          <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 font-medium">
            Critical: <strong className="text-white">{item.stats.criticalCount}</strong>
          </span>

          <span className={`px-2.5 py-0.5 rounded-full border font-medium ${
            item.stats.roadHealthScore >= 75
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : item.stats.roadHealthScore >= 60
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}>
            Health Score: <strong className="text-white">{item.stats.roadHealthScore}%</strong>
          </span>

          <span className="text-slate-400 ml-auto font-mono text-[11px]">
            Latency: ~{item.stats.avgInferenceMs}ms
          </span>
        </div>
      )}

      {/* Error display */}
      {item.error && (
        <div className="mt-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{item.error}</span>
        </div>
      )}
    </div>
  );
};
