import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Activity, 
  Clock, 
  Zap, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Crosshair, 
  BarChart2, 
  Play, 
  Pause,
  Square,
  Camera,
  RefreshCw,
  ArrowRight,
  MapPin,
  Layers,
  Sparkles,
  List,
  Car,
  FileText,
  Download,
  FileCheck,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Info,
  X,
  Target
} from 'lucide-react';
import L from 'leaflet';
import { InspectionVideo } from '../types/inspection';
import { videoService } from '../services/videoService';
import { apiClient } from '../services/apiClient';
import { DetectionSvgOverlay, OverlayDetection } from './DetectionSvgOverlay';

interface LiveDetectionItem {
  id: string;
  category: string;
  confidence: number;
  severity: string;
  frame_number: number;
  timestamp: number;
  latitude?: number;
  longitude?: number;
  image_url?: string;
}

interface LiveProcessingProps {
  videoId: string;
  video?: InspectionVideo | null;
  onNavigate: (tab: string) => void;
  onProcessingComplete?: (updatedVideo: InspectionVideo) => void;
}

export const LiveProcessing: React.FC<LiveProcessingProps> = ({
  videoId,
  video,
  onNavigate,
  onProcessingComplete
}) => {
  // Stream Source Selection: 'server_ws' or 'hardware_webcam'
  const [streamSource, setStreamSource] = useState<'server_ws' | 'hardware_webcam'>('server_ws');

  const [currentFrameUrl, setCurrentFrameUrl] = useState<string | null>(null);
  const [frameNumber, setFrameNumber] = useState<number>(0);
  const [totalFrames, setTotalFrames] = useState<number>(video?.total_frames || 0);
  const [timestamp, setTimestamp] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Connecting to Live AI Processing Stream...');
  const [activeStage, setActiveStage] = useState<string>('Initializing Models');
  const [roadHealth, setRoadHealth] = useState<number>(100);
  const [etaSeconds, setEtaSeconds] = useState<number>(0);

  // Playback & Pause/Resume State
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // Category counts
  const [potholeCount, setPotholeCount] = useState<number>(0);
  const [crackCount, setCrackCount] = useState<number>(0);
  const [brokenRoadCount, setBrokenRoadCount] = useState<number>(0);
  const [missingAsphaltCount, setMissingAsphaltCount] = useState<number>(0);
  const [roadDamageCount, setRoadDamageCount] = useState<number>(0);
  const [vehicleCount, setVehicleCount] = useState<number>(0);
  const [helmetCount, setHelmetCount] = useState<number>(0);
  const [numberPlateCount, setNumberPlateCount] = useState<number>(0);
  const [helmetViolationsCount, setHelmetViolationsCount] = useState<number>(0);

  // Hardware Webcam State
  const [webcamActive, setWebcamActive] = useState<boolean>(false);
  const [webcamDevices, setWebcamDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [isConnectingWebcam, setIsConnectingWebcam] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(0);

  // Timeline detections
  const [timelineEvents, setTimelineEvents] = useState<LiveDetectionItem[]>([]);
  const [selectedTimelineEvent, setSelectedTimelineEvent] = useState<LiveDetectionItem | null>(null);

  // Performance telemetry
  const [fps, setFps] = useState<number>(30);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // SVG-based Bounding Box Overlay State
  const [currentFrameDetections, setCurrentFrameDetections] = useState<OverlayDetection[]>([]);
  const [frameWidth, setFrameWidth] = useState<number>(1280);
  const [frameHeight, setFrameHeight] = useState<number>(720);
  const [enableSvgOverlay, setEnableSvgOverlay] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showConfidence, setShowConfidence] = useState<boolean>(true);
  const [showSeverity, setShowSeverity] = useState<boolean>(true);
  const [showCornerBrackets, setShowCornerBrackets] = useState<boolean>(true);
  const [showFill, setShowFill] = useState<boolean>(true);
  const [overlayCategoryFilter, setOverlayCategoryFilter] = useState<string>('all');
  const [minConfidenceThreshold, setMinConfidenceThreshold] = useState<number>(0.25);
  const [selectedOverlayDetection, setSelectedOverlayDetection] = useState<OverlayDetection | null>(null);
  const [showOverlayControls, setShowOverlayControls] = useState<boolean>(true);

  // Active Session Guard Ref
  const activeSessionIdRef = useRef<string | null>(null);

  // GPS state
  const [currentGps, setCurrentGps] = useState<{ lat: number; lng: number }>({ lat: 28.4595, lng: 77.0266 });
  const routePointsRef = useRef<[number, number][]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const webcamIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const damageLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const frameTimesRef = useRef<number[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getFullImageUrl = (path: string): string => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
    const base = apiClient.defaults.baseURL || `${window.location.protocol}//${window.location.host}`;
    const host = base.replace(/\/api\/v1\/?$/, '');
    return `${host}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  // 1. Elapsed timer and Session Reset on videoId change
  useEffect(() => {
    // Reset all state and session guard when videoId changes
    activeSessionIdRef.current = null;
    setCurrentFrameUrl(null);
    setFrameNumber(0);
    setTotalFrames(video?.total_frames || 0);
    setTimestamp(0);
    setProgress(0);
    setElapsedSeconds(0);
    setEtaSeconds(0);
    setIsPaused(false);
    setIsCompleted(false);
    setIsCancelling(false);
    setPotholeCount(0);
    setCrackCount(0);
    setBrokenRoadCount(0);
    setMissingAsphaltCount(0);
    setRoadDamageCount(0);
    setVehicleCount(0);
    setHelmetCount(0);
    setNumberPlateCount(0);
    setHelmetViolationsCount(0);
    setRoadHealth(100);
    setTimelineEvents([]);
    setSelectedTimelineEvent(null);
    setStatusText('Connecting to isolated live processing stream...');
    setActiveStage('Initializing Models');
    routePointsRef.current = [];
    frameTimesRef.current = [];

    if (damageLayerGroupRef.current) {
      damageLayerGroupRef.current.clearLayers();
    }
    if (polylineRef.current) {
      polylineRef.current.setLatLngs([]);
    }

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [videoId]);

  // 2. Hardware Webcam Device Enumeration
  const enumerateWebcamDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      setWebcamDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.warn('Could not enumerate webcam devices:', err);
    }
  };

  useEffect(() => {
    enumerateWebcamDevices();
  }, []);

  // 3. Start Hardware Webcam
  const startWebcamStream = async (deviceId?: string) => {
    setWebcamError(null);
    setIsConnectingWebcam(true);
    stopWebcamStream();

    try {
      const targetId = deviceId || selectedDeviceId;
      const constraints: MediaStreamConstraints = {
        video: targetId ? { deviceId: { exact: targetId }, width: { ideal: 1280 }, height: { ideal: 720 } } : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        await webcamVideoRef.current.play();
      }

      setWebcamActive(true);
      setActiveStage('Detecting');
      setStatusText('Live Webcam Stream Active — Multi-Model Inference Running');

      // Refresh devices list to populate device labels
      enumerateWebcamDevices();

      // Start Frame Ingestion Interval (~20 FPS)
      if (webcamIntervalRef.current) clearInterval(webcamIntervalRef.current);
      webcamIntervalRef.current = setInterval(captureAndProcessWebcamFrame, 50);

    } catch (err: any) {
      console.error('Webcam stream error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setWebcamError('Camera access permission was denied. Please grant camera permission in browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setWebcamError('No webcam device detected. Please connect a USB webcam or enable your laptop camera.');
      } else {
        setWebcamError(`Unable to start camera: ${err.message || 'Hardware device error'}`);
      }
      setWebcamActive(false);
    } finally {
      setIsConnectingWebcam(false);
    }
  };

  // 4. Stop Hardware Webcam Cleanly
  const stopWebcamStream = () => {
    if (webcamIntervalRef.current) {
      clearInterval(webcamIntervalRef.current);
      webcamIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (webcamVideoRef.current) {
      webcamVideoRef.current.srcObject = null;
    }
    setWebcamActive(false);
    setStatusText('Webcam Stream Stopped Cleanly');
  };

  // 5. Capture & Post Frame to Multi-Model Inference API
  const captureAndProcessWebcamFrame = async () => {
    const videoElem = webcamVideoRef.current;
    const canvasElem = captureCanvasRef.current;
    if (!videoElem || !canvasElem || videoElem.readyState < 2) return;

    canvasElem.width = videoElem.videoWidth || 640;
    canvasElem.height = videoElem.videoHeight || 480;
    const ctx = canvasElem.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoElem, 0, 0, canvasElem.width, canvasElem.height);
    const base64Data = canvasElem.toDataURL('image/jpeg', 0.7);

    try {
      const response = await apiClient.post('/cameras/detect-frame', {
        image_base64: base64Data,
        camera_id: selectedDeviceId || 'webcam'
      });

      const data = response.data;
      if (data.image_base64) setCurrentFrameUrl(data.image_base64);
      if (data.fps) setFps(data.fps);
      if (data.latency_ms) setLatencyMs(data.latency_ms);
      if (data.road_damage_count !== undefined) setRoadDamageCount(data.road_damage_count);
      if (data.vehicle_count !== undefined) setVehicleCount(data.vehicle_count);
      if (data.number_plate_count !== undefined) setNumberPlateCount(data.number_plate_count);

      if (Array.isArray(data.detections)) {
        setCurrentFrameDetections(data.detections);
      }

      if (data.damage_by_type) {
        setPotholeCount(data.damage_by_type.pothole || 0);
        setCrackCount(
          (data.damage_by_type.longitudinal_crack || 0) +
          (data.damage_by_type.transverse_crack || 0) +
          (data.damage_by_type.alligator_crack || 0)
        );
        setBrokenRoadCount(data.damage_by_type.broken_road || 0);
        setMissingAsphaltCount(data.damage_by_type.missing_asphalt || 0);
      }

      setFrameNumber((prev) => prev + 1);
      setTimestamp((prev) => prev + 0.05);

      if (Array.isArray(data.detections) && data.detections.length > 0) {
        const newItems: LiveDetectionItem[] = data.detections.map((d: any, idx: number) => ({
          id: `webcam-${Date.now()}-${idx}`,
          category: d.category || 'damage',
          confidence: d.confidence || 0.88,
          severity: d.type === 'damage' ? 'HIGH' : 'LOW',
          frame_number: frameNumber,
          timestamp: timestamp,
          image_url: data.image_base64
        }));
        setTimelineEvents((prev) => [...newItems, ...prev.slice(0, 49)]);
      }
    } catch (err) {
      console.warn('Webcam frame inference error:', err);
    }
  };

  // Clean up media streams on unmount
  useEffect(() => {
    return () => {
      stopWebcamStream();
    };
  }, []);

  // 6. Leaflet Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [28.4595, 77.0266],
      zoom: 16,
      zoomControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 19
    }).addTo(map);

    const polyline = L.polyline([], {
      color: '#2563EB',
      weight: 4,
      opacity: 0.85
    }).addTo(map);

    const vehicleIcon = L.divIcon({
      className: 'custom-vehicle-marker',
      html: `<div style="background-color: #34C759; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #FFFFFF; box-shadow: 0 0 10px #34C759;"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    const vehicleMarker = L.marker([28.4595, 77.0266], { icon: vehicleIcon }).addTo(map);
    const damageLayerGroup = L.layerGroup().addTo(map);

    mapRef.current = map;
    polylineRef.current = polyline;
    vehicleMarkerRef.current = vehicleMarker;
    damageLayerGroupRef.current = damageLayerGroup;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Helper for marker colors based on severity
  const getSeverityColor = (sev: string) => {
    const s = sev.toUpperCase();
    if (s.includes('CRITICAL')) return '#FF3B30'; // Red
    if (s.includes('HIGH')) return '#FF9500';     // Orange
    if (s.includes('MEDIUM')) return '#FFD60A';   // Yellow
    return '#34C759';                             // Green (Low)
  };

  // 7. Pause / Resume / Cancel Controls
  const handleTogglePause = async () => {
    try {
      if (!isPaused) {
        await videoService.pauseProcessingPipeline();
        setIsPaused(true);
        setStatusText('Inference pipeline paused. Frames held.');
      } else {
        await videoService.resumeProcessingPipeline();
        setIsPaused(false);
        setStatusText('Inference pipeline resumed. Processing live frames...');
      }
    } catch (err) {
      console.warn('Failed to toggle pause:', err);
    }
  };

  const handleCancelProcessing = async () => {
    setIsCancelling(true);
    try {
      await videoService.cancelProcessingPipeline();
      setStatusText('AI detection session cancelled by user.');
      setIsPaused(false);
      setProgress(0);
    } catch (err) {
      console.warn('Failed to cancel processing:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  // 8. WebSocket Realtime Engine
  useEffect(() => {
    const clientId = `live-${videoId}-${Date.now()}`;

    const ws = videoService.connectWebSocket(
      clientId,
      (msg: any) => {
        // Strict Video ID filter: discard messages meant for any other video
        if (msg.video_id && msg.video_id !== videoId) {
          return;
        }

        // Handle backend session reset message
        if (msg.type === 'session_reset') {
          if (!msg.video_id || msg.video_id === videoId) {
            if (msg.session_id) {
              activeSessionIdRef.current = msg.session_id;
            }
            setCurrentFrameUrl(null);
            setCurrentFrameDetections([]);
            setSelectedOverlayDetection(null);
            setFrameNumber(0);
            setProgress(0);
            setPotholeCount(0);
            setCrackCount(0);
            setBrokenRoadCount(0);
            setMissingAsphaltCount(0);
            setRoadDamageCount(0);
            setVehicleCount(0);
            setHelmetCount(0);
            setNumberPlateCount(0);
            setHelmetViolationsCount(0);
            setTimelineEvents([]);
            setSelectedTimelineEvent(null);
            routePointsRef.current = [];
            damageLayerGroupRef.current?.clearLayers();
            polylineRef.current?.setLatLngs([]);
            setStatusText(msg.message || 'Fresh detection session initialized.');
            setActiveStage('Initializing Models');
          }
          return;
        }

        // Strict Session ID validation: if session_id is present, ensure it matches active session
        if (msg.session_id) {
          if (!activeSessionIdRef.current) {
            activeSessionIdRef.current = msg.session_id;
          } else if (activeSessionIdRef.current !== msg.session_id) {
            // Superseded or stale frame from older session: drop immediately
            return;
          }
        }

        // Calculate live FPS
        const now = performance.now();
        frameTimesRef.current.push(now);
        if (frameTimesRef.current.length > 10) frameTimesRef.current.shift();
        if (frameTimesRef.current.length > 1) {
          const delta = (now - frameTimesRef.current[0]) / (frameTimesRef.current.length - 1);
          if (delta > 0) setFps(Math.round(1000 / delta));
        }

        // Status / Stage / Progress updates
        if (msg.stage) {
          setActiveStage(msg.stage);
          if (msg.stage === 'Paused') setIsPaused(true);
          if (msg.stage === 'Detecting') setIsPaused(false);
        }
        if (msg.message) {
          setStatusText(msg.message);
        }
        if (msg.progress !== undefined) {
          setProgress(msg.progress);
        }
        if (msg.total_frames) {
          setTotalFrames(msg.total_frames);
        }
        if (msg.eta_seconds !== undefined) {
          setEtaSeconds(msg.eta_seconds);
        }
        if (msg.road_health !== undefined) {
          setRoadHealth(msg.road_health);
        }

        // Frame Payload Processing
        if (msg.type === 'frame' || msg.image_url || msg.image_data || msg.image_base64) {
          setActiveStage('Detecting');
          let frameImgUrl = '';
          if (msg.image_data) {
            frameImgUrl = msg.image_data.startsWith('data:') ? msg.image_data : `data:image/jpeg;base64,${msg.image_data}`;
          } else if (msg.image_base64) {
            frameImgUrl = msg.image_base64.startsWith('data:') ? msg.image_base64 : `data:image/jpeg;base64,${msg.image_base64}`;
          } else if (msg.image_url) {
            frameImgUrl = getFullImageUrl(msg.image_url);
          }

          if (frameImgUrl) {
            setCurrentFrameUrl(frameImgUrl);
          }
          if (msg.frame_number) {
            setFrameNumber(msg.frame_number);
          }
          if (msg.timestamp !== undefined) {
            setTimestamp(msg.timestamp);
          }
          if (msg.frame_width) {
            setFrameWidth(msg.frame_width);
          }
          if (msg.frame_height) {
            setFrameHeight(msg.frame_height);
          }
          if (Array.isArray(msg.detections)) {
            setCurrentFrameDetections(msg.detections);
          }

          // Live GPS update
          let frameLat = 28.4595 + (msg.frame_number * 0.00008);
          let frameLng = 77.0266 + (msg.frame_number * 0.00009);

          if (msg.gps && msg.gps.latitude && msg.gps.longitude) {
            frameLat = msg.gps.latitude;
            frameLng = msg.gps.longitude;
          }

          setCurrentGps({ lat: frameLat, lng: frameLng });
          routePointsRef.current.push([frameLat, frameLng]);

          if (polylineRef.current) {
            polylineRef.current.setLatLngs(routePointsRef.current);
          }
          if (vehicleMarkerRef.current) {
            vehicleMarkerRef.current.setLatLng([frameLat, frameLng]);
          }
          if (mapRef.current && routePointsRef.current.length % 5 === 0) {
            mapRef.current.panTo([frameLat, frameLng], { animate: true });
          }

          // Authoritative counts from backend if present
          if (msg.counts) {
            if (typeof msg.counts.pothole === 'number') setPotholeCount(msg.counts.pothole);
            if (typeof msg.counts.crack === 'number') setCrackCount(msg.counts.crack);
            if (typeof msg.counts.broken_road === 'number') setBrokenRoadCount(msg.counts.broken_road);
            if (typeof msg.counts.missing_asphalt === 'number') setMissingAsphaltCount(msg.counts.missing_asphalt);
            if (typeof msg.counts.road_damage === 'number') setRoadDamageCount(msg.counts.road_damage);
            if (typeof msg.counts.vehicle === 'number') setVehicleCount(msg.counts.vehicle);
            if (typeof msg.counts.helmet === 'number') setHelmetCount(msg.counts.helmet);
            if (typeof msg.counts.number_plate === 'number') setNumberPlateCount(msg.counts.number_plate);
            if (typeof msg.counts.helmet_violations === 'number') setHelmetViolationsCount(msg.counts.helmet_violations);
          }

          // Handle incoming detections on frame
          if (Array.isArray(msg.detections) && msg.detections.length > 0) {
            const newItems: LiveDetectionItem[] = msg.detections.map((d: any, idx: number) => {
              const cat = (d.category || 'damage').toLowerCase();
              if (!msg.counts) {
                if (cat.includes('pothole')) setPotholeCount((c) => c + 1);
                else if (cat.includes('crack')) setCrackCount((c) => c + 1);
                else if (cat.includes('broken')) setBrokenRoadCount((c) => c + 1);
                else if (cat.includes('asphalt')) setMissingAsphaltCount((c) => c + 1);
                if (cat.includes('car') || cat.includes('truck') || cat.includes('vehicle')) setVehicleCount((c) => c + 1);
                if (cat.includes('helmet')) setHelmetCount((c) => c + 1);
                if (cat.includes('plate')) setNumberPlateCount((c) => c + 1);
              }

              const sev = d.severity || 'HIGH';
              const markerColor = getSeverityColor(sev);

              // Add damage marker to map
              if (damageLayerGroupRef.current) {
                const markerIcon = L.divIcon({
                  className: 'damage-pin',
                  html: `<div style="background-color: ${markerColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #FFFFFF; box-shadow: 0 0 8px ${markerColor};"></div>`,
                  iconSize: [12, 12],
                  iconAnchor: [6, 6]
                });

                const m = L.marker([frameLat, frameLng], { icon: markerIcon });
                m.bindPopup(`
                  <div style="font-family: monospace; font-size: 11px; color: #111;">
                    <strong>${d.category.toUpperCase()}</strong><br/>
                    Severity: ${sev}<br/>
                    Conf: ${(d.confidence * 100).toFixed(0)}%<br/>
                    Frame #${msg.frame_number} @ ${msg.timestamp.toFixed(1)}s
                  </div>
                `);
                damageLayerGroupRef.current.addLayer(m);
              }

              return {
                id: `det-${msg.frame_number}-${idx}-${Date.now()}`,
                category: d.category || 'Pothole',
                confidence: d.confidence || 0.85,
                severity: sev,
                frame_number: msg.frame_number || 0,
                timestamp: msg.timestamp || 0,
                latitude: frameLat,
                longitude: frameLng,
                image_url: frameImgUrl
              };
            });

            setTimelineEvents((prev) => [...newItems, ...prev.slice(0, 49)]);
          }
        }

        // Completion Handling
        if (msg.type === 'finished' || msg.progress === 100 || msg.stage === 'Finished' || msg.stage === 'Completed') {
          setProgress(100);
          setIsCompleted(true);
          setActiveStage('Completed');
          setStatusText('YOLO Real-Time Detection Completed! Output video and analytics saved.');

          videoService.getVideoDetails(videoId).then((details) => {
            if (onProcessingComplete) onProcessingComplete(details);
          }).catch(() => {});
        }
      },
      (err) => {
        console.warn('Live Processing WS Connection Notice:', err);
        setStatusText('Inference pipeline running. Receiving live YOLO video stream...');
      }
    );

    wsRef.current = ws;

    // Fallback polling interval to guarantee status updates if WebSocket misses a packet
    const pollInterval = setInterval(async () => {
      if (!videoId || isCompleted) return;
      try {
        const details = await videoService.getVideoDetails(videoId);
        if (details.status === 'completed') {
          setProgress(100);
          setIsCompleted(true);
          setActiveStage('Completed');
          setStatusText('YOLO Frame Processing Completed!');
          clearInterval(pollInterval);
          if (onProcessingComplete) onProcessingComplete(details);
        } else if (details.status === 'failed') {
          setStatusText('Video processing encountered an error.');
          clearInterval(pollInterval);
        } else {
          // Check global progress endpoint if available
          const statusRes = await apiClient.get('/process/status').catch(() => null);
          if (statusRes && statusRes.data && statusRes.data.is_processing) {
            setProgress(statusRes.data.progress_percent || 50);
            if (statusRes.data.status) setStatusText(statusRes.data.status);
            if (statusRes.data.current_fps) setFps(statusRes.data.current_fps);
          }
        }
      } catch (pollErr) {
        // Silent catch for polling
      }
    }, 2500);

    return () => {
      if (wsRef.current) wsRef.current.close();
      clearInterval(pollInterval);
    };
  }, [videoId, isCompleted]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalDetectionsCount = potholeCount + crackCount + brokenRoadCount + missingAsphaltCount;
  const stagesList = ['Uploading', 'Initializing Models', 'Detecting', 'Saving Output', 'Completed'];

  const getStageIndex = (st: string) => {
    const norm = st.toLowerCase();
    if (norm.includes('upload')) return 0;
    if (norm.includes('init') || norm.includes('model') || norm.includes('extract')) return 1;
    if (norm.includes('detect') || norm.includes('yolo') || norm.includes('run') || norm.includes('process')) return 2;
    if (norm.includes('sav') || norm.includes('report') || norm.includes('generat')) return 3;
    if (norm.includes('complete') || norm.includes('finish')) return 4;
    return 2;
  };

  const currentStageIdx = getStageIndex(activeStage);

  return (
    <div className="space-y-6 text-[#E0E0E0] font-mono">
      {/* Hidden Video and Canvas elements for local webcam capture */}
      <video ref={webcamVideoRef} autoPlay playsInline muted style={{ display: 'none' }} />
      <canvas ref={captureCanvasRef} style={{ display: 'none' }} />

      {/* Stream Source Mode Selector & Control Bar */}
      <div className="bg-[#141414] border border-[#2A2A2A] p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setStreamSource('server_ws');
              stopWebcamStream();
            }}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 transition-all ${
              streamSource === 'server_ws'
                ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                : 'bg-[#1A1A1A] text-[#888] border-[#333] hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Uploaded Video Realtime Stream</span>
          </button>

          <button
            onClick={() => {
              setStreamSource('hardware_webcam');
              enumerateWebcamDevices();
            }}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 transition-all ${
              streamSource === 'hardware_webcam'
                ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                : 'bg-[#1A1A1A] text-[#888] border-[#333] hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Live Hardware CCTV / Webcam</span>
          </button>
        </div>

        {streamSource === 'hardware_webcam' && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Device Selector */}
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                if (webcamActive) startWebcamStream(e.target.value);
              }}
              className="bg-[#1A1A1A] text-white text-xs border border-[#333] px-2.5 py-1.5 focus:outline-none focus:border-[#2563EB]"
            >
              {webcamDevices.length === 0 ? (
                <option value="">Default Camera / Laptop Webcam</option>
              ) : (
                webcamDevices.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {dev.label || `Camera Device #${idx + 1}`}
                  </option>
                ))
              )}
            </select>

            {/* Start / Stop Toggle */}
            {!webcamActive ? (
              <button
                onClick={() => startWebcamStream()}
                disabled={isConnectingWebcam}
                className="px-3.5 py-1.5 bg-[#34C759] hover:bg-emerald-600 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 border border-emerald-400"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>{isConnectingWebcam ? 'Connecting...' : 'Start Camera'}</span>
              </button>
            ) : (
              <button
                onClick={stopWebcamStream}
                className="px-3.5 py-1.5 bg-[#FF3B30] hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 border border-red-400"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Stop Camera</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pipeline Stage Progress Breadcrumbs */}
      <div className="bg-[#141414] border border-[#2A2A2A] p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-[#888] uppercase text-[11px] font-bold">
          <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>Pipeline Stage:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {stagesList.map((stg, idx) => {
            const isDone = idx < currentStageIdx;
            const isCurrent = idx === currentStageIdx;
            return (
              <div key={stg} className="flex items-center gap-1.5">
                <span
                  className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${
                    isCurrent
                      ? 'bg-[#2563EB] text-white border-blue-400 shadow-[0_0_8px_rgba(37,99,235,0.4)] animate-pulse'
                      : isDone
                      ? 'bg-[#34C759]/20 text-[#34C759] border-emerald-600/40'
                      : 'bg-[#1A1A1A] text-[#666] border-[#333]'
                  }`}
                >
                  {isDone && <CheckCircle2 className="w-3 h-3" />}
                  {stg}
                </span>
                {idx < stagesList.length - 1 && <span className="text-[#444]">→</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Webcam Error Warning Banner */}
      {webcamError && (
        <div className="p-3 bg-[#FF3B30]/15 border border-[#FF3B30] text-xs text-[#FF3B30] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#FF3B30] flex-shrink-0" />
            <span>{webcamError}</span>
          </div>
          <button
            onClick={() => startWebcamStream()}
            className="px-2.5 py-1 bg-[#FF3B30] text-white text-[10px] font-bold uppercase hover:bg-red-600"
          >
            Retry Camera
          </button>
        </div>
      )}

      {/* Top Header Navigation & Status Bar */}
      <div className="bg-[#141414] border border-[#2A2A2A] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#2563EB] uppercase tracking-widest mb-1">
            <Radio className="w-4 h-4 text-[#FF3B30] animate-pulse" />
            <span className="font-bold">
              {streamSource === 'hardware_webcam' ? 'REALTIME WEBCAM MULTI-MODEL INFERENCE' : 'REALTIME FRAME-BY-FRAME YOLO DETECTION'}
            </span>
            <span className={`text-white text-[9px] px-1.5 py-0.5 rounded font-bold ${isPaused ? 'bg-[#FF9500]' : 'bg-[#FF3B30] animate-ping'}`}>
              {isPaused ? 'PAUSED' : 'LIVE'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-white uppercase">{video?.title || `Inspection Video #${videoId}`}</h2>
          <p className="text-xs text-[#888]">{statusText}</p>
        </div>

        {/* Action Controls: Pause, Resume, Stop, Results */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#1A1A1A] border border-[#333] px-3 py-1.5 text-right">
            <p className="text-[9px] text-[#888] uppercase">Inference Speed</p>
            <p className="text-xs font-bold text-[#34C759]">{fps} FPS {latencyMs > 0 ? `// ${latencyMs}ms` : '// IN_MEMORY'}</p>
          </div>
          <div className="bg-[#1A1A1A] border border-[#333] px-3 py-1.5 text-right">
            <p className="text-[9px] text-[#888] uppercase">Elapsed Time</p>
            <p className="text-xs font-bold text-[#FFD60A]">{formatTime(elapsedSeconds)}</p>
          </div>

          {/* Pause / Resume Control */}
          <button
            onClick={handleTogglePause}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 transition-all font-mono ${
              isPaused
                ? 'bg-[#34C759] hover:bg-emerald-600 text-black border-emerald-400'
                : 'bg-[#1A1A1A] hover:bg-[#252525] text-[#FFD60A] border-[#FFD60A]/40'
            }`}
            title={isPaused ? 'Resume detection stream' : 'Pause detection stream'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          {/* Cancel / Stop Control */}
          <button
            onClick={handleCancelProcessing}
            disabled={isCancelling}
            className="px-3 py-2 bg-[#1A1A1A] hover:bg-red-950/40 text-[#FF3B30] hover:text-red-400 text-xs font-bold uppercase tracking-wider border border-[#333] hover:border-red-500/50 flex items-center gap-1.5 transition-all font-mono"
            title="Halt current inference loop and cancel task"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>{isCancelling ? 'Stopping...' : 'Cancel'}</span>
          </button>

          <button
            onClick={() => onNavigate('results')}
            className="px-4 py-2 bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider border border-blue-400 flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(37,99,235,0.4)] font-mono"
          >
            <span>View Full Results</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Completion Banner with Actions */}
      {isCompleted && (
        <div className="bg-gradient-to-r from-emerald-950/50 via-[#141414] to-blue-950/50 border-2 border-[#34C759] p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_20px_rgba(52,199,89,0.2)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#34C759]/20 border border-[#34C759] flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-[#34C759]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Video Detection Complete!</h3>
              <p className="text-xs text-[#AAA]">All frames processed, annotated MP4 video generated, and analytics persisted to database.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/processed/processed_${videoId}.mp4`}
              download={`processed_${videoId}.mp4`}
              className="px-3.5 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white text-xs font-bold uppercase tracking-wider border border-[#444] flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-[#34C759]" />
              <span>Download Processed Video</span>
            </a>
            <button
              onClick={() => onNavigate('report')}
              className="px-3.5 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white text-xs font-bold uppercase tracking-wider border border-[#444] flex items-center gap-1.5 transition-all"
            >
              <FileCheck className="w-3.5 h-3.5 text-[#FFD60A]" />
              <span>Detection Report</span>
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-4 py-2 bg-[#34C759] hover:bg-emerald-600 text-black text-xs font-bold uppercase tracking-wider font-bold border border-emerald-400 flex items-center gap-1.5 transition-all"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Analytics Summary</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Center Area: Large AI Video Player & Right Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Large AI Video Player Canvas */}
        <div className="lg:col-span-8 bg-black border-2 border-[#2563EB] relative flex flex-col justify-between overflow-hidden shadow-[0_0_25px_rgba(37,99,235,0.2)]">
          {/* Frame Info Overlay */}
          <div className="bg-[#141414]/90 backdrop-blur-md p-3 border-b border-[#2A2A2A] flex items-center justify-between text-xs z-10">
            <div className="flex items-center space-x-3">
              <span className="bg-[#FF3B30] text-white px-2 py-0.5 font-bold uppercase text-[10px] flex items-center gap-1">
                <Crosshair className="w-3 h-3" />
                FRAME_{frameNumber || 1} {totalFrames > 0 ? `/ ${totalFrames}` : ''}
              </span>
              <span className="text-[#AAA] font-mono">TIMESTAMP: {timestamp.toFixed(2)}s</span>
            </div>
            <div className="flex items-center space-x-3 text-[11px]">
              <span className={`font-bold ${isPaused ? 'text-[#FF9500]' : 'text-[#34C759]'}`}>
                {isPaused ? 'STATUS: PAUSED' : 'INFERENCE: ACTIVE'}
              </span>
              <span className="text-[#666]">|</span>
              <span className="text-[#FF9500] font-bold">TOTAL DETECTIONS: {totalDetectionsCount + vehicleCount + numberPlateCount}</span>
            </div>
          </div>

          {/* Main Frame Viewport with SVG Overlay */}
          <div className="relative aspect-video bg-[#080808] flex items-center justify-center overflow-hidden group">
            {currentFrameUrl ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img 
                  src={currentFrameUrl} 
                  alt="Live AI Frame Stream"
                  className="w-full h-full object-contain select-none"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                      setFrameWidth(img.naturalWidth);
                      setFrameHeight(img.naturalHeight);
                    }
                  }}
                />

                {/* SVG-based Dynamic Detection Overlay */}
                {enableSvgOverlay && currentFrameDetections.length > 0 && (
                  <DetectionSvgOverlay
                    detections={currentFrameDetections}
                    frameWidth={frameWidth}
                    frameHeight={frameHeight}
                    showLabels={showLabels}
                    showConfidence={showConfidence}
                    showSeverity={showSeverity}
                    showCornerBrackets={showCornerBrackets}
                    showFill={showFill}
                    filterCategory={overlayCategoryFilter}
                    minConfidence={minConfidenceThreshold}
                    selectedDetectionId={selectedOverlayDetection?.id || null}
                    onSelectDetection={(det) => setSelectedOverlayDetection(det)}
                  />
                )}

                {/* Active Detection Inspector Overlay Pill */}
                {selectedOverlayDetection && (
                  <div className="absolute bottom-3 left-3 right-3 bg-[#111111]/95 backdrop-blur-md border border-[#2563EB] p-2.5 z-30 shadow-2xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-[#2563EB]/20 border border-[#2563EB] flex items-center justify-center text-[#2563EB] font-bold">
                        <Target className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white uppercase tracking-wider font-mono">
                            {selectedOverlayDetection.category?.toUpperCase() || 'DETECTION'}
                          </span>
                          <span className="bg-[#2563EB] text-white text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                            {Math.round((selectedOverlayDetection.confidence || 0.85) * 100)}% CONF
                          </span>
                          {selectedOverlayDetection.severity && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/40">
                              {selectedOverlayDetection.severity.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#888] font-mono mt-0.5">
                          BBOX: [{Math.round(selectedOverlayDetection.x_min ?? (selectedOverlayDetection.box ? selectedOverlayDetection.box[0] : 0))}, {Math.round(selectedOverlayDetection.y_min ?? (selectedOverlayDetection.box ? selectedOverlayDetection.box[1] : 0))}, {Math.round(selectedOverlayDetection.x_max ?? (selectedOverlayDetection.box ? selectedOverlayDetection.box[2] : 0))}, {Math.round(selectedOverlayDetection.y_max ?? (selectedOverlayDetection.box ? selectedOverlayDetection.box[3] : 0))}]
                          {selectedOverlayDetection.width ? ` // DIM: ${Math.round(selectedOverlayDetection.width)}×${Math.round(selectedOverlayDetection.height || 0)}px` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedOverlayDetection(null)}
                      className="p-1 text-[#888] hover:text-white hover:bg-[#222] transition-all rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                <Activity className="w-12 h-12 text-[#2563EB] animate-spin" />
                <p className="text-sm font-bold text-white uppercase">Awaiting YOLO Model Live Feed...</p>
                <p className="text-xs text-[#666]">Streaming frame detections over WebSocket in real time</p>
              </div>
            )}

            {/* Reticle Corner Graphics */}
            <div className="absolute top-4 left-4 border-l-2 border-t-2 border-[#FF3B30] w-6 h-6 pointer-events-none opacity-80 z-20" />
            <div className="absolute top-4 right-4 border-r-2 border-t-2 border-[#FF3B30] w-6 h-6 pointer-events-none opacity-80 z-20" />
            <div className="absolute bottom-4 left-4 border-l-2 border-b-2 border-[#FF3B30] w-6 h-6 pointer-events-none opacity-80 z-20" />
            <div className="absolute bottom-4 right-4 border-r-2 border-b-2 border-[#FF3B30] w-6 h-6 pointer-events-none opacity-80 z-20" />
          </div>

          {/* SVG Overlay HUD Interactive Controls Bar */}
          <div className="bg-[#101010] border-t border-[#222] p-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            {/* Left: SVG Overlay Master Toggle & Category Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setEnableSvgOverlay(!enableSvgOverlay)}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider border flex items-center gap-1.5 transition-all font-mono ${
                  enableSvgOverlay
                    ? 'bg-[#2563EB]/20 text-[#60A5FA] border-[#2563EB] shadow-[0_0_8px_rgba(37,99,235,0.3)]'
                    : 'bg-[#1A1A1A] text-[#666] border-[#333] hover:text-[#AAA]'
                }`}
                title="Toggle real-time SVG detection bounding box overlay"
              >
                {enableSvgOverlay ? <Eye className="w-3.5 h-3.5 text-[#60A5FA]" /> : <EyeOff className="w-3.5 h-3.5 text-[#666]" />}
                <span>SVG HUD {enableSvgOverlay ? 'ON' : 'OFF'}</span>
              </button>

              <div className="h-4 w-px bg-[#2A2A2A] mx-0.5" />

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1 bg-[#161616] p-0.5 border border-[#2A2A2A] rounded">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'damage', label: 'Damage', color: 'text-[#FF3B30]' },
                  { id: 'vehicle', label: 'Vehicles', color: 'text-[#00C2FF]' },
                  { id: 'helmet', label: 'Helmets', color: 'text-[#FFD60A]' },
                  { id: 'plate', label: 'Plates', color: 'text-[#34C759]' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setOverlayCategoryFilter(f.id)}
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded transition-all ${
                      overlayCategoryFilter === f.id
                        ? 'bg-[#2563EB] text-white shadow'
                        : `text-[#888] hover:text-white ${f.color || ''}`
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Graphic Elements Toggles & Confidence Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowLabels(!showLabels)}
                className={`px-2 py-0.5 text-[10px] font-mono font-bold border transition-all ${
                  showLabels ? 'bg-[#1E293B] text-blue-300 border-blue-500/40' : 'bg-[#141414] text-[#666] border-[#2A2A2A]'
                }`}
                title="Toggle Category & Confidence Labels"
              >
                Labels {showLabels ? '✓' : '✗'}
              </button>

              <button
                onClick={() => setShowCornerBrackets(!showCornerBrackets)}
                className={`px-2 py-0.5 text-[10px] font-mono font-bold border transition-all ${
                  showCornerBrackets ? 'bg-[#1E293B] text-blue-300 border-blue-500/40' : 'bg-[#141414] text-[#666] border-[#2A2A2A]'
                }`}
                title="Toggle HUD Reticle Corner Brackets"
              >
                Brackets {showCornerBrackets ? '✓' : '✗'}
              </button>

              <button
                onClick={() => setShowFill(!showFill)}
                className={`px-2 py-0.5 text-[10px] font-mono font-bold border transition-all ${
                  showFill ? 'bg-[#1E293B] text-blue-300 border-blue-500/40' : 'bg-[#141414] text-[#666] border-[#2A2A2A]'
                }`}
                title="Toggle Box Semi-Transparent Fill"
              >
                Fill {showFill ? '✓' : '✗'}
              </button>

              {/* Confidence Threshold Slider */}
              <div className="flex items-center gap-1.5 bg-[#161616] px-2 py-0.5 border border-[#2A2A2A] rounded">
                <span className="text-[9px] text-[#888] font-mono uppercase">Conf:</span>
                <input
                  type="range"
                  min="0.10"
                  max="0.90"
                  step="0.05"
                  value={minConfidenceThreshold}
                  onChange={(e) => setMinConfidenceThreshold(parseFloat(e.target.value))}
                  className="w-14 h-1.5 accent-[#2563EB] cursor-pointer"
                  title={`Minimum confidence threshold: ${(minConfidenceThreshold * 100).toFixed(0)}%`}
                />
                <span className="text-[10px] font-mono font-bold text-[#FFD60A] w-7 text-right">
                  {(minConfidenceThreshold * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar & ETA Footer */}
          <div className="bg-[#141414] border-t border-[#2A2A2A] p-3 space-y-2">
            <div className="flex flex-wrap justify-between items-center text-xs gap-2">
              <span className="text-white font-bold uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                Inspection Progress: {progress}% {totalFrames > 0 ? `(${frameNumber} / ${totalFrames} Frames)` : ''}
              </span>
              <div className="flex items-center gap-4 text-[#AAA]">
                {etaSeconds > 0 && !isCompleted && (
                  <span className="text-[#FFD60A] font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#FFD60A]" />
                    ETA: {formatTime(etaSeconds)}
                  </span>
                )}
                <span>GPS: {currentGps.lat.toFixed(4)}, {currentGps.lng.toFixed(4)}</span>
              </div>
            </div>
            <div className="w-full bg-[#222] h-2.5 overflow-hidden border border-[#333]">
              <div 
                className="bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#34C759] h-full transition-all duration-300 shadow-[0_0_10px_#2563EB]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Telemetry & Live Counters */}
        <div className="lg:col-span-4 space-y-6">
          {/* Category Summary Cards */}
          <div className="bg-[#141414] border border-[#2A2A2A] p-4 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-[#2A2A2A] pb-2">
              <span className="flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-[#FF3B30]" />
                Live Multi-Model Counters
              </span>
              <span className="text-[#2563EB] font-mono font-bold">{totalDetectionsCount + vehicleCount + numberPlateCount} TOTAL</span>
            </h3>

            {/* Damage Counters */}
            <div className="space-y-1">
              <p className="text-[10px] text-[#FF3B30] font-bold uppercase flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#FF3B30]" /> Road Damage Defects ({roadDamageCount || totalDetectionsCount})
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#1A1A1A] p-2 border border-[#2A2A2A] flex justify-between items-center">
                  <span className="text-[#AAA]">Potholes</span>
                  <span className="text-[#FF3B30] font-bold font-mono">{potholeCount}</span>
                </div>
                <div className="bg-[#1A1A1A] p-2 border border-[#2A2A2A] flex justify-between items-center">
                  <span className="text-[#AAA]">Cracks</span>
                  <span className="text-[#FF9500] font-bold font-mono">{crackCount}</span>
                </div>
                <div className="bg-[#1A1A1A] p-2 border border-[#2A2A2A] flex justify-between items-center">
                  <span className="text-[#AAA]">Broken Road</span>
                  <span className="text-[#FFD60A] font-bold font-mono">{brokenRoadCount}</span>
                </div>
                <div className="bg-[#1A1A1A] p-2 border border-[#2A2A2A] flex justify-between items-center">
                  <span className="text-[#AAA]">Missing Asphalt</span>
                  <span className="text-[#34C759] font-bold font-mono">{missingAsphaltCount}</span>
                </div>
              </div>
            </div>

            {/* Vehicles, Helmets & Plates Counters */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#2A2A2A]">
              <div className="bg-[#1A1A1A] p-2 border border-[#2563EB]/40 flex justify-between items-center">
                <span className="text-[#2563EB] font-bold text-[10px] uppercase flex items-center gap-1">
                  <Car className="w-3.5 h-3.5 text-[#2563EB]" />
                  Vehicles
                </span>
                <span className="text-[#2563EB] font-bold font-mono text-sm">{vehicleCount}</span>
              </div>

              <div className="bg-[#1A1A1A] p-2 border border-[#FFD60A]/40 flex justify-between items-center">
                <span className="text-[#FFD60A] font-bold text-[10px] uppercase flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-[#FFD60A]" />
                  Helmets
                </span>
                <span className="text-[#FFD60A] font-bold font-mono text-sm">{helmetCount}</span>
              </div>

              <div className="bg-[#1A1A1A] p-2 border border-[#34C759]/40 flex justify-between items-center">
                <span className="text-[#34C759] font-bold text-[10px] uppercase flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-[#34C759]" />
                  Plates
                </span>
                <span className="text-[#34C759] font-bold font-mono text-sm">{numberPlateCount}</span>
              </div>
            </div>

            {/* Violations Count Card */}
            {helmetViolationsCount > 0 && (
              <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/40 p-2.5 flex items-center justify-between">
                <span className="text-[#FF3B30] font-bold text-xs uppercase flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-[#FF3B30]" />
                  Safety Violations
                </span>
                <span className="text-[#FF3B30] font-mono font-bold text-sm">{helmetViolationsCount}</span>
              </div>
            )}

            {/* Road Health Score Gauge */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[#888] uppercase">Road Health Score</p>
                <p className="text-sm font-bold text-white">{roadHealth} / 100</p>
              </div>
              <div className={`px-2.5 py-1 text-[10px] font-bold uppercase border ${
                roadHealth > 75 ? 'bg-[#34C759]/20 text-[#34C759] border-[#34C759]' : 'bg-[#FF3B30]/20 text-[#FF3B30] border-[#FF3B30]'
              }`}>
                {roadHealth > 75 ? 'GOOD / FAIR' : 'CRITICAL DAMAGE'}
              </div>
            </div>
          </div>

          {/* Interactive Leaflet GPS Map */}
          <div className="bg-[#141414] border border-[#2A2A2A] p-4 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#2A2A2A] pb-2 flex justify-between items-center">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#2563EB]" />
                Live Vehicle GPS Map
              </span>
              <span className="text-[10px] text-[#34C759]">TRACKING</span>
            </h3>

            <div 
              ref={mapContainerRef} 
              className="w-full h-48 bg-[#0D0D0D] border border-[#2A2A2A] relative overflow-hidden" 
            />

            <div className="flex justify-between items-center text-[10px] text-[#888]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#FF3B30]" /> Critical
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#FF9500]" /> High
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#FFD60A]" /> Medium
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#34C759]" /> Vehicle Route
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Interactive Live Timeline */}
      <div className="bg-[#141414] border border-[#2A2A2A] p-4 space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#2A2A2A] pb-2 flex justify-between items-center">
          <span className="flex items-center gap-2">
            <List className="w-4 h-4 text-[#2563EB]" />
            Live Damage Detections Timeline ({timelineEvents.length} events)
          </span>
          <span className="text-[10px] text-[#AAA]">Click event to inspect frame</span>
        </h3>

        {timelineEvents.length === 0 ? (
          <div className="p-6 text-center text-[#666] text-xs">
            No road damage defects detected yet. Streaming inspection frames in real time...
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {timelineEvents.map((evt) => {
              const borderCol = getSeverityColor(evt.severity);
              return (
                <button
                  key={evt.id}
                  onClick={() => {
                    setSelectedTimelineEvent(evt);
                    if (evt.image_url) setCurrentFrameUrl(evt.image_url);
                  }}
                  className={`flex-shrink-0 bg-[#1A1A1A] border p-2.5 text-left transition-all hover:scale-105 min-w-[180px] ${
                    selectedTimelineEvent?.id === evt.id ? 'border-[#2563EB] bg-[#222]' : 'border-[#2A2A2A]'
                  }`}
                  style={{ borderLeftColor: borderCol, borderLeftWidth: '4px' }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white text-xs uppercase">{evt.category}</span>
                    <span className="text-[9px] font-bold px-1 rounded uppercase" style={{ color: borderCol, backgroundColor: `${borderCol}20` }}>
                      {evt.severity}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#888] space-y-0.5">
                    <p>Frame #{evt.frame_number}</p>
                    <p>TS: {evt.timestamp.toFixed(2)}s</p>
                    <p className="text-[#34C759]">Conf: {(evt.confidence * 100).toFixed(0)}%</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
