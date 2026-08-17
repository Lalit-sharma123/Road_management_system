import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Crosshair, 
  AlertTriangle, 
  ShieldAlert, 
  Layers 
} from 'lucide-react';
import { Detection, SeverityLevel, FrameData } from '../types/inspection';

interface DetectionTableProps {
  detections?: Detection[];
  frames?: FrameData[];
  onSelectFrame?: (frameIdx: number) => void;
}

export const DetectionTable: React.FC<DetectionTableProps> = ({ 
  detections: directDetections, 
  frames,
  onSelectFrame 
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [minConfidence, setMinConfidence] = useState<number>(0.20);
  const [sortField, setSortField] = useState<'timestamp_sec' | 'confidence' | 'severity_score'>('timestamp_sec');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Flatten detections if frames provided
  const allDetections: Detection[] = directDetections || (
    frames?.flatMap((f) => f.detections || []) || []
  );

  // Filter list
  const filtered = allDetections.filter((d) => {
    const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter;
    const matchesSeverity = severityFilter === 'all' || d.severity === severityFilter;
    const matchesConf = d.confidence >= minConfidence;
    const matchesSearch = searchTerm === '' || 
      d.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.severity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.frame_number.toString().includes(searchTerm);

    return matchesCategory && matchesSeverity && matchesConf && matchesSearch;
  });

  // Sort list
  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (field: 'timestamp_sec' | 'confidence' | 'severity_score') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
      case 'critical':
        return <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/40">Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-[#FF9500]/20 text-[#FF9500] border border-[#FF9500]/40">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-[#FFD60A]/20 text-[#FFD60A] border border-[#FFD60A]/40">Medium</span>;
      default:
        return <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-[#34C759]/20 text-[#34C759] border border-[#34C759]/40">Low</span>;
    }
  };

  return (
    <div className="bg-[#141414] border border-[#2A2A2A] p-5 space-y-4 font-mono text-xs">
      {/* Table Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2A2A2A] pb-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-[#2563EB]" />
            YOLO Inferred Road Defects Table ({sorted.length} records)
          </h3>
          <p className="text-[11px] text-[#888]">
            Detailed frame-by-frame defect detections with confidence & bounding box telemetry
          </p>
        </div>

        {/* Search Bar & Quick Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#888] absolute left-2.5 top-2.5" />
            <input 
              type="text" 
              placeholder="Search category, frame..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#1A1A1A] border border-[#333] pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#2563EB] w-44"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#1A1A1A] border border-[#333] px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#2563EB]"
          >
            <option value="all">All Categories</option>
            <option value="pothole">Potholes</option>
            <option value="transverse_crack">Transverse Crack</option>
            <option value="longitudinal_crack">Longitudinal Crack</option>
            <option value="alligator_crack">Alligator Crack</option>
            <option value="missing_asphalt">Missing Asphalt</option>
            <option value="broken_road">Broken Road</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#1A1A1A] border border-[#333] px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#2563EB]"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Table Display */}
      <div className="overflow-x-auto border border-[#2A2A2A]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1A1A1A] border-b border-[#2A2A2A] text-[#888] text-[10px] uppercase tracking-wider">
              <th className="p-3"># Detection ID</th>
              <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('timestamp_sec')}>
                <div className="flex items-center gap-1">
                  <span>Frame & Timestamp</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3">Category</th>
              <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('confidence')}>
                <div className="flex items-center gap-1">
                  <span>Confidence</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3">Severity</th>
              <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('severity_score')}>
                <div className="flex items-center gap-1">
                  <span>Severity Score</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3">BBox Coordinates (px)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222]">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-[#666] text-xs">
                  No road defect detections match current filters.
                </td>
              </tr>
            ) : (
              sorted.map((item, idx) => (
                <tr 
                  key={item.id || `det-${idx}`} 
                  onClick={() => onSelectFrame && onSelectFrame(item.frame_number)}
                  className="hover:bg-[#1A1A1A] transition-colors cursor-pointer"
                >
                  <td className="p-3 text-[#AAA] text-[10px] truncate max-w-[120px]">
                    {item.id || `DET_${idx + 1}`}
                  </td>
                  <td className="p-3 text-white font-bold">
                    Frame #{item.frame_number}
                    <span className="text-[#888] text-[10px] block font-normal">
                      @{item.timestamp_sec?.toFixed(2) ?? '0.00'}s
                    </span>
                  </td>
                  <td className="p-3 font-bold text-white uppercase">
                    {item.category?.replace(/_/g, ' ') || 'Pothole'}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-[#222] h-1.5 overflow-hidden">
                        <div 
                          className="bg-[#2563EB] h-full"
                          style={{ width: `${(item.confidence * 100).toFixed(0)}%` }}
                        />
                      </div>
                      <span className="text-white font-bold">
                        {(item.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    {getSeverityBadge(item.severity)}
                  </td>
                  <td className="p-3 text-[#FFD60A] font-bold">
                    {item.severity_score?.toFixed(1) ?? '75.0'}
                  </td>
                  <td className="p-3 text-[#888] text-[10px]">
                    [{item.bbox?.x_min ?? 0}, {item.bbox?.y_min ?? 0}, {item.bbox?.x_max ?? 0}, {item.bbox?.y_max ?? 0}]
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
