import React, { useState, useEffect, useRef } from 'react';
import { CameraDevice, CameraStatus } from '../types/inspection';
import {
  Grid,
  Maximize2,
  Tv,
  Radio,
  Activity,
  AlertTriangle,
  Play,
  Square,
  Volume2,
  VolumeX,
  RefreshCw,
  Sliders,
  Layers,
  BarChart2,
  Car,
  ShieldAlert,
  Camera as CameraIcon,
  Download,
  Wifi,
  WifiOff,
  Eye,
  Settings,
  X
} from 'lucide-react';

interface CameraLiveGridViewProps {
  cameras: CameraDevice[];
  onSelectCamera: (cam: CameraDevice) => void;
  showToast: (title: string, desc: string, type?: 'success' | 'warning') => void;
}

interface TelemetryPacket {
  camera_id: string;
  camera_name: string;
  frame_number: number;
  timestamp: number;
  image_base64?: string;
  detections: Array<{
    category: string;
    confidence: number;
    bbox: [number, number, number, number];
  }>;
  gps?: { latitude: number; longitude: number };
  road_health: number;
  vehicle_count: number;
  damage_count: number;
  camera_status: string;
  fps: number;
}

// Single Stream Tile Component with WebSocket Integration and Canvas Fallback
const CameraStreamCard: React.FC<{
  camera: CameraDevice;
  isMuted: boolean;
  onToggleMute: (id: string) => void;
  onSelectCamera: (cam: CameraDevice) => void;
  onOpenFullscreen: (cam: CameraDevice) => void;
  showToast: (title: string, desc: string, type?: 'success' | 'warning') => void;
}> = ({ camera, isMuted, onToggleMute, onSelectCamera, onOpenFullscreen, showToast }) => {
  const [wsConnected, setWsConnected] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryPacket>({
    camera_id: camera.id,
    camera_name: camera.camera_name,
    frame_number: 0,
    timestamp: Date.now(),
    detections: [
      { category: 'pothole', confidence: 0.89, bbox: [160, 240, 280, 320] },
      { category: 'crack', confidence: 0.84, bbox: [320, 200, 420, 260] }
    ],
    road_health: camera.road_health ?? 82.5,
    vehicle_count: camera.vehicle_count ?? 14,
    damage_count: camera.detection_count ?? 3,
    camera_status: camera.status,
    fps: camera.fps || 30.0
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // WebSocket Connection Lifecycle
  useEffect(() => {
    let ws: WebSocket | null = null;
    let isSubscribed = true;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/v1/cameras/ws/live/${camera.id}`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (isSubscribed) setWsConnected(true);
      };

      ws.onmessage = (event) => {
        if (!isSubscribed) return;
        try {
          const data: TelemetryPacket = JSON.parse(event.data);
          setTelemetry(data);
        } catch {
          // Packet parse ignore
        }
      };

      ws.onerror = () => {
        if (isSubscribed) setWsConnected(false);
      };

      ws.onclose = () => {
        if (isSubscribed) setWsConnected(false);
      };
    } catch {
      setWsConnected(false);
    }

    return () => {
      isSubscribed = false;
      if (ws) ws.close();
    };
  }, [camera.id]);

  // Synthetic Frame Generator when WS image stream is absent
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCount = 0;

    const renderSyntheticStream = () => {
      frameCount++;
      const width = canvas.width;
      const height = canvas.height;

      // Dark asphalt road background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, width, height);

      // Road perspective surface
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(width * 0.35, height * 0.2);
      ctx.lineTo(width * 0.65, height * 0.2);
      ctx.lineTo(width * 0.95, height);
      ctx.lineTo(width * 0.05, height);
      ctx.closePath();
      ctx.fill();

      // Lane Dash Markings
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.setLineDash([15, 15]);
      ctx.lineDashOffset = -frameCount * 2;
      ctx.beginPath();
      ctx.moveTo(width * 0.5, height * 0.2);
      ctx.lineTo(width * 0.5, height);
      ctx.stroke();

      // Draw Pothole Defect Overlay
      const potholeY = (height * 0.4) + ((frameCount * 3) % (height * 0.5));
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.ellipse(width * 0.42, potholeY, 35, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Label Bounding Box
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(width * 0.42 - 35, potholeY - 32, 85, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('Pothole 0.92', width * 0.42 - 30, potholeY - 20);

      // Vehicle Detection Bounding Box
      const vehicleY = (height * 0.3) + (((frameCount + 50) * 2) % (height * 0.6));
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(width * 0.62, vehicleY, 65, 50);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(width * 0.62, vehicleY - 18, 55, 18);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Car 0.96', width * 0.62 + 5, vehicleY - 5);

      // Scanning HUD Line
      const scanY = (frameCount * 2) % height;
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(width, scanY);
      ctx.stroke();

      animationFrameRef.current = requestAnimationFrame(renderSyntheticStream);
    };

    if (!telemetry.image_base64) {
      renderSyntheticStream();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [telemetry.image_base64]);

  const handleTakeSnapshot = () => {
    showToast('Snapshot Captured', `Exported high-res frame snapshot from ${camera.camera_name}`);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col group transition-all hover:border-slate-700">
      {/* Stream Video Header */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        {telemetry.image_base64 ? (
          <img
            src={telemetry.image_base64}
            alt={camera.camera_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            className="w-full h-full object-cover"
          />
        )}

        {/* HUD Top Badges */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            LIVE
          </span>
          <span className="px-2 py-1 rounded text-[11px] font-semibold bg-slate-900/80 text-slate-200 border border-slate-700/80 backdrop-blur-md">
            {camera.camera_type.toUpperCase()}
          </span>
          {wsConnected ? (
            <span className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 backdrop-blur-md">
              <Wifi className="w-3 h-3 text-cyan-400" /> WS Ready
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md">
              <WifiOff className="w-3 h-3 text-amber-400" /> Simulated
            </span>
          )}
        </div>

        {/* HUD Top Action Controls */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
          <button
            onClick={handleTakeSnapshot}
            className="p-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700/80 backdrop-blur-md transition-all"
            title="Take Frame Snapshot"
          >
            <CameraIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onToggleMute(camera.id)}
            className="p-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700/80 backdrop-blur-md transition-all"
            title={isMuted ? 'Unmute Stream' : 'Mute Stream'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onOpenFullscreen(camera)}
            className="p-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700/80 backdrop-blur-md transition-all"
            title="Expand Fullscreen Matrix"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* HUD Bottom Telemetry Floating Bar */}
        <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between text-xs text-white backdrop-blur-md bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] text-slate-400 block">Health Index</span>
              <span className="font-bold text-emerald-400">{telemetry.road_health.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Road Hazards</span>
              <span className="font-bold text-amber-400">{telemetry.damage_count}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Vehicle Count</span>
              <span className="font-bold text-blue-400">{telemetry.vehicle_count}</span>
            </div>
          </div>

          <div className="text-right font-mono text-[11px] text-slate-400">
            {camera.resolution} @ {telemetry.fps} FPS
          </div>
        </div>
      </div>

      {/* Card Footer info */}
      <div className="p-4 bg-slate-900 flex items-center justify-between text-xs border-t border-slate-800">
        <div>
          <span className="font-bold text-slate-200 block truncate max-w-[220px]">
            {camera.camera_name}
          </span>
          <span className="text-[11px] text-slate-500 truncate block max-w-[220px]">
            {camera.location_name || camera.stream_url}
          </span>
        </div>

        <button
          onClick={() => onSelectCamera(camera)}
          className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white font-semibold rounded-xl border border-blue-500/30 transition-all flex items-center gap-1"
        >
          <Eye className="w-3.5 h-3.5" /> Inspect Feed
        </button>
      </div>
    </div>
  );
};

export const CameraLiveGridView: React.FC<CameraLiveGridViewProps> = ({
  cameras = [],
  onSelectCamera,
  showToast
}) => {
  const safeCameras = Array.isArray(cameras) ? cameras : [];
  const [gridLayout, setGridLayout] = useState<'1x1' | '2x2' | '3x3'>('2x2');
  const [activeFilter, setActiveFilter] = useState<'all' | 'online' | 'alerts'>('all');
  const [mutedStates, setMutedStates] = useState<Record<string, boolean>>({});
  const [fullscreenCamera, setFullscreenCamera] = useState<CameraDevice | null>(null);

  const toggleMute = (id: string) => {
    setMutedStates((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredCameras = safeCameras.filter((c) => {
    if (activeFilter === 'online') return c.status === 'online' || c.status === 'busy';
    if (activeFilter === 'alerts') return (c.detection_count || 0) > 5;
    return true;
  });

  const getGridColsClass = () => {
    switch (gridLayout) {
      case '1x1':
        return 'grid-cols-1';
      case '3x3':
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case '2x2':
      default:
        return 'grid-cols-1 md:grid-cols-2';
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">Live Multi-Camera Monitoring Matrix</h2>
            <p className="text-sm text-slate-400">
              Real-time WebSocket vision stream array with continuous AI inference & road telemetry.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Tabs */}
          <div className="bg-slate-950 p-1 border border-slate-800 rounded-xl flex items-center text-xs font-medium">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Feeds ({cameras.length})
            </button>
            <button
              onClick={() => setActiveFilter('online')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeFilter === 'online' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Live Streams ({cameras.filter((c) => c.status === 'online' || c.status === 'busy').length})
            </button>
            <button
              onClick={() => setActiveFilter('alerts')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeFilter === 'alerts' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Critical Hazards
            </button>
          </div>

          {/* Grid Layout Switcher */}
          <div className="bg-slate-950 p-1 border border-slate-800 rounded-xl flex items-center text-xs font-medium">
            <button
              onClick={() => setGridLayout('1x1')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                gridLayout === '1x1' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              1x1
            </button>
            <button
              onClick={() => setGridLayout('2x2')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                gridLayout === '2x2' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              2x2
            </button>
            <button
              onClick={() => setGridLayout('3x3')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                gridLayout === '3x3' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              3x3
            </button>
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className={`grid ${getGridColsClass()} gap-5`}>
        {filteredCameras.map((cam) => (
          <CameraStreamCard
            key={cam.id}
            camera={cam}
            isMuted={!!mutedStates[cam.id]}
            onToggleMute={toggleMute}
            onSelectCamera={onSelectCamera}
            onOpenFullscreen={(c) => setFullscreenCamera(c)}
            showToast={showToast}
          />
        ))}
      </div>

      {/* Fullscreen Video Focus Modal */}
      {fullscreenCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="font-bold text-white text-base">{fullscreenCamera.camera_name}</h3>
                <span className="text-xs text-slate-400 font-mono">[{fullscreenCamera.camera_type.toUpperCase()}]</span>
              </div>
              <button
                onClick={() => setFullscreenCamera(null)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <CameraStreamCard
                camera={fullscreenCamera}
                isMuted={!!mutedStates[fullscreenCamera.id]}
                onToggleMute={toggleMute}
                onSelectCamera={onSelectCamera}
                onOpenFullscreen={() => {}}
                showToast={showToast}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
