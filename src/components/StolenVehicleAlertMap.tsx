import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  ShieldAlert,
  AlertOctagon,
  Layers,
  Crosshair,
  Maximize2,
  Clock,
  MapPin,
  Camera,
  User,
  CheckCircle2,
  ExternalLink,
  Radio,
  Navigation,
  Compass,
  RefreshCw,
  Eye
} from 'lucide-react';
import { StolenVehicleAlert } from '../types/stolenVehicle';

export interface StolenVehicleAlertMapProps {
  alerts: StolenVehicleAlert[];
  selectedAlertId?: string | null;
  onSelectAlert?: (alert: StolenVehicleAlert) => void;
  onResolveAlert?: (alert: StolenVehicleAlert) => void;
  onOpenRegistry?: () => void;
  height?: string;
  className?: string;
}

export const StolenVehicleAlertMap: React.FC<StolenVehicleAlertMapProps> = ({
  alerts,
  selectedAlertId,
  onSelectAlert,
  onResolveAlert,
  onOpenRegistry,
  height = '600px',
  className = ''
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map());

  const [mapStyle, setMapStyle] = useState<'dark' | 'streets'>('dark');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [autoFitBounds, setAutoFitBounds] = useState<boolean>(true);
  const [activeAlertCount, setActiveAlertCount] = useState<number>(0);

  // Filter alerts by status and ensure valid latitude/longitude
  const validGeotaggedAlerts = useMemo(() => {
    return alerts.filter(
      (a) =>
        typeof a.latitude === 'number' &&
        !isNaN(a.latitude) &&
        typeof a.longitude === 'number' &&
        !isNaN(a.longitude) &&
        (filterStatus === 'ALL' || a.status === filterStatus)
    );
  }, [alerts, filterStatus]);

  // Compute active count
  useEffect(() => {
    const active = alerts.filter((a) => a.status === 'ACTIVE').length;
    setActiveAlertCount(active);
  }, [alerts]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center: First valid alert or NCR / Highway corridor
      const initialCenter: [number, number] =
        validGeotaggedAlerts.length > 0
          ? [validGeotaggedAlerts[0].latitude!, validGeotaggedAlerts[0].longitude!]
          : [28.4595, 77.0266];

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: validGeotaggedAlerts.length > 0 ? 13 : 11,
        zoomControl: false,
        attributionControl: false
      });

      // Add zoom control to top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Base tile layer
      const darkTiles = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          maxZoom: 19,
          subdomains: 'abcd'
        }
      );
      darkTiles.addTo(map);
      tileLayerRef.current = darkTiles;

      // Layer group for dynamic stolen vehicle markers
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer when mapStyle changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const tileUrl =
      mapStyle === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const newTiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: mapStyle === 'dark' ? 'abcd' : 'abc'
    });
    newTiles.addTo(mapInstanceRef.current);
    tileLayerRef.current = newTiles;
  }, [mapStyle]);

  // Render Real Stolen Vehicle Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    markerMapRef.current.clear();

    const bounds: [number, number][] = [];

    validGeotaggedAlerts.forEach((alert) => {
      const lat = alert.latitude!;
      const lng = alert.longitude!;
      bounds.push([lat, lng]);

      const isSelected = selectedAlertId === alert.id;
      const isActive = alert.status === 'ACTIVE';
      const isInvestigating = alert.status === 'INVESTIGATING';
      const isIntercepted = alert.status === 'INTERCEPTED' || alert.status === 'RESOLVED';

      // Pick marker color and icon
      let badgeColor = '#EF4444'; // Red
      let borderColor = '#F87171';
      let iconEmoji = '🚨';
      let pingClass = 'animate-ping';

      if (isInvestigating) {
        badgeColor = '#F59E0B'; // Amber
        borderColor = '#FCD34D';
        iconEmoji = '⚠️';
      } else if (isIntercepted) {
        badgeColor = '#10B981'; // Emerald
        borderColor = '#34D399';
        iconEmoji = '🛡️';
        pingClass = '';
      } else if (alert.status === 'FALSE_POSITIVE') {
        badgeColor = '#6B7280';
        borderColor = '#9CA3AF';
        iconEmoji = '⚪';
        pingClass = '';
      }

      // Create Custom DivIcon
      const markerHtml = `
        <div style="position:relative; width:44px; height:44px; display:flex; align-items:center; justify-content:center; cursor:pointer;" id="stolen-marker-${alert.id}">
          ${
            isActive
              ? `<div style="position:absolute; width:44px; height:44px; border-radius:50%; background:rgba(239, 68, 68, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
              : isInvestigating
              ? `<div style="position:absolute; width:44px; height:44px; border-radius:50%; background:rgba(245, 158, 11, 0.3); animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
              : ''
          }
          <div style="
            position:relative;
            width: 32px;
            height: 32px;
            background: ${badgeColor};
            border: 2px solid ${isSelected ? '#FFFFFF' : borderColor};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 ${isSelected ? '20px #FFF' : '12px ' + badgeColor};
            font-size: 15px;
            color: #FFFFFF;
            transition: transform 0.2s;
            transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
          ">
            ${iconEmoji}
          </div>
          <div style="
            position: absolute;
            bottom: -18px;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid ${borderColor};
            color: #F8FAFC;
            font-family: monospace;
            font-weight: 800;
            font-size: 10px;
            padding: 1px 6px;
            border-radius: 4px;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.8);
            pointer-events: none;
          ">
            ${alert.vehicle_number}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-stolen-vehicle-marker',
        html: markerHtml,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      // Custom Leaflet Popup
      const statusBadgeBg =
        isActive ? 'bg-red-500/20 text-red-300 border-red-500/40' :
        isInvestigating ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
        'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

      const popupContent = document.createElement('div');
      popupContent.className = 'stolen-alert-popup p-1 text-slate-200 text-xs font-sans';
      popupContent.style.minWidth = '280px';
      popupContent.innerHTML = `
        <div style="background:#0F172A; border:1px solid #334155; border-radius:12px; padding:12px; color:#F8FAFC; box-shadow:0 10px 25px -5px rgba(0,0,0,0.5);">
          <!-- Header -->
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #1E293B; padding-bottom:6px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:16px;">${iconEmoji}</span>
              <span style="font-weight:800; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#F87171;">
                ${alert.status === 'ACTIVE' ? 'Active Stolen Alert' : 'Intercept Log'}
              </span>
            </div>
            <span style="padding:2px 8px; border-radius:6px; font-size:10px; font-weight:700; border:1px solid; background:rgba(239,68,68,0.2); color:#FCA5A5; border-color:rgba(239,68,68,0.4);">
              ${alert.status}
            </span>
          </div>

          <!-- Target Plate -->
          <div style="background:#020617; border:1px solid #334155; border-radius:8px; padding:8px 10px; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
            <div>
              <span style="font-size:9px; color:#94A3B8; text-transform:uppercase; font-weight:700; display:block;">Target License Plate</span>
              <span style="font-family:monospace; font-size:16px; font-weight:900; color:#34D399; letter-spacing:1px;">${alert.vehicle_number}</span>
            </div>
            ${typeof alert.detection_count === 'number' && alert.detection_count > 1 ? `
              <span style="background:rgba(59,130,246,0.2); border:1px solid rgba(59,130,246,0.4); color:#93C5FD; font-size:10px; font-weight:700; padding:2px 6px; border-radius:6px;">
                ${alert.detection_count} detections
              </span>
            ` : ''}
          </div>

          <!-- Details Grid -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:11px; margin-bottom:10px;">
            <div style="background:#1E293B; padding:6px 8px; border-radius:6px;">
              <span style="color:#94A3B8; font-size:9px; display:block;">FIR Reference</span>
              <span style="color:#FDE047; font-weight:600; font-family:monospace;">${alert.fir_number || 'ACTIVE-FIR'}</span>
            </div>
            <div style="background:#1E293B; padding:6px 8px; border-radius:6px;">
              <span style="color:#94A3B8; font-size:9px; display:block;">Owner on Record</span>
              <span style="color:#E2E8F0; font-weight:600;">${alert.owner_name || 'Record on File'}</span>
            </div>
          </div>

          <!-- Location & Camera Info -->
          <div style="background:#1E293B; padding:6px 8px; border-radius:6px; margin-bottom:8px; font-size:11px;">
            <div style="display:flex; align-items:center; gap:4px; color:#38BDF8; font-weight:600; margin-bottom:2px;">
              <span>📹 ${alert.camera_name || 'ANPR Surveillance Camera'}</span>
            </div>
            <div style="color:#94A3B8; font-size:10px;">
              📍 ${alert.camera_location || 'Corridor Geotag'}<br/>
              <span style="font-family:monospace; color:#64748B;">GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}</span>
            </div>
          </div>

          <!-- Timestamp -->
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:10px; color:#94A3B8; margin-bottom:10px; border-top:1px solid #1E293B; padding-top:6px;">
            <span>Detected:</span>
            <span style="font-weight:600; color:#E2E8F0;">${new Date(alert.last_detected_at || alert.timestamp).toLocaleTimeString()} (${new Date(alert.timestamp).toLocaleDateString()})</span>
          </div>

          <!-- Actions -->
          <div style="display:flex; gap:6px;">
            <button id="btn-resolve-${alert.id}" style="flex:1; background:#DC2626; hover:background:#B91C1C; color:#FFF; font-weight:700; font-size:11px; padding:6px 10px; border-radius:6px; border:none; cursor:pointer;">
              Update Status / Intercept
            </button>
          </div>
        </div>
      `;

      // Bind Click Handlers
      marker.bindPopup(popupContent, {
        closeButton: true,
        className: 'custom-leaflet-stolen-popup'
      });

      marker.on('click', () => {
        onSelectAlert?.(alert);
      });

      marker.on('popupopen', () => {
        setTimeout(() => {
          const btn = document.getElementById(`btn-resolve-${alert.id}`);
          if (btn && onResolveAlert) {
            btn.onclick = () => onResolveAlert(alert);
          }
        }, 50);
      });

      markersLayerRef.current?.addLayer(marker);
      markerMapRef.current.set(alert.id, marker);
    });

    // Auto fit bounds if enabled and alerts exist
    if (autoFitBounds && bounds.length > 0) {
      if (bounds.length === 1) {
        mapInstanceRef.current.setView(bounds[0], 14, { animate: true });
      } else {
        const leafletBounds = L.latLngBounds(bounds);
        mapInstanceRef.current.fitBounds(leafletBounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [validGeotaggedAlerts, selectedAlertId, autoFitBounds, onSelectAlert, onResolveAlert]);

  // Fly to selected alert when selectedAlertId changes
  useEffect(() => {
    if (!selectedAlertId || !mapInstanceRef.current) return;
    const targetAlert = alerts.find((a) => a.id === selectedAlertId);
    if (targetAlert && typeof targetAlert.latitude === 'number' && typeof targetAlert.longitude === 'number') {
      mapInstanceRef.current.flyTo([targetAlert.latitude, targetAlert.longitude], 16, {
        duration: 1.2
      });
      const marker = markerMapRef.current.get(selectedAlertId);
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedAlertId, alerts]);

  // Recenter / Fit All Bounds handler
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    const bounds: [number, number][] = validGeotaggedAlerts.map((a) => [a.latitude!, a.longitude!]);
    if (bounds.length > 0) {
      if (bounds.length === 1) {
        mapInstanceRef.current.flyTo(bounds[0], 15);
      } else {
        mapInstanceRef.current.fitBounds(L.latLngBounds(bounds), { padding: [60, 60] });
      }
    } else {
      mapInstanceRef.current.flyTo([28.4595, 77.0266], 12);
    }
  };

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col shadow-2xl ${className}`}
      style={{ height }}
    >
      {/* Map Control HUD Overlay */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Tactical Status Indicator */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3.5 py-2 rounded-xl shadow-xl text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-200">
            <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span>REAL-TIME ANPR INTERCEPT GRID</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-semibold">{validGeotaggedAlerts.length} Geotagged Alerts</span>
          </div>
          {activeAlertCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold text-[10px] border border-red-500/40 animate-pulse">
              {activeAlertCount} ACTIVE
            </span>
          )}
        </div>

        {/* Right: Map Controls & Status Filter */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Status Filter */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-2 py-1 shadow-xl">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL" className="bg-slate-900">All Statuses ({alerts.length})</option>
              <option value="ACTIVE" className="bg-slate-900">Active Only</option>
              <option value="INVESTIGATING" className="bg-slate-900">Investigating</option>
              <option value="INTERCEPTED" className="bg-slate-900">Intercepted</option>
              <option value="RESOLVED" className="bg-slate-900">Resolved</option>
            </select>
          </div>

          {/* Style Toggle (Dark vs Streets) */}
          <button
            type="button"
            onClick={() => setMapStyle(mapStyle === 'dark' ? 'streets' : 'dark')}
            title="Toggle Map Style"
            className="p-2 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 text-slate-200 rounded-xl shadow-xl transition flex items-center gap-1.5 text-xs font-semibold"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">{mapStyle === 'dark' ? 'Dark' : 'Streets'}</span>
          </button>

          {/* Fit Bounds */}
          <button
            type="button"
            onClick={handleRecenter}
            title="Fit All Geotags"
            className="p-2 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 text-slate-200 rounded-xl shadow-xl transition flex items-center gap-1.5 text-xs font-semibold"
          >
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Fit Bounds</span>
          </button>
        </div>
      </div>

      {/* Actual Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Bottom HUD / Legend */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] pointer-events-none flex flex-col sm:flex-row items-end sm:items-center justify-between gap-2">
        {/* Legend */}
        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-slate-800/90 px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-3 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border border-red-300"></span>
            <span>Active Siren</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-300"></span>
            <span>Investigating</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-300"></span>
            <span>Intercepted</span>
          </div>
        </div>

        {/* Quick Stolen Registry Button */}
        {onOpenRegistry && (
          <button
            type="button"
            onClick={onOpenRegistry}
            className="pointer-events-auto px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white font-bold text-xs rounded-xl shadow-xl flex items-center gap-1.5 transition"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Open Stolen Vehicle Registry</span>
          </button>
        )}
      </div>

      {/* Empty State Overlay when no geotagged alerts exist */}
      {validGeotaggedAlerts.length === 0 && (
        <div className="absolute inset-0 z-[500] pointer-events-none flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="pointer-events-auto max-w-md mx-4 bg-slate-900/95 border border-slate-800 p-6 rounded-2xl shadow-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="text-base font-bold text-slate-100">Live ANPR Geotag Grid Active</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              No geotagged stolen vehicle encounters detected yet. When registered stolen vehicles are identified across video inspections or live camera feeds, their exact GPS coordinates and intercept routes will render here in real time.
            </p>
            {onOpenRegistry && (
              <button
                type="button"
                onClick={onOpenRegistry}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition mt-2"
              >
                <ShieldAlert className="w-4 h-4 text-red-400" /> Verify Registered Stolen Vehicles
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
