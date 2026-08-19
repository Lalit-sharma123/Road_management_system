import React, { useState, useEffect } from 'react';
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
  Cpu
} from 'lucide-react';
import { InspectionVideo, Detection, SeverityLevel, DetectionModel } from '../types/inspection';
import { DetectionTimeline } from './DetectionTimeline';
import { videoService } from '../services/videoService';

interface YOLODetectorViewProps {
  video: InspectionVideo;
  onNavigate: (tab: string) => void;
  currentModel?: DetectionModel;
}

export const YOLODetectorView: React.FC<YOLODetectorViewProps> = ({ video, onNavigate, currentModel }) => {
  const [videoData, setVideoData] = useState<InspectionVideo>(video);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedFrameIdx, setSelectedFrameIdx] = useState(0);
  const [confFilter, setConfFilter] = useState(0.30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Fetch real detection results from GET /api/v1/videos/{video_id}
  const loadVideoDetails = async () => {
    if (!video.id) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const realData = await videoService.getVideoDetails(video.id);
      setVideoData(realData);
    } catch (err: unknown) {
      console.warn(`Could not load real detection details for video ${video.id}:`, err);
      setFetchError(`Using initial video record for ID: ${video.id}`);
      setVideoData(video);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVideoDetails();
  }, [video.id]);

  const activeVideo = videoData || video;
  const frames = activeVideo.frames || [];
  const currentFrame = frames[selectedFrameIdx] || frames[0];
  
  const allDetections = currentFrame?.detections || [];
  const filteredDetections = allDetections.filter(d => 
    d.confidence >= confFilter && (selectedCategory === 'all' || d.category === selectedCategory)
  );

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const getSeverityBadgeClass = (severity: SeverityLevel) => {
    switch(severity) {
      case 'critical': return 'bg-[#FF3B30] text-white border-[#FF3B30]';
      case 'high': return 'bg-[#FF9500] text-black border-[#FF9500] font-bold';
      case 'medium': return 'bg-[#FFD60A] text-black border-[#FFD60A] font-bold';
      default: return 'bg-[#34C759] text-black border-[#34C759] font-bold';
    }
  };

  return (
    <div className="space-y-6 text-[#E0E0E0] font-mono">
      {/* Top Controller & Status */}
      <div className="bg-[#141414] border border-[#2A2A2A] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#FF9500] text-[10px] uppercase tracking-widest mb-0.5">
            <Crosshair className="w-3.5 h-3.5 text-[#FF3B30]" />
            <span>YOLOv11 DEEP LEARNING BBOX INFERENCE ENGINE</span>
          </div>
          <h2 className="text-base font-bold text-white uppercase">{activeVideo.title}</h2>
          <p className="text-[11px] text-[#888]">
            {activeVideo.resolution || '1920x1080'} @ {activeVideo.fps || 30} FPS // {activeVideo.total_frames || frames.length} FRAMES // {activeVideo.filename}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadVideoDetails}
            disabled={isLoading}
            title="Reload detection results from GET /api/v1/videos/{id}"
            className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#252525] text-xs uppercase tracking-wider text-[#AAA] border border-[#333] flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#2563EB]' : ''}`} />
            <span>Refresh API</span>
          </button>
          <button
            onClick={() => onNavigate('cv-filters')}
            className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#252525] text-xs uppercase tracking-wider text-[#AAA] border border-[#333]"
          >
            CV Pre-Processing
          </button>
          <button
            onClick={() => onNavigate('gps-map')}
            className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-600 text-xs uppercase tracking-wider text-white border border-blue-400"
          >
            GPS Telemetry Map
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="p-3 bg-[#FF9500]/10 border border-[#FF9500]/30 text-xs text-[#FF9500] flex items-center justify-between">
          <span>{fetchError}</span>
          <button onClick={loadVideoDetails} className="underline uppercase hover:text-white">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Visualizer Stage */}
        <div className="lg:col-span-8 bg-black border border-[#2A2A2A] relative flex flex-col justify-between overflow-hidden">
          {/* Top Overlay Badge */}
          <div className="bg-[#141414]/90 p-3 border-b border-[#2A2A2A] flex items-center justify-between text-[10px] z-10">
            <div className="flex items-center space-x-3">
              <span className="bg-[#FF3B30] text-white px-1.5 py-0.5 font-bold uppercase">
                ANALYZING: FRAME_{currentFrame?.frame_number || selectedFrameIdx + 1}
              </span>
              <span className="text-[#888]">
                TIMESTAMP: {(currentFrame?.timestamp_sec ?? selectedFrameIdx * 0.1).toFixed(2)}s
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[#34C759] font-bold">MODEL: {currentModel?.display_name || currentModel?.model_name || (currentModel as any)?.name || 'YOLOv11 Large'}</span>
              <span className="text-[#666]">|</span>
              <span className="text-[#FF9500]">CONF &ge; {(confFilter * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Video / Frame Canvas Stage */}
          <div className="relative w-full aspect-video bg-[#050505] flex items-center justify-center overflow-hidden">
            {/* Radial background grid */}
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none" 
              style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
            />

            {/* Frame Image */}
            <img 
              src={currentFrame?.image_url || activeVideo.thumbnail_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=1200&q=80'} 
              alt="Road Inspection Frame"
              className="w-full h-full object-cover"
            />

            {/* Dynamic Bounding Boxes */}
            {filteredDetections.map((det) => {
              const color = det.category === 'pothole' ? '#FF3B30' : det.category === 'alligator_crack' ? '#FF9500' : '#FFD60A';
              // Convert pixel bounding boxes to percentages for scale responsiveness
              const leftPct = (det.bbox.x_min / 1280) * 100;
              const topPct = (det.bbox.y_min / 720) * 100;
              const widthPct = ((det.bbox.x_max - det.bbox.x_min) / 1280) * 100;
              const heightPct = ((det.bbox.y_max - det.bbox.y_min) / 720) * 100;

              return (
                <div 
                  key={det.id}
                  className="absolute border-2 transition-all hover:scale-[1.02] cursor-pointer"
                  style={{
                    left: `${Math.min(85, Math.max(5, leftPct))}%`,
                    top: `${Math.min(85, Math.max(5, topPct))}%`,
                    width: `${Math.min(60, Math.max(10, widthPct))}%`,
                    height: `${Math.min(60, Math.max(10, heightPct))}%`,
                    borderColor: color,
                    boxShadow: `0 0 12px ${color}80`
                  }}
                >
                  <div 
                    className="absolute -top-6 left-0 text-[9px] font-mono px-1.5 py-0.5 text-black font-bold uppercase flex items-center gap-1 shadow whitespace-nowrap"
                    style={{ backgroundColor: color }}
                  >
                    <span>{det.category.replace('_', ' ')}</span>
                    <span>{(det.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}

            {/* Crosshair Center Reticle */}
            <div className="absolute pointer-events-none opacity-30 flex items-center justify-center">
              <div className="w-12 h-12 border border-[#FF9500] rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-[#FF9500] rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="bg-[#141414] p-3 border-t border-[#2A2A2A] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <button 
                onClick={togglePlay}
                className="p-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#3A3A3A] text-white"
              >
                {isPlaying ? <Pause className="w-4 h-4 text-[#FF9500]" /> : <Play className="w-4 h-4 text-[#34C759]" />}
              </button>
              <button 
                onClick={() => setSelectedFrameIdx(0)}
                className="p-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#3A3A3A] text-[#AAA]"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Frame Scrubber */}
            <div className="flex-1 flex items-center space-x-3 w-full sm:w-auto">
              <span className="text-[10px] text-[#888]">SCRUB:</span>
              <input 
                type="range"
                min="0"
                max={Math.max(0, frames.length - 1)}
                value={selectedFrameIdx}
                onChange={(e) => setSelectedFrameIdx(Number(e.target.value))}
                className="w-full accent-[#2563EB] cursor-pointer"
              />
              <span className="text-[10px] font-bold text-white whitespace-nowrap">
                {selectedFrameIdx + 1} / {Math.max(1, frames.length)}
              </span>
            </div>
          </div>
        </div>

        {/* Right BBox Detection Drawer & Controls */}
        <div className="lg:col-span-4 bg-[#111111] border border-[#2A2A2A] p-5 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#FF9500] flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#FF9500]" />
                <span>Detection BBox Log ({filteredDetections.length})</span>
              </h3>
            </div>

            {/* Filter Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#888]">YOLO CONFIDENCE FILTER</span>
                <span className="text-[#2563EB] font-bold">{(confFilter * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range"
                min="0.10"
                max="0.95"
                step="0.05"
                value={confFilter}
                onChange={(e) => setConfFilter(Number(e.target.value))}
                className="w-full accent-[#2563EB]"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-1">
              {['all', 'pothole', 'alligator_crack', 'longitudinal_crack', 'rutting'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 text-[10px] uppercase border transition-all ${
                    selectedCategory === cat 
                      ? 'bg-[#2563EB] text-white border-[#2563EB] font-bold' 
                      : 'bg-[#1A1A1A] text-[#888] border-[#2A2A2A] hover:text-white'
                  }`}
                >
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Detections List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredDetections.length === 0 ? (
                <div className="p-4 bg-[#141414] border border-[#2A2A2A] text-center text-xs text-[#666]">
                  No bounding boxes match confidence filter.
                </div>
              ) : (
                filteredDetections.map((det) => (
                  <div key={det.id} className="bg-[#161616] border-l-2 border-[#FF3B30] p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white uppercase">{det.category.replace('_', ' ')}</span>
                      <span className={`px-1.5 py-0.2 text-[9px] uppercase border ${getSeverityBadgeClass(det.severity)}`}>
                        {det.severity}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-[#888]">
                      <span>Confidence: {(det.confidence * 100).toFixed(1)}%</span>
                      <span>Score: {det.severity_score}</span>
                    </div>
                    <div className="text-[9px] text-[#666]">
                      BBOX: [{det.bbox.x_min}, {det.bbox.y_min}, {det.bbox.x_max}, {det.bbox.y_max}] ({det.bbox.area_pixels} px²)
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bottom Telemetry Card */}
          <div className="border border-[#2A2A2A] bg-[#141414] p-3 space-y-2 text-[10px]">
            <div className="flex justify-between text-[#888]">
              <span>ACTIVE MODEL:</span>
              <span className="text-[#2563EB] font-bold">{currentModel?.display_name || currentModel?.model_name || (currentModel as any)?.name || 'YOLOv11 Extra Large'}</span>
            </div>
            <div className="flex justify-between text-[#888]">
              <span>MODEL WEIGHTS:</span>
              <span className="text-white truncate max-w-[180px]">{currentModel?.weight_path || 'weights/yolov11x-pothole.pt'}</span>
            </div>
            <div className="flex justify-between text-[#888]">
              <span>ROAD HEALTH SCORE:</span>
              <span className="text-[#FF3B30] font-bold">
                {activeVideo.analytics?.road_health_score ?? 78.5} / 100
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature 5: Detection Timeline */}
      <DetectionTimeline
        frames={frames}
        durationSeconds={activeVideo.duration_seconds || 48.0}
        selectedFrameIdx={selectedFrameIdx}
        onSelectFrameByIdx={setSelectedFrameIdx}
      />
    </div>
  );
};

