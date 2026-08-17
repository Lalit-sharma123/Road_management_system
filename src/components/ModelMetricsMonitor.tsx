import React from 'react';
import { Clock, Zap, Activity, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { ModelTelemetryItem } from './YOLOModelMonitor';

interface ModelMetricsMonitorProps {
  model: ModelTelemetryItem;
  maxBaselineMs?: number;
}

/**
 * Visual Latency Gauge Component
 * Provides an instant performance health check with dynamic color transitions:
 * - Green (Optimal): < 15ms
 * - Yellow (Moderate): 15ms - 30ms
 * - Red (Degraded): > 30ms
 */
export const VisualLatencyGauge: React.FC<{
  latencyMs: number;
  avgMs: number;
  maxScaleMs?: number;
}> = ({ latencyMs, avgMs, maxScaleMs = 50 }) => {
  // Determine performance threshold & color scheme
  const getHealthLevel = (ms: number) => {
    if (ms < 15) {
      return {
        level: 'optimal',
        label: 'Optimal Speed',
        badge: 'FAST',
        color: '#10B981', // Emerald / Green
        bgClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        strokeColor: '#10B981',
        glowColor: 'rgba(16, 185, 129, 0.4)',
        gradientId: 'gauge-green',
        statusText: 'Sub-15ms Realtime'
      };
    } else if (ms <= 30) {
      return {
        level: 'moderate',
        label: 'Moderate Latency',
        badge: 'NORMAL',
        color: '#F59E0B', // Amber / Yellow
        bgClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        strokeColor: '#F59E0B',
        glowColor: 'rgba(245, 158, 11, 0.4)',
        gradientId: 'gauge-yellow',
        statusText: '15-30ms Acceptable'
      };
    } else {
      return {
        level: 'degraded',
        label: 'High Latency Alert',
        badge: 'SLOW',
        color: '#EF4444', // Red / Rose
        bgClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        strokeColor: '#EF4444',
        glowColor: 'rgba(239, 68, 68, 0.4)',
        gradientId: 'gauge-red',
        statusText: '>30ms Lag Detected'
      };
    }
  };

  const health = getHealthLevel(latencyMs);
  
  // Calculate gauge fill arc percentage (0 to 180 degrees semi-circle arc)
  const clampedMs = Math.min(Math.max(latencyMs, 0), maxScaleMs);
  const percentage = clampedMs / maxScaleMs;
  
  // Semi-circle SVG arc parameters
  const radius = 38;
  const circumference = Math.PI * radius; // Half-circle perimeter
  const strokeDashoffset = circumference * (1 - percentage);

  return (
    <div className="flex flex-col items-center justify-center relative p-2 bg-slate-900/90 border border-slate-800 rounded-xl transition-all duration-500">
      {/* SVG Semi-Circle Latency Gauge */}
      <div className="relative w-36 h-20 flex items-end justify-center overflow-hidden">
        <svg className="w-36 h-36 -rotate-180 transform" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="gauge-green" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <linearGradient id="gauge-yellow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            <linearGradient id="gauge-red" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F87171" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
            <filter id="gauge-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Track Arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#1E293B"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset="0"
            strokeLinecap="round"
          />

          {/* Foreground Transitioning Dynamic Gauge Arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke={`url(#${health.gradientId})`}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter="url(#gauge-glow)"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Latency Value Overlay */}
        <div className="absolute bottom-1 flex flex-col items-center justify-center">
          <div className="text-xl font-black text-white tracking-tight flex items-baseline gap-0.5">
            <span style={{ color: health.color }} className="transition-colors duration-500">
              {latencyMs.toFixed(1)}
            </span>
            <span className="text-[10px] font-semibold text-slate-400">ms</span>
          </div>
          <span className="text-[9px] font-mono text-slate-500">
            Scale: 0-{maxScaleMs}ms
          </span>
        </div>
      </div>

      {/* Latency Health Check Status Badge */}
      <div className="mt-2 w-full flex items-center justify-between text-xs px-2 py-1 rounded-lg border bg-slate-950/60">
        <div className="flex items-center gap-1.5">
          <span 
            className="w-2 h-2 rounded-full animate-pulse transition-colors duration-500" 
            style={{ backgroundColor: health.color, boxShadow: `0 0 8px ${health.glowColor}` }}
          />
          <span className="text-[11px] font-medium text-slate-300">
            {health.statusText}
          </span>
        </div>
        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border transition-colors duration-500 ${health.bgClass}`}>
          {health.badge}
        </span>
      </div>
    </div>
  );
};

export const ModelMetricsMonitor: React.FC<ModelMetricsMonitorProps> = ({ model }) => {
  return (
    <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 shadow-lg hover:border-slate-700 transition-all">
      {/* Model Title & Health Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: model.color }} />
            {model.name}
          </h4>
          <p className="text-xs text-slate-400 font-mono">{model.filename}</p>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
          {model.throughput_fps} FPS
        </span>
      </div>

      {/* Gauge & Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        {/* Visual Latency Gauge with Green/Yellow/Red transitions */}
        <VisualLatencyGauge latencyMs={model.last_latency_ms} avgMs={model.avg_latency_ms} />

        {/* Secondary Metrics Column */}
        <div className="space-y-2 text-xs">
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Moving Avg Latency</div>
            <div className="text-sm font-bold text-slate-200">{model.avg_latency_ms.toFixed(1)} ms</div>
          </div>

          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Inferences Executed</div>
            <div className="text-sm font-bold text-slate-200">{model.inferences.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
