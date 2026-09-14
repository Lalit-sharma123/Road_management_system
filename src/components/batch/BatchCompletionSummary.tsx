import React from 'react';
import { 
  CheckCircle2, 
  ArrowRight, 
  MapPin, 
  FileText, 
  AlertTriangle, 
  Activity, 
  X,
  Layers,
  Sparkles
} from 'lucide-react';
import { BatchCollectiveStats, BatchQueueItem } from '../../types/batch';

interface BatchCompletionSummaryProps {
  stats: BatchCollectiveStats;
  items: BatchQueueItem[];
  onDismiss: () => void;
  onNavigate: (tab: string) => void;
}

export const BatchCompletionSummary: React.FC<BatchCompletionSummaryProps> = ({
  stats,
  items,
  onDismiss,
  onNavigate
}) => {
  // Find highest risk corridor (lowest health score)
  const completedItems = items.filter(i => i.status === 'completed');
  const worstCorridor = [...completedItems].sort(
    (a, b) => (a.stats?.roadHealthScore || 100) - (b.stats?.roadHealthScore || 100)
  )[0];

  return (
    <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-5 space-y-4 backdrop-blur-sm shadow-xs animate-in fade-in">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Batch Processing Complete
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                100% Ingested
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Successfully processed {completedItems.length} video corridors with YOLO defect extraction, telemetry mapping, and health scoring.
            </p>
          </div>
        </div>

        <button 
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          title="Dismiss summary banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Summary Highlight Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5">
          <div className="text-xs text-slate-400 font-medium">Corridors Inspected</div>
          <div className="text-xl font-bold text-white mt-1">{completedItems.length} Streams</div>
          <div className="text-xs text-emerald-400 mt-0.5 font-medium">All Segments Ingested</div>
        </div>

        <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5">
          <div className="text-xs text-slate-400 font-medium">Hazard Detections</div>
          <div className="text-xl font-bold text-amber-400 mt-1">{stats.totalDefectsFound} Hazards</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {stats.totalPotholesFound} Potholes • {stats.totalCracksFound} Cracks
          </div>
        </div>

        <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5">
          <div className="text-xs text-slate-400 font-medium">Mean Road Health</div>
          <div className={`text-xl font-bold mt-1 ${
            stats.averageRoadHealth >= 75 ? 'text-emerald-400' :
            stats.averageRoadHealth >= 60 ? 'text-amber-400' : 'text-rose-400'
          }`}>
            {stats.averageRoadHealth.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {stats.totalCriticalHazards} Critical Zones
          </div>
        </div>

        <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5">
          <div className="text-xs text-slate-400 font-medium">Highest Risk Section</div>
          <div className="text-sm font-bold text-rose-400 mt-1 truncate" title={worstCorridor?.title}>
            {worstCorridor ? worstCorridor.title : 'None'}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Health: {worstCorridor?.stats?.roadHealthScore || '--'}%
          </div>
        </div>
      </div>

      {/* Footer Navigation Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/70">
        <span className="text-xs text-slate-400">
          All streams saved to the inspection registry and ready for map exploration.
        </span>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate('results')}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
          >
            <span>Results Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onNavigate('map')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/70 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>View on Map</span>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/70 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>Generate Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};
