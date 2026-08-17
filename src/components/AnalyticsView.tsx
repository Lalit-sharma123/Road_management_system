import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Calculator, 
  Terminal, 
  DollarSign, 
  AlertTriangle,
  PieChart as PieIcon,
  Layers,
  Zap
} from 'lucide-react';
import { InspectionVideo } from '../types/inspection';

interface AnalyticsViewProps {
  video: InspectionVideo;
  onNavigate: (tab: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ video, onNavigate }) => {
  const [weightArea, setWeightArea] = useState(0.40);
  const [weightConfidence, setWeightConfidence] = useState(0.30);
  const [weightCategory, setWeightCategory] = useState(0.30);

  const analytics = video.analytics || {
    road_health_score: 78.5,
    total_detections: 12,
    pothole_count: 4,
    crack_count: 6,
    critical_count: 2,
    damage_density_per_km: 8.4,
    overall_severity: 'high'
  };

  // Calculate estimated repair cost
  const estimatedCost = (analytics.pothole_count * 250) + (analytics.crack_count * 90) + (analytics.critical_count * 500);

  return (
    <div className="space-y-6 text-[#E0E0E0] font-mono">
      {/* Top Banner */}
      <div className="bg-[#141414] border border-[#2A2A2A] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#FF9500] text-[10px] uppercase tracking-widest mb-0.5">
            <Calculator className="w-3.5 h-3.5 text-[#FF3B30]" />
            <span>MATHEMATICAL SEVERITY FORMULA & MAINTENANCE BUDGETING</span>
          </div>
          <h2 className="text-base font-bold text-white uppercase">Road Damage Severity Rating Calculator</h2>
          <p className="text-[11px] text-[#888]">
            Weighted formula engine evaluating bounding box area, prediction confidence, defect category weights, and repair cost estimation.
          </p>
        </div>

        <button
          onClick={() => onNavigate('reports')}
          className="px-4 py-2 bg-[#2563EB] hover:bg-blue-600 text-xs font-mono uppercase tracking-wider text-white border border-blue-400"
        >
          Generate Official PDF Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Interactive Formula Weights */}
        <div className="lg:col-span-5 bg-[#111111] border border-[#2A2A2A] p-5 space-y-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#FF9500] flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#FF9500]" />
            <span>Severity Weight Coefficients</span>
          </h3>

          <div className="bg-[#0F0F0F] border border-[#222] p-3 text-[11px] text-[#34C759]">
            <code>Severity Score = (W_area &times; Area_ratio) + (W_conf &times; Conf) + (W_class &times; Class_weight)</code>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-[#AAA] mb-1">
                <span>W_area (BBox Area Weight):</span>
                <span className="text-[#2563EB] font-bold">{(weightArea * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" min="0.1" max="0.7" step="0.05"
                value={weightArea} onChange={(e) => setWeightArea(Number(e.target.value))}
                className="w-full accent-[#2563EB]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-[#AAA] mb-1">
                <span>W_conf (Confidence Weight):</span>
                <span className="text-[#2563EB] font-bold">{(weightConfidence * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" min="0.1" max="0.5" step="0.05"
                value={weightConfidence} onChange={(e) => setWeightConfidence(Number(e.target.value))}
                className="w-full accent-[#2563EB]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-[#AAA] mb-1">
                <span>W_class (Defect Type Severity):</span>
                <span className="text-[#2563EB] font-bold">{(weightCategory * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" min="0.1" max="0.5" step="0.05"
                value={weightCategory} onChange={(e) => setWeightCategory(Number(e.target.value))}
                className="w-full accent-[#2563EB]"
              />
            </div>
          </div>

          <div className="border-t border-[#2A2A2A] pt-4 space-y-2">
            <div className="text-xs text-[#888] font-bold">DEFECT TYPE SEVERITY WEIGHTS:</div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-2 bg-[#141414] border border-[#222]">Pothole: <span className="text-[#FF3B30] font-bold">2.5x</span></div>
              <div className="p-2 bg-[#141414] border border-[#222]">Broken Road: <span className="text-[#FF3B30] font-bold">2.2x</span></div>
              <div className="p-2 bg-[#141414] border border-[#222]">Alligator Crack: <span className="text-[#FF9500] font-bold">1.8x</span></div>
              <div className="p-2 bg-[#141414] border border-[#222]">Linear Crack: <span className="text-[#FFD60A] font-bold">1.2x</span></div>
            </div>
          </div>
        </div>

        {/* Right Distribution Charts & Estimated Maintenance Costs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Cost Estimation Panel */}
          <div className="bg-[#111111] border border-[#2A2A2A] p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#34C759] flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#34C759]" />
              <span>Automated Maintenance & Patching Budget</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#141414] border border-[#2A2A2A] p-3 text-[11px]">
                <span className="text-[#888]">POTHOLE REPAIRS:</span>
                <div className="text-base font-bold text-white mt-1">${analytics.pothole_count * 250} USD</div>
                <span className="text-[9px] text-[#666]">{analytics.pothole_count} units @ $250</span>
              </div>
              <div className="bg-[#141414] border border-[#2A2A2A] p-3 text-[11px]">
                <span className="text-[#888]">CRACK SEALING:</span>
                <div className="text-base font-bold text-white mt-1">${analytics.crack_count * 90} USD</div>
                <span className="text-[9px] text-[#666]">{analytics.crack_count} units @ $90</span>
              </div>
              <div className="bg-[#141414] border border-[#FF3B30] p-3 text-[11px]">
                <span className="text-[#FF3B30]">URGENT RE-ASPHALT:</span>
                <div className="text-lg font-bold text-[#FF3B30] mt-1">${analytics.critical_count * 500} USD</div>
                <span className="text-[9px] text-red-400">{analytics.critical_count} critical zones</span>
              </div>
            </div>

            <div className="bg-[#161616] p-3 border border-[#2A2A2A] flex items-center justify-between text-xs">
              <span className="font-bold text-white uppercase">TOTAL ESTIMATED SECTION REPAIR BUDGET:</span>
              <span className="text-xl font-bold font-mono text-[#34C759]">${estimatedCost} USD</span>
            </div>
          </div>

          {/* Breakdown Distribution Bars */}
          <div className="bg-[#111111] border border-[#2A2A2A] p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#FF9500] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#FF9500]" />
              <span>Defect Class Distribution Breakdown</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-white">Potholes</span>
                  <span className="text-[#FF3B30] font-bold">{analytics.pothole_count} detected</span>
                </div>
                <div className="w-full bg-[#1A1A1A] h-2 border border-[#2A2A2A]">
                  <div className="bg-[#FF3B30] h-full" style={{ width: `${(analytics.pothole_count / Math.max(1, analytics.total_detections)) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-white">Cracks (Longitudinal / Alligator)</span>
                  <span className="text-[#FF9500] font-bold">{analytics.crack_count} detected</span>
                </div>
                <div className="w-full bg-[#1A1A1A] h-2 border border-[#2A2A2A]">
                  <div className="bg-[#FF9500] h-full" style={{ width: `${(analytics.crack_count / Math.max(1, analytics.total_detections)) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-white">Structural Critical Hazards</span>
                  <span className="text-[#FFD60A] font-bold">{analytics.critical_count} detected</span>
                </div>
                <div className="w-full bg-[#1A1A1A] h-2 border border-[#2A2A2A]">
                  <div className="bg-[#FFD60A] h-full" style={{ width: `${(analytics.critical_count / Math.max(1, analytics.total_detections)) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
