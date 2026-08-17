import React, { useState, useRef } from 'react';
import { 
  Clock, 
  Film, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Crosshair, 
  Zap,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { FrameData, Detection, SeverityLevel, InspectionVideo } from '../types/inspection';
import { apiClient } from '../services/apiClient';

export interface TimelineDetectionEvent {
  id: string;
  frameIdx: number;
  frame_number: number;
  timestamp_sec: number;
  category: string;
  confidence: number;
  severity: SeverityLevel;
  severity_score?: number;
  image_url?: string;
  bbox?: {
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
    area_pixels?: number;
  };
}

export interface DetectionTimelineProps {
  frames?: FrameData[];
  video?: InspectionVideo;
  dashboardData?: any;
  durationSeconds?: number;
  selectedFrameIdx?: number;
  selectedDetectionId?: string;
  onSelectFrameByIdx?: (idx: number) => void;
  onSeekVideo?: (timestampSec: number) => void;
  onSelectDetection?: (event: TimelineDetectionEvent) => void;
  processedVideoUrl?: string;
}

export const DetectionTimeline: React.FC<DetectionTimelineProps> = ({
  frames = [],
  video,
  dashboardData,
  durationSeconds: propDuration,
  selectedFrameIdx = 0,
  selectedDetectionId: externalSelectedId,
  onSelectFrameByIdx,
  onSeekVideo,
  onSelectDetection,
  processedVideoUrl
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(externalSelectedId || null);
  const [jumpNotice, setJumpNotice] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);

  const effectiveDuration = propDuration || video?.duration_seconds || dashboardData?.video_metadata?.duration_seconds || 48.0;

  // Extract events from dashboardData API if available, or fall back to video.frames
  const rawTimelineFromApi = dashboardData?.timeline;

  const timelineEvents: TimelineDetectionEvent[] = [];

  if (Array.isArray(rawTimelineFromApi) && rawTimelineFromApi.length > 0) {
    rawTimelineFromApi.forEach((item: any, idx: number) => {
      timelineEvents.push({
        id: item.id || `dash_det_${idx}`,
        frameIdx: item.frame_number ? Math.max(0, item.frame_number - 1) : idx,
        frame_number: item.frame_number || idx + 1,
        timestamp_sec: item.timestamp_seconds ?? item.timestamp_sec ?? 0,
        category: item.category || 'pothole',
        confidence: item.confidence ?? 0.85,
        severity: (item.severity || 'medium') as SeverityLevel,
        severity_score: item.severity_score ?? 75,
        image_url: item.image_path || item.image_url,
        bbox: item.bbox
      });
    });
  } else if (frames.length > 0) {
    frames.forEach((frame, fIdx) => {
      (frame.detections || []).forEach((det, dIdx) => {
        timelineEvents.push({
          id: det.id || `det_${fIdx}_${dIdx}`,
          frameIdx: fIdx,
          frame_number: frame.frame_number,
          timestamp_sec: frame.timestamp_sec ?? (frame.frame_number / 30.0),
          category: det.category,
          confidence: det.confidence,
          severity: det.severity,
          severity_score: det.severity_score,
          image_url: frame.image_url,
          bbox: det.bbox
        });
      });
    });
  } else if (video?.frames && video.frames.length > 0) {
    video.frames.forEach((frame, fIdx) => {
      (frame.detections || []).forEach((det, dIdx) => {
        timelineEvents.push({
          id: det.id || `det_${fIdx}_${dIdx}`,
          frameIdx: fIdx,
          frame_number: frame.frame_number,
          timestamp_sec: frame.timestamp_sec ?? (frame.frame_number / 30.0),
          category: det.category,
          confidence: det.confidence,
          severity: det.severity,
          severity_score: det.severity_score,
          image_url: frame.image_url,
          bbox: det.bbox
        });
      });
    });
  }

  // Sort events strictly ordered by timestamp
  timelineEvents.sort((a, b) => a.timestamp_sec - b.timestamp_sec);

  // Filter events
  const filteredEvents = timelineEvents.filter((ev) => {
    const matchesSearch = 
      ev.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.frame_number.toString().includes(searchTerm) ||
      ev.timestamp_sec.toFixed(1).includes(searchTerm) ||
      ev.severity.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSeverity = severityFilter === 'all' || ev.severity === severityFilter;
    const matchesCategory = categoryFilter === 'all' || ev.category === categoryFilter;

    return matchesSearch && matchesSeverity && matchesCategory;
  });

  const formatTimestamp = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = (secs % 60).toFixed(2);
    const paddedSecs = parseFloat(remainderSecs) < 10 ? `0${remainderSecs}` : remainderSecs;
    return `${mins.toString().padStart(2, '0')}:${paddedSecs}`;
  };

  const getSeverityBadgeClass = (severity: SeverityLevel) => {
    switch (severity) {
      case 'critical':
        return 'bg-[#FF3B30]/20 text-[#FF3B30] border-[#FF3B30] font-bold';
      case 'high':
        return 'bg-[#FF9500]/20 text-[#FF9500] border-[#FF9500] font-bold';
      case 'medium':
        return 'bg-[#FFD60A]/20 text-[#FFD60A] border-[#FFD60A] font-bold';
      default:
        return 'bg-[#34C759]/20 text-[#34C759] border-[#34C759] font-bold';
    }
  };

  // Helper to format full video media path
  const getMediaUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const base = apiClient.defaults.baseURL || `${window.location.protocol}//${window.location.host}`;
    const host = base.replace(/\/api\/v1\/?$/, '');
    return `${host}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const activeVideoUrl = getMediaUrl(
    processedVideoUrl || video?.processed_file_path || video?.file_path
  );

  // Handle timeline item selection & video seek
  const handleItemClick = (event: TimelineDetectionEvent) => {
    setSelectedId(event.id);

    if (onSelectDetection) {
      onSelectDetection(event);
    }

    if (onSelectFrameByIdx) {
      onSelectFrameByIdx(event.frameIdx);
    }

    if (onSeekVideo) {
      onSeekVideo(event.timestamp_sec);
    }

    // Direct Video Element seeking
    if (videoRef.current) {
      videoRef.current.currentTime = event.timestamp_sec;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }

    setJumpNotice(
      `SEEKED TO [${formatTimestamp(event.timestamp_sec)}] // Frame #${event.frame_number} // ${event.category.toUpperCase().replace('_', ' ')} (${(event.confidence * 100).toFixed(0)}%)`
    );

    setTimeout(() => setJumpNotice(null), 3000);
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  return (
    <div className="bg-[#111111] border border-[#2A2A2A] p-5 space-y-5 font-mono text-[#E0E0E0]">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#2A2A2A] pb-3 gap-3">
        <div>
          <div className="flex items-center space-x-2 text-[#2563EB] text-[10px] uppercase tracking-widest mb-0.5">
            <Clock className="w-3.5 h-3.5" />
            <span>TIME-SERIES COMPUTER VISION EVENT STREAM</span>
          </div>
          <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
            <span>Detection Timeline Navigation Engine</span>
            <span className="text-[10px] text-[#34C759] bg-[#34C759]/10 border border-[#34C759]/30 px-2 py-0.5 font-bold">
              {timelineEvents.length} TOTAL DETECTIONS
            </span>
          </h3>
        </div>

        {jumpNotice && (
          <div className="bg-[#2563EB]/20 border border-[#2563EB] text-[#60A5FA] px-3 py-1 text-xs font-bold flex items-center gap-2 animate-pulse shadow-[0_0_12px_rgba(37,99,235,0.3)]">
            <Zap className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>{jumpNotice}</span>
          </div>
        )}
      </div>

      {/* Video Player & Seek Viewport (If Video Available) */}
      {activeVideoUrl && (
        <div className="bg-black border border-[#2A2A2A] overflow-hidden relative">
          <div className="bg-[#1A1A1A] p-2 text-[10px] font-bold text-white uppercase border-b border-[#2A2A2A] flex justify-between items-center">
            <span className="flex items-center gap-1.5 text-[#2563EB]">
              <Film className="w-3.5 h-3.5" /> Synchronized Processed Inspection Video
            </span>
            <span className="text-[#888]">SEEK ENABLED</span>
          </div>

          <div className="relative aspect-video max-h-80 bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              src={activeVideoUrl}
              muted={isMuted}
              controls={false}
              className="w-full h-full object-contain"
              onTimeUpdate={() => {
                if (videoRef.current) {
                  // Keep playing status in sync
                  setIsPlaying(!videoRef.current.paused);
                }
              }}
            />

            {/* Video Controls Overlay */}
            <div className="absolute bottom-3 left-3 right-3 bg-black/80 backdrop-blur border border-[#333] p-2 flex items-center justify-between text-xs text-white">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlayPause}
                  className="p-1.5 bg-[#2563EB] hover:bg-blue-600 text-white rounded-sm"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0;
                    }
                  }}
                  className="p-1.5 bg-[#222] hover:bg-[#333] text-[#AAA]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] text-[#FFD60A] font-bold">
                  {videoRef.current ? formatTimestamp(videoRef.current.currentTime) : '00:00.00'} / {formatTimestamp(effectiveDuration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 bg-[#222] hover:bg-[#333] text-[#AAA]"
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Visual Scrubber Track */}
      <div className="space-y-2 bg-[#141414] border border-[#222] p-4">
        <div className="flex justify-between text-[10px] text-[#888] uppercase">
          <span>00:00.00 (START)</span>
          <span className="text-[#FF9500] font-bold">TIMELINE DEFECT MARKERS (CLICK TO SEEK VIDEO)</span>
          <span>{formatTimestamp(effectiveDuration)} (END)</span>
        </div>

        {/* Scrubber Bar Axis */}
        <div className="relative w-full h-9 bg-[#1A1A1A] border border-[#333] rounded-sm flex items-center px-1 overflow-hidden">
          {/* Timeline markers */}
          {timelineEvents.map((ev, index) => {
            const leftPct = Math.min(98, Math.max(1, (ev.timestamp_sec / effectiveDuration) * 100));
            const isSelected = selectedId === ev.id || (frames[selectedFrameIdx] && ev.frameIdx === selectedFrameIdx);

            const markerColor = 
              ev.severity === 'critical' ? '#FF3B30' :
              ev.severity === 'high' ? '#FF9500' :
              ev.severity === 'medium' ? '#FFD60A' : '#34C759';

            return (
              <button
                key={`${ev.id}-${index}`}
                onClick={() => handleItemClick(ev)}
                title={`[${formatTimestamp(ev.timestamp_sec)}] Frame #${ev.frame_number}: ${ev.category.replace('_', ' ').toUpperCase()} (${ev.severity.toUpperCase()})`}
                className={`absolute w-3.5 h-6 -translate-x-1/2 transition-transform hover:scale-150 z-10 flex items-center justify-center ${
                  isSelected ? 'scale-150 z-30 ring-2 ring-white shadow-[0_0_10px_#2563EB]' : ''
                }`}
                style={{ left: `${leftPct}%` }}
              >
                <div 
                  className={`w-2 h-5 border border-black shadow ${isSelected ? 'ring-2 ring-white' : ''}`}
                  style={{ backgroundColor: markerColor }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
        <div className="sm:col-span-5 relative">
          <Search className="w-4 h-4 text-[#666] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search timestamp, frame #, damage type..."
            className="w-full bg-[#1A1A1A] border border-[#333] pl-9 pr-3 py-2 text-white placeholder-[#555] focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-[#333] px-3 py-2 text-white focus:outline-none focus:border-[#2563EB]"
          >
            <option value="all">SEVERITY: ALL</option>
            <option value="critical">CRITICAL</option>
            <option value="high">HIGH</option>
            <option value="medium">MEDIUM</option>
            <option value="low">LOW</option>
          </select>
        </div>

        <div className="sm:col-span-4">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-[#333] px-3 py-2 text-white focus:outline-none focus:border-[#2563EB]"
          >
            <option value="all">DAMAGE TYPE: ALL</option>
            <option value="pothole">Pothole</option>
            <option value="alligator_crack">Alligator Crack</option>
            <option value="longitudinal_crack">Longitudinal Crack</option>
            <option value="transverse_crack">Transverse Crack</option>
            <option value="broken_road">Broken Road</option>
            <option value="missing_asphalt">Missing Asphalt</option>
          </select>
        </div>
      </div>

      {/* Chronological Detection Table */}
      <div className="border border-[#222] bg-[#141414] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#1A1A1A] text-[#888] uppercase text-[10px] border-b border-[#2A2A2A]">
            <tr>
              <th className="p-3">Timestamp</th>
              <th className="p-3">Frame #</th>
              <th className="p-3">Damage Category</th>
              <th className="p-3">Severity</th>
              <th className="p-3">Confidence</th>
              <th className="p-3 text-right">Video Seek Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222]">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-[#666]">
                  No detection events match selected filters.
                </td>
              </tr>
            ) : (
              filteredEvents.map((ev) => {
                const isSelected = selectedId === ev.id || (frames[selectedFrameIdx] && ev.frameIdx === selectedFrameIdx);

                return (
                  <tr
                    key={ev.id}
                    onClick={() => handleItemClick(ev)}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#2563EB]/25 text-white font-bold border-l-4 border-l-[#2563EB] shadow-[0_0_12px_rgba(37,99,235,0.25)]'
                        : 'hover:bg-[#1A1A1A] text-slate-300'
                    }`}
                  >
                    <td className="p-3 font-bold font-mono text-[#2563EB] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>{formatTimestamp(ev.timestamp_sec)} ({ev.timestamp_sec.toFixed(1)}s)</span>
                    </td>
                    <td className="p-3 font-mono">
                      <span className="bg-[#1D1D1D] px-2 py-0.5 border border-[#333] text-white">
                        Frame #{ev.frame_number}
                      </span>
                    </td>
                    <td className="p-3 uppercase font-bold text-white">
                      {ev.category.replace('_', ' ')}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 text-[9px] uppercase border ${getSeverityBadgeClass(ev.severity)}`}>
                        {ev.severity}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-[#FF9500]">
                          {(ev.confidence * 100).toFixed(0)}%
                        </span>
                        <div className="w-16 bg-[#222] h-1.5 overflow-hidden">
                          <div 
                            className="bg-[#FF9500] h-full" 
                            style={{ width: `${ev.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemClick(ev);
                        }}
                        className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider border flex items-center space-x-1 ml-auto transition-all ${
                          isSelected
                            ? 'bg-[#2563EB] text-white border-blue-400 font-bold shadow-[0_0_10px_rgba(37,99,235,0.5)]'
                            : 'bg-[#1A1A1A] hover:bg-[#252525] text-[#2563EB] border-[#2563EB]/40'
                        }`}
                      >
                        <Crosshair className="w-3 h-3" />
                        <span>{isSelected ? 'ACTIVE SEEK' : 'SEEK VIDEO'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
