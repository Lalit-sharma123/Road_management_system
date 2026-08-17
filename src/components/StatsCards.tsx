import React from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Activity, 
  Layers, 
  TrendingUp, 
  HeartPulse, 
  CheckCircle2, 
  Crosshair 
} from 'lucide-react';
import { InspectionVideo, RoadAnalyticsData } from '../types/inspection';

interface StatsCardsProps {
  analytics?: RoadAnalyticsData;
  video?: InspectionVideo;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ analytics, video }) => {
  // Extract values directly from analytics model or fallback to 0
  const totalDetections = analytics?.total_detections ?? 0;
  const potholeCount = analytics?.pothole_count ?? 0;
  const crackCount = analytics?.crack_count ?? 0;
  const criticalCount = analytics?.critical_count ?? 0;
  const damageDensity = analytics?.damage_density_per_km ?? 0;
  const healthScore = analytics?.road_health_score ?? 100;
  const overallSeverity = analytics?.overall_severity ?? 'low';

  const getHealthStatusText = (score: number) => {
    if (score >= 85) return { text: 'EXCELLENT', color: 'text-[#34C759]', bg: 'bg-[#34C759]/10 border-[#34C759]' };
    if (score >= 70) return { text: 'GOOD QUALITY', color: 'text-[#30B0C7]', bg: 'bg-[#30B0C7]/10 border-[#30B0C7]' };
    if (score >= 50) return { text: 'FAIR / MODERATE', color: 'text-[#FFD60A]', bg: 'bg-[#FFD60A]/10 border-[#FFD60A]' };
    return { text: 'CRITICAL DAMAGE', color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10 border-[#FF3B30]' };
  };

  const healthStatus = getHealthStatusText(healthScore);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 font-mono">
        {/* Card 1: Total Detections */}
        <div className="bg-[#141414] border border-[#2A2A2A] p-4 flex flex-col justify-between hover:border-[#2563EB] transition-colors shadow-lg">
          <div className="flex items-center justify-between text-[#888] text-[10px] uppercase tracking-wider mb-2">
            <span>Total Defect Detections</span>
            <Crosshair className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">{totalDetections}</div>
            <p className="text-[10px] text-[#888] mt-1">Identified across frames</p>
          </div>
        </div>

        {/* Card 2: Potholes */}
        <div className="bg-[#141414] border border-[#2A2A2A] p-4 flex flex-col justify-between hover:border-[#FF3B30] transition-colors shadow-lg">
          <div className="flex items-center justify-between text-[#888] text-[10px] uppercase tracking-wider mb-2">
            <span>Potholes Count</span>
            <ShieldAlert className="w-4 h-4 text-[#FF3B30]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#FF3B30] font-mono">{potholeCount}</div>
            <p className="text-[10px] text-[#888] mt-1">Severe road depressions</p>
          </div>
        </div>

        {/* Card 3: Cracks */}
        <div className="bg-[#141414] border border-[#2A2A2A] p-4 flex flex-col justify-between hover:border-[#FF9500] transition-colors shadow-lg">
          <div className="flex items-center justify-between text-[#888] text-[10px] uppercase tracking-wider mb-2">
            <span>Cracks Count</span>
            <Activity className="w-4 h-4 text-[#FF9500]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#FF9500] font-mono">{crackCount}</div>
            <p className="text-[10px] text-[#888] mt-1">Longitudinal & Transverse</p>
          </div>
        </div>

        {/* Card 4: Critical Hazards */}
        <div className="bg-[#141414] border border-[#2A2A2A] p-4 flex flex-col justify-between hover:border-[#FFD60A] transition-colors shadow-lg">
          <div className="flex items-center justify-between text-[#888] text-[10px] uppercase tracking-wider mb-2">
            <span>Critical Hazards</span>
            <AlertTriangle className="w-4 h-4 text-[#FFD60A]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#FFD60A] font-mono">{criticalCount}</div>
            <p className="text-[10px] text-[#888] mt-1">High priority repair needed</p>
          </div>
        </div>

        {/* Card 5: Damage Density */}
        <div className="bg-[#141414] border border-[#2A2A2A] p-4 flex flex-col justify-between hover:border-[#30B0C7] transition-colors shadow-lg">
          <div className="flex items-center justify-between text-[#888] text-[10px] uppercase tracking-wider mb-2">
            <span>Damage Density</span>
            <TrendingUp className="w-4 h-4 text-[#30B0C7]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#30B0C7] font-mono">{damageDensity.toFixed(1)}</div>
            <p className="text-[10px] text-[#888] mt-1">Defects / km surveyed</p>
          </div>
        </div>

        {/* Card 6: Road Health Score Overview */}
        <div className="bg-[#141414] border border-[#2A2A2A] p-4 flex flex-col justify-between border-l-4 border-l-[#2563EB] shadow-lg">
          <div className="flex items-center justify-between text-[#888] text-[10px] uppercase tracking-wider mb-1">
            <span>Road Health Score</span>
            <HeartPulse className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-white font-mono">{healthScore.toFixed(1)}</span>
              <span className="text-xs text-[#888]">/ 100</span>
            </div>
            <div className="mt-2">
              <span className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 border ${healthStatus.bg} ${healthStatus.color}`}>
                {healthStatus.text}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
