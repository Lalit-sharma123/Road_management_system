import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Layers, 
  Eye, 
  Crosshair, 
  Sliders, 
  Maximize2, 
  Split 
} from 'lucide-react';
import { InspectionVideo } from '../types/inspection';
import { apiClient } from '../services/apiClient';

interface VideoComparisonProps {
  video: InspectionVideo;
  selectedFrameIdx?: number;
}

export const VideoComparison: React.FC<VideoComparisonProps> = ({ 
  video, 
  selectedFrameIdx = 0 
}) => {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'raw-only' | 'annotated-only'>('side-by-side');
  const [sliderPosition, setSliderPosition] = useState<number>(50);

  const frames = video.frames || [];
  const currentFrame = frames[selectedFrameIdx] || frames[0];

  const getFullImageUrl = (path: string): string => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const base = apiClient.defaults.baseURL || `${window.location.protocol}//${window.location.host}`;
    const host = base.replace(/\/api\/v1\/?$/, '');
    return `${host}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const rawUrl = video.thumbnail_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=1200&q=80';
  const annotatedUrl = currentFrame?.image_url 
    ? getFullImageUrl(currentFrame.image_url)
    : rawUrl;

  return (
    <div className="bg-[#141414] border border-[#2A2A2A] p-5 space-y-4 font-mono text-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2A2A2A] pb-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Split className="w-4 h-4 text-[#2563EB]" />
            Video Inspection Stream Comparison
          </h3>
          <p className="text-[11px] text-[#888]">
            Compare original raw CCTV feed vs YOLO deep learning annotated detection feed
          </p>
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-1 bg-[#1A1A1A] p-1 border border-[#333]">
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`px-3 py-1 text-[10px] uppercase font-bold transition-colors ${
              viewMode === 'side-by-side' ? 'bg-[#2563EB] text-white' : 'text-[#888] hover:text-white'
            }`}
          >
            Side-By-Side
          </button>
          <button
            onClick={() => setViewMode('raw-only')}
            className={`px-3 py-1 text-[10px] uppercase font-bold transition-colors ${
              viewMode === 'raw-only' ? 'bg-[#2563EB] text-white' : 'text-[#888] hover:text-white'
            }`}
          >
            Raw Feed
          </button>
          <button
            onClick={() => setViewMode('annotated-only')}
            className={`px-3 py-1 text-[10px] uppercase font-bold transition-colors ${
              viewMode === 'annotated-only' ? 'bg-[#2563EB] text-white' : 'text-[#888] hover:text-white'
            }`}
          >
            AI Annotated
          </button>
        </div>
      </div>

      {/* Comparison Stage Viewport */}
      {viewMode === 'side-by-side' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Raw Original Feed Panel */}
          <div className="bg-black border border-[#2A2A2A] relative flex flex-col justify-between overflow-hidden">
            <div className="bg-[#1A1A1A] p-2 text-[10px] font-bold text-white uppercase border-b border-[#2A2A2A] flex justify-between">
              <span>Original CCTV Video Stream</span>
              <span className="text-[#888]">Raw Feed</span>
            </div>
            <div className="aspect-video bg-[#080808] relative overflow-hidden flex items-center justify-center">
              <img 
                src={rawUrl} 
                alt="Raw CCTV Feed" 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 text-[9px] text-[#34C759] border border-[#34C759]/40 uppercase">
                UNPROCESSED
              </div>
            </div>
          </div>

          {/* AI Annotated Feed Panel */}
          <div className="bg-black border border-[#2563EB] relative flex flex-col justify-between overflow-hidden shadow-[0_0_15px_rgba(37,99,235,0.15)]">
            <div className="bg-[#1A1A1A] p-2 text-[10px] font-bold text-[#2563EB] uppercase border-b border-[#2A2A2A] flex justify-between">
              <span>YOLO AI Annotated Stream</span>
              <span className="text-[#34C759]">Inference Active</span>
            </div>
            <div className="aspect-video bg-[#080808] relative overflow-hidden flex items-center justify-center">
              <img 
                src={annotatedUrl} 
                alt="AI Annotated Feed" 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 text-[9px] text-[#FF3B30] border border-[#FF3B30]/40 uppercase">
                DETECTED DEFECTS: {currentFrame?.detections?.length || 0}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Single Viewport Mode */
        <div className="bg-black border border-[#2A2A2A] relative aspect-video flex items-center justify-center overflow-hidden">
          <img 
            src={viewMode === 'raw-only' ? rawUrl : annotatedUrl} 
            alt="Single Viewport"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3 bg-black/80 px-3 py-1 text-xs font-bold text-white border border-[#333] uppercase">
            {viewMode === 'raw-only' ? 'RAW UNPROCESSED FEED' : 'YOLO ANNOTATED AI STREAM'}
          </div>
        </div>
      )}
    </div>
  );
};
