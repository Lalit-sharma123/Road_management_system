import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Crosshair, 
  Layers, 
  Eye, 
  Sliders, 
  AlertTriangle, 
  Maximize2, 
  Play, 
  Pause, 
  RotateCcw,
  CheckCircle2,
  Activity,
  Terminal,
  Grid,
  RefreshCw,
  Cpu,
  MapPin,
  Download,
  FileJson,
  Filter,
  Navigation,
  Compass,
  Zap,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Video,
  Sparkles,
  Info
} from 'lucide-react';
import { InspectionVideo, Detection, SeverityLevel, DetectionModel, FrameData, DamageCategory } from '../types/inspection';
import { DetectionTimeline, TimelineDetectionEvent } from './DetectionTimeline';
import { videoService } from '../services/videoService';
import { apiClient } from '../services/apiClient';

interface YOLODetectorViewProps {
  video: InspectionVideo;
  onNavigate: (tab: string) => void;
  currentModel?: DetectionModel;
  models?: DetectionModel[];
  onSelectModel?: (model: DetectionModel) => void;
  videosList?: InspectionVideo[];
}

export const YOLODetectorView: React.FC<YOLODetectorViewProps> = ({ 
  video, 
  onNavigate, 
  currentModel,
  models = [],
  onSelectModel,
  videosList
}) => {
  const [videoData, setVideoData] = useState<InspectionVideo>(video);
  const [allVideos, setAllVideos] = useState<InspectionVideo[]>(videosList || []);
  const [selectedVideoId, setSelectedVideoId] = useState<string>(video.id);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Frame & Playback State
  const [selectedFrameIdx, setSelectedFrameIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0); // 0.5x, 1x, 2x
  const [isLooping, setIsLooping] = useState<boolean>(true);

  // Filters State
  const [confFilter, setConfFilter] = useState<number>(0.30);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);
  const [hoveredDetectionId, setHoveredDetectionId] = useState<string | null>(null);

  // Layer Visibility
  const [showOverlays, setShowOverlays] = useState<boolean>(true);
  const [showCenterReticle, setShowCenterReticle] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showConfidence, setShowConfidence] = useState<boolean>(true);
  const [showAreaPixels, setShowAreaPixels] = useState<boolean>(false);

  // Fetch all videos list from backend API
  useEffect(() => {
    videoService.listVideos()
      .then((serverVideos) => {
        if (Array.isArray(serverVideos) && serverVideos.length > 0) {
          setAllVideos(serverVideos);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch real detection details from GET /api/v1/videos/{video_id}
  const loadVideoDetails = useCallback(async (targetId: string) => {
    if (!targetId) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const realData = await videoService.getVideoDetails(targetId);
      setVideoData(realData);
      setSelectedFrameIdx(0);
      setSelectedDetectionId(null);
    } catch (err: unknown) {
      console.warn(`Could not load real detection details for video ${targetId}:`, err);
      setFetchError(`Using available cached record for ID: ${targetId}`);
      if (targetId === video.id) {
        setVideoData(video);
      }
    } finally {
      setIsLoading(false);
    }
  }, [video]);

  // Trigger load when selectedVideoId changes
  useEffect(() => {
    if (selectedVideoId) {
      loadVideoDetails(selectedVideoId);
    }
  }, [selectedVideoId, loadVideoDetails]);

  // Sync prop changes
  useEffect(() => {
    if (video.id && video.id !== selectedVideoId) {
      setSelectedVideoId(video.id);
      setVideoData(video);
    }
  }, [video.id]);

  const activeVideo = videoData || video;
  const frames: FrameData[] = activeVideo.frames || [];
  const currentFrame = frames[selectedFrameIdx] || frames[0];
  
  // Real Frame Playback Engine
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && frames.length > 0) {
      const frameRate = activeVideo.fps || 10;
      const intervalMs = Math.max(30, Math.round(1000 / (frameRate * playbackSpeed)));
      
      interval = setInterval(() => {
        setSelectedFrameIdx((prevIdx) => {
          if (prevIdx >= frames.length - 1) {
            if (isLooping) {
              return 0;
            } else {
              setIsPlaying(false);
              return prevIdx;
            }
          }
          return prevIdx + 1;
        });
      }, intervalMs);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, frames.length, activeVideo.fps, playbackSpeed, isLooping]);

  // Filter Detections for Current Frame
  const allDetections = currentFrame?.detections || [];
  const filteredDetections = useMemo(() => {
    return allDetections.filter(d => {
      const meetsConf = d.confidence >= confFilter;
      const meetsCat = selectedCategory === 'all' || d.category === selectedCategory;
      const meetsSev = selectedSeverity === 'all' || d.severity === selectedSeverity;
      return meetsConf && meetsCat && meetsSev;
    });
  }, [allDetections, confFilter, selectedCategory, selectedSeverity]);

  // GPS Telemetry for current frame
  const currentGPS = useMemo(() => {
    if (!activeVideo.gps_tracks || activeVideo.gps_tracks.length === 0) {
      return {
        latitude: 28.4595 + (selectedFrameIdx * 0.00005),
        longitude: 77.0266 + (selectedFrameIdx * 0.00004),
        speed_kmh: 42.5,
        road_name: 'NH-48 Corridor (Sector 14)',
        altitude_meters: 215.4
      };
    }
    const currentFrameNumber = currentFrame?.frame_number || selectedFrameIdx + 1;
    // Find closest GPS track
    const found = activeVideo.gps_tracks.find(g => g.frame_number >= currentFrameNumber) || activeVideo.gps_tracks[0];
    return found;
  }, [activeVideo.gps_tracks, currentFrame, selectedFrameIdx]);

  // Frame Navigation Helpers
  const handlePrevFrame = () => {
    setSelectedFrameIdx((prev) => Math.max(0, prev - 1));
  };

  const handleNextFrame = () => {
    setSelectedFrameIdx((prev) => Math.min(Math.max(0, frames.length - 1), prev + 1));
  };

  const handleFirstFrame = () => {
    setSelectedFrameIdx(0);
  };

  const handleLastFrame = () => {
    setSelectedFrameIdx(Math.max(0, frames.length - 1));
  };

  // Severity UI Styling Helpers
  const getSeverityBadgeClass = (severity: SeverityLevel | string) => {
    switch(severity) {
      case 'critical': return 'bg-[#FF3B30] text-white border-[#FF3B30]';
      case 'high': return 'bg-[#FF9500] text-black border-[#FF9500] font-bold';
      case 'medium': return 'bg-[#FFD60A] text-black border-[#FFD60A] font-bold';
      default: return 'bg-[#34C759] text-black border-[#34C759] font-bold';
    }
  };

  const getCategoryColor = (category: string) => {
    switch(category) {
      case 'pothole': return '#FF3B30'; // Red
      case 'alligator_crack': return '#FF9500'; // Orange
      case 'longitudinal_crack': return '#FFD60A'; // Yellow
      case 'transverse_crack': return '#00C7BE'; // Cyan
      case 'missing_asphalt': return '#AF52DE'; // Purple
      case 'broken_road': return '#FF2D55'; // Pink
      case 'car':
      case 'truck':
      case 'bus': return '#34C759'; // Green
      case 'helmet':
      case 'no_helmet': return '#5856D6'; // Indigo
      default: return '#FF9500';
    }
  };

  // Export BBox Data as JSON
  const handleExportJSON = () => {
    const payload = {
      video_id: activeVideo.id,
      video_title: activeVideo.title,
      frame_idx: selectedFrameIdx,
      frame_number: currentFrame?.frame_number || selectedFrameIdx + 1,
      timestamp_sec: currentFrame?.timestamp_sec || selectedFrameIdx * 0.1,
      detections_count: filteredDetections.length,
      detections: filteredDetections,
      gps_telemetry: currentGPS,
      exported_at: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `yolo_bbox_frame_${selectedFrameIdx + 1}_${activeVideo.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Download Current Frame Snapshot
  const handleDownloadSnapshot = () => {
    const imgUrl = currentFrame?.image_url || activeVideo.thumbnail_url;
    if (!imgUrl) return;
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = `frame_snapshot_${selectedFrameIdx + 1}.jpg`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Bounding Box Coordinate Scaler (Handles both Pixel & 0-1 Normalized BBoxes)
  const calculateBBoxPercentages = (det: Detection) => {
    const bbox = det.bbox;
    if (!bbox) return { left: 10, top: 10, width: 20, height: 20 };

    let left = 0;
    let top = 0;
    let width = 0;
    let height = 0;

    // Check if coordinates are normalized [0.0 - 1.0]
    if (bbox.x_max <= 1.05 && bbox.x_max > 0) {
      left = bbox.x_min * 100;
      top = bbox.y_min * 100;
      width = (bbox.x_max - bbox.x_min) * 100;
      height = (bbox.y_max - bbox.y_min) * 100;
    } 
    // Check if coordinates are normalized percent [0 - 100]
    else if (bbox.x_max <= 100 && bbox.x_max > 1.05 && bbox.y_max <= 100) {
      left = bbox.x_min;
      top = bbox.y_min;
      width = bbox.x_max - bbox.x_min;
      height = bbox.y_max - bbox.y_min;
    } 
    // Absolute Pixel Coordinates
    else {
      let baseW = 1280;
      let baseH = 720;
      if (activeVideo.resolution) {
        const parts = activeVideo.resolution.split('x');
        if (parts.length === 2) {
          baseW = parseInt(parts[0]) || 1280;
          baseH = parseInt(parts[1]) || 720;
        }
      }
      left = (bbox.x_min / baseW) * 100;
      top = (bbox.y_min / baseH) * 100;
      width = ((bbox.x_max - bbox.x_min) / baseW) * 100;
      height = ((bbox.y_max - bbox.y_min) / baseH) * 100;
    }

    // Clamp boundaries so boxes never overflow stage
    return {
      left: Math.max(0, Math.min(95, left)),
      top: Math.max(0, Math.min(95, top)),
      width: Math.max(3, Math.min(98 - left, width)),
      height: Math.max(3, Math.min(98 - top, height))
    };
  };

  return (
    <div id="yolo-detector-page" className="space-y-6 text-[#E0E0E0] font-mono animate-in fade-in duration-300">
      {/* Top Header Bar & Video Selector */}
      <div className="bg-[#141414] border border-[#2A2A2A] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-[#FF9500] text-[10px] uppercase tracking-widest">
            <Crosshair className="w-4 h-4 text-[#FF3B30] animate-pulse" />
            <span className="font-bold">YOLOv11 MULTI-MODEL DEEP LEARNING INFERENCE ENGINE</span>
            <span className="bg-[#FF9500]/20 text-[#FF9500] px-1.5 py-0.2 border border-[#FF9500]/40 rounded text-[9px]">REAL-TIME HUD</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-white uppercase tracking-tight">{activeVideo.title}</h2>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-[#1F1F1F] border border-[#333] text-[#34C759] font-bold">
              ID: {activeVideo.id}
            </span>
          </div>
          <p className="text-[11px] text-[#888] flex items-center gap-2 flex-wrap">
            <span>{activeVideo.resolution || '1920x1080'}</span>
            <span>•</span>
            <span>{activeVideo.fps || 30} FPS</span>
            <span>•</span>
            <span>{frames.length > 0 ? frames.length : activeVideo.total_frames || 1} FRAMES</span>
            <span>•</span>
            <span className="text-[#AAA]">{activeVideo.filename}</span>
          </p>
        </div>

        {/* Action Buttons & Video Switcher Dropdown */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Video Switcher Dropdown */}
          <div className="relative flex items-center bg-[#1A1A1A] border border-[#333] px-2.5 py-1 text-xs">
            <Video className="w-3.5 h-3.5 text-[#2563EB] mr-1.5" />
            <select
              value={selectedVideoId}
              onChange={(e) => setSelectedVideoId(e.target.value)}
              className="bg-transparent text-white text-xs outline-none cursor-pointer pr-2 font-mono"
            >
              {allVideos.map((v) => (
                <option key={v.id} value={v.id} className="bg-[#1A1A1A] text-white">
                  {v.title} ({v.frames?.length || v.total_frames || 0} f)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => loadVideoDetails(selectedVideoId)}
            disabled={isLoading}
            title="Reload full detection telemetry from GET /api/v1/videos/{id}"
            className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#252525] text-xs uppercase tracking-wider text-[#AAA] hover:text-white border border-[#333] flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#2563EB]' : 'text-indigo-400'}`} />
            <span>{isLoading ? 'Syncing...' : 'Sync API'}</span>
          </button>

          <button
            onClick={() => onNavigate('cv-filters')}
            className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#252525] text-xs uppercase tracking-wider text-[#AAA] hover:text-white border border-[#333] transition-all"
          >
            CV Filters
          </button>

          <button
            onClick={() => onNavigate('gps-map')}
            className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-600 text-xs uppercase tracking-wider text-white border border-blue-400 flex items-center gap-1.5 shadow-md transition-all"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>GPS Telemetry</span>
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="p-3 bg-[#FF9500]/10 border border-[#FF9500]/30 text-xs text-[#FF9500] flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#FF9500]" />
            {fetchError}
          </span>
          <button onClick={() => loadVideoDetails(selectedVideoId)} className="underline uppercase hover:text-white">Retry</button>
        </div>
      )}

      {/* Main Detector Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visualizer Stage & Controls */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-black border border-[#2A2A2A] relative flex flex-col justify-between overflow-hidden shadow-2xl">
            {/* Top Stage Overlay Header */}
            <div className="bg-[#141414]/95 p-3 border-b border-[#2A2A2A] flex flex-wrap items-center justify-between text-[10px] gap-2 z-10">
              <div className="flex items-center space-x-3">
                <span className="bg-[#FF3B30] text-white px-2 py-0.5 font-bold uppercase tracking-wider flex items-center gap-1.5 shadow">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  FRAME: {currentFrame?.frame_number || selectedFrameIdx + 1} / {Math.max(1, frames.length)}
                </span>
                <span className="text-[#888] font-mono">
                  TIMESTAMP: <strong className="text-white">{(currentFrame?.timestamp_sec ?? selectedFrameIdx * 0.1).toFixed(2)}s</strong>
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-[#34C759] font-bold">
                  MODEL: {currentModel?.display_name || currentModel?.model_name || 'YOLOv11 Large'}
                </span>
                <span className="text-[#666]">|</span>
                <span className="text-[#FF9500] font-bold">
                  CONF &ge; {(confFilter * 100).toFixed(0)}%
                </span>
                <span className="text-[#666]">|</span>
                <span className="text-cyan-400 font-bold">
                  {filteredDetections.length} HAZARD{filteredDetections.length !== 1 ? 'S' : ''}
                </span>
              </div>
            </div>

            {/* Video / Frame Canvas Display */}
            <div className="relative w-full aspect-video bg-[#050505] flex items-center justify-center overflow-hidden select-none">
              {/* Radial background technical grid */}
              <div 
                className="absolute inset-0 opacity-25 pointer-events-none" 
                style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
              />

              {/* Frame Image */}
              <img 
                src={currentFrame?.image_url || activeVideo.thumbnail_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=1200&q=80'} 
                alt={`Road Inspection Frame ${selectedFrameIdx + 1}`}
                className="w-full h-full object-cover pointer-events-none"
              />

              {/* Dynamic Bounding Box Overlays */}
              {showOverlays && filteredDetections.map((det, idx) => {
                const color = getCategoryColor(det.category);
                const isSelected = selectedDetectionId === det.id;
                const isHovered = hoveredDetectionId === det.id;
                const { left, top, width, height } = calculateBBoxPercentages(det);

                return (
                  <div 
                    key={`${det.video_id || 'v'}-${det.id || 'det'}-${idx}`}
                    onClick={() => setSelectedDetectionId(isSelected ? null : det.id)}
                    onMouseEnter={() => setHoveredDetectionId(det.id)}
                    onMouseLeave={() => setHoveredDetectionId(null)}
                    className={`absolute transition-all cursor-pointer ${
                      isSelected ? 'border-[3px] z-30 scale-[1.01]' : isHovered ? 'border-2 z-20 scale-[1.01]' : 'border-2 z-10'
                    }`}
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                      borderColor: color,
                      boxShadow: isSelected 
                        ? `0 0 20px ${color}, inset 0 0 10px ${color}60` 
                        : isHovered 
                        ? `0 0 14px ${color}` 
                        : `0 0 8px ${color}60`,
                      backgroundColor: isSelected ? `${color}20` : 'transparent'
                    }}
                  >
                    {/* BBox Label Tag */}
                    {showLabels && (
                      <div 
                        className="absolute -top-6 left-0 text-[9px] font-mono px-1.5 py-0.5 text-black font-bold uppercase flex items-center gap-1 shadow-md whitespace-nowrap z-20"
                        style={{ backgroundColor: color }}
                      >
                        <span>{det.category.replace('_', ' ')}</span>
                        {showConfidence && <span>{(det.confidence * 100).toFixed(0)}%</span>}
                        {isSelected && <span className="bg-black text-white px-1 text-[8px] rounded">SELECTED</span>}
                      </div>
                    )}

                    {/* Corner Reticle Accents */}
                    <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2" style={{ borderColor: color }} />
                    <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2" style={{ borderColor: color }} />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2" style={{ borderColor: color }} />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2" style={{ borderColor: color }} />
                  </div>
                );
              })}

              {/* Crosshair Center Reticle */}
              {showCenterReticle && (
                <div className="absolute pointer-events-none opacity-40 flex items-center justify-center">
                  <div className="w-16 h-16 border border-[#FF9500] rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-[#FF3B30] rounded-full"></div>
                  </div>
                  <div className="absolute w-24 h-[1px] bg-[#FF9500]/60" />
                  <div className="absolute h-24 w-[1px] bg-[#FF9500]/60" />
                </div>
              )}

              {/* Empty State when no detections match */}
              {filteredDetections.length === 0 && (
                <div className="absolute bottom-4 right-4 bg-black/80 border border-[#333] px-3 py-1 text-[10px] text-[#888] pointer-events-none">
                  No hazards detected at current threshold
                </div>
              )}
            </div>

            {/* Controls Bar */}
            <div className="bg-[#141414] p-3 sm:p-4 border-t border-[#2A2A2A] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              {/* Playback Buttons */}
              <div className="flex items-center space-x-1.5">
                <button 
                  onClick={handleFirstFrame}
                  title="First Frame"
                  className="p-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#3A3A3A] text-[#AAA] hover:text-white transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button 
                  onClick={handlePrevFrame}
                  title="Previous Frame"
                  className="p-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#3A3A3A] text-[#AAA] hover:text-white transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button 
                  id="btn-yolo-play-toggle"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-3 py-2 border font-bold flex items-center gap-1.5 transition-all shadow-md ${
                    isPlaying 
                      ? 'bg-[#FF9500] text-black border-[#FF9500]' 
                      : 'bg-[#34C759] text-black border-[#34C759] hover:bg-emerald-400'
                  }`}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
                </button>

                <button 
                  onClick={handleNextFrame}
                  title="Next Frame"
                  className="p-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#3A3A3A] text-[#AAA] hover:text-white transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Speed Multiplier */}
                <div className="flex items-center bg-[#1A1A1A] border border-[#3A3A3A] rounded overflow-hidden text-[10px]">
                  {[0.5, 1.0, 2.0].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-2 py-1.5 font-bold transition-all ${
                        playbackSpeed === spd ? 'bg-[#2563EB] text-white' : 'text-[#888] hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Frame Scrubber */}
              <div className="flex-1 flex items-center space-x-3 w-full sm:w-auto">
                <span className="text-[10px] text-[#888] font-bold">FRAME:</span>
                <input 
                  type="range"
                  min="0"
                  max={Math.max(0, frames.length - 1)}
                  value={selectedFrameIdx}
                  onChange={(e) => setSelectedFrameIdx(Number(e.target.value))}
                  className="w-full accent-[#2563EB] cursor-pointer"
                />
                <span className="text-[11px] font-bold text-white whitespace-nowrap bg-[#1F1F1F] px-2 py-0.5 border border-[#333]">
                  {selectedFrameIdx + 1} / {Math.max(1, frames.length)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick HUD Viewport Toggles & Actions */}
          <div className="bg-[#141414] border border-[#2A2A2A] p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-[#888] font-bold uppercase mr-1">HUD Layers:</span>
              
              <button
                onClick={() => setShowOverlays(!showOverlays)}
                className={`px-2.5 py-1 text-[10px] border flex items-center gap-1.5 transition-all ${
                  showOverlays ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-[#1A1A1A] text-[#777] border-[#333]'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>BBoxes</span>
              </button>

              <button
                onClick={() => setShowLabels(!showLabels)}
                className={`px-2.5 py-1 text-[10px] border flex items-center gap-1.5 transition-all ${
                  showLabels ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-[#1A1A1A] text-[#777] border-[#333]'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Labels</span>
              </button>

              <button
                onClick={() => setShowCenterReticle(!showCenterReticle)}
                className={`px-2.5 py-1 text-[10px] border flex items-center gap-1.5 transition-all ${
                  showCenterReticle ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-[#1A1A1A] text-[#777] border-[#333]'
                }`}
              >
                <Crosshair className="w-3 h-3" />
                <span>Reticle</span>
              </button>

              <button
                onClick={() => setIsLooping(!isLooping)}
                className={`px-2.5 py-1 text-[10px] border flex items-center gap-1.5 transition-all ${
                  isLooping ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#1A1A1A] text-[#777] border-[#333]'
                }`}
              >
                <span>Loop {isLooping ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadSnapshot}
                title="Download Current Frame Snapshot"
                className="px-2.5 py-1 bg-[#1A1A1A] hover:bg-[#252525] text-[10px] uppercase text-[#AAA] hover:text-white border border-[#333] flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3 h-3 text-cyan-400" />
                <span>Snapshot</span>
              </button>

              <button
                onClick={handleExportJSON}
                title="Export Frame Bounding Box Telemetry (JSON)"
                className="px-2.5 py-1 bg-[#1A1A1A] hover:bg-[#252525] text-[10px] uppercase text-[#AAA] hover:text-white border border-[#333] flex items-center gap-1.5 transition-all"
              >
                <FileJson className="w-3 h-3 text-amber-400" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          {/* Real Frame GPS Geotag & Mini-Telemetry Ribbon */}
          <div className="bg-[#141414] border border-[#2A2A2A] p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-[#888] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#FF3B30]" />
                GPS Coordinates
              </span>
              <p className="text-white font-mono font-bold">
                {currentGPS.latitude.toFixed(5)}° N, {currentGPS.longitude.toFixed(5)}° E
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] text-[#888] flex items-center gap-1">
                <Navigation className="w-3 h-3 text-[#2563EB]" />
                Speed & Altitude
              </span>
              <p className="text-white font-mono font-bold">
                {currentGPS.speed_kmh || 42.5} km/h • {currentGPS.altitude_meters || 215}m
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] text-[#888] flex items-center gap-1">
                <Compass className="w-3 h-3 text-amber-400" />
                Road Sector
              </span>
              <p className="text-white font-mono font-bold truncate">
                {currentGPS.road_name || 'NH-48 Sector 14'}
              </p>
            </div>

            <div className="flex items-center justify-end">
              <button
                onClick={() => onNavigate('gps-map')}
                className="px-3 py-1.5 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-indigo-300 hover:text-white border border-indigo-500/40 text-[10px] uppercase font-bold flex items-center gap-1.5 rounded transition-all"
              >
                <MapPin className="w-3 h-3 text-indigo-400" />
                <span>Map Defect</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: BBox Detection Drawer & Deep Telemetry */}
        <div className="lg:col-span-4 space-y-4">
          {/* Detection BBox Log */}
          <div className="bg-[#111111] border border-[#2A2A2A] p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#FF9500] flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#FF9500]" />
                <span>Hazard BBox Log ({filteredDetections.length})</span>
              </h3>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>

            {/* Confidence Threshold Slider */}
            <div className="space-y-1.5 bg-[#161616] p-2.5 border border-[#2A2A2A] rounded">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#888] flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-[#2563EB]" />
                  Confidence Filter
                </span>
                <span className="text-[#2563EB] font-bold">{(confFilter * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range"
                min="0.10"
                max="0.95"
                step="0.05"
                value={confFilter}
                onChange={(e) => setConfFilter(Number(e.target.value))}
                className="w-full accent-[#2563EB] cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-[#666]">
                <span>10% (Permissive)</span>
                <span>95% (Strict)</span>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="space-y-1">
              <span className="text-[10px] text-[#888] uppercase block">Defect Category:</span>
              <div className="flex flex-wrap gap-1">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'pothole', label: 'Pothole' },
                  { id: 'alligator_crack', label: 'Alligator' },
                  { id: 'longitudinal_crack', label: 'Longitudinal' },
                  { id: 'transverse_crack', label: 'Transverse' },
                  { id: 'missing_asphalt', label: 'Missing Asphalt' },
                  { id: 'broken_road', label: 'Broken' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2 py-0.5 text-[10px] uppercase border transition-all ${
                      selectedCategory === cat.id 
                        ? 'bg-[#2563EB] text-white border-[#2563EB] font-bold' 
                        : 'bg-[#1A1A1A] text-[#888] border-[#2A2A2A] hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Filter Pills */}
            <div className="space-y-1">
              <span className="text-[10px] text-[#888] uppercase block">Severity Filter:</span>
              <div className="flex flex-wrap gap-1">
                {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSelectedSeverity(sev)}
                    className={`px-2 py-0.5 text-[10px] uppercase border transition-all ${
                      selectedSeverity === sev 
                        ? 'bg-[#FF9500] text-black border-[#FF9500] font-bold' 
                        : 'bg-[#1A1A1A] text-[#888] border-[#2A2A2A] hover:text-white'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {/* Detections List Items */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {filteredDetections.length === 0 ? (
                <div className="p-5 bg-[#161616] border border-[#2A2A2A] text-center text-xs text-[#666] space-y-1">
                  <p>No bounding boxes match current filter.</p>
                  <p className="text-[10px] text-[#555]">Lower confidence threshold to inspect raw detections.</p>
                </div>
              ) : (
                filteredDetections.map((det, idx) => {
                  const isSelected = selectedDetectionId === det.id;
                  const isHovered = hoveredDetectionId === det.id;
                  const color = getCategoryColor(det.category);

                  return (
                    <div 
                      key={`${det.video_id || 'v'}-${det.id || 'det'}-${idx}`}
                      onClick={() => setSelectedDetectionId(isSelected ? null : det.id)}
                      onMouseEnter={() => setHoveredDetectionId(det.id)}
                      onMouseLeave={() => setHoveredDetectionId(null)}
                      className={`p-3 text-xs space-y-1.5 transition-all cursor-pointer border-l-4 ${
                        isSelected 
                          ? 'bg-[#222] border-r border-t border-b border-[#444] shadow-lg' 
                          : isHovered 
                          ? 'bg-[#1C1C1C]' 
                          : 'bg-[#161616] border-y border-r border-[#222]'
                      }`}
                      style={{ borderLeftColor: color }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          <span className="font-bold text-white uppercase">{det.category.replace('_', ' ')}</span>
                        </div>
                        <span className={`px-1.5 py-0.2 text-[9px] uppercase border ${getSeverityBadgeClass(det.severity)}`}>
                          {det.severity}
                        </span>
                      </div>

                      <div className="flex justify-between text-[10px] text-[#888]">
                        <span>Confidence: <strong className="text-white">{(det.confidence * 100).toFixed(1)}%</strong></span>
                        <span>Score: <strong className="text-[#FF9500]">{det.severity_score}</strong></span>
                      </div>

                      <div className="text-[9px] text-[#666] flex items-center justify-between">
                        <span>BBOX: [{det.bbox?.x_min}, {det.bbox?.y_min}, {det.bbox?.x_max}, {det.bbox?.y_max}]</span>
                        {det.bbox?.area_pixels && <span>{det.bbox.area_pixels} px²</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Model Architecture & Weights Telemetry Card */}
          <div className="border border-[#2A2A2A] bg-[#141414] p-4 space-y-3 text-[10px]">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-2">
              <h4 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>Neural Model Telemetry</span>
              </h4>
              <span className="text-[#34C759] font-bold font-mono">CUDA ONLINE</span>
            </div>

            <div className="space-y-1.5 font-mono">
              <div className="flex justify-between text-[#888]">
                <span>ARCHITECTURE:</span>
                <span className="text-[#2563EB] font-bold">
                  {currentModel?.display_name || currentModel?.model_name || 'YOLOv11 Extra Large'}
                </span>
              </div>

              <div className="flex justify-between text-[#888]">
                <span>WEIGHTS:</span>
                <span className="text-white truncate max-w-[180px]">
                  {currentModel?.weight_path || 'weights/yolov11x-pothole.pt'}
                </span>
              </div>

              <div className="flex justify-between text-[#888]">
                <span>INPUT RESOLUTION:</span>
                <span className="text-white">640x640 (Auto Letterboxed)</span>
              </div>

              <div className="flex justify-between text-[#888]">
                <span>ROAD HEALTH INDEX:</span>
                <span className="text-[#FF3B30] font-bold">
                  {activeVideo.analytics?.road_health_score ?? 78.5} / 100
                </span>
              </div>
            </div>

            {onSelectModel && models.length > 0 && (
              <div className="pt-2 border-t border-[#2A2A2A]">
                <label className="text-[9px] text-[#777] uppercase block mb-1">Switch Model Architecture:</label>
                <select
                  value={currentModel?.model_name || ''}
                  onChange={(e) => {
                    const target = models.find(m => m.model_name === e.target.value);
                    if (target) onSelectModel(target);
                  }}
                  className="w-full bg-[#1A1A1A] border border-[#333] text-white p-1.5 rounded text-xs font-mono outline-none"
                >
                  {models.map(m => (
                    <option key={m.id} value={m.model_name}>
                      {m.display_name} ({m.version || 'v11'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feature: Synchronized Detection Timeline */}
      <DetectionTimeline
        frames={frames}
        video={activeVideo}
        durationSeconds={activeVideo.duration_seconds || 48.0}
        selectedFrameIdx={selectedFrameIdx}
        selectedDetectionId={selectedDetectionId || undefined}
        onSelectFrameByIdx={(idx) => {
          setSelectedFrameIdx(idx);
        }}
        onSelectDetection={(ev: TimelineDetectionEvent) => {
          setSelectedFrameIdx(ev.frameIdx);
          setSelectedDetectionId(ev.id);
        }}
      />
    </div>
  );
};
