import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  Navigation, 
  Compass, 
  Terminal, 
  Layers, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  Zap,
  Globe,
  Eye,
  Filter,
  Maximize2,
  Crosshair,
  Maximize,
  Car,
  Send,
  Building2,
  ShieldAlert
} from 'lucide-react';
import { InspectionVideo, GPSPoint, SeverityLevel, DamageCategory } from '../types/inspection';

export interface DynamicPotholeMarker {
  id?: string;
  pothole_id?: string;
  detection_id?: string;
  track_id?: number;
  frame_number?: number;
  timestamp_sec?: number;
  timestamp?: string;
  latitude: number;
  longitude: number;
  category?: DamageCategory | string;
  severity?: SeverityLevel | string;
  confidence?: number;
  road_name?: string;
  road_authority?: string;
  image_url?: string;
  evidence_image_url?: string;
  distance_meters?: number;
  lane_position?: string;
}

export interface GpsMappingViewProps {
  video?: InspectionVideo | null;
  onNavigate?: (tab: string) => void;
  potholeMarkers?: DynamicPotholeMarker[];
  currentVehiclePosition?: { lat: number; lng: number };
  compact?: boolean;
  onReportPothole?: (marker: DynamicPotholeMarker) => void;
  heightClass?: string;
}

export interface GPSDamageMarker {
  id: string;
  pothole_id?: string;
  frame_number: number;
  timestamp_sec: number;
  latitude: number;
  longitude: number;
  category: DamageCategory;
  severity: SeverityLevel;
  confidence: number;
  road_name: string;
  road_authority?: string;
  image_url: string;
  distance_meters?: number;
  lane_position?: string;
}

const defaultStaticMarkers: GPSDamageMarker[] = [
  {
    id: 'marker-101',
    pothole_id: 'POT-101',
    frame_number: 120,
    timestamp_sec: 4.0,
    latitude: 28.4600,
    longitude: 77.0270,
    category: 'pothole',
    severity: 'critical',
    confidence: 0.94,
    road_name: 'NH-48 Sector 14 Corridor A',
    road_authority: 'National Highways Authority of India (NHAI)',
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'marker-102',
    pothole_id: 'CRK-102',
    frame_number: 280,
    timestamp_sec: 9.3,
    latitude: 28.4612,
    longitude: 77.0282,
    category: 'longitudinal_crack',
    severity: 'medium',
    confidence: 0.82,
    road_name: 'NH-48 Sector 14 Corridor A',
    road_authority: 'National Highways Authority of India (NHAI)',
    image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'marker-103',
    pothole_id: 'POT-103',
    frame_number: 468,
    timestamp_sec: 15.6,
    latitude: 28.4628,
    longitude: 77.0298,
    category: 'broken_road',
    severity: 'critical',
    confidence: 0.91,
    road_name: 'NH-48 Sector 14 Corridor B',
    road_authority: 'National Highways Authority of India (NHAI)',
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'marker-104',
    pothole_id: 'CRK-104',
    frame_number: 663,
    timestamp_sec: 22.1,
    latitude: 28.4640,
    longitude: 77.0310,
    category: 'transverse_crack',
    severity: 'low',
    confidence: 0.76,
    road_name: 'NH-48 Sector 14 Corridor B',
    road_authority: 'State PWD Division',
    image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'marker-105',
    pothole_id: 'POT-105',
    frame_number: 954,
    timestamp_sec: 31.8,
    latitude: 28.4660,
    longitude: 77.0330,
    category: 'pothole',
    severity: 'high',
    confidence: 0.89,
    road_name: 'NH-48 Sector 14 Corridor C',
    road_authority: 'State PWD Division',
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'marker-106',
    pothole_id: 'ASP-106',
    frame_number: 1260,
    timestamp_sec: 42.0,
    latitude: 28.4682,
    longitude: 77.0352,
    category: 'missing_asphalt',
    severity: 'medium',
    confidence: 0.85,
    road_name: 'NH-48 Sector 14 Corridor C',
    road_authority: 'Municipal Corporation Road Division',
    image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80'
  }
];

export const GpsMappingView: React.FC<GpsMappingViewProps> = ({ 
  video, 
  onNavigate,
  potholeMarkers,
  currentVehiclePosition,
  compact = false,
  onReportPothole,
  heightClass
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);

  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Base road GPS track points
  const gpsTracks: GPSPoint[] = video?.gps_tracks || [
    { frame_number: 1, latitude: 28.4595, longitude: 77.0266, altitude_meters: 215.4, speed_kmh: 42.5, road_name: 'NH-48 Sector 14' },
    { frame_number: 150, latitude: 28.4608, longitude: 77.0278, altitude_meters: 215.8, speed_kmh: 44.1, road_name: 'NH-48 Sector 14' },
    { frame_number: 300, latitude: 28.4621, longitude: 77.0291, altitude_meters: 216.2, speed_kmh: 41.8, road_name: 'NH-48 Sector 14' },
    { frame_number: 450, latitude: 28.4635, longitude: 77.0305, altitude_meters: 215.1, speed_kmh: 45.0, road_name: 'NH-48 Sector 14' },
    { frame_number: 600, latitude: 28.4649, longitude: 77.0318, altitude_meters: 214.7, speed_kmh: 39.2, road_name: 'NH-48 Sector 14' }
  ];

  // Derive Geotagged Damage Markers dynamically from props or video frames
  const damageMarkers: GPSDamageMarker[] = useMemo(() => {
    if (potholeMarkers && potholeMarkers.length > 0) {
      return potholeMarkers.map((m, idx) => ({
        id: m.id || m.pothole_id || m.detection_id || `pot-${idx}-${m.latitude}-${m.longitude}`,
        pothole_id: m.pothole_id || `POT-${m.track_id || idx + 1}`,
        frame_number: m.frame_number ?? (idx * 15),
        timestamp_sec: m.timestamp_sec ?? (m.timestamp ? Math.round(new Date(m.timestamp).getTime() / 1000) : idx * 2),
        latitude: m.latitude,
        longitude: m.longitude,
        category: ((m.category as DamageCategory) || 'pothole'),
        severity: ((m.severity as SeverityLevel) || 'high'),
        confidence: m.confidence ?? 0.92,
        road_name: m.road_name || 'Active Road Corridor',
        road_authority: m.road_authority || 'National Highway Authority',
        image_url: m.image_url || m.evidence_image_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
        distance_meters: m.distance_meters,
        lane_position: m.lane_position
      }));
    }

    if (video?.frames && video.frames.length > 0) {
      const extracted: GPSDamageMarker[] = [];
      video.frames.forEach((f) => {
        if (f.has_damage && f.detections && f.detections.length > 0) {
          f.detections.forEach((d) => {
            const gpsPt = video.gps_tracks?.find((g) => g.frame_number >= f.frame_number) || video.gps_tracks?.[0];
            extracted.push({
              id: d.id,
              pothole_id: `POT-${d.id.slice(-4)}`,
              frame_number: f.frame_number,
              timestamp_sec: f.timestamp_sec,
              latitude: gpsPt ? gpsPt.latitude : 28.4635 + (Math.random() - 0.5) * 0.008,
              longitude: gpsPt ? gpsPt.longitude : 77.0305 + (Math.random() - 0.5) * 0.008,
              category: d.category,
              severity: d.severity,
              confidence: d.confidence,
              road_name: gpsPt?.road_name || 'NH-48 Corridor',
              image_url: f.image_url
            });
          });
        }
      });
      if (extracted.length > 0) return extracted;
    }

    return defaultStaticMarkers;
  }, [potholeMarkers, video]);

  const [selectedMarker, setSelectedMarker] = useState<GPSDamageMarker>(damageMarkers[0] || defaultStaticMarkers[0]);

  // Sync selectedMarker when damageMarkers change
  useEffect(() => {
    if (damageMarkers.length > 0) {
      setSelectedMarker((prev) => {
        const found = damageMarkers.find((m) => m.id === prev?.id);
        return found || damageMarkers[0];
      });
    }
  }, [damageMarkers]);

  // Filter markers based on dropdown selections
  const filteredMarkers = useMemo(() => {
    return damageMarkers.filter((m) => {
      const matchesSev = severityFilter === 'all' || m.severity === severityFilter;
      const matchesCat = categoryFilter === 'all' || m.category === categoryFilter;
      return matchesSev && matchesCat;
    });
  }, [damageMarkers, severityFilter, categoryFilter]);

  const getSeverityHexColor = (severity: SeverityLevel | string) => {
    switch (severity) {
      case 'critical':
        return '#FF3B30'; // Red
      case 'high':
        return '#FF9500'; // Orange
      case 'medium':
        return '#FFD60A'; // Yellow
      case 'low':
      default:
        return '#34C759'; // Green
    }
  };

  const formatTimestamp = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = (secs % 60).toFixed(2);
    const padded = parseFloat(remainder) < 10 ? `0${remainder}` : remainder;
    return `${mins.toString().padStart(2, '0')}:${padded}`;
  };

  // 1. Initialize Map Instance (Only on mount)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialCenter: [number, number] = currentVehiclePosition 
        ? [currentVehiclePosition.lat, currentVehiclePosition.lng]
        : (damageMarkers[0] ? [damageMarkers[0].latitude, damageMarkers[0].longitude] : [28.4635, 77.0305]);

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: compact ? 14 : 15,
        zoomControl: !compact,
        attributionControl: false
      });

      // CartoDB Dark Matter tile layer
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          subdomains: 'abcd',
          maxZoom: 19
        }
      ).addTo(map);

      // Create polyline track
      const polylineCoords: [number, number][] = gpsTracks.map(p => [p.latitude, p.longitude]);
      if (polylineCoords.length > 1) {
        L.polyline(polylineCoords, {
          color: '#3B82F6',
          weight: 3,
          opacity: 0.8,
          dashArray: '6, 6'
        }).addTo(map);
      }

      // Layer group for dynamic markers
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      // Add vehicle marker if position provided
      if (currentVehiclePosition) {
        const carIcon = L.divIcon({
          className: 'custom-car-marker',
          html: `
            <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center;">
              <div style="position:absolute; width:34px; height:34px; border-radius:50%; background:rgba(99,102,241,0.25); animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
              <div style="width:22px; height:22px; border-radius:50%; background:#4F46E5; border:2px solid #FFFFFF; box-shadow:0 0 10px rgba(79,70,229,0.9); display:flex; align-items:center; justify-content:center; color:white;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 19 21 12 17 5 21 12 2"/></svg>
              </div>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });

        const vMarker = L.marker([currentVehiclePosition.lat, currentVehiclePosition.lng], { icon: carIcon }).addTo(map);
        vehicleMarkerRef.current = vMarker;
      }

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Smoothly update vehicle position marker
  useEffect(() => {
    if (!currentVehiclePosition) return;
    if (mapInstanceRef.current) {
      if (!vehicleMarkerRef.current) {
        const carIcon = L.divIcon({
          className: 'custom-car-marker',
          html: `
            <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center;">
              <div style="position:absolute; width:34px; height:34px; border-radius:50%; background:rgba(99,102,241,0.25); animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
              <div style="width:22px; height:22px; border-radius:50%; background:#4F46E5; border:2px solid #FFFFFF; box-shadow:0 0 10px rgba(79,70,229,0.9); display:flex; align-items:center; justify-content:center; color:white;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 19 21 12 17 5 21 12 2"/></svg>
              </div>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });
        vehicleMarkerRef.current = L.marker([currentVehiclePosition.lat, currentVehiclePosition.lng], { icon: carIcon }).addTo(mapInstanceRef.current);
      } else {
        vehicleMarkerRef.current.setLatLng([currentVehiclePosition.lat, currentVehiclePosition.lng]);
      }
    }
  }, [currentVehiclePosition?.lat, currentVehiclePosition?.lng]);

  const handleCenterOnVehicle = () => {
    if (currentVehiclePosition && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([currentVehiclePosition.lat, currentVehiclePosition.lng], 16, { duration: 0.8 });
    }
  };

  // 3. Render and Update Pothole Markers when filteredMarkers changes
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;

    markersLayerRef.current.clearLayers();

    filteredMarkers.forEach((marker) => {
      const hexColor = getSeverityHexColor(marker.severity);
      const isSelected = selectedMarker?.id === marker.id;

      // Custom HTML Marker Icon
      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="
            width: ${isSelected ? '28px' : '22px'};
            height: ${isSelected ? '28px' : '22px'};
            background-color: ${hexColor};
            border: 2px solid #FFFFFF;
            border-radius: 50%;
            box-shadow: 0 0 ${isSelected ? '16px' : '8px'} ${hexColor};
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            <div style="width: 7px; height: 7px; background-color: #FFFFFF; border-radius: 50%;"></div>
          </div>
        `,
        iconSize: [isSelected ? 28 : 22, isSelected ? 28 : 22],
        iconAnchor: [isSelected ? 14 : 11, isSelected ? 14 : 11]
      });

      const popupHTML = `
        <div style="font-family: ui-monospace, SFMono-Regular, monospace; color: #E0E0E0; background: #141414; padding: 10px; border: 1px solid #333; border-radius: 6px; min-width: 220px;">
          <div style="font-size: 9px; color: #888; text-transform: uppercase; margin-bottom: 4px; font-weight: bold;">
            ${marker.road_name}
          </div>
          ${marker.image_url ? `<img src="${marker.image_url}" alt="Damage Snapshot" style="width: 100%; height: 95px; object-fit: cover; border: 1px solid #222; border-radius: 4px; margin-bottom: 8px;" />` : ''}
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #FFF;">
              ${marker.category.replace('_', ' ')}
            </span>
            <span style="font-size: 9px; font-weight: bold; background: ${hexColor}33; color: ${hexColor}; border: 1px solid ${hexColor}; padding: 2px 6px; border-radius: 3px; text-transform: uppercase;">
              ${marker.severity}
            </span>
          </div>
          <div style="font-size: 10px; color: #AAA; line-height: 1.5; margin-bottom: 6px;">
            <div>🎯 <b>Confidence:</b> <span style="color: #FF9500; font-weight: bold;">${(marker.confidence * 100).toFixed(0)}%</span></div>
            <div>📍 <b>GPS:</b> ${marker.latitude.toFixed(5)}°, ${marker.longitude.toFixed(5)}°</div>
            ${marker.road_authority ? `<div>🏛 <b>Authority:</b> <span style="color:#60A5FA;">${marker.road_authority}</span></div>` : ''}
          </div>
        </div>
      `;

      const leafletMarker = L.marker([marker.latitude, marker.longitude], { icon: customIcon })
        .bindPopup(popupHTML, { className: 'custom-leaflet-popup' })
        .on('click', () => {
          setSelectedMarker(marker);
        });

      markersLayerRef.current?.addLayer(leafletMarker);
    });
  }, [filteredMarkers, selectedMarker?.id]);

  const handleCenterOnMarker = (marker: GPSDamageMarker) => {
    setSelectedMarker(marker);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([marker.latitude, marker.longitude], 17, { duration: 1.0 });
    }
  };

  // Compact View Layout (for embedding in HUD / Driver Mode)
  if (compact) {
    return (
      <div className="w-full space-y-3 font-mono text-[#E0E0E0]">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-indigo-400 font-bold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" />
            <span>Interactive GPS Pothole Map</span>
          </div>
          <div className="flex items-center gap-2">
            {currentVehiclePosition && (
              <button
                onClick={handleCenterOnVehicle}
                title="Center map on vehicle"
                className="px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-[10px] flex items-center gap-1 transition-all"
              >
                <Crosshair className="w-3 h-3" />
                <span>Recenter</span>
              </button>
            )}
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
              {filteredMarkers.length} LIVE MARKERS
            </span>
          </div>
        </div>

        {/* Leaflet DOM Mounting Container */}
        <div 
          ref={mapContainerRef} 
          className={`w-full ${heightClass || 'h-60'} rounded-xl border border-slate-800 bg-[#141414] overflow-hidden relative z-0`} 
        />

        {/* Compact Selected Marker Bar & Action */}
        {selectedMarker && (
          <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getSeverityHexColor(selectedMarker.severity) }} />
                <span className="font-bold text-white uppercase text-[11px] truncate">{selectedMarker.pothole_id || selectedMarker.category}</span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: `${getSeverityHexColor(selectedMarker.severity)}22`, color: getSeverityHexColor(selectedMarker.severity) }}>
                  {selectedMarker.severity}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                {selectedMarker.road_name} • {selectedMarker.latitude.toFixed(4)}°, {selectedMarker.longitude.toFixed(4)}°
              </div>
            </div>

            {onReportPothole && (
              <button
                onClick={() => onReportPothole(selectedMarker)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[10px] uppercase shrink-0 transition-all flex items-center gap-1 shadow-sm"
              >
                <Send className="w-3 h-3" />
                Report
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full View Layout (for GPS Mapping Tab)
  return (
    <div className="space-y-6 text-[#E0E0E0] font-mono">
      {/* GIS Mapping Banner */}
      <div className="bg-[#141414] border border-[#2A2A2A] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#2563EB] text-[10px] uppercase tracking-widest mb-0.5">
            <Globe className="w-3.5 h-3.5" />
            <span>INTERACTIVE LEAFLET GIS ROAD DEFECT MAPPER</span>
          </div>
          <h2 className="text-base font-bold text-white uppercase">{video?.title || 'Active Corridor'} Spatial Map</h2>
          <p className="text-[11px] text-[#888]">
            Color-coded severity damage markers (Green, Yellow, Orange, Red) overlaid on Leaflet dark canvas with real-time GPS coordinate mapping.
          </p>
        </div>

        {/* Severity Legend Badges */}
        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#34C759]/10 border border-[#34C759]/40 text-[#34C759]">
            <span className="w-2 h-2 rounded-full bg-[#34C759]" />
            <span className="font-bold">LOW</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#FFD60A]/10 border border-[#FFD60A]/40 text-[#FFD60A]">
            <span className="w-2 h-2 rounded-full bg-[#FFD60A]" />
            <span className="font-bold">MEDIUM</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#FF9500]/10 border border-[#FF9500]/40 text-[#FF9500]">
            <span className="w-2 h-2 rounded-full bg-[#FF9500]" />
            <span className="font-bold">HIGH</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#FF3B30]/10 border border-[#FF3B30]/40 text-[#FF3B30]">
            <span className="w-2 h-2 rounded-full bg-[#FF3B30]" />
            <span className="font-bold">CRITICAL</span>
          </div>
        </div>
      </div>

      {/* Map Control Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#111111] border border-[#2A2A2A] p-3 text-xs">
        <div className="sm:col-span-5 flex items-center space-x-2">
          <Filter className="w-4 h-4 text-[#2563EB]" />
          <span className="text-[#888] uppercase font-bold">SEVERITY FILTER:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="flex-1 bg-[#1A1A1A] border border-[#333] px-2.5 py-1.5 text-white focus:outline-none focus:border-[#2563EB]"
          >
            <option value="all">ALL SEVERITIES ({damageMarkers.length})</option>
            <option value="critical">🔴 CRITICAL ONLY</option>
            <option value="high">🟠 HIGH ONLY</option>
            <option value="medium">🟡 MEDIUM ONLY</option>
            <option value="low">🟢 LOW ONLY</option>
          </select>
        </div>

        <div className="sm:col-span-5 flex items-center space-x-2">
          <span className="text-[#888] uppercase font-bold">DAMAGE TYPE:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex-1 bg-[#1A1A1A] border border-[#333] px-2.5 py-1.5 text-white focus:outline-none focus:border-[#2563EB]"
          >
            <option value="all">ALL CATEGORIES</option>
            <option value="pothole">Potholes</option>
            <option value="alligator_crack">Alligator Cracks</option>
            <option value="longitudinal_crack">Longitudinal Cracks</option>
            <option value="transverse_crack">Transverse Cracks</option>
            <option value="broken_road">Broken Road</option>
            <option value="missing_asphalt">Missing Asphalt</option>
          </select>
        </div>

        <div className="sm:col-span-2 flex justify-end">
          <button
            onClick={() => {
              if (mapInstanceRef.current) {
                const targetCoord: [number, number] = currentVehiclePosition 
                  ? [currentVehiclePosition.lat, currentVehiclePosition.lng] 
                  : (damageMarkers[0] ? [damageMarkers[0].latitude, damageMarkers[0].longitude] : [28.4635, 77.0305]);
                mapInstanceRef.current.flyTo(targetCoord, 15);
              }
            }}
            className="w-full px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] text-white flex items-center justify-center space-x-1 font-bold"
          >
            <Crosshair className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>RESET VIEW</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Leaflet Map Stage */}
        <div className="lg:col-span-8 bg-[#0B0B0B] border border-[#2A2A2A] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-2 text-xs">
            <h3 className="font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#2563EB]" />
              <span>Interactive Leaflet Map View</span>
            </h3>
            <span className="text-[10px] text-[#34C759] bg-[#34C759]/10 border border-[#34C759]/30 px-2 py-0.5 font-bold">
              {filteredMarkers.length} MARKERS RENDERED
            </span>
          </div>

          {/* Leaflet DOM Mounting Container */}
          <div 
            ref={mapContainerRef} 
            className="w-full h-96 bg-[#141414] border border-[#2A2A2A] relative z-0" 
          />

          {/* Track telemetry bar */}
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="bg-[#141414] border border-[#222] p-2">
              <span className="text-[#888]">GPS CENTER:</span>
              <div className="text-white font-bold">
                {currentVehiclePosition ? `${currentVehiclePosition.lat.toFixed(4)}° N, ${currentVehiclePosition.lng.toFixed(4)}° E` : '28.4635° N, 77.0305° E'}
              </div>
            </div>
            <div className="bg-[#141414] border border-[#222] p-2">
              <span className="text-[#888]">ROAD CORRIDOR:</span>
              <div className="text-[#FF9500] font-bold truncate">
                {selectedMarker?.road_name || 'NH-48 Expressway'}
              </div>
            </div>
            <div className="bg-[#141414] border border-[#222] p-2">
              <span className="text-[#888]">POTHOLES DETECTED:</span>
              <div className="text-[#34C759] font-bold">
                {filteredMarkers.length} GEOTAGGED
              </div>
            </div>
          </div>
        </div>

        {/* Selected Marker Details Inspector */}
        <div className="lg:col-span-4 bg-[#111111] border border-[#2A2A2A] p-4 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#FF9500] flex items-center gap-2 border-b border-[#2A2A2A] pb-2">
            <Terminal className="w-4 h-4 text-[#FF9500]" />
            <span>Geotag Marker Detail</span>
          </h3>

          {selectedMarker ? (
            <div className="space-y-3 bg-[#141414] border border-[#2A2A2A] p-3 text-xs">
              {selectedMarker.image_url && (
                <img 
                  src={selectedMarker.image_url} 
                  alt="Selected damage snapshot" 
                  className="w-full h-36 object-cover border border-[#2A2A2A]"
                />
              )}

              <div className="flex justify-between items-center border-b border-[#222] pb-2">
                <span className="text-[#888]">DAMAGE CATEGORY:</span>
                <span className="text-white font-bold uppercase">{selectedMarker.category.replace('_', ' ')}</span>
              </div>

              <div className="flex justify-between items-center border-b border-[#222] pb-2">
                <span className="text-[#888]">SEVERITY LEVEL:</span>
                <span 
                  className="px-2 py-0.5 text-[9px] font-bold uppercase border"
                  style={{
                    backgroundColor: `${getSeverityHexColor(selectedMarker.severity)}22`,
                    color: getSeverityHexColor(selectedMarker.severity),
                    borderColor: getSeverityHexColor(selectedMarker.severity)
                  }}
                >
                  {selectedMarker.severity}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-[#222] pb-2">
                <span className="text-[#888]">ROAD CORRIDOR:</span>
                <span className="text-[#2563EB] font-bold truncate max-w-[170px]">{selectedMarker.road_name}</span>
              </div>

              {selectedMarker.road_authority && (
                <div className="flex justify-between items-center border-b border-[#222] pb-2">
                  <span className="text-[#888]">AUTHORITY:</span>
                  <span className="text-indigo-300 font-bold truncate max-w-[170px]">{selectedMarker.road_authority}</span>
                </div>
              )}

              <div className="flex justify-between items-center border-b border-[#222] pb-2">
                <span className="text-[#888]">TIMESTAMP:</span>
                <span className="text-[#2563EB] font-bold">{formatTimestamp(selectedMarker.timestamp_sec)} ({selectedMarker.timestamp_sec}s)</span>
              </div>

              <div className="flex justify-between items-center border-b border-[#222] pb-2">
                <span className="text-[#888]">YOLO CONFIDENCE:</span>
                <span className="text-[#FF9500] font-bold">{(selectedMarker.confidence * 100).toFixed(0)}%</span>
              </div>

              <div className="flex justify-between items-center border-b border-[#222] pb-2">
                <span className="text-[#888]">GPS LATITUDE:</span>
                <span className="text-white font-mono">{selectedMarker.latitude.toFixed(6)}° N</span>
              </div>

              <div className="flex justify-between items-center border-b border-[#222] pb-2">
                <span className="text-[#888]">GPS LONGITUDE:</span>
                <span className="text-white font-mono">{selectedMarker.longitude.toFixed(6)}° E</span>
              </div>

              {onReportPothole && (
                <button
                  onClick={() => onReportPothole(selectedMarker)}
                  className="w-full mt-2 py-2 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white text-xs uppercase font-bold border border-rose-400 flex items-center justify-center space-x-1.5 transition-all shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>REPORT POTHOLE TO ROAD AUTHORITY</span>
                </button>
              )}

              {onNavigate && (
                <button
                  onClick={() => onNavigate('detector')}
                  className="w-full py-2 bg-[#2563EB] hover:bg-blue-600 text-white text-xs uppercase font-bold border border-blue-400 flex items-center justify-center space-x-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>INSPECT FRAME IN DETECTOR</span>
                </button>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-[#666] text-xs">
              Click any colored damage marker on the Leaflet map to inspect geotag details.
            </div>
          )}

          {/* Marker List Picker */}
          <div className="space-y-2 border-t border-[#2A2A2A] pt-3">
            <div className="text-[10px] text-[#888] uppercase font-bold">
              GEOTAGGED DEFECT STREAM ({filteredMarkers.length}):
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {filteredMarkers.map((m) => {
                const hexColor = getSeverityHexColor(m.severity);
                const isSelected = selectedMarker?.id === m.id;

                return (
                  <div
                    key={m.id}
                    onClick={() => handleCenterOnMarker(m)}
                    className={`p-2 border cursor-pointer transition-colors flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-[#2563EB]/20 border-[#2563EB] text-white font-bold'
                        : 'bg-[#141414] hover:bg-[#1A1A1A] border-[#222] text-[#AAA]'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: hexColor }} />
                      <span className="uppercase text-[11px]">{m.category.replace('_', ' ')}</span>
                    </div>
                    <span className="text-[10px] text-[#2563EB] font-mono">{formatTimestamp(m.timestamp_sec)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

