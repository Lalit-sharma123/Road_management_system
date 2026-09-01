import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
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
  ShieldAlert,
  Flame,
  Sliders,
  Database,
  RefreshCw,
  Info,
  Clock
} from 'lucide-react';
import { InspectionVideo, GPSPoint, SeverityLevel, DamageCategory, PotholeHeatmapPoint, HeatmapHotspot } from '../types/inspection';
import { heatmapService } from '../services/heatmapService';
import { apiClient } from '../services/apiClient';

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
  const heatLayerRef = useRef<any>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);

  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Heatmap Overlay Controls
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showMarkers, setShowMarkers] = useState<boolean>(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.65);
  const [heatmapRadius, setHeatmapRadius] = useState<number>(28);
  const [heatmapBlur, setHeatmapBlur] = useState<number>(18);
  const [timeWindowDays, setTimeWindowDays] = useState<number>(30);
  const [includeHistoricalDb, setIncludeHistoricalDb] = useState<boolean>(true);
  const [showHeatmapSettings, setShowHeatmapSettings] = useState<boolean>(false);
  const [isLoadingHeatmap, setIsLoadingHeatmap] = useState<boolean>(false);
  const [historicalHeatmapData, setHistoricalHeatmapData] = useState<PotholeHeatmapPoint[]>([]);
  const [hotspotsList, setHotspotsList] = useState<HeatmapHotspot[]>([]);
  const [dbPotholes, setDbPotholes] = useState<GPSDamageMarker[]>([]);

  // Fetch real database recorded potholes from backend
  const loadDatabasePotholes = useCallback(async () => {
    try {
      const res = await apiClient.get('/driver/potholes?limit=100');
      if (res.data?.potholes && Array.isArray(res.data.potholes) && res.data.potholes.length > 0) {
        const loaded: GPSDamageMarker[] = res.data.potholes.map((p: any, idx: number) => ({
          id: p.id || p.detection_id || `pot-db-${idx}`,
          pothole_id: p.pothole_id || `POT-${idx + 100}`,
          frame_number: p.frame_number || (idx * 30),
          timestamp_sec: p.timestamp ? Math.round(new Date(p.timestamp).getTime() / 1000) % 3600 : idx * 2,
          latitude: p.latitude,
          longitude: p.longitude,
          category: (p.category as DamageCategory) || 'pothole',
          severity: (p.severity as SeverityLevel) || 'high',
          confidence: p.confidence ?? 0.90,
          road_name: p.road_name || 'Active Road Corridor',
          road_authority: p.road_authority || 'National Highway Authority',
          image_url: p.image_url || p.evidence_image_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
          distance_meters: p.distance_meters,
          lane_position: p.lane_position
        }));
        setDbPotholes(loaded);
      }
    } catch (err) {
      console.debug('Database potholes load notice:', err);
    }
  }, []);

  useEffect(() => {
    loadDatabasePotholes();
  }, [loadDatabasePotholes]);

  // Base road GPS track points derived from video or real database coordinates
  const gpsTracks: GPSPoint[] = useMemo(() => {
    if (video?.gps_tracks && video.gps_tracks.length > 0) {
      return video.gps_tracks;
    }
    if (dbPotholes.length > 0) {
      return dbPotholes.map((p, i) => ({
        frame_number: p.frame_number,
        latitude: p.latitude,
        longitude: p.longitude,
        altitude_meters: 215.0 + (i * 0.2),
        speed_kmh: 42.0,
        road_name: p.road_name
      }));
    }
    const centerLat = currentVehiclePosition?.lat || 28.4595;
    const centerLng = currentVehiclePosition?.lng || 77.0266;
    return [
      { frame_number: 1, latitude: centerLat, longitude: centerLng, altitude_meters: 215.4, speed_kmh: 42.5, road_name: 'National Highway Corridor' },
      { frame_number: 150, latitude: centerLat + 0.0013, longitude: centerLng + 0.0012, altitude_meters: 215.8, speed_kmh: 44.1, road_name: 'National Highway Corridor' },
      { frame_number: 300, latitude: centerLat + 0.0026, longitude: centerLng + 0.0025, altitude_meters: 216.2, speed_kmh: 41.8, road_name: 'National Highway Corridor' },
      { frame_number: 450, latitude: centerLat + 0.0040, longitude: centerLng + 0.0039, altitude_meters: 215.1, speed_kmh: 45.0, road_name: 'National Highway Corridor' }
    ];
  }, [video?.gps_tracks, dbPotholes, currentVehiclePosition]);

  // Fetch Historical Database Pothole Detections for Heatmap
  const loadHistoricalHeatmap = useCallback(async () => {
    setIsLoadingHeatmap(true);
    try {
      const data = await heatmapService.getPotholeHeatmap({
        days: timeWindowDays,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        min_severity: severityFilter !== 'all' ? severityFilter : undefined
      });
      if (data && data.heatmap_points) {
        setHistoricalHeatmapData(data.heatmap_points);
        if (data.hotspots) {
          setHotspotsList(data.hotspots);
        }
      }
    } catch (err) {
      console.warn('Historical heatmap load error:', err);
    } finally {
      setIsLoadingHeatmap(false);
    }
  }, [timeWindowDays, categoryFilter, severityFilter]);

  useEffect(() => {
    loadHistoricalHeatmap();
  }, [loadHistoricalHeatmap]);

  // Derive Geotagged Damage Markers dynamically from real props, video frames, or database
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
              latitude: gpsPt ? gpsPt.latitude : (currentVehiclePosition?.lat || 28.4635),
              longitude: gpsPt ? gpsPt.longitude : (currentVehiclePosition?.lng || 77.0305),
              category: d.category,
              severity: d.severity,
              confidence: d.confidence,
              road_name: gpsPt?.road_name || 'Active Road Corridor',
              image_url: f.image_url
            });
          });
        }
      });
      if (extracted.length > 0) return extracted;
    }

    if (dbPotholes.length > 0) {
      return dbPotholes;
    }

    return defaultStaticMarkers;
  }, [potholeMarkers, video, dbPotholes, currentVehiclePosition]);

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

  // Consolidated Heatmap Density Points: Current inspection markers + Historical Database
  const consolidatedHeatmapPoints: [number, number, number][] = useMemo(() => {
    const points: [number, number, number][] = [];
    const severityWeightMap: Record<string, number> = {
      critical: 1.0,
      high: 0.8,
      medium: 0.5,
      low: 0.3
    };

    // 1. Add current live/filtered markers
    filteredMarkers.forEach((m) => {
      const weight = (severityWeightMap[m.severity] || 0.6) * Math.max(0.4, m.confidence);
      points.push([m.latitude, m.longitude, Math.min(1.0, Math.max(0.1, weight))]);
    });

    // 2. Add historical database detections if enabled
    if (includeHistoricalDb && historicalHeatmapData.length > 0) {
      historicalHeatmapData.forEach((h) => {
        const matchesCat = categoryFilter === 'all' || h.category === categoryFilter;
        const matchesSev = severityFilter === 'all' || h.severity === severityFilter;
        if (matchesCat && matchesSev) {
          const weight = h.intensity || (severityWeightMap[h.severity || 'high'] || 0.6);
          points.push([h.latitude, h.longitude, Math.min(1.0, Math.max(0.1, weight))]);
        }
      });
    }

    return points;
  }, [filteredMarkers, historicalHeatmapData, includeHistoricalDb, categoryFilter, severityFilter]);

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

  // 3. Render and Synchronize Heatmap Density Overlay Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Remove existing heatmap layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    // If heatmap layer is active and we have points
    if (showHeatmap && consolidatedHeatmapPoints.length > 0) {
      try {
        const heatLayer = (L as any).heatLayer(consolidatedHeatmapPoints, {
          radius: heatmapRadius,
          blur: heatmapBlur,
          maxZoom: 18,
          max: 1.0,
          minOpacity: 0.1,
          gradient: {
            0.15: '#10B981', // emerald green (low density)
            0.35: '#06B6D4', // cyan / blue
            0.55: '#FACC15', // vibrant yellow (medium density)
            0.75: '#F97316', // orange (high density)
            0.95: '#EF4444'  // red (critical hazard cluster)
          }
        });

        heatLayer.addTo(map);

        // Apply custom semi-transparent opacity to the canvas layer
        if (heatLayer._canvas) {
          heatLayer._canvas.style.opacity = String(heatmapOpacity);
          heatLayer._canvas.style.transition = 'opacity 0.2s ease-in-out';
        }

        heatLayerRef.current = heatLayer;
      } catch (err) {
        console.error('Failed to create Leaflet HeatLayer:', err);
      }
    }

    return () => {
      if (heatLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [showHeatmap, consolidatedHeatmapPoints, heatmapOpacity, heatmapRadius, heatmapBlur]);

  // Update canvas opacity dynamically when slider moves
  useEffect(() => {
    if (heatLayerRef.current?._canvas) {
      heatLayerRef.current._canvas.style.opacity = String(heatmapOpacity);
    }
  }, [heatmapOpacity]);

  // 4. Render and Update Pothole Markers when filteredMarkers or showMarkers changes
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;

    markersLayerRef.current.clearLayers();

    if (!showMarkers) return;

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
  }, [filteredMarkers, selectedMarker?.id, showMarkers]);

  const handleCenterOnVehicle = () => {
    if (currentVehiclePosition && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([currentVehiclePosition.lat, currentVehiclePosition.lng], 16, { duration: 0.8 });
    }
  };

  const handleCenterOnMarker = (marker: GPSDamageMarker) => {
    setSelectedMarker(marker);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([marker.latitude, marker.longitude], 17, { duration: 1.0 });
    }
  };

  const handleCenterOnHotspot = (hotspot: HeatmapHotspot) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(hotspot.center, 16, { duration: 1.0 });
    }
  };

  // Compact View Layout (for embedding in HUD / Driver Mode)
  if (compact) {
    return (
      <div className="w-full space-y-3 font-mono text-[#E0E0E0]">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-indigo-400 font-bold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" />
            <span>Interactive GPS & Density Heatmap</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Compact Heatmap Layer Toggle */}
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 font-bold transition-all border ${
                showHeatmap 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm' 
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="Toggle Heatmap Density Layer"
            >
              <Flame className={`w-3 h-3 ${showHeatmap ? 'text-amber-400 fill-amber-400' : ''}`} />
              <span>HEATMAP {showHeatmap ? 'ON' : 'OFF'}</span>
            </button>

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
              {consolidatedHeatmapPoints.length} HEATPOINTS
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
            <span>INTERACTIVE LEAFLET GIS ROAD DEFECT & HEATMAP MAPPER</span>
          </div>
          <h2 className="text-base font-bold text-white uppercase">{video?.title || 'Active Corridor'} Spatial Heatmap</h2>
          <p className="text-[11px] text-[#888]">
            Historical pothole density heatmap overlay with semi-transparent gradient blending, combined with geotagged discrete severity pins.
          </p>
        </div>

        {/* Heatmap & Severity Legend Badges */}
        <div className="flex flex-wrap items-center gap-3 text-[10px]">
          {/* Heatmap Density Legend Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 border border-[#333] rounded">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[#AAA] font-bold">DENSITY:</span>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2 bg-[#10B981] rounded-xs" title="Low Density" />
              <span className="w-2.5 h-2 bg-[#06B6D4] rounded-xs" title="Moderate Density" />
              <span className="w-2.5 h-2 bg-[#FACC15] rounded-xs" title="Medium Density" />
              <span className="w-2.5 h-2 bg-[#F97316] rounded-xs" title="High Density" />
              <span className="w-2.5 h-2 bg-[#EF4444] rounded-xs" title="Critical Cluster" />
            </div>
            <span className="text-[#888] text-[9px]">Low &rarr; Critical</span>
          </div>

          {/* Severity Legend Badges */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 px-2 py-1 bg-[#34C759]/10 border border-[#34C759]/40 text-[#34C759]">
              <span className="w-2 h-2 rounded-full bg-[#34C759]" />
              <span className="font-bold">LOW</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-[#FFD60A]/10 border border-[#FFD60A]/40 text-[#FFD60A]">
              <span className="w-2 h-2 rounded-full bg-[#FFD60A]" />
              <span className="font-bold">MED</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-[#FF9500]/10 border border-[#FF9500]/40 text-[#FF9500]">
              <span className="w-2 h-2 rounded-full bg-[#FF9500]" />
              <span className="font-bold">HIGH</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-[#FF3B30]/10 border border-[#FF3B30]/40 text-[#FF3B30]">
              <span className="w-2 h-2 rounded-full bg-[#FF3B30]" />
              <span className="font-bold">CRIT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Map Toolbar & Heatmap Layer Configuration Bar */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#111111] border border-[#2A2A2A] p-3 text-xs">
          {/* Layer Toggles */}
          <div className="sm:col-span-4 flex items-center space-x-2">
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-3 py-1.5 border flex items-center gap-1.5 font-bold transition-all ${
                showHeatmap
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-sm'
                  : 'bg-[#1A1A1A] text-[#777] border-[#333] hover:text-white'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'fill-amber-400' : ''}`} />
              <span>HEATMAP {showHeatmap ? 'ACTIVE' : 'OFF'}</span>
            </button>

            <button
              onClick={() => setShowMarkers(!showMarkers)}
              className={`px-3 py-1.5 border flex items-center gap-1.5 font-bold transition-all ${
                showMarkers
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                  : 'bg-[#1A1A1A] text-[#777] border-[#333] hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>PINS {showMarkers ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => setShowHeatmapSettings(!showHeatmapSettings)}
              className={`p-1.5 border flex items-center justify-center transition-all ${
                showHeatmapSettings
                  ? 'bg-[#2563EB] text-white border-blue-400'
                  : 'bg-[#1A1A1A] text-[#888] border-[#333] hover:text-white'
              }`}
              title="Heatmap visual tuning & opacity settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>

          {/* Severity & Category Filters */}
          <div className="sm:col-span-3 flex items-center space-x-2">
            <Filter className="w-4 h-4 text-[#2563EB]" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="flex-1 bg-[#1A1A1A] border border-[#333] px-2.5 py-1.5 text-white focus:outline-none focus:border-[#2563EB]"
            >
              <option value="all">ALL SEVERITIES</option>
              <option value="critical">🔴 CRITICAL ONLY</option>
              <option value="high">🟠 HIGH ONLY</option>
              <option value="medium">🟡 MEDIUM ONLY</option>
              <option value="low">🟢 LOW ONLY</option>
            </select>
          </div>

          <div className="sm:col-span-3 flex items-center space-x-2">
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

          <div className="sm:col-span-2 flex justify-end gap-2">
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
              <span>RECENTER</span>
            </button>
          </div>
        </div>

        {/* Collapsible Heatmap Visual Calibration Panel */}
        {showHeatmapSettings && (
          <div className="bg-[#141414] border border-[#333] p-4 text-xs space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider">
                <Flame className="w-4 h-4" />
                <span>Heatmap Density & Semi-Transparent Layer Calibration</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadHistoricalHeatmap}
                  disabled={isLoadingHeatmap}
                  className="px-2.5 py-1 bg-[#222] hover:bg-[#333] border border-[#444] text-[#CCC] flex items-center gap-1.5 transition-all text-[11px]"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingHeatmap ? 'animate-spin text-amber-400' : ''}`} />
                  <span>Sync DB</span>
                </button>
                <button
                  onClick={() => setShowHeatmapSettings(false)}
                  className="text-[#888] hover:text-white px-2 py-0.5 font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Semi-Transparent Layer Opacity Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#888] uppercase font-bold">Layer Opacity:</span>
                  <span className="text-amber-400 font-bold font-mono">{(heatmapOpacity * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={heatmapOpacity}
                  onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#2A2A2A] rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[9px] text-[#666]">
                  <span>20% (Subtle)</span>
                  <span>65% (Balanced)</span>
                  <span>100% (Solid)</span>
                </div>
              </div>

              {/* Density Influence Radius Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#888] uppercase font-bold">Density Radius:</span>
                  <span className="text-amber-400 font-bold font-mono">{heatmapRadius}px</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="50"
                  step="1"
                  value={heatmapRadius}
                  onChange={(e) => setHeatmapRadius(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-[#2A2A2A] rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[9px] text-[#666]">
                  <span>15px (Pinpoint)</span>
                  <span>28px (Corridor)</span>
                  <span>50px (Macro)</span>
                </div>
              </div>

              {/* Gaussian Blur Radius Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#888] uppercase font-bold">Gradient Blur:</span>
                  <span className="text-amber-400 font-bold font-mono">{heatmapBlur}px</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="35"
                  step="1"
                  value={heatmapBlur}
                  onChange={(e) => setHeatmapBlur(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-[#2A2A2A] rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[9px] text-[#666]">
                  <span>10px (Sharp)</span>
                  <span>18px (Smooth)</span>
                  <span>35px (Diffuse)</span>
                </div>
              </div>

              {/* Historical Database Time Horizon */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#888] uppercase font-bold">Historical DB Horizon:</span>
                  <span className="text-[#60A5FA] font-bold font-mono">{timeWindowDays} Days</span>
                </div>
                <select
                  value={timeWindowDays}
                  onChange={(e) => setTimeWindowDays(parseInt(e.target.value))}
                  className="w-full bg-[#1A1A1A] border border-[#333] px-2 py-1 text-white focus:outline-none focus:border-[#2563EB]"
                >
                  <option value={7}>Last 7 Days (Recent Audits)</option>
                  <option value={30}>Last 30 Days (Standard Month)</option>
                  <option value={90}>Last 90 Days (Quarterly Density)</option>
                  <option value={365}>Last 365 Days (Full Historical DB)</option>
                </select>
                <div className="flex items-center gap-2 mt-1">
                  <label className="flex items-center gap-1.5 text-[10px] text-[#AAA] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeHistoricalDb}
                      onChange={(e) => setIncludeHistoricalDb(e.target.checked)}
                      className="rounded accent-blue-600"
                    />
                    <span>Include Global Database Records</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Leaflet Map Stage */}
        <div className="lg:col-span-8 bg-[#0B0B0B] border border-[#2A2A2A] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-2 text-xs">
            <h3 className="font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#2563EB]" />
              <span>Interactive Leaflet Map View</span>
            </h3>
            <div className="flex items-center gap-2">
              {showHeatmap && (
                <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 font-bold flex items-center gap-1">
                  <Flame className="w-3 h-3 fill-amber-400" />
                  <span>{consolidatedHeatmapPoints.length} HEATPOINTS ACTIVE</span>
                </span>
              )}
              {showMarkers && (
                <span className="text-[10px] text-[#34C759] bg-[#34C759]/10 border border-[#34C759]/30 px-2 py-0.5 font-bold">
                  {filteredMarkers.length} PIN MARKERS
                </span>
              )}
            </div>
          </div>

          {/* Leaflet DOM Mounting Container */}
          <div 
            ref={mapContainerRef} 
            className="w-full h-96 bg-[#141414] border border-[#2A2A2A] relative z-0" 
          />

          {/* Track telemetry & Heatmap statistics bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
            <div className="bg-[#141414] border border-[#222] p-2">
              <span className="text-[#888] flex items-center gap-1">
                <Navigation className="w-3 h-3 text-blue-400" />
                <span>GPS CENTER:</span>
              </span>
              <div className="text-white font-bold truncate mt-0.5">
                {currentVehiclePosition ? `${currentVehiclePosition.lat.toFixed(4)}° N, ${currentVehiclePosition.lng.toFixed(4)}° E` : '28.4635° N, 77.0305° E'}
              </div>
            </div>
            <div className="bg-[#141414] border border-[#222] p-2">
              <span className="text-[#888] flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                <span>DENSITY OVERLAY:</span>
              </span>
              <div className="text-[#FF9500] font-bold truncate mt-0.5">
                {showHeatmap ? `${consolidatedHeatmapPoints.length} Heatpoints (${(heatmapOpacity * 100).toFixed(0)}% Opacity)` : 'Overlay Inactive'}
              </div>
            </div>
            <div className="bg-[#141414] border border-[#222] p-2">
              <span className="text-[#888] flex items-center gap-1">
                <Database className="w-3 h-3 text-emerald-400" />
                <span>HISTORICAL DATABASE:</span>
              </span>
              <div className="text-[#34C759] font-bold truncate mt-0.5">
                {historicalHeatmapData.length} Records in Past {timeWindowDays}d
              </div>
            </div>
          </div>

          {/* High-Density Hotspot Corridors Quick-Jump Bar */}
          {hotspotsList.length > 0 && (
            <div className="bg-[#111111] border border-[#2A2A2A] p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[10px] text-[#888] uppercase font-bold">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>IDENTIFIED HIGH-DENSITY POTHOLE CORRIDORS & HOTSPOTS</span>
                </span>
                <span>Click corridor to jump</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {hotspotsList.map((spot, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleCenterOnHotspot(spot)}
                    className="p-2.5 bg-[#161616] hover:bg-[#202020] border border-[#333] hover:border-amber-500/50 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white text-[11px] truncate">{spot.corridor}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="text-amber-400 font-bold">{spot.pothole_count} Potholes</span>
                        <span>•</span>
                        <span className="text-rose-400 font-bold">Hazard: {spot.hazard_index}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                      {spot.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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


