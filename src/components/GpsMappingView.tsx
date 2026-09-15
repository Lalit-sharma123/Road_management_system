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
  Clock,
  Camera,
  Video,
  AlertCircle,
  Plus,
  Upload,
  Download,
  Trash2,
  Locate,
  Check,
  X,
  FileSpreadsheet,
  FileText,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { InspectionVideo, GPSPoint, SeverityLevel, DamageCategory, PotholeHeatmapPoint, HeatmapHotspot, CameraDevice, TrafficViolation } from '../types/inspection';
import { StolenVehicleAlert } from '../types/stolenVehicle';
import { cameraService } from '../services/systemService';
import { violationService } from '../services/violationService';
import { stolenVehicleService } from '../services/stolenVehicleService';
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
  model_name?: string;
  depth_cm?: number;
  width_cm?: number;
}

export interface GpsMappingViewProps {
  video?: InspectionVideo | null;
  onNavigate?: (tab: string) => void;
  potholeMarkers?: DynamicPotholeMarker[];
  currentVehiclePosition?: { lat: number; lng: number };
  compact?: boolean;
  onReportPothole?: (marker: DynamicPotholeMarker) => void;
  heightClass?: string;
  cameras?: CameraDevice[];
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
  model_name?: string;
  depth_cm?: number;
  width_cm?: number;
}

const defaultStaticMarkers: GPSDamageMarker[] = [
  {
    id: 'marker-101',
    pothole_id: 'POT-101',
    frame_number: 120,
    timestamp_sec: 4.0,
    latitude: 28.4595,
    longitude: 77.0266,
    category: 'pothole',
    severity: 'critical',
    confidence: 0.94,
    road_name: 'NH-48 Sector 14 Link A',
    road_authority: 'National Highways Authority of India (NHAI)',
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    model_name: 'best.pt',
    depth_cm: 6.8,
    width_cm: 45.0
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
    road_name: 'NH-48 Sector 14 Link B',
    road_authority: 'National Highways Authority of India (NHAI)',
    image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
    model_name: 'best.pt',
    depth_cm: 1.8,
    width_cm: 32.0
  },
  {
    id: 'marker-103',
    pothole_id: 'POT-103',
    frame_number: 468,
    timestamp_sec: 15.6,
    latitude: 28.4635,
    longitude: 77.0305,
    category: 'broken_road',
    severity: 'critical',
    confidence: 0.91,
    road_name: 'NH-48 Sector 14 North',
    road_authority: 'National Highways Authority of India (NHAI)',
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    model_name: 'best.pt',
    depth_cm: 8.5,
    width_cm: 95.0
  },
  {
    id: 'marker-104',
    pothole_id: 'CRK-104',
    frame_number: 663,
    timestamp_sec: 22.1,
    latitude: 28.4720,
    longitude: 77.0515,
    category: 'transverse_crack',
    severity: 'low',
    confidence: 0.76,
    road_name: 'NH-48 IFFCO Chowk Flyover',
    road_authority: 'National Highways Authority of India (NHAI)',
    image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
    model_name: 'best.pt',
    depth_cm: 1.2,
    width_cm: 75.0
  },
  {
    id: 'marker-105',
    pothole_id: 'POT-105',
    frame_number: 954,
    timestamp_sec: 31.8,
    latitude: 28.4810,
    longitude: 77.0690,
    category: 'pothole',
    severity: 'high',
    confidence: 0.89,
    road_name: 'NH-48 Signature Tower Segment',
    road_authority: 'State PWD Division',
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    model_name: 'best.pt',
    depth_cm: 5.4,
    width_cm: 42.0
  },
  {
    id: 'marker-106',
    pothole_id: 'ASP-106',
    frame_number: 1260,
    timestamp_sec: 42.0,
    latitude: 28.4980,
    longitude: 77.0930,
    category: 'missing_asphalt',
    severity: 'medium',
    confidence: 0.85,
    road_name: 'NH-48 Shankar Chowk Flyover',
    road_authority: 'National Highways Authority of India (NHAI)',
    image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
    model_name: 'best.pt',
    depth_cm: 4.1,
    width_cm: 50.0
  },
  {
    id: 'marker-107',
    pothole_id: 'POT-107',
    frame_number: 1350,
    timestamp_sec: 45.0,
    latitude: 28.5080,
    longitude: 77.1020,
    category: 'pothole',
    severity: 'high',
    confidence: 0.88,
    road_name: 'NH-48 Sirhaul Toll Plaza',
    road_authority: 'National Highways Authority of India (NHAI)',
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    model_name: 'best.pt',
    depth_cm: 6.0,
    width_cm: 55.0
  }
];

export const GpsMappingView: React.FC<GpsMappingViewProps> = ({ 
  video, 
  onNavigate,
  potholeMarkers,
  currentVehiclePosition,
  compact = false,
  onReportPothole,
  heightClass,
  cameras: propsCameras
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<any>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const surveyorMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Real Data vs Demo Data mode state
  const [dataMode, setDataMode] = useState<'real' | 'all'>(() => {
    const saved = localStorage.getItem('nhai_gis_data_mode');
    return saved === 'all' ? 'all' : 'real'; // Default strictly to 'real' as requested
  });

  // Persistent Real Road Surveyed Defects
  const [realMappedDefects, setRealMappedDefects] = useState<GPSDamageMarker[]>(() => {
    try {
      const saved = localStorage.getItem('nhai_real_survey_defects_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved real survey defects:', e);
    }
    return [];
  });

  // Pinning & Interactive Mapping Mode
  const [isPinningMode, setIsPinningMode] = useState<boolean>(false);
  const isPinningModeRef = useRef<boolean>(false);
  useEffect(() => {
    isPinningModeRef.current = isPinningMode;
    if (mapContainerRef.current) {
      mapContainerRef.current.style.cursor = isPinningMode ? 'crosshair' : 'grab';
    }
  }, [isPinningMode]);

  // Modal and Live GPS states
  const [isAddDefectModalOpen, setIsAddDefectModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [surveyorGps, setSurveyorGps] = useState<{ lat: number; lng: number } | null>(null);
  const [importStats, setImportStats] = useState<{ total: number; message: string } | null>(null);

  // Add Defect Form Inputs
  const [newDefectLat, setNewDefectLat] = useState<number | string>(28.4635);
  const [newDefectLng, setNewDefectLng] = useState<number | string>(77.0305);
  const [newDefectCategory, setNewDefectCategory] = useState<DamageCategory>('pothole');
  const [newDefectSeverity, setNewDefectSeverity] = useState<SeverityLevel>('high');
  const [newDefectRoadName, setNewDefectRoadName] = useState<string>('National Highway Survey Corridor');
  const [newDefectRoadAuthority, setNewDefectRoadAuthority] = useState<string>('National Highways Authority of India (NHAI)');
  const [newDefectDepth, setNewDefectDepth] = useState<number | string>(5.5);
  const [newDefectWidth, setNewDefectWidth] = useState<number | string>(42.0);
  const [newDefectConfidence, setNewDefectConfidence] = useState<number>(0.94);
  const [newDefectImageUrl, setNewDefectImageUrl] = useState<string>('');
  const [newDefectNotes, setNewDefectNotes] = useState<string>('');

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

  // Highway Cameras, Traffic Violations & Stolen Vehicle alerts state
  const camerasLayerRef = useRef<L.LayerGroup | null>(null);
  const violationsLayerRef = useRef<L.LayerGroup | null>(null);
  const [showCameras, setShowCameras] = useState<boolean>(true);
  const [showViolations, setShowViolations] = useState<boolean>(true);
  const [highwayCameras, setHighwayCameras] = useState<CameraDevice[]>(propsCameras || []);
  const [highwayViolations, setHighwayViolations] = useState<TrafficViolation[]>([]);
  const [stolenAlerts, setStolenAlerts] = useState<StolenVehicleAlert[]>([]);

  // Save data mode preference
  const handleToggleDataMode = (mode: 'real' | 'all') => {
    setDataMode(mode);
    localStorage.setItem('nhai_gis_data_mode', mode);
  };

  // Persist real surveyed defects to localStorage
  const saveRealDefects = (defects: GPSDamageMarker[]) => {
    setRealMappedDefects(defects);
    try {
      localStorage.setItem('nhai_real_survey_defects_v2', JSON.stringify(defects));
    } catch (e) {
      console.error('Failed to save real survey defects:', e);
    }
  };

  // Add a newly pinned/surveyed defect
  const handleAddRealDefect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const lat = Number(newDefectLat);
    const lng = Number(newDefectLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Please enter valid GPS coordinates (Latitude between -90 and 90, Longitude between -180 and 180)');
      return;
    }

    const uniquePotholeId = `POT-REAL-${Math.floor(100 + Math.random() * 900)}`;
    const newMarker: GPSDamageMarker = {
      id: `real_pot_${Date.now()}`,
      pothole_id: uniquePotholeId,
      frame_number: 1,
      timestamp_sec: Math.floor(Date.now() / 1000) % 3600,
      latitude: lat,
      longitude: lng,
      category: newDefectCategory,
      severity: newDefectSeverity,
      confidence: Number(newDefectConfidence) || 0.95,
      road_name: newDefectRoadName.trim() || 'Surveyed Highway Segment',
      road_authority: newDefectRoadAuthority.trim() || 'National Highways Authority of India (NHAI)',
      image_url: newDefectImageUrl.trim() || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
      depth_cm: Number(newDefectDepth) || 5.0,
      width_cm: Number(newDefectWidth) || 40.0,
      model_name: 'best.pt'
    };

    const updated = [newMarker, ...realMappedDefects];
    saveRealDefects(updated);

    // Also sync to devApi backend
    try {
      await apiClient.post('/driver/potholes', newMarker);
    } catch (err) {
      console.debug('Failed to sync to backend /driver/potholes:', err);
    }

    setIsAddDefectModalOpen(false);
    setIsPinningMode(false);

    // Fly to newly added point
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 17, { duration: 1.0 });
    }
  };

  // Acquire real device GPS location using HTML5 Geolocation API
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setSurveyorGps({ lat, lng });
        setNewDefectLat(lat);
        setNewDefectLng(lng);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 17, { duration: 1.2 });

          // Update or place surveyor position marker
          if (!surveyorMarkerRef.current) {
            const surveyorIcon = L.divIcon({
              className: 'surveyor-marker',
              html: `
                <div style="position:relative; width:36px; height:36px; display:flex; align-items:center; justify-content:center;">
                  <div style="position:absolute; width:36px; height:36px; border-radius:50%; background:rgba(37,99,235,0.3); animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
                  <div style="width:22px; height:22px; border-radius:50%; background:#2563EB; border:2px solid #FFF; box-shadow:0 0 12px rgba(37,99,235,0.9); display:flex; align-items:center; justify-content:center; color:white;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
                  </div>
                </div>
              `,
              iconSize: [36, 36],
              iconAnchor: [18, 18]
            });
            surveyorMarkerRef.current = L.marker([lat, lng], { icon: surveyorIcon })
              .addTo(mapInstanceRef.current)
              .bindPopup('<b style="color:#2563EB">📡 Real Surveyor GPS Location</b><br/>Acquired via Device Telemetry');
          } else {
            surveyorMarkerRef.current.setLatLng([lat, lng]);
          }
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        alert('Could not acquire GPS position. Please check browser location permissions or ensure location services are enabled.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Import real survey data (CSV or GeoJSON)
  const handleSurveyFileUpload = (fileOrEvent: File | React.ChangeEvent<HTMLInputElement>) => {
    let file: File | null = null;
    if (fileOrEvent instanceof File) {
      file = fileOrEvent;
    } else if (fileOrEvent && 'target' in fileOrEvent && fileOrEvent.target.files && fileOrEvent.target.files[0]) {
      file = fileOrEvent.target.files[0];
    }
    if (!file) return;

    const reader = new FileReader();
    const fileName = file.name.toLowerCase();

    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      const parsedItems: GPSDamageMarker[] = [];

      try {
        if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
          const geojson = JSON.parse(content);
          const features = geojson.features || (geojson.type === 'Feature' ? [geojson] : []);
          features.forEach((feat: any, idx: number) => {
            if (feat.geometry && feat.geometry.type === 'Point' && Array.isArray(feat.geometry.coordinates)) {
              const [lon, lat] = feat.geometry.coordinates;
              const props = feat.properties || {};
              parsedItems.push({
                id: `import_${Date.now()}_${idx}`,
                pothole_id: props.pothole_id || props.id || `POT-IMP-${idx + 1}`,
                frame_number: idx * 10,
                timestamp_sec: idx * 2,
                latitude: Number(lat),
                longitude: Number(lon),
                category: (props.category as DamageCategory) || 'pothole',
                severity: (props.severity as SeverityLevel) || 'high',
                confidence: Number(props.confidence) || 0.92,
                road_name: props.road_name || props.road || 'Imported Road Survey Corridor',
                road_authority: props.road_authority || 'Surveyed Authority',
                image_url: props.image_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
                depth_cm: Number(props.depth_cm) || 4.5,
                width_cm: Number(props.width_cm) || 35.0,
                model_name: props.model_name || 'best.pt'
              });
            }
          });
        } else {
          // Parse CSV
          const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
          if (lines.length > 1) {
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
            const latIdx = headers.findIndex(h => h === 'latitude' || h === 'lat' || h === 'y');
            const lngIdx = headers.findIndex(h => h === 'longitude' || h === 'lng' || h === 'lon' || h === 'x');
            const catIdx = headers.findIndex(h => h === 'category' || h === 'type' || h === 'damage_type');
            const sevIdx = headers.findIndex(h => h === 'severity' || h === 'level');
            const roadIdx = headers.findIndex(h => h === 'road_name' || h === 'road' || h === 'street' || h === 'highway');
            const confIdx = headers.findIndex(h => h === 'confidence' || h === 'score');
            const depthIdx = headers.findIndex(h => h === 'depth_cm' || h === 'depth');
            const widthIdx = headers.findIndex(h => h === 'width_cm' || h === 'width');

            if (latIdx !== -1 && lngIdx !== -1) {
              for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
                const lat = parseFloat(cols[latIdx]);
                const lng = parseFloat(cols[lngIdx]);
                if (!isNaN(lat) && !isNaN(lng)) {
                  parsedItems.push({
                    id: `import_csv_${Date.now()}_${i}`,
                    pothole_id: `POT-CSV-${i}`,
                    frame_number: i * 15,
                    timestamp_sec: i * 2,
                    latitude: lat,
                    longitude: lng,
                    category: (catIdx !== -1 ? (cols[catIdx] as DamageCategory) : 'pothole') || 'pothole',
                    severity: (sevIdx !== -1 ? (cols[sevIdx] as SeverityLevel) : 'high') || 'high',
                    confidence: confIdx !== -1 ? parseFloat(cols[confIdx]) || 0.90 : 0.90,
                    road_name: roadIdx !== -1 && cols[roadIdx] ? cols[roadIdx] : 'Surveyed Road Corridor',
                    road_authority: 'Highway Inspection Survey',
                    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
                    depth_cm: depthIdx !== -1 ? parseFloat(cols[depthIdx]) || 5.0 : 5.0,
                    width_cm: widthIdx !== -1 ? parseFloat(cols[widthIdx]) || 40.0 : 40.0,
                    model_name: 'best.pt'
                  });
                }
              }
            }
          }
        }

        if (parsedItems.length > 0) {
          const combined = [...parsedItems, ...realMappedDefects];
          saveRealDefects(combined);
          setImportStats({
            total: parsedItems.length,
            message: `Successfully imported ${parsedItems.length} real road survey points.`
          });

          // Zoom map to fit imported points
          if (mapInstanceRef.current && parsedItems.length > 0) {
            const bounds = L.latLngBounds(parsedItems.map(p => [p.latitude, p.longitude]));
            mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
          }
        } else {
          setImportStats({
            total: 0,
            message: 'No valid GPS defect coordinates found. Ensure columns contain "latitude" and "longitude".'
          });
        }
      } catch (err: any) {
        setImportStats({
          total: 0,
          message: `File parse error: ${err.message || 'Invalid format'}`
        });
      }
    };

    reader.readAsText(file);
  };

  // Export current mapped defects as GeoJSON
  const handleExportGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: damageMarkers.map(m => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [m.longitude, m.latitude]
        },
        properties: {
          id: m.id,
          pothole_id: m.pothole_id,
          category: m.category,
          severity: m.severity,
          confidence: m.confidence,
          road_name: m.road_name,
          road_authority: m.road_authority,
          depth_cm: m.depth_cm,
          width_cm: m.width_cm,
          timestamp_sec: m.timestamp_sec
        }
      }))
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `road_defects_gis_survey_${Date.now()}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export current mapped defects as CSV
  const handleExportCSV = () => {
    const header = 'id,pothole_id,latitude,longitude,category,severity,confidence,road_name,road_authority,depth_cm,width_cm,timestamp_sec\n';
    const rows = damageMarkers.map(m => 
      `"${m.id}","${m.pothole_id || ''}",${m.latitude},${m.longitude},"${m.category}","${m.severity}",${m.confidence},"${m.road_name.replace(/"/g, '""')}","${(m.road_authority || '').replace(/"/g, '""')}",${m.depth_cm || 0},${m.width_cm || 0},${m.timestamp_sec}`
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `road_defects_gis_survey_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Permanently purge demo sample data
  const handlePurgeSampleData = async () => {
    if (confirm('Permanently purge default sample defects? Only real surveyed potholes and geotagged uploads will remain on the map.')) {
      try {
        await apiClient.delete('/driver/potholes/clear-sample');
      } catch (e) {
        console.debug('Backend clear notice:', e);
      }
      setDataMode('real');
      localStorage.setItem('nhai_gis_data_mode', 'real');
      loadDatabasePotholes();
      loadHistoricalHeatmap();
    }
  };

  // Delete individual real defect
  const handleDeleteDefect = (defectId: string) => {
    const updated = realMappedDefects.filter(m => m.id !== defectId);
    saveRealDefects(updated);
  };

  // Clear all real mapped survey points
  const handleClearAllRealDefects = () => {
    if (confirm('Clear all your surveyed real road defect points from this device?')) {
      saveRealDefects([]);
    }
  };

  // Fetch Highway Cameras, Violations & Alerts
  useEffect(() => {
    if (propsCameras && propsCameras.length > 0) {
      setHighwayCameras(propsCameras);
    } else {
      cameraService.listCameras()
        .then((cams) => {
          if (Array.isArray(cams) && cams.length > 0) setHighwayCameras(cams);
        })
        .catch(() => {});
    }

    violationService.getViolations({ limit: 25 })
      .then((res) => {
        if (Array.isArray(res?.items)) setHighwayViolations(res.items);
      })
      .catch(() => {});

    stolenVehicleService.getLiveAlerts(20)
      .then((alerts) => {
        if (Array.isArray(alerts)) setStolenAlerts(alerts);
      })
      .catch(() => {});
  }, [propsCameras]);

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
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
          category: (p.category as DamageCategory) || 'pothole',
          severity: (p.severity as SeverityLevel) || 'high',
          confidence: p.confidence ?? 0.90,
          road_name: p.road_name || 'Active Road Corridor',
          road_authority: p.road_authority || 'National Highway Authority',
          image_url: p.image_url || p.evidence_image_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
          distance_meters: p.distance_meters,
          lane_position: p.lane_position,
          model_name: p.model_name || 'best.pt',
          depth_cm: p.depth_cm,
          width_cm: p.width_cm
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

  // Base road GPS track points derived from real defects, video, or real database coordinates
  const gpsTracks: GPSPoint[] = useMemo(() => {
    if (video?.gps_tracks && video.gps_tracks.length > 0) {
      return video.gps_tracks;
    }
    if (realMappedDefects.length > 0) {
      return realMappedDefects.map((p, i) => ({
        frame_number: p.frame_number || (i * 30),
        latitude: p.latitude,
        longitude: p.longitude,
        altitude_meters: 215.0 + (i * 0.2),
        speed_kmh: 40.0,
        road_name: p.road_name
      }));
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
    const centerLat = currentVehiclePosition?.lat || (realMappedDefects[0]?.latitude) || 28.4595;
    const centerLng = currentVehiclePosition?.lng || (realMappedDefects[0]?.longitude) || 77.0266;
    return [
      { frame_number: 1, latitude: centerLat, longitude: centerLng, altitude_meters: 215.4, speed_kmh: 42.5, road_name: 'Surveyed Highway Corridor' },
      { frame_number: 150, latitude: centerLat + 0.0013, longitude: centerLng + 0.0012, altitude_meters: 215.8, speed_kmh: 44.1, road_name: 'Surveyed Highway Corridor' },
      { frame_number: 300, latitude: centerLat + 0.0026, longitude: centerLng + 0.0025, altitude_meters: 216.2, speed_kmh: 41.8, road_name: 'Surveyed Highway Corridor' },
      { frame_number: 450, latitude: centerLat + 0.0040, longitude: centerLng + 0.0039, altitude_meters: 215.1, speed_kmh: 45.0, road_name: 'Surveyed Highway Corridor' }
    ];
  }, [video?.gps_tracks, realMappedDefects, dbPotholes, currentVehiclePosition]);

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

  // Derive Geotagged Damage Markers dynamically from real props, video frames, surveyed defects, or database
  const damageMarkers: GPSDamageMarker[] = useMemo(() => {
    const allReal: GPSDamageMarker[] = [...realMappedDefects];

    if (potholeMarkers && potholeMarkers.length > 0) {
      potholeMarkers.forEach((m, idx) => {
        allReal.push({
          id: m.id || m.pothole_id || m.detection_id || `pot-${idx}-${m.latitude}-${m.longitude}`,
          pothole_id: m.pothole_id || `POT-${m.track_id || idx + 1}`,
          frame_number: m.frame_number ?? (idx * 15),
          timestamp_sec: m.timestamp_sec ?? (m.timestamp ? Math.round(new Date(m.timestamp).getTime() / 1000) : idx * 2),
          latitude: Number(m.latitude),
          longitude: Number(m.longitude),
          category: ((m.category as DamageCategory) || 'pothole'),
          severity: ((m.severity as SeverityLevel) || 'high'),
          confidence: m.confidence ?? 0.92,
          road_name: m.road_name || 'Active Road Corridor',
          road_authority: m.road_authority || 'National Highway Authority',
          image_url: m.image_url || m.evidence_image_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
          distance_meters: m.distance_meters,
          lane_position: m.lane_position,
          model_name: m.model_name || 'best.pt',
          depth_cm: m.depth_cm,
          width_cm: m.width_cm
        });
      });
    }

    if (video?.frames && video.frames.length > 0) {
      video.frames.forEach((f) => {
        if (f.has_damage && f.detections && f.detections.length > 0) {
          f.detections.forEach((d) => {
            const gpsPt = video.gps_tracks?.find((g) => g.frame_number >= f.frame_number) || video.gps_tracks?.[0];
            allReal.push({
              id: d.id,
              pothole_id: `POT-${d.id.slice(-4)}`,
              frame_number: f.frame_number,
              timestamp_sec: f.timestamp_sec,
              latitude: Number(d.latitude || (gpsPt ? gpsPt.latitude : (currentVehiclePosition?.lat || 28.4635))),
              longitude: Number(d.longitude || (gpsPt ? gpsPt.longitude : (currentVehiclePosition?.lng || 77.0305))),
              category: d.category,
              severity: d.severity,
              confidence: d.confidence,
              road_name: d.road_name || gpsPt?.road_name || 'Active Road Corridor',
              road_authority: d.road_authority,
              image_url: f.image_url,
              model_name: d.model_name || 'best.pt',
              depth_cm: d.depth_cm,
              width_cm: d.width_cm
            });
          });
        }
      });
    }

    if (dbPotholes.length > 0) {
      allReal.push(...dbPotholes);
    }

    // Deduplicate allReal by coordinates + id
    const uniqueRealMap = new Map<string, GPSDamageMarker>();
    allReal.forEach(item => {
      const key = `${Number(item.latitude).toFixed(5)}_${Number(item.longitude).toFixed(5)}_${item.category}`;
      if (!uniqueRealMap.has(key)) {
        uniqueRealMap.set(key, item);
      }
    });
    const uniqueReal = Array.from(uniqueRealMap.values());

    // In 'real' mode, NEVER use defaultStaticMarkers!
    if (dataMode === 'real') {
      return uniqueReal;
    }

    // In 'all' mode, fall back to defaultStaticMarkers if uniqueReal is empty
    if (uniqueReal.length > 0) {
      return uniqueReal;
    }
    return defaultStaticMarkers;
  }, [dataMode, realMappedDefects, potholeMarkers, video, dbPotholes, currentVehiclePosition]);

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
      const polyline = L.polyline([], {
        color: '#3B82F6',
        weight: 3,
        opacity: 0.8,
        dashArray: '6, 6'
      }).addTo(map);
      polylineRef.current = polyline;

      // Layer group for dynamic markers
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      // Layer group for highway cameras
      const camerasLayer = L.layerGroup().addTo(map);
      camerasLayerRef.current = camerasLayer;

      // Layer group for traffic violations & stolen alerts
      const violationsLayer = L.layerGroup().addTo(map);
      violationsLayerRef.current = violationsLayer;

      // Map click listener for interactive pinning of real defects
      map.on('click', (e: L.LeafletMouseEvent) => {
        if (isPinningModeRef.current) {
          const lat = parseFloat(e.latlng.lat.toFixed(6));
          const lng = parseFloat(e.latlng.lng.toFixed(6));
          setNewDefectLat(lat);
          setNewDefectLng(lng);
          setIsAddDefectModalOpen(true);
          setIsPinningMode(false);
        }
      });

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

  // Update GPS polyline track when gpsTracks change
  useEffect(() => {
    if (polylineRef.current && gpsTracks.length > 1) {
      const coords: [number, number][] = gpsTracks.map(p => [p.latitude, p.longitude]);
      polylineRef.current.setLatLngs(coords);
    }
  }, [gpsTracks]);

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
            <div>🤖 <b>Model:</b> <span style="color: #A78BFA; font-weight: bold;">${marker.model_name || 'best.pt'}</span></div>
            <div>🎯 <b>Confidence:</b> <span style="color: #FF9500; font-weight: bold;">${((Number(marker.confidence) || 0.8) * 100).toFixed(0)}%</span></div>
            <div>📍 <b>GPS:</b> ${(Number(marker.latitude) || 28.4595).toFixed(5)}°, ${(Number(marker.longitude) || 77.0266).toFixed(5)}°</div>
            ${marker.depth_cm ? `<div>📏 <b>Dimensions:</b> Depth ${marker.depth_cm}cm${marker.width_cm ? ` • Width ${marker.width_cm}cm` : ''}</div>` : ''}
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

  // 5. Render Highway Cameras on Leaflet map
  useEffect(() => {
    if (!camerasLayerRef.current || !mapInstanceRef.current) return;
    camerasLayerRef.current.clearLayers();

    if (!showCameras) return;

    highwayCameras.forEach((cam) => {
      const isOnline = cam.status === 'online';
      const camIcon = L.divIcon({
        className: 'custom-camera-marker',
        html: `
          <div style="
            width: 28px;
            height: 28px;
            background: #0284C7;
            border: 2px solid #38BDF8;
            border-radius: 6px;
            box-shadow: 0 0 12px rgba(56, 189, 248, 0.75);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #FFFFFF;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
              <circle cx="12" cy="13" r="3"/>
            </svg>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const popupHTML = `
        <div style="font-family: ui-monospace, SFMono-Regular, monospace; color: #E0E0E0; background: #0B132B; padding: 12px; border: 1px solid #0284C7; border-radius: 6px; min-width: 240px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 9px; font-weight: bold; background: #0284C733; color: #38BDF8; border: 1px solid #38BDF8; padding: 2px 6px; border-radius: 3px; text-transform: uppercase;">
              ${cam.camera_type || 'RTSP Live Stream'}
            </span>
            <span style="font-size: 9px; font-weight: bold; color: ${isOnline ? '#34C759' : '#FF3B30'};">
              ● ${cam.status.toUpperCase()}
            </span>
          </div>
          <div style="font-size: 12px; font-weight: bold; color: #FFF; margin-bottom: 4px;">
            ${cam.camera_name}
          </div>
          <div style="font-size: 10px; color: #94A3B8; margin-bottom: 8px;">
            📍 ${cam.location_name || 'Highway Corridor'}<br/>
            🌐 GPS: ${cam.latitude.toFixed(5)}°, ${cam.longitude.toFixed(5)}°<br/>
            ⚡ Stream: 1920x1080 @ ${cam.fps || 30} FPS
          </div>
          <button id="view-cam-${cam.id}" style="width: 100%; padding: 6px 10px; background: #0284C7; color: white; border: none; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px;">
            Open Live Camera Feed
          </button>
        </div>
      `;

      const marker = L.marker([cam.latitude, cam.longitude], { icon: camIcon })
        .bindPopup(popupHTML, { className: 'custom-leaflet-popup' });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`view-cam-${cam.id}`);
        if (btn) {
          btn.onclick = () => onNavigate?.('live-grid');
        }
      });

      camerasLayerRef.current?.addLayer(marker);
    });
  }, [highwayCameras, showCameras, onNavigate]);

  // 6. Render Traffic Violations & Stolen Alerts on Leaflet map
  useEffect(() => {
    if (!violationsLayerRef.current || !mapInstanceRef.current) return;
    violationsLayerRef.current.clearLayers();

    if (!showViolations) return;

    // Stolen vehicle alerts (Priority Red Flashing)
    stolenAlerts.forEach((alert) => {
      if (!alert.latitude || !alert.longitude) return;
      const alertIcon = L.divIcon({
        className: 'custom-stolen-marker',
        html: `
          <div style="
            width: 30px;
            height: 30px;
            background: #DC2626;
            border: 2px solid #F87171;
            border-radius: 50%;
            box-shadow: 0 0 16px rgba(239, 68, 68, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #FFFFFF;
            font-size: 14px;
          ">
            🚨
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const popupHTML = `
        <div style="font-family: ui-monospace, SFMono-Regular, monospace; color: #E0E0E0; background: #1C0505; padding: 12px; border: 1px solid #DC2626; border-radius: 6px; min-width: 250px;">
          <div style="font-size: 10px; font-weight: bold; color: #F87171; text-transform: uppercase; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
            🚨 STOLEN VEHICLE ALERT (FIR ACTIVE)
          </div>
          <div style="font-size: 14px; font-weight: 900; color: #FFF; letter-spacing: 1px; margin-bottom: 4px;">
            ${alert.vehicle_number}
          </div>
          <div style="font-size: 10px; color: #E2E8F0; margin-bottom: 6px;">
            📄 <b>FIR:</b> ${alert.fir_number || 'FIR-2026-HR-8821'}<br/>
            🚘 <b>Owner:</b> ${alert.owner_name || 'Reported Stolen'}<br/>
            🤖 <b>ANPR Model:</b> <span style="color:#FBBF24;">numberplate-yolo-v26n.pt</span><br/>
            📍 <b>Location:</b> ${alert.camera_location || alert.camera_name || 'NH-48 Sirhaul Gateway'}
          </div>
          <button id="view-alert-${alert.id}" style="width: 100%; padding: 6px 10px; background: #DC2626; color: white; border: none; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer; text-transform: uppercase;">
            Open Stolen Alerts Desk
          </button>
        </div>
      `;

      const marker = L.marker([alert.latitude, alert.longitude], { icon: alertIcon })
        .bindPopup(popupHTML, { className: 'custom-leaflet-popup' });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`view-alert-${alert.id}`);
        if (btn) {
          btn.onclick = () => onNavigate?.('stolen-alerts');
        }
      });

      violationsLayerRef.current?.addLayer(marker);
    });

    // Traffic violations (Helmet / Speed / ANPR)
    highwayViolations.forEach((v) => {
      const lat = v.latitude ?? 28.4595;
      const lng = v.longitude ?? 77.0266;
      const modelUsed = v.violation_type.toLowerCase().includes('helmet')
        ? 'helmet.pt'
        : 'numberplate-yolo-v26n.pt';

      const vIcon = L.divIcon({
        className: 'custom-violation-marker',
        html: `
          <div style="
            width: 26px;
            height: 26px;
            background: #D97706;
            border: 2px solid #FBBF24;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(245, 158, 11, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #FFFFFF;
            font-size: 12px;
          ">
            🛡️
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const popupHTML = `
        <div style="font-family: ui-monospace, SFMono-Regular, monospace; color: #E0E0E0; background: #181205; padding: 12px; border: 1px solid #D97706; border-radius: 6px; min-width: 230px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 9px; font-weight: bold; background: #D9770633; color: #FBBF24; border: 1px solid #FBBF24; padding: 2px 6px; border-radius: 3px; text-transform: uppercase;">
              ${v.violation_type.replace(/_/g, ' ')}
            </span>
            <span style="font-size: 10px; font-weight: bold; color: #34C759;">₹${v.fine_amount}</span>
          </div>
          <div style="font-size: 13px; font-weight: 800; color: #FFF; margin-bottom: 4px;">
            ${v.license_plate_number}
          </div>
          <div style="font-size: 10px; color: #CBD5E1; margin-bottom: 6px;">
            🤖 <b>Model:</b> <span style="color:#FBBF24;">${modelUsed}</span><br/>
            📍 <b>Road:</b> ${v.location_name || 'NH-48 Corridor'}<br/>
            ⏱️ <b>Time:</b> ${new Date(v.created_at).toLocaleTimeString()}
          </div>
          <button id="view-viol-${v.id}" style="width: 100%; padding: 6px 10px; background: #D97706; color: white; border: none; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer; text-transform: uppercase;">
            View e-Challan
          </button>
        </div>
      `;

      const marker = L.marker([lat, lng], { icon: vIcon })
        .bindPopup(popupHTML, { className: 'custom-leaflet-popup' });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`view-viol-${v.id}`);
        if (btn) {
          btn.onclick = () => onNavigate?.('violations');
        }
      });

      violationsLayerRef.current?.addLayer(marker);
    });
  }, [highwayViolations, stolenAlerts, showViolations, onNavigate]);

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
                {selectedMarker.road_name} • {(Number(selectedMarker.latitude) || 28.4595).toFixed(4)}°, {(Number(selectedMarker.longitude) || 77.0266).toFixed(4)}°
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
      {/* Real Data Mode Command & GIS Navigation Header */}
      <div className="bg-[#111111] border border-blue-900/40 p-4 rounded-t-sm shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
                dataMode === 'real'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 flex items-center gap-1'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/50'
              }`}>
                {dataMode === 'real' ? (
                  <>
                    <Zap className="w-3 h-3 fill-emerald-400" />
                    <span>REAL DATA MODE (LIVE SURVEY)</span>
                  </>
                ) : (
                  <span>DEMO / SAMPLE DATA MODE</span>
                )}
              </span>

              <span className="text-[10px] text-[#888]">
                {dataMode === 'real' 
                  ? `${damageMarkers.length} Real Mapped Defect${damageMarkers.length === 1 ? '' : 's'}`
                  : `${damageMarkers.length} Defect Pins Displayed`}
              </span>
            </div>

            <h2 className="text-base font-bold text-white uppercase flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#2563EB]" />
              <span>{video?.title || 'National Highway Corridor'} GIS Map & Heatmap</span>
            </h2>
            <p className="text-[11px] text-[#888]">
              Direct GPS defect mapping engine. Map real surveyed potholes, live mobile surveyor telemetry, and import/export GIS survey packages.
            </p>
          </div>

          {/* Mode Switch & Real Survey Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Switch Button */}
            <div className="bg-[#1A1A1A] border border-[#333] p-1 flex items-center rounded text-xs">
              <button
                type="button"
                onClick={() => handleToggleDataMode('real')}
                className={`px-3 py-1 text-[11px] font-bold uppercase transition-all rounded ${
                  dataMode === 'real'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                ⚡ Real Data
              </button>
              <button
                type="button"
                onClick={() => handleToggleDataMode('all')}
                className={`px-3 py-1 text-[11px] font-bold uppercase transition-all rounded ${
                  dataMode === 'all'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                All / Demo
              </button>
            </div>

            {/* Map Pinning Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsPinningMode(!isPinningMode)}
              className={`px-3 py-1.5 text-xs font-bold uppercase border flex items-center gap-1.5 transition-all ${
                isPinningMode
                  ? 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-lg'
                  : 'bg-[#1E1E1E] hover:bg-[#2A2A2A] text-amber-300 border-amber-500/40 hover:border-amber-400'
              }`}
              title="Click anywhere on map to drop a new road defect"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>{isPinningMode ? 'CLICK MAP TO PIN...' : 'PIN ON MAP'}</span>
            </button>

            {/* Add Defect Modal Button */}
            <button
              type="button"
              onClick={() => setIsAddDefectModalOpen(true)}
              className="px-3 py-1.5 text-xs font-bold uppercase bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD DEFECT</span>
            </button>

            {/* Real Device GPS Locator */}
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={isLocating}
              className="px-3 py-1.5 text-xs font-bold uppercase bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] hover:border-blue-500 text-white flex items-center gap-1.5 transition-all"
              title="Acquire live device GPS location"
            >
              <Locate className={`w-3.5 h-3.5 text-sky-400 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'LOCATING...' : 'MY GPS'}</span>
            </button>

            {/* Import Survey Data Button */}
            <button
              type="button"
              onClick={() => { setImportStats(null); setIsImportModalOpen(true); }}
              className="px-3 py-1.5 text-xs font-bold uppercase bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] hover:border-emerald-500 text-white flex items-center gap-1.5 transition-all"
              title="Import GeoJSON or CSV survey data"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>IMPORT</span>
            </button>

            {/* Export Dropdown / Buttons */}
            <button
              type="button"
              onClick={handleExportGeoJSON}
              className="px-2.5 py-1.5 text-xs font-bold uppercase bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] hover:border-indigo-500 text-white flex items-center gap-1 transition-all"
              title="Export current mapped points as GeoJSON"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>GEOJSON</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 text-xs font-bold uppercase bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] hover:border-teal-500 text-white flex items-center gap-1 transition-all"
              title="Export current mapped points as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
              <span>CSV</span>
            </button>

            {/* Purge Demo Data Button */}
            <button
              type="button"
              onClick={handlePurgeSampleData}
              className="p-1.5 text-xs font-bold uppercase bg-[#1A1A1A] hover:bg-rose-950/40 border border-[#333] hover:border-rose-600 text-rose-400 transition-all"
              title="Purge default sample data permanently"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Pinning Mode Active Alert Bar */}
        {isPinningMode && (
          <div className="mt-3 p-2.5 bg-rose-950/40 border border-rose-500/60 rounded flex items-center justify-between text-xs text-rose-200">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-rose-400 animate-spin" />
              <span className="font-bold">CLICK-TO-PIN ACTIVE:</span>
              <span>Click anywhere on the road map to place a geotagged defect at that coordinate.</span>
            </div>
            <button
              onClick={() => setIsPinningMode(false)}
              className="px-2 py-0.5 bg-rose-800 hover:bg-rose-700 text-white text-[10px] font-bold uppercase rounded"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Main Map Toolbar & Heatmap Layer Configuration Bar */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#111111] border border-[#2A2A2A] p-3 text-xs">
          {/* Layer Toggles */}
          <div className="sm:col-span-5 flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-2.5 py-1.5 border flex items-center gap-1.5 font-bold transition-all ${
                showHeatmap
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-sm'
                  : 'bg-[#1A1A1A] text-[#777] border-[#333] hover:text-white'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'fill-amber-400' : ''}`} />
              <span>HEATMAP</span>
            </button>

            <button
              onClick={() => setShowMarkers(!showMarkers)}
              className={`px-2.5 py-1.5 border flex items-center gap-1.5 font-bold transition-all ${
                showMarkers
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                  : 'bg-[#1A1A1A] text-[#777] border-[#333] hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>DEFECTS ({filteredMarkers.length})</span>
            </button>

            <button
              onClick={() => setShowCameras(!showCameras)}
              className={`px-2.5 py-1.5 border flex items-center gap-1.5 font-bold transition-all ${
                showCameras
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/50'
                  : 'bg-[#1A1A1A] text-[#777] border-[#333] hover:text-white'
              }`}
              title="Toggle Live Highway ANPR Cameras"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>CAMS ({highwayCameras.length})</span>
            </button>

            <button
              onClick={() => setShowViolations(!showViolations)}
              className={`px-2.5 py-1.5 border flex items-center gap-1.5 font-bold transition-all ${
                showViolations
                  ? 'bg-amber-600/20 text-amber-400 border-amber-500/50'
                  : 'bg-[#1A1A1A] text-[#777] border-[#333] hover:text-white'
              }`}
              title="Toggle Traffic Violations & Stolen Vehicle Alerts"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>ALERTS ({highwayViolations.length + stolenAlerts.length})</span>
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
          <div className="relative">
            <div 
              ref={mapContainerRef} 
              className="w-full h-96 bg-[#141414] border border-[#2A2A2A] relative z-0" 
            />

            {/* Empty State Overlay for Real Data Mode when no defects are mapped */}
            {dataMode === 'real' && damageMarkers.length === 0 && (
              <div className="absolute inset-0 z-10 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm uppercase tracking-wider">Real Data Mode Active</h4>
                  <p className="text-[#AAA] text-xs max-w-md mt-1">
                    No real surveyed defects currently mapped. Choose an action below to populate real road inspection data.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPinningMode(true)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase rounded flex items-center gap-1.5 shadow"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Click Map To Pin Defect</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLocateMe}
                    disabled={isLocating}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase rounded flex items-center gap-1.5 shadow"
                  >
                    <Locate className="w-3.5 h-3.5" />
                    <span>Acquire Device GPS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setImportStats(null); setIsImportModalOpen(true); }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded flex items-center gap-1.5 shadow"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import GeoJSON / CSV</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Track telemetry & Heatmap statistics bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
            <div className="bg-[#141414] border border-[#222] p-2">
              <span className="text-[#888] flex items-center gap-1">
                <Navigation className="w-3 h-3 text-blue-400" />
                <span>GPS CENTER:</span>
              </span>
              <div className="text-white font-bold truncate mt-0.5">
                {currentVehiclePosition?.lat != null ? `${Number(currentVehiclePosition.lat).toFixed(4)}° N, ${Number(currentVehiclePosition.lng).toFixed(4)}° E` : '28.4635° N, 77.0305° E'}
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

              {/* Record Type Badge */}
              <div className="flex justify-between items-center pb-1">
                {selectedMarker.id?.startsWith('real_') || realMappedDefects.some(d => d.id === selectedMarker.id) || dbPotholes.some(p => p.id === selectedMarker.id) ? (
                  <div className="w-full px-2 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-[10px] flex items-center justify-between uppercase">
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3 fill-emerald-400" /> Real Survey Record</span>
                    <span className="text-emerald-300/80 font-mono text-[9px]">{selectedMarker.id.slice(0, 16)}</span>
                  </div>
                ) : (
                  <div className="w-full px-2 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold text-[10px] flex items-center justify-between uppercase">
                    <span>Demo / Simulated Record</span>
                    <span className="text-amber-300/80 font-mono text-[9px]">{selectedMarker.id}</span>
                  </div>
                )}
              </div>

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
                <span className="text-[#FF9500] font-bold">{((Number(selectedMarker.confidence) || 0.8) * 100).toFixed(0)}%</span>
              </div>

              <div className="flex justify-between items-center border-b border-[#222] pb-2">
                <span className="text-[#888]">GPS LATITUDE:</span>
                <span className="text-white font-mono">{(Number(selectedMarker.latitude) || 28.4595).toFixed(6)}° N</span>
              </div>

              <div className="flex justify-between items-center border-b border-[#222] pb-2">
                <span className="text-[#888]">GPS LONGITUDE:</span>
                <span className="text-white font-mono">{(Number(selectedMarker.longitude) || 77.0266).toFixed(6)}° E</span>
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

              <button
                type="button"
                onClick={() => handleDeleteDefect(selectedMarker.id)}
                className="w-full mt-1.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 text-xs uppercase font-bold border border-rose-800 flex items-center justify-center space-x-1.5 transition-all"
                title="Remove this defect from the active map"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>DELETE THIS DEFECT</span>
              </button>

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

      {/* MODAL 1: ADD REAL DEFECT MANUAL / PIN FORM */}
      {isAddDefectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#333] max-w-lg w-full p-5 space-y-4 shadow-2xl rounded-sm">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase">Add Real Survey Road Defect</h3>
                  <p className="text-[10px] text-[#888]">Geotag real road anomaly into GIS database</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddDefectModalOpen(false)}
                className="text-[#888] hover:text-white font-bold text-lg px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRealDefect} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#AAA] font-bold">Latitude (GPS N)</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={newDefectLat}
                    onChange={(e) => setNewDefectLat(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#1F1F1F] border border-[#333] px-3 py-1.5 text-white font-mono focus:border-blue-500 focus:outline-none"
                    placeholder="28.4595"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#AAA] font-bold">Longitude (GPS E)</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={newDefectLng}
                    onChange={(e) => setNewDefectLng(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#1F1F1F] border border-[#333] px-3 py-1.5 text-white font-mono focus:border-blue-500 focus:outline-none"
                    placeholder="77.0266"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#AAA] font-bold">Defect Category</label>
                  <select
                    value={newDefectCategory}
                    onChange={(e) => setNewDefectCategory(e.target.value as DamageCategory)}
                    className="w-full bg-[#1F1F1F] border border-[#333] px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="pothole">Pothole</option>
                    <option value="alligator_crack">Alligator Crack</option>
                    <option value="longitudinal_crack">Longitudinal Crack</option>
                    <option value="transverse_crack">Transverse Crack</option>
                    <option value="broken_road">Broken Road Edge</option>
                    <option value="missing_asphalt">Missing Asphalt</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#AAA] font-bold">Severity Level</label>
                  <select
                    value={newDefectSeverity}
                    onChange={(e) => setNewDefectSeverity(e.target.value as SeverityLevel)}
                    className="w-full bg-[#1F1F1F] border border-[#333] px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="critical">🔴 Critical (High Collision Hazard)</option>
                    <option value="high">🟠 High (Suspension Damage)</option>
                    <option value="medium">🟡 Medium (Surface Distress)</option>
                    <option value="low">🟢 Low (Early Raveling)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#AAA] font-bold">Road / Corridor Name</label>
                  <input
                    type="text"
                    required
                    value={newDefectRoadName}
                    onChange={(e) => setNewDefectRoadName(e.target.value)}
                    className="w-full bg-[#1F1F1F] border border-[#333] px-3 py-1.5 text-white focus:border-blue-500 focus:outline-none"
                    placeholder="NH-48 Corridor (KM 42+200)"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#AAA] font-bold">Road Authority</label>
                  <input
                    type="text"
                    value={newDefectRoadAuthority}
                    onChange={(e) => setNewDefectRoadAuthority(e.target.value)}
                    className="w-full bg-[#1F1F1F] border border-[#333] px-3 py-1.5 text-white focus:border-blue-500 focus:outline-none"
                    placeholder="NHAI PIU Gurgaon / PWD"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#AAA] font-bold">Est. Depth (cm)</label>
                  <input
                    type="number"
                    value={newDefectDepth}
                    onChange={(e) => setNewDefectDepth(e.target.value)}
                    className="w-full bg-[#1F1F1F] border border-[#333] px-3 py-1.5 text-white focus:border-blue-500 focus:outline-none"
                    placeholder="8.5"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#AAA] font-bold">Est. Width (cm)</label>
                  <input
                    type="number"
                    value={newDefectWidth}
                    onChange={(e) => setNewDefectWidth(e.target.value)}
                    className="w-full bg-[#1F1F1F] border border-[#333] px-3 py-1.5 text-white focus:border-blue-500 focus:outline-none"
                    placeholder="45"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#AAA] font-bold">Field Surveyor Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={newDefectNotes}
                  onChange={(e) => setNewDefectNotes(e.target.value)}
                  className="w-full bg-[#1F1F1F] border border-[#333] p-2 text-white focus:border-blue-500 focus:outline-none resize-none"
                  placeholder="Severe water logging after rain, immediate cold-mix pothole repair recommended."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#222]">
                <button
                  type="button"
                  onClick={() => setIsAddDefectModalOpen(false)}
                  className="px-4 py-2 bg-[#222] hover:bg-[#333] text-white font-bold uppercase rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase rounded text-xs flex items-center gap-1.5 shadow"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Real Defect to GIS</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: IMPORT SURVEY DATA (GEOJSON / CSV) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#333] max-w-lg w-full p-5 space-y-4 shadow-2xl rounded-sm">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase">Import Real Survey Package</h3>
                  <p className="text-[10px] text-[#888]">Load GeoJSON feature collection or CSV GPS road coordinates</p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-[#888] hover:text-white font-bold text-lg px-2"
              >
                ✕
              </button>
            </div>

            {/* Import Status Alert */}
            {importStats && (
              <div className={`p-3 text-xs rounded border ${
                importStats.total > 0 
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
              }`}>
                {importStats.message}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="border-2 border-dashed border-[#333] hover:border-emerald-500/60 p-6 rounded text-center transition-all bg-[#181818]">
                <FileSpreadsheet className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                <p className="text-white font-bold text-sm">Select GeoJSON or CSV file</p>
                <p className="text-[11px] text-[#888] mt-1">
                  Supported formats: Standard GeoJSON FeatureCollection (Point), CSV with lat/latitude & lng/longitude headers.
                </p>

                <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase cursor-pointer rounded shadow transition-all">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Survey File</span>
                  <input
                    type="file"
                    accept=".geojson,.json,.csv"
                    onChange={handleSurveyFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="bg-[#1A1A1A] p-3 rounded border border-[#2A2A2A] space-y-1.5 text-[11px]">
                <div className="font-bold text-white uppercase">Accepted CSV Format Template:</div>
                <pre className="bg-black/50 p-2 text-emerald-400 font-mono text-[10px] overflow-x-auto rounded">
{`latitude,longitude,category,severity,road_name
28.461245,77.029810,pothole,critical,NH-48 Express
28.463510,77.031200,alligator_crack,high,NH-48 Express
28.465800,77.033400,broken_road,medium,NH-48 Express`}
                </pre>
              </div>

              <div className="flex justify-end pt-2 border-t border-[#222]">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 bg-[#222] hover:bg-[#333] text-white font-bold uppercase rounded text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


