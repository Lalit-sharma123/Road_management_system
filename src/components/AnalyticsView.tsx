import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  Calculator, 
  Terminal, 
  DollarSign, 
  AlertTriangle,
  PieChart as PieIcon,
  Layers,
  Zap,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Car,
  Truck,
  Bus,
  Clock,
  MapPin,
  Activity,
  FileSpreadsheet,
  AlertOctagon,
  Eye,
  CheckCircle2,
  Radio,
  Sliders,
  Flame,
  Shield
} from 'lucide-react';
import { InspectionVideo } from '../types/inspection';
import { analyticsService } from '../services/analyticsService';
import { LiveTelemetryResponse } from '../types/analytics';

interface AnalyticsViewProps {
  video: InspectionVideo;
  onNavigate: (tab: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ video, onNavigate }) => {
  // Severity Formula Slider States
  const [weightArea, setWeightArea] = useState<number>(0.40);
  const [weightConfidence, setWeightConfidence] = useState<number>(0.30);
  const [weightCategory, setWeightCategory] = useState<number>(0.30);

  // Live Backend Telemetry State
  const [telemetry, setTelemetry] = useState<LiveTelemetryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'overview' | 'potholes' | 'severity' | 'stolen' | 'mobility' | 'trends' | 'violations'>('overview');
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);

  // Polling ref for cleanup
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch live telemetry from backend
  const fetchLiveTelemetry = useCallback(async (customWeights?: {
    weight_area: number;
    weight_confidence: number;
    weight_category: number;
  }) => {
    try {
      const weights = customWeights || {
        weight_area: weightArea,
        weight_confidence: weightConfidence,
        weight_category: weightCategory
      };
      const data = await analyticsService.getLiveTelemetry(weights);
      if (data && data.status === 'success') {
        setTelemetry(data);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.warn('Live telemetry fetch warning (falling back gracefully):', err);
    } finally {
      setIsLoading(false);
      setIsRecalculating(false);
    }
  }, [weightArea, weightConfidence, weightCategory]);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    fetchLiveTelemetry();
  }, [video.id, fetchLiveTelemetry]);

  // Auto-sync polling every 6 seconds for continuous live telemetry updates
  useEffect(() => {
    if (!isAutoRefreshing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      fetchLiveTelemetry();
    }, 6000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAutoRefreshing, fetchLiveTelemetry]);

  // Listen to real-time events from Live Processing and WebSocket streams
  useEffect(() => {
    const handleLiveEvent = () => {
      fetchLiveTelemetry();
    };

    window.addEventListener('stolen_vehicle_detected', handleLiveEvent);
    window.addEventListener('detection_processed', handleLiveEvent);
    window.addEventListener('live_telemetry_update', handleLiveEvent);

    return () => {
      window.removeEventListener('stolen_vehicle_detected', handleLiveEvent);
      window.removeEventListener('detection_processed', handleLiveEvent);
      window.removeEventListener('live_telemetry_update', handleLiveEvent);
    };
  }, [fetchLiveTelemetry]);

  // Handle live recalculation when sliders adjust
  const handleWeightChange = (type: 'area' | 'conf' | 'cat', value: number) => {
    let newArea = weightArea;
    let newConf = weightConfidence;
    let newCat = weightCategory;

    if (type === 'area') {
      newArea = value;
      setWeightArea(value);
    } else if (type === 'conf') {
      newConf = value;
      setWeightConfidence(value);
    } else if (type === 'cat') {
      newCat = value;
      setWeightCategory(value);
    }

    setIsRecalculating(true);
    fetchLiveTelemetry({
      weight_area: newArea,
      weight_confidence: newConf,
      weight_category: newCat
    });
  };

  // Extract Telemetry Data (Real values without synthetic mock constants)
  const roadHealth = telemetry?.road_health || {
    average_road_health_score: video.analytics?.road_health_score ?? (video.id ? 100 : 0),
    total_inspected_sections: video.id ? 1 : 0,
    rating: (video.analytics?.road_health_score ?? 100) >= 80 ? 'GOOD CONDITION' : (video.analytics?.road_health_score ?? 100) >= 50 ? 'FAIR CONDITION' : 'CRITICAL DEFECTS'
  };

  const potholeTel = telemetry?.pothole_telemetry || {
    pothole_count: video.analytics?.pothole_count || 0,
    crack_count: video.analytics?.crack_count || 0,
    total_defects: (video.analytics?.pothole_count || 0) + (video.analytics?.crack_count || 0),
    density_per_km: video.analytics?.pothole_count ? Number(((video.analytics.pothole_count) / Math.max(1, (video.duration_seconds || 60) / 60)).toFixed(1)) : 0,
    categories: {
      pothole: video.analytics?.pothole_count || 0,
      longitudinal_crack: 0,
      transverse_crack: 0,
      alligator_crack: 0,
      missing_asphalt: 0,
      broken_road: 0
    },
    frequency_timeline: []
  };

  const severityTel = telemetry?.severity_scoring || {
    severities: {
      low: 0,
      medium: 0,
      high: 0,
      critical: video.analytics?.critical_count || 0
    },
    critical_count: video.analytics?.critical_count || 0,
    formula_weights: { weight_area: weightArea, weight_confidence: weightConfidence, weight_category: weightCategory },
    estimated_budget: {
      pothole_repairs: (video.analytics?.pothole_count || 0) * 250,
      crack_sealing: (video.analytics?.crack_count || 0) * 90,
      critical_re_asphalt: (video.analytics?.critical_count || 0) * 500,
      total_estimated_budget: ((video.analytics?.pothole_count || 0) * 250) + ((video.analytics?.crack_count || 0) * 90) + ((video.analytics?.critical_count || 0) * 500)
    }
  };

  const stolenTel = telemetry?.stolen_vehicle_telemetry || {
    total_stolen_registered: 0,
    active_alerts_count: 0,
    intercepted_count: 0,
    alerts_today_count: 0,
    intercept_rate: 0,
    timeline: [],
    recent_intercepts: []
  };

  const mobilityTel = telemetry?.traffic_mobility || {
    total_vehicles: video.analytics?.vehicle_count || 0,
    vehicles_by_type: {
      car: video.analytics?.vehicle_count || 0,
      truck: 0,
      bus: 0,
      motorcycle: 0,
      bicycle: 0,
      number_plate: 0
    }
  };

  const violationsTel = telemetry?.violations_enforcement || {
    total_violations: 0,
    helmet_violations: 0,
    total_fines_amount: 0,
    paid_fines_amount: 0,
    violations_breakdown: []
  };

  const trendsTel = telemetry?.monthly_trends || {
    months: [],
    potholes: [],
    cracks: [],
    stolen_alerts: [],
    average_health_score: []
  };

  // Color Palettes
  const CATEGORY_COLORS: Record<string, string> = {
    pothole: '#FF3B30',
    transverse_crack: '#FF9500',
    longitudinal_crack: '#FFD60A',
    alligator_crack: '#E056FD',
    missing_asphalt: '#34C759',
    broken_road: '#30B0C7'
  };

  const VEHICLE_COLORS: Record<string, string> = {
    car: '#2563EB',
    truck: '#7C3AED',
    bus: '#DB2777',
    motorcycle: '#059669',
    bicycle: '#10B981',
    number_plate: '#34C759'
  };

  const SEVERITY_COLORS: Record<string, string> = {
    critical: '#FF3B30',
    high: '#FF9500',
    medium: '#FFD60A',
    low: '#34C759'
  };

  // Chart 1: Defect Distribution Pie
  const defectDistributionData = Object.entries(potholeTel.categories || {}).map(([cat, count]) => ({
    name: String(cat || '').replace(/_/g, ' ').toUpperCase(),
    rawKey: cat,
    value: Number(count || 0),
    color: CATEGORY_COLORS[String(cat || '').toLowerCase()] || '#FF3B30'
  })).filter(d => d.value > 0);

  // Chart 2: Severity Bar Data
  const severityChartData = Object.entries(severityTel.severities || {}).map(([sev, count]) => ({
    severity: String(sev || '').toUpperCase(),
    count: Number(count || 0),
    fill: SEVERITY_COLORS[String(sev || '').toLowerCase()] || '#2563EB'
  }));

  // Chart 3: Vehicle Mobility Data
  const vehicleChartData = Object.entries(mobilityTel.vehicles_by_type || {})
    .filter(([k]) => k !== 'number_plate')
    .map(([vClass, count]) => ({
      name: String(vClass || '').replace(/_/g, ' ').toUpperCase(),
      value: Number(count || 0),
      color: VEHICLE_COLORS[String(vClass || '').toLowerCase()] || '#2563EB'
    })).filter(d => d.value > 0);

  // Chart 4: Historical 6-Month Trends Data
  const trendsChartData = trendsTel.months.map((m, idx) => ({
    month: m,
    potholes: trendsTel.potholes[idx] || 0,
    cracks: trendsTel.cracks[idx] || 0,
    stolenAlerts: trendsTel.stolen_alerts[idx] || 0,
    healthScore: trendsTel.average_health_score[idx] || 80
  }));

  return (
    <div className="space-y-6 text-[#E0E0E0] font-mono">
      {/* Top Banner with Real-Time Backend Telemetry Connection Status */}
      <div className="bg-[#141414] border border-[#2A2A2A] p-5 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-[#FF9500] text-[10px] uppercase tracking-widest mb-1 font-bold">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>LIVE TELEMETRY STREAM & ANALYTICS ENGINE</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-[#2563EB]" />
              <span>Infrastructure Defect & Telemetry Intelligence</span>
            </h1>
            <p className="text-xs text-[#888] mt-1 max-w-3xl">
              Real-time backend telemetry metrics for live pothole frequency, multi-weight severity risk scoring, automated maintenance budgeting, and intercepted stolen vehicle alerts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsAutoRefreshing(!isAutoRefreshing)}
              className={`px-3 py-2 text-xs uppercase border transition-all flex items-center gap-1.5 ${
                isAutoRefreshing 
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400 font-bold' 
                  : 'bg-[#1A1A1A] border-[#333] text-[#888]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{isAutoRefreshing ? 'Live Stream: ACTIVE' : 'Live Stream: PAUSED'}</span>
            </button>

            <button
              onClick={() => fetchLiveTelemetry()}
              disabled={isLoading}
              className="px-3 py-2 bg-[#1A1A1A] hover:bg-[#252525] text-white text-xs uppercase border border-[#333] transition-all flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#2563EB]' : ''}`} />
              <span>Sync Endpoint</span>
            </button>

            <button
              onClick={() => onNavigate('reports')}
              className="px-4 py-2 bg-[#2563EB] hover:bg-blue-600 text-xs uppercase tracking-wider text-white border border-blue-400 flex items-center gap-1.5 shadow-[0_0_10px_rgba(37,99,235,0.3)] font-bold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Generate Report</span>
            </button>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-[#222] flex flex-wrap items-center justify-between text-[10px] text-[#777]">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-emerald-400 font-bold">LIVE TELEMETRY ENDPOINT:</span>
            <span>`/api/v1/analytics/live-telemetry` & `/api/v1/stolen-alerts`</span>
          </div>
          <span>Last Stream Ingestion: {lastRefreshed.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* KPI Metric Cards Row - Live Dynamic Telemetry */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Road Health Index */}
        <div className="bg-[#111111] border border-[#2A2A2A] p-3.5 flex flex-col justify-between hover:border-[#444] transition">
          <div className="flex items-center justify-between text-[10px] uppercase text-[#888]">
            <span>Road Health Score</span>
            <ShieldCheck className={`w-4 h-4 ${roadHealth.average_road_health_score >= 75 ? 'text-[#34C759]' : 'text-[#FF9500]'}`} />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {roadHealth.average_road_health_score} <span className="text-xs text-[#666]">/ 100</span>
          </div>
          <div className="text-[10px] text-[#34C759] mt-1 uppercase font-bold">
            {roadHealth.rating}
          </div>
        </div>

        {/* Pothole Frequency & Total Defects */}
        <div className="bg-[#111111] border border-red-500/40 p-3.5 flex flex-col justify-between hover:border-red-500 transition">
          <div className="flex items-center justify-between text-[10px] uppercase text-[#FF3B30]">
            <span>Pothole Frequency</span>
            <AlertTriangle className="w-4 h-4 text-[#FF3B30]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#FF3B30]">
            {potholeTel.pothole_count} <span className="text-xs text-[#AAA]">({potholeTel.density_per_km}/km)</span>
          </div>
          <div className="text-[10px] text-[#FF3B30]/80 mt-1 uppercase">
            {potholeTel.total_defects} Total Defect Points
          </div>
        </div>

        {/* Critical Risk Hazards */}
        <div className="bg-[#111111] border border-amber-500/40 p-3.5 flex flex-col justify-between hover:border-amber-500 transition">
          <div className="flex items-center justify-between text-[10px] uppercase text-amber-400">
            <span>Critical Hazards</span>
            <ShieldAlert className="w-4 h-4 text-amber-500 animate-pulse" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400">
            {severityTel.critical_count}
          </div>
          <div className="text-[10px] text-amber-400/80 mt-1 uppercase">
            Formula Priority: W_area {(weightArea * 100).toFixed(0)}%
          </div>
        </div>

        {/* Stolen Vehicle Intercepts */}
        <div className="bg-[#111111] border border-rose-500/40 p-3.5 flex flex-col justify-between hover:border-rose-500 transition">
          <div className="flex items-center justify-between text-[10px] uppercase text-rose-400">
            <span>Stolen Intercepts</span>
            <AlertOctagon className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-400">
            {stolenTel.active_alerts_count} <span className="text-xs text-[#AAA]">Active</span>
          </div>
          <div className="text-[10px] text-rose-400/80 mt-1 uppercase">
            {stolenTel.total_stolen_registered} Stolen in Registry
          </div>
        </div>

        {/* Vehicles Monitored */}
        <div className="bg-[#111111] border border-blue-500/40 p-3.5 flex flex-col justify-between hover:border-blue-500 transition">
          <div className="flex items-center justify-between text-[10px] uppercase text-[#2563EB]">
            <span>Traffic Tracked</span>
            <Car className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#2563EB]">
            {mobilityTel.total_vehicles}
          </div>
          <div className="text-[10px] text-[#2563EB]/80 mt-1 uppercase">
            Active ANPR Streams
          </div>
        </div>

        {/* Repair Budget Forecast */}
        <div className="bg-[#111111] border border-emerald-500/40 p-3.5 flex flex-col justify-between hover:border-emerald-500 transition">
          <div className="flex items-center justify-between text-[10px] uppercase text-emerald-400">
            <span>Patching Budget</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">
            ${(severityTel.estimated_budget.total_estimated_budget / 1000).toFixed(1)}k
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-1 uppercase">
            Live Cost Model
          </div>
        </div>
      </div>

      {/* Navigation Filter Tabs for Charts */}
      <div className="bg-[#141414] border border-[#2A2A2A] p-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 uppercase transition-all border ${
              activeTab === 'overview'
                ? 'bg-blue-950/60 text-blue-400 border-blue-500 font-bold shadow-[0_0_8px_rgba(37,99,235,0.3)]'
                : 'bg-[#1A1A1A] text-[#888] border-transparent hover:text-white'
            }`}
          >
            Telemetry Overview
          </button>
          <button
            onClick={() => setActiveTab('potholes')}
            className={`px-3 py-1.5 uppercase transition-all border ${
              activeTab === 'potholes'
                ? 'bg-[#FF3B30]/20 text-[#FF3B30] border-[#FF3B30] font-bold shadow-[0_0_8px_rgba(255,59,48,0.3)]'
                : 'bg-[#1A1A1A] text-[#888] border-transparent hover:text-white'
            }`}
          >
            Pothole Frequency & Classes
          </button>
          <button
            onClick={() => setActiveTab('severity')}
            className={`px-3 py-1.5 uppercase transition-all border ${
              activeTab === 'severity'
                ? 'bg-[#FF9500]/20 text-[#FF9500] border-[#FF9500] font-bold shadow-[0_0_8px_rgba(255,149,0,0.3)]'
                : 'bg-[#1A1A1A] text-[#888] border-transparent hover:text-white'
            }`}
          >
            Severity Scoring & Formula Tuner
          </button>
          <button
            onClick={() => setActiveTab('stolen')}
            className={`px-3 py-1.5 uppercase transition-all border ${
              activeTab === 'stolen'
                ? 'bg-rose-950/60 text-rose-400 border-rose-500 font-bold shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                : 'bg-[#1A1A1A] text-[#888] border-transparent hover:text-white'
            }`}
          >
            Stolen Intercept Telemetry ({stolenTel.active_alerts_count})
          </button>
          <button
            onClick={() => setActiveTab('mobility')}
            className={`px-3 py-1.5 uppercase transition-all border ${
              activeTab === 'mobility'
                ? 'bg-[#2563EB]/20 text-[#2563EB] border-[#2563EB] font-bold shadow-[0_0_8px_rgba(37,99,235,0.3)]'
                : 'bg-[#1A1A1A] text-[#888] border-transparent hover:text-white'
            }`}
          >
            Traffic Mobility
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`px-3 py-1.5 uppercase transition-all border ${
              activeTab === 'trends'
                ? 'bg-[#34C759]/20 text-[#34C759] border-[#34C759] font-bold shadow-[0_0_8px_rgba(52,199,89,0.3)]'
                : 'bg-[#1A1A1A] text-[#888] border-transparent hover:text-white'
            }`}
          >
            6-Month Historical Trends
          </button>
          <button
            onClick={() => setActiveTab('violations')}
            className={`px-3 py-1.5 uppercase transition-all border ${
              activeTab === 'violations'
                ? 'bg-[#E056FD]/20 text-[#E056FD] border-[#E056FD] font-bold shadow-[0_0_8px_rgba(224,86,253,0.3)]'
                : 'bg-[#1A1A1A] text-[#888] border-transparent hover:text-white'
            }`}
          >
            Enforcement & Fines
          </button>
        </div>

        <span className="text-[11px] text-[#666] hidden xl:inline flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-emerald-400" />
          Live Telemetry Recharts Engine
        </span>
      </div>

      {/* SECTION 1: Real Pothole Frequency Timeline & Defect Classes */}
      {(activeTab === 'overview' || activeTab === 'potholes') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Real Pothole Frequency by Road Distance Interval */}
          <div className="lg:col-span-7 bg-[#111111] border border-[#2A2A2A] p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#FF3B30]" />
                <span>Live Pothole & Defect Frequency Timeline (Road Distance Telemetry)</span>
              </h3>
              <span className="text-[10px] text-[#FF3B30] bg-[#FF3B30]/10 border border-[#FF3B30]/30 px-2 py-0.5 font-bold">
                {potholeTel.density_per_km} Defect Density / km
              </span>
            </div>

            <div className="h-72 w-full flex items-center justify-center">
              {potholeTel.frequency_timeline.length === 0 ? (
                <div className="text-center text-slate-500 text-xs font-mono">
                  No distance-interval telemetry logged for this video survey yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={potholeTel.frequency_timeline} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="potholeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF3B30" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#FF3B30" stopOpacity={0.05}/>
                      </linearGradient>
                      <linearGradient id="crackGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF9500" stopOpacity={0.7}/>
                        <stop offset="95%" stopColor="#FF9500" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="interval" stroke="#666" fontSize={10} />
                    <YAxis stroke="#666" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#141414', borderColor: '#333', color: '#FFF', fontSize: '11px', fontFamily: 'monospace' }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Area type="monotone" dataKey="potholes" stroke="#FF3B30" fillOpacity={1} fill="url(#potholeGradient)" name="Potholes / Interval" />
                    <Area type="monotone" dataKey="cracks" stroke="#FF9500" fillOpacity={1} fill="url(#crackGradient)" name="Cracks / Interval" />
                    <Line type="monotone" dataKey="frequency_density" stroke="#34C759" strokeWidth={2} name="Defect Density Score" dot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#222] text-[10px]">
              <div className="p-2 bg-[#161616] border border-[#222]">
                <span className="text-[#888]">TOTAL POTHOLES:</span>
                <div className="text-base font-bold text-[#FF3B30]">{potholeTel.pothole_count}</div>
              </div>
              <div className="p-2 bg-[#161616] border border-[#222]">
                <span className="text-[#888]">TOTAL CRACKS:</span>
                <div className="text-base font-bold text-[#FF9500]">{potholeTel.crack_count}</div>
              </div>
              <div className="p-2 bg-[#161616] border border-[#222]">
                <span className="text-[#888]">INSPECTED SECTIONS:</span>
                <div className="text-base font-bold text-emerald-400">{roadHealth.total_inspected_sections}</div>
              </div>
            </div>
          </div>

          {/* Defect Classification Donut */}
          <div className="lg:col-span-5 bg-[#111111] border border-[#2A2A2A] p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-[#FF3B30]" />
                <span>Damage Category Breakdown</span>
              </h3>
              <span className="text-[10px] text-[#888]">
                {potholeTel.total_defects} Total
              </span>
            </div>

            <div className="h-72 w-full flex items-center justify-center">
              {defectDistributionData.length === 0 ? (
                <div className="text-center text-slate-500 text-xs font-mono">
                  No road damage defects detected in selected survey dataset.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={defectDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {defectDistributionData.map((entry, index) => (
                        <Cell key={`damage-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#141414', borderColor: '#333', color: '#FFF', fontSize: '11px', fontFamily: 'monospace' }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#222] text-[10px]">
              <div className="p-2 bg-[#161616] border border-[#222]">
                <span className="text-[#888]">POTHOLES:</span>
                <div className="text-sm font-bold text-[#FF3B30]">{potholeTel.categories['pothole'] || 0}</div>
              </div>
              <div className="p-2 bg-[#161616] border border-[#222]">
                <span className="text-[#888]">TRANSVERSE:</span>
                <div className="text-sm font-bold text-[#FF9500]">{potholeTel.categories['transverse_crack'] || 0}</div>
              </div>
              <div className="p-2 bg-[#161616] border border-[#222]">
                <span className="text-[#888]">ALLIGATOR:</span>
                <div className="text-sm font-bold text-[#E056FD]">{potholeTel.categories['alligator_crack'] || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Stolen Vehicle Intercept Alerts Telemetry */}
      {(activeTab === 'overview' || activeTab === 'stolen') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Stolen Vehicle Intercept Daily Activity Chart */}
          <div className="lg:col-span-6 bg-[#111111] border border-rose-500/30 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-500" />
                <span>Stolen Vehicle Intercept Activity & 7-Day Trend</span>
              </h3>
              <span className="text-[10px] text-rose-300 bg-rose-950/60 border border-rose-500/40 px-2 py-0.5">
                {stolenTel.active_alerts_count} ACTIVE ALERTS
              </span>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
              {stolenTel.timeline.length === 0 ? (
                <div className="text-center text-slate-500 text-xs font-mono">
                  No stolen vehicle intercept alerts logged in this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stolenTel.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="day" stroke="#666" fontSize={10} />
                    <YAxis stroke="#666" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#141414', borderColor: '#333', color: '#FFF', fontSize: '11px', fontFamily: 'monospace' }} 
                    />
                    <Bar dataKey="alerts" fill="#F43F5E" radius={[4, 4, 0, 0]} name="Stolen Alerts Recorded" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#222] text-[10px]">
              <div className="p-2 bg-rose-950/20 border border-rose-500/20">
                <span className="text-[#AAA]">ACTIVE ALERTS:</span>
                <div className="text-base font-bold text-rose-400">{stolenTel.active_alerts_count}</div>
              </div>
              <div className="p-2 bg-[#161616] border border-[#222]">
                <span className="text-[#888]">TODAY&apos;S DETECTIONS:</span>
                <div className="text-base font-bold text-amber-400">{stolenTel.alerts_today_count}</div>
              </div>
              <div className="p-2 bg-[#161616] border border-[#222]">
                <span className="text-[#888]">IN REGISTRY:</span>
                <div className="text-base font-bold text-white">{stolenTel.total_stolen_registered}</div>
              </div>
            </div>
          </div>

          {/* Stolen Vehicle Recent Intercepts Live Table / Feed */}
          <div className="lg:col-span-6 bg-[#111111] border border-[#2A2A2A] p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#60A5FA]" />
                <span>Recent Intercepted Target Plates (Law Enforcement)</span>
              </h3>
              <button
                onClick={() => onNavigate('stolen_alerts')}
                className="text-[10px] text-[#60A5FA] hover:underline uppercase font-bold"
              >
                Alerts Center →
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {stolenTel.recent_intercepts && stolenTel.recent_intercepts.length > 0 ? (
                stolenTel.recent_intercepts.map((item, idx) => (
                  <div key={item.id || idx} className="p-2.5 bg-[#141414] border border-[#222] hover:border-rose-500/50 transition flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-rose-400 font-mono text-sm tracking-wider">{item.vehicle_number}</span>
                        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-red-950/60 text-red-300 border border-red-500/40">
                          {item.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#888] mt-0.5">
                        FIR: <span className="text-[#CCC]">{item.fir_number}</span> | Owner: <span className="text-[#CCC]">{item.owner_name}</span>
                      </div>
                      <div className="text-[9px] text-[#666] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-rose-400" />
                        <span>{item.camera_location} ({item.camera_name})</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-[10px] font-bold text-emerald-400">{(item.confidence * 100).toFixed(0)}% Conf</span>
                      <span className="text-[9px] text-[#777]">{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-[#141414] border border-[#222] text-center text-[#888] text-xs">
                  No active stolen alert intercepts logged in current session.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#222] flex items-center justify-between text-[11px]">
              <span className="text-[#888]">Intercept Resolution Rate:</span>
              <span className="text-emerald-400 font-bold">{stolenTel.intercept_rate}%</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: Dynamic Severity Scoring & Maintenance Budget Tuner */}
      {(activeTab === 'overview' || activeTab === 'severity') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Interactive Severity Weight Coefficients */}
          <div className="lg:col-span-5 bg-[#111111] border border-[#2A2A2A] p-5 space-y-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2A]">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#FF9500] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#FF9500]" />
                <span>Severity Formula Live Weights</span>
              </h3>
              <span className="text-[10px] text-[#34C759] flex items-center gap-1">
                {isRecalculating ? <RefreshCw className="w-3 h-3 animate-spin text-amber-400" /> : <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                <span>Live Tuner</span>
              </span>
            </div>

            <div className="bg-[#0F0F0F] border border-[#222] p-3 text-[11px] text-[#34C759] leading-relaxed">
              <code>Severity = (W_area &times; Area_ratio) + (W_conf &times; Conf) + (W_class &times; Defect_multiplier)</code>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-[#AAA] mb-1">
                  <span>W_area (Defect Surface Area):</span>
                  <span className="text-[#2563EB] font-bold">{(weightArea * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" min="0.1" max="0.7" step="0.05"
                  value={weightArea} onChange={(e) => handleWeightChange('area', Number(e.target.value))}
                  className="w-full accent-[#2563EB] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-[#AAA] mb-1">
                  <span>W_conf (Model Confidence):</span>
                  <span className="text-[#2563EB] font-bold">{(weightConfidence * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" min="0.1" max="0.5" step="0.05"
                  value={weightConfidence} onChange={(e) => handleWeightChange('conf', Number(e.target.value))}
                  className="w-full accent-[#2563EB] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-[#AAA] mb-1">
                  <span>W_class (Defect Hazard Multiplier):</span>
                  <span className="text-[#2563EB] font-bold">{(weightCategory * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" min="0.1" max="0.5" step="0.05"
                  value={weightCategory} onChange={(e) => handleWeightChange('cat', Number(e.target.value))}
                  className="w-full accent-[#2563EB] cursor-pointer"
                />
              </div>
            </div>

            <div className="border-t border-[#2A2A2A] pt-4 space-y-2">
              <div className="text-xs text-[#888] font-bold uppercase">Multipliers in Live Formula:</div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="p-2 bg-[#141414] border border-[#222]">Pothole: <span className="text-[#FF3B30] font-bold">2.5x</span></div>
                <div className="p-2 bg-[#141414] border border-[#222]">Broken Road: <span className="text-[#FF3B30] font-bold">2.2x</span></div>
                <div className="p-2 bg-[#141414] border border-[#222]">Alligator Crack: <span className="text-[#FF9500] font-bold">1.8x</span></div>
                <div className="p-2 bg-[#141414] border border-[#222]">Linear Crack: <span className="text-[#FFD60A] font-bold">1.2x</span></div>
              </div>
            </div>
          </div>

          {/* Right: Real-Time Maintenance Budget & Severity Risk Breakdown */}
          <div className="lg:col-span-7 bg-[#111111] border border-[#2A2A2A] p-5 space-y-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2A]">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#34C759] flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#34C759]" />
                <span>Dynamic Maintenance & Patching Budget Forecast</span>
              </h3>
              <span className="text-[10px] text-[#34C759] bg-[#34C759]/10 border border-[#34C759]/30 px-2 py-0.5">
                LIVE CALCULATION
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#141414] border border-[#2A2A2A] p-3 text-[11px]">
                <span className="text-[#888]">POTHOLE REPAIRS:</span>
                <div className="text-lg font-bold text-white mt-1">
                  ${severityTel.estimated_budget.pothole_repairs.toLocaleString()} USD
                </div>
                <span className="text-[9px] text-[#666]">{potholeTel.pothole_count} potholes @ $250</span>
              </div>
              <div className="bg-[#141414] border border-[#2A2A2A] p-3 text-[11px]">
                <span className="text-[#888]">CRACK SEALING:</span>
                <div className="text-lg font-bold text-white mt-1">
                  ${severityTel.estimated_budget.crack_sealing.toLocaleString()} USD
                </div>
                <span className="text-[9px] text-[#666]">{potholeTel.crack_count} cracks @ $90</span>
              </div>
              <div className="bg-[#141414] border border-[#FF3B30] p-3 text-[11px]">
                <span className="text-[#FF3B30]">CRITICAL RE-ASPHALT:</span>
                <div className="text-lg font-bold text-[#FF3B30] mt-1">
                  ${severityTel.estimated_budget.critical_re_asphalt.toLocaleString()} USD
                </div>
                <span className="text-[9px] text-red-400">{severityTel.critical_count} critical zones @ $500</span>
              </div>
            </div>

            <div className="bg-[#161616] p-4 border border-[#2A2A2A] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-white uppercase text-xs block">TOTAL ESTIMATED SECTION REPAIR BUDGET:</span>
                <span className="text-[10px] text-[#888]">Computed across {potholeTel.total_defects} real detection points</span>
              </div>
              <span className="text-2xl font-bold font-mono text-[#34C759]">
                ${severityTel.estimated_budget.total_estimated_budget.toLocaleString()} USD
              </span>
            </div>

            {/* Severity Distribution Bar Chart */}
            <div className="space-y-2 pt-2 border-t border-[#222]">
              <span className="text-xs text-[#AAA] font-bold uppercase">Severity Risk Matrix Distribution:</span>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={severityChartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" horizontal={false} />
                    <XAxis type="number" stroke="#666" fontSize={10} />
                    <YAxis dataKey="severity" type="category" stroke="#AAA" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#141414', borderColor: '#333', color: '#FFF', fontSize: '11px', fontFamily: 'monospace' }} 
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {severityChartData.map((entry, index) => (
                        <Cell key={`sev-cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: 6-Month Degradation & Traffic Mobility */}
      {(activeTab === 'overview' || activeTab === 'trends' || activeTab === 'mobility') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 6-Month Timeline Trends Chart */}
          <div className="lg:col-span-8 bg-[#111111] border border-[#2A2A2A] p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#34C759]" />
                <span>6-Month Historical Defect & Stolen Alerts Timeline</span>
              </h3>
              <span className="text-[10px] text-[#34C759] bg-[#34C759]/10 border border-[#34C759]/30 px-2 py-0.5">
                DATABASE TIMELINE
              </span>
            </div>

            <div className="h-72 w-full flex items-center justify-center">
              {trendsChartData.length === 0 ? (
                <div className="text-center text-slate-500 text-xs font-mono">
                  No historical monthly trend logs available yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendsChartData} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="month" stroke="#666" fontSize={11} />
                    <YAxis stroke="#666" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#141414', borderColor: '#333', color: '#FFF', fontSize: '11px', fontFamily: 'monospace' }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line type="monotone" dataKey="potholes" stroke="#FF3B30" strokeWidth={2} name="Potholes Found" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="cracks" stroke="#FF9500" strokeWidth={2} name="Cracks Found" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="stolenAlerts" stroke="#F43F5E" strokeWidth={2} name="Stolen Alerts" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="healthScore" stroke="#34C759" strokeWidth={2} name="Road Health Score" dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Vehicle Traffic Mobility Breakdown */}
          <div className="lg:col-span-4 bg-[#111111] border border-[#2A2A2A] p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Car className="w-4 h-4 text-[#2563EB]" />
                <span>Vehicle Class Mobility</span>
              </h3>
              <span className="text-[10px] text-[#2563EB] bg-[#2563EB]/10 border border-[#2563EB]/30 px-2 py-0.5">
                {mobilityTel.total_vehicles} Tracked
              </span>
            </div>

            <div className="h-72 w-full flex items-center justify-center">
              {vehicleChartData.length === 0 ? (
                <div className="text-center text-slate-500 text-xs font-mono">
                  No vehicle detections logged in current survey.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vehicleChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="name" stroke="#666" fontSize={10} angle={-15} textAnchor="end" />
                    <YAxis stroke="#666" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#141414', borderColor: '#333', color: '#FFF', fontSize: '11px', fontFamily: 'monospace' }} 
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {vehicleChartData.map((entry, index) => (
                        <Cell key={`veh-bar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: Violations & Enforcement */}
      {(activeTab === 'overview' || activeTab === 'violations') && (
        <div className="bg-[#111111] border border-[#2A2A2A] p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#E056FD]" />
              <span>Traffic Violations, Challans & Fines Telemetry</span>
            </h3>
            <span className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5">
              ₹{violationsTel.total_fines_amount.toLocaleString()} TOTAL FINES
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 h-64 w-full flex items-center justify-center">
              {violationsTel.violations_breakdown.length === 0 ? (
                <div className="text-center text-slate-500 text-xs font-mono">
                  No traffic violations or e-challans recorded in this survey.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={violationsTel.violations_breakdown} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="category" stroke="#666" fontSize={10} />
                    <YAxis stroke="#666" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#141414', borderColor: '#333', color: '#FFF', fontSize: '11px', fontFamily: 'monospace' }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '6px' }} />
                    <Bar dataKey="challans" fill="#FF3B30" name="Challans Issued" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="fines" fill="#FF9500" name="Fine Value (₹)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="lg:col-span-4 flex flex-col justify-between space-y-3">
              <div className="p-3 bg-[#141414] border border-[#222]">
                <span className="text-[10px] text-[#888] uppercase">Helmet Violations:</span>
                <div className="text-xl font-bold text-[#FF3B30]">{violationsTel.helmet_violations} Challans</div>
              </div>
              <div className="p-3 bg-[#141414] border border-[#222]">
                <span className="text-[10px] text-[#888] uppercase">Total Penalties Assessed:</span>
                <div className="text-xl font-bold text-amber-400">₹{violationsTel.total_fines_amount.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-[#141414] border border-[#222]">
                <span className="text-[10px] text-[#888] uppercase">Paid Fines Collected:</span>
                <div className="text-xl font-bold text-emerald-400">₹{violationsTel.paid_fines_amount.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation Bar */}
      <div className="pt-3 border-t border-[#222] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('violations')}
            className="px-3 py-1.5 bg-red-950/60 border border-red-500/40 text-red-400 text-xs hover:bg-red-900/60 transition flex items-center gap-1 font-bold"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Violations Center ({violationsTel.total_violations})</span>
          </button>
          <button
            onClick={() => onNavigate('stolen_alerts')}
            className="px-3 py-1.5 bg-rose-950/60 border border-rose-500/40 text-rose-400 text-xs hover:bg-rose-900/60 transition flex items-center gap-1 font-bold"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Stolen Alerts ({stolenTel.active_alerts_count})</span>
          </button>
        </div>

        <button
          onClick={() => onNavigate('gps-map')}
          className="px-3 py-1.5 bg-[#1A1A1A] border border-[#333] text-slate-300 hover:text-white text-xs transition flex items-center gap-1"
        >
          <MapPin className="w-3.5 h-3.5 text-[#34C759]" />
          <span>GIS Heatmap Map</span>
        </button>
      </div>
    </div>
  );
};
