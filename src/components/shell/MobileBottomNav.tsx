import React from 'react';
import { 
  Activity, 
  Video, 
  Radio, 
  AlertOctagon, 
  Menu 
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenMenu: () => void;
  stolenAlertCount: number;
  queueCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenMenu,
  stolenAlertCount,
  queueCount = 0
}) => {
  return (
    <nav className="lg:hidden h-14 bg-slate-950/80 backdrop-blur-2xl border-t border-white/[0.08] shadow-[0_-8px_30px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.06)] px-2 flex items-center justify-around text-[10px] shrink-0 z-30 select-none">
      {/* Dashboard */}
      <button
        onClick={() => setActiveTab('dashboard')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
          activeTab === 'dashboard' ? 'text-indigo-300 font-semibold drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Activity className="w-4 h-4 mb-0.5" />
        <span>Dashboard</span>
      </button>

      {/* Batch Upload */}
      <button
        onClick={() => setActiveTab('upload')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors relative ${
          activeTab === 'upload' ? 'text-indigo-300 font-semibold drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Video className="w-4 h-4 mb-0.5" />
        <span>Queue</span>
        {queueCount > 0 && (
          <span className="absolute top-1 right-3 px-1.5 py-0.2 bg-indigo-600 text-white rounded-full text-[8px] leading-none shadow-xs font-semibold">
            {queueCount}
          </span>
        )}
      </button>

      {/* Live Stream */}
      <button
        onClick={() => setActiveTab('live_processing')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
          activeTab === 'live_processing' ? 'text-indigo-300 font-semibold drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Radio className="w-4 h-4 mb-0.5" />
        <span>Live</span>
      </button>

      {/* Stolen Alerts */}
      <button
        onClick={() => setActiveTab('stolen_alerts')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors relative ${
          activeTab === 'stolen_alerts' ? 'text-rose-400 font-semibold drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <AlertOctagon className="w-4 h-4 mb-0.5" />
        <span>Alerts</span>
        {stolenAlertCount > 0 && (
          <span className="absolute top-1 right-2 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[8px] leading-none animate-pulse font-black shadow-xs">
            {stolenAlertCount}
          </span>
        )}
      </button>

      {/* More / All Views Menu */}
      <button
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-100 transition-colors"
      >
        <Menu className="w-4 h-4 mb-0.5" />
        <span>All Views</span>
      </button>
    </nav>
  );
};
