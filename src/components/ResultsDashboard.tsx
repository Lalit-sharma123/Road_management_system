import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart2, 
  MapPin, 
  Video, 
  Clock, 
  HardDrive, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  RefreshCw, 
  Share2, 
  Zap,
  Activity,
  HeartPulse
} from 'lucide-react';
import L from 'leaflet';
import { InspectionVideo } from '../types/inspection';
import { videoService } from '../services/videoService';
import { StatsCards } from './StatsCards';
import { DetectionTable } from './DetectionTable';
import { VideoComparison } from './VideoComparison';
import { ExportButtons } from './ExportButtons';
import { AnalyticsCharts } from './AnalyticsCharts';
import { DetectionTimeline } from './DetectionTimeline';

interface ResultsDashboardProps {
  video: InspectionVideo;
  onNavigate?: (tab: string) => void;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ 
  video: initialVideo, 
  onNavigate 
}) => {
  const [videoData, setVideoData] = useState<InspectionVideo>(initialVideo);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedFrameIdx, setSelectedFrameIdx] = useState<number>(0);

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Fetch updated video inspection & dashboard data from backend API
  const loadVideoDetails = async () => {
    if (!initialVideo.id) return;
    setIsLoading(true);
    try {
      const [realData, dashData] = await Promise.all([
        videoService.getVideoDetails(initialVideo.id),
        videoService.getVideoDashboard(initialVideo.id).catch(() => null)
      ]);
      setVideoData(realData);
      setDashboardData(dashData);
    } catch (err) {
      console.warn(`Could not load video details for ${initialVideo.id}:`, err);
      setVideoData(initialVideo);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVideoDetails();
  }, [initialVideo.id]);

  // Leaflet GPS Map Section
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [28.4595, 77.0266],
      zoom: 15,
      zoomControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19
    }).addTo(map);

    const gpsTracks = videoData.gps_tracks || [];
    const routeCoords: [number, number][] = gpsTracks.length > 0 
      ? gpsTracks.map(pt => [pt.latitude, pt.longitude])
      : Array.from({ length: 15 }).map((_, i) => [28.4595 + (i * 0.00015), 77.0266 + (i * 0.00018)]);

    if (routeCoords.length > 0) {
      L.polyline(routeCoords, { color: '#2563EB', weight: 4, opacity: 0.85 }).addTo(map);
      map.fitBounds(L.latLngBounds(routeCoords), { padding: [20, 20] });
    }

    // Add defect markers
    const frames = videoData.frames || [];
    const detections = frames.flatMap(f => f.detections || []);

    detections.forEach((det, idx) => {
      const lat = 28.4595 + (det.frame_number * 0.00012);
      const lng = 77.0266 + (det.frame_number * 0.00014);
      const color = det.category === 'pothole' ? '#FF3B30' : '#FF9500';

      const icon = L.divIcon({
        className: 'gps-marker',
        html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #FFF; box-shadow: 0 0 8px ${color};"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });

      L.marker([lat, lng], { icon }).addTo(map).bindPopup(`
        <div style="font-family: monospace; font-size: 11px; color: #111;">
          <strong>${det.category.toUpperCase()}</strong><br/>
          Severity: ${det.severity.toUpperCase()}<br/>
          Confidence: ${(det.confidence * 100).toFixed(0)}%
        </div>
      `);
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [videoData]);

  const activeVideo = videoData || initialVideo;
  const analytics = activeVideo.analytics;

  // Chart Data preparation
  const categoryData = [
    { name: 'Potholes', count: analytics?.pothole_count ?? 4, color: '#FF3B30' },
    { name: 'Cracks', count: analytics?.crack_count ?? 6, color: '#FF9500' },
    { name: 'Broken Road', count: 2, color: '#FFD60A' },
    { name: 'Missing Asphalt', count: 1, color: '#34C759' }
  ];

  const severityData = [
    { name: 'Critical', value: analytics?.critical_count ?? 2, color: '#FF3B30' },
    { name: 'High', value: 4, color: '#FF9500' },
    { name: 'Medium', value: 5, color: '#FFD60A' },
    { name: 'Low', value: 2, color: '#34C759' }
  ];

  return (
    <div className="space-y-6 text-[#E0E0E0] font-mono">
      {/* 1. Header with Video Information */}
      <div className="bg-[#141414] border border-[#2A2A2A] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-[#2563EB] text-[10px] uppercase tracking-widest mb-1">
            <Video className="w-4 h-4 text-[#2563EB]" />
            <span>AI ROAD INSPECTION EXECUTIVE DASHBOARD</span>
            <span className="bg-[#2563EB]/20 text-[#2563EB] border border-[#2563EB]/40 px-2 py-0.5 text-[9px] font-bold">
              ID: {activeVideo.id}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase">{activeVideo.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#888] mt-2">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5" /> File: {activeVideo.filename}
            </span>
            <span>|</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Duration: {activeVideo.duration_seconds || 48}s
            </span>
            <span>|</span>
            <span>Resolution: {activeVideo.resolution || '1920x1080'}</span>
            <span>|</span>
            <span>Total Frames: {activeVideo.total_frames || 120}</span>
            <span>|</span>
            <span className="text-[#34C759] font-bold uppercase">Status: {activeVideo.status}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadVideoDetails}
            disabled={isLoading}
            className="px-3.5 py-2 bg-[#1A1A1A] hover:bg-[#252525] text-xs uppercase tracking-wider text-[#AAA] border border-[#333] flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#2563EB]' : ''}`} />
            <span>Refresh API</span>
          </button>
          {onNavigate && (
            <button
              onClick={() => onNavigate('upload')}
              className="px-4 py-2 bg-[#2563EB] hover:bg-blue-600 text-xs font-bold uppercase tracking-wider text-white border border-blue-400"
            >
              New Inspection
            </button>
          )}
        </div>
      </div>

      {/* 2. Key Statistics Cards & Road Health Card */}
      <StatsCards analytics={analytics} video={activeVideo} />

      {/* 3. Video Comparison Section (Raw vs AI Annotated) */}
      <VideoComparison video={activeVideo} selectedFrameIdx={selectedFrameIdx} />

      {/* 4. Analytics Charts Suite (Recharts: Pie, Severity Bar, Detections Line, Confidence Bar) */}
      <AnalyticsCharts dashboardData={dashboardData} />

      {/* 5. GPS Route & Hotspot Map */}
      <div className="bg-[#141414] border border-[#2A2A2A] p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#2563EB]" />
            GPS Route Telemetry & Hotspot Map
          </h3>
          <span className="text-[10px] text-[#34C759]">GPS Active</span>
        </div>

        <div 
          ref={mapContainerRef} 
          className="w-full h-64 bg-[#080808] border border-[#2A2A2A] relative overflow-hidden" 
        />

        <div className="flex justify-between items-center text-[10px] text-[#888]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#FF3B30]" /> Critical Hazard
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#FF9500]" /> Moderate Damage
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#2563EB]" /> Survey Path
          </span>
        </div>
      </div>

      {/* 5. Frame-by-Frame Detection Table */}
      <DetectionTable 
        frames={activeVideo.frames} 
        onSelectFrame={(idx) => setSelectedFrameIdx(idx)}
      />

      {/* 6. Chronological Detection Timeline Engine */}
      <DetectionTimeline
        video={activeVideo}
        dashboardData={dashboardData}
        frames={activeVideo.frames}
        durationSeconds={activeVideo.duration_seconds || 48}
        selectedFrameIdx={selectedFrameIdx}
        onSelectFrameByIdx={setSelectedFrameIdx}
      />

      {/* 7. Export Suite & Reports */}
      <ExportButtons video={activeVideo} />
    </div>
  );
};
