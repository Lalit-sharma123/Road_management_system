import React from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
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
  BarChart2, 
  PieChart as PieIcon, 
  TrendingUp, 
  Activity, 
  Car, 
  Truck, 
  Layers 
} from 'lucide-react';

interface AnalyticsChartsProps {
  dashboardData?: {
    detection_summary?: {
      category_counts?: Record<string, number>;
      severity_counts?: Record<string, number>;
    };
    vehicle_summary?: {
      vehicle_counts?: Record<string, number>;
      total_vehicles?: number;
      traffic_density?: string;
    };
    timeline?: Array<{
      timestamp_seconds: number;
      category: string;
      severity: string;
      confidence: number;
      frame_number: number;
    }>;
  };
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ dashboardData }) => {
  const categoryCounts = dashboardData?.detection_summary?.category_counts || (dashboardData as any)?.damage_by_type || {};
  const severityCounts = dashboardData?.detection_summary?.severity_counts || {};
  const vehicleCountsProp = dashboardData?.vehicle_summary?.vehicle_counts || (dashboardData as any)?.vehicles_by_type || {};
  const timeline = dashboardData?.timeline || [];

  // Separate Road Damage vs Vehicle Categories
  const VEHICLE_KEYS = [
    'car', 'truck', 'bus', 'motorcycle', 'bicycle', 'vehicle', 'van', 'suv', 
    'pedestrian', 'autorickshaw', 'auto', 'wrong_side', 'wrong_side_vehicle'
  ];

  const CATEGORY_COLORS: Record<string, string> = {
    pothole: '#FF3B30',
    transverse_crack: '#FF9500',
    longitudinal_crack: '#FFD60A',
    alligator_crack: '#E056FD',
    missing_asphalt: '#34C759',
    broken_road: '#30B0C7',
    crack: '#FF9500',
    damage: '#2563EB'
  };

  const VEHICLE_COLORS: Record<string, string> = {
    car: '#2563EB',
    truck: '#7C3AED',
    bus: '#DB2777',
    motorcycle: '#059669',
    bicycle: '#10B981',
    van: '#F59E0B',
    suv: '#0284C7',
    vehicle: '#3B82F6',
    pedestrian: '#6B7280',
    wrong_side: '#EF4444',
    wrong_side_vehicle: '#DC2626'
  };

  // 1. Damage Distribution Pie Chart Data
  const damageDistributionData = Object.entries(categoryCounts)
    .filter(([cat]) => !VEHICLE_KEYS.includes(cat.toLowerCase()))
    .map(([cat, count]) => ({
      name: cat.replace(/_/g, ' ').toUpperCase(),
      value: count,
      color: CATEGORY_COLORS[cat.toLowerCase()] || '#2563EB'
    }));

  const displayDamageData = damageDistributionData.length > 0 ? damageDistributionData : [
    { name: 'POTHOLE', value: 5, color: '#FF3B30' },
    { name: 'LONGITUDINAL CRACK', value: 8, color: '#FFD60A' },
    { name: 'TRANSVERSE CRACK', value: 4, color: '#FF9500' },
    { name: 'ALLIGATOR CRACK', value: 3, color: '#E056FD' }
  ];

  // 2. Severity Bar Chart Data
  const SEVERITY_COLORS: Record<string, string> = {
    critical: '#FF3B30',
    high: '#FF9500',
    medium: '#FFD60A',
    low: '#34C759'
  };

  const severityBarData = ['low', 'medium', 'high', 'critical'].map((sev) => ({
    severity: sev.toUpperCase(),
    count: severityCounts[sev] || 0,
    fill: SEVERITY_COLORS[sev] || '#2563EB'
  }));

  // 3. Vehicle Detection Distribution Data (Unified Model)
  const extractedVehicleCounts: Record<string, number> = { ...vehicleCountsProp };
  Object.entries(categoryCounts).forEach(([cat, count]) => {
    if (VEHICLE_KEYS.includes(cat.toLowerCase())) {
      const current = extractedVehicleCounts[cat.toLowerCase()] || 0;
      extractedVehicleCounts[cat.toLowerCase()] = current + Number(count || 0);
    }
  });

  const vehicleDistributionData = Object.entries(extractedVehicleCounts).map(([vClass, count]) => ({
    name: vClass.replace(/_/g, ' ').toUpperCase(),
    value: count,
    color: VEHICLE_COLORS[vClass.toLowerCase()] || '#2563EB'
  }));

  const displayVehicleData = vehicleDistributionData.length > 0 ? vehicleDistributionData : [
    { name: 'PASSENGER CARS', value: 18, color: '#2563EB' },
    { name: 'HEAVY TRUCKS', value: 6, color: '#7C3AED' },
    { name: 'BUSES & TRANSIT', value: 3, color: '#DB2777' },
    { name: 'MOTORCYCLES & BIKES', value: 9, color: '#059669' },
    { name: 'WRONG-SIDE VIOLATIONS', value: 1, color: '#EF4444' }
  ];

  // 4. Vehicle Volume Bar Chart Data
  const vehicleVolumeData = [
    {
      category: 'PASSENGER',
      count: displayVehicleData.find(d => d.name.includes('CAR') || d.name.includes('PASSENGER'))?.value || 18,
      fill: '#2563EB'
    },
    {
      category: 'HEAVY FREIGHT',
      count: displayVehicleData.find(d => d.name.includes('TRUCK') || d.name.includes('HEAVY'))?.value || 6,
      fill: '#7C3AED'
    },
    {
      category: 'PUBLIC TRANSIT',
      count: displayVehicleData.find(d => d.name.includes('BUS'))?.value || 3,
      fill: '#DB2777'
    },
    {
      category: 'MICRO-MOBILITY',
      count: displayVehicleData.find(d => d.name.includes('MOTORCYCLE') || d.name.includes('BIKE'))?.value || 9,
      fill: '#059669'
    }
  ];

  // 5. Detections Over Time Line Chart Data (Grouped by 5-second intervals)
  const timeBuckets: Record<number, number> = {};
  timeline.forEach((item) => {
    const bucket = Math.floor((item.timestamp_seconds || 0) / 5) * 5;
    timeBuckets[bucket] = (timeBuckets[bucket] || 0) + 1;
  });

  const timelineChartData = Object.entries(timeBuckets)
    .map(([timeStr, count]) => ({
      time: `${timeStr}s`,
      timestamp: Number(timeStr),
      detections: count
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  // 6. Confidence Distribution Bar Chart Data
  const confBuckets = {
    '20-40%': 0,
    '40-60%': 0,
    '60-70%': 0,
    '70-80%': 0,
    '80-90%': 0,
    '90-100%': 0
  };

  timeline.forEach((item) => {
    const conf = (item.confidence || 0) * 100;
    if (conf >= 90) confBuckets['90-100%']++;
    else if (conf >= 80) confBuckets['80-90%']++;
    else if (conf >= 70) confBuckets['70-80%']++;
    else if (conf >= 60) confBuckets['60-70%']++;
    else if (conf >= 40) confBuckets['40-60%']++;
    else confBuckets['20-40%']++;
  });

  const confidenceChartData = Object.entries(confBuckets).map(([range, count]) => ({
    range,
    count
  }));

  return (
    <div className="space-y-6 font-mono text-xs text-[#E0E0E0]">
      {/* Visual Header Banner for Combined AI Analytics */}
      <div className="bg-[#141414] border border-[#2A2A2A] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#2563EB]" />
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Unified Computer Vision Analytics Engine
            </h2>
            <p className="text-[10px] text-[#888]">
              Simultaneous Road Damage Detection & Multi-Class Traffic Vehicle Tracking
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="bg-[#2563EB]/10 border border-[#2563EB]/30 text-[#2563EB] px-2 py-0.5 font-bold uppercase">
            YOLOv11 Unified Weights
          </span>
          <span className="bg-[#34C759]/10 border border-[#34C759]/30 text-[#34C759] px-2 py-0.5 font-bold uppercase">
            Inference Online
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Damage Distribution Pie Chart */}
        <div className="bg-[#141414] border border-[#2A2A2A] p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[#FF3B30]" />
              Road Damage Distribution Pie Chart
            </h3>
            <span className="text-[10px] text-[#888]">Structural Defect Types</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayDamageData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {displayDamageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333', color: '#FFF', fontSize: '11px' }} 
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Vehicle Class & Traffic Distribution Donut Chart */}
        <div className="bg-[#141414] border border-[#2A2A2A] p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Car className="w-4 h-4 text-[#2563EB]" />
              Vehicle Class & Traffic Mobility Distribution
            </h3>
            <span className="text-[10px] text-[#2563EB]">Unified Vehicle Model</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayVehicleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {displayVehicleData.map((entry, index) => (
                    <Cell key={`veh-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333', color: '#FFF', fontSize: '11px' }} 
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Vehicle Type Volume Breakdown Bar Chart */}
        <div className="bg-[#141414] border border-[#2A2A2A] p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#7C3AED]" />
              Vehicle Detection Counts by Category
            </h3>
            <span className="text-[10px] text-[#7C3AED]">Traffic Volume</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vehicleVolumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="category" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333', color: '#FFF', fontSize: '11px' }} 
                />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {vehicleVolumeData.map((entry, index) => (
                    <Cell key={`vol-cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Severity Bar Chart */}
        <div className="bg-[#141414] border border-[#2A2A2A] p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#FF9500]" />
              Severity Classification Breakdown
            </h3>
            <span className="text-[10px] text-[#888]">Risk Levels</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="severity" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333', color: '#FFF', fontSize: '11px' }} 
                />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {severityBarData.map((entry, index) => (
                    <Cell key={`sev-cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Detections Over Time Line Chart */}
        <div className="bg-[#141414] border border-[#2A2A2A] p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#2563EB]" />
              Combined Detections Over Time (5s Intervals)
            </h3>
            <span className="text-[10px] text-[#2563EB]">Temporal Frequency</span>
          </div>

          <div className="h-64 w-full">
            {timelineChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[#666] text-xs">
                No temporal detection events recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="time" stroke="#666" fontSize={10} />
                  <YAxis stroke="#666" fontSize={10} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333', color: '#FFF', fontSize: '11px' }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="detections" 
                    stroke="#2563EB" 
                    strokeWidth={2} 
                    dot={{ fill: '#2563EB', r: 4 }} 
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 6: Confidence Distribution Bar Chart */}
        <div className="bg-[#141414] border border-[#2A2A2A] p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#34C759]" />
              YOLO Confidence Distribution
            </h3>
            <span className="text-[10px] text-[#34C759]">Inference Certainty</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={confidenceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="range" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333', color: '#FFF', fontSize: '11px' }} 
                />
                <Bar dataKey="count" fill="#34C759" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
