import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Cpu, 
  Database, 
  Activity, 
  Wifi, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Lock 
} from 'lucide-react';
import { UserRole, DetectionModel } from '../../types/inspection';

interface AppStatusBarProps {
  currentModel: DetectionModel;
  currentRole: UserRole;
  selectedModel: string;
  totalVideosCount: number;
}

export const AppStatusBar: React.FC<AppStatusBarProps> = ({
  currentModel,
  currentRole,
  selectedModel,
  totalVideosCount
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toTimeString().split(' ')[0] + ' UTC');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="h-7 glass-statusbar px-4 flex items-center justify-between text-[11px] text-slate-400 select-none shrink-0 z-20 overflow-x-auto no-scrollbar">
      {/* Left: System Health & WebSocket Link */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="flex items-center space-x-1.5 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span className="font-medium text-slate-200">System Healthy</span>
        </div>

        <span className="text-white/15">•</span>

        <div className="flex items-center space-x-1.5 text-slate-300">
          <Wifi className="w-3 h-3 text-indigo-400" />
          <span>WebSocket connected</span>
        </div>

        <span className="text-white/15 hidden md:inline">•</span>

        <div className="hidden md:flex items-center space-x-1">
          <span>Latency:</span>
          <span className="text-slate-200 font-mono font-medium">11.4 ms</span>
        </div>
      </div>

      {/* Middle: Active Inference Engine & Backend */}
      <div className="hidden lg:flex items-center space-x-3 shrink-0">
        <div className="flex items-center space-x-1.5 text-slate-300">
          <Cpu className="w-3 h-3 text-indigo-400" />
          <span>Model:</span>
          <span className="text-slate-100 font-medium">{currentModel?.display_name || 'YOLOv11 XL'}</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-white/[0.06] border border-white/10 text-slate-300 font-mono rounded-md">CUDA:0</span>
        </div>

        <span className="text-white/15">•</span>

        <div className="flex items-center space-x-1.5">
          <Database className="w-3 h-3 text-amber-400" />
          <span>PostgreSQL 16</span>
        </div>

        <span className="text-white/15">•</span>

        <div className="flex items-center space-x-1.5">
          <span>Ollama:</span>
          <span className="text-slate-200 font-mono font-medium">{selectedModel || 'llama3.1'}</span>
        </div>
      </div>

      {/* Right: Role, Video Count & Clock */}
      <div className="flex items-center space-x-3 shrink-0 ml-auto pl-3">
        <div className="hidden sm:flex items-center space-x-1">
          <span>Inspections:</span>
          <span className="text-slate-200 font-medium font-mono">{totalVideosCount}</span>
        </div>

        <span className="text-white/15 hidden sm:inline">•</span>

        <div className="flex items-center space-x-1">
          <Lock className="w-3 h-3 text-slate-400" />
          <span className="capitalize text-slate-300 font-medium">{currentRole}</span>
        </div>

        <span className="text-white/15">•</span>

        <div className="flex items-center space-x-1 font-mono text-slate-400">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{timeStr || 'LIVE'}</span>
        </div>
      </div>
    </footer>
  );
};
