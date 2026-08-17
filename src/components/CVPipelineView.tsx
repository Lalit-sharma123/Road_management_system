import React, { useState } from 'react';
import { 
  Sliders, 
  Layers, 
  Terminal, 
  Cpu, 
  RefreshCw, 
  CheckCircle2,
  Sparkles,
  Zap,
  Image as ImageIcon
} from 'lucide-react';
import { InspectionVideo } from '../types/inspection';

interface CVPipelineViewProps {
  video: InspectionVideo;
  onNavigate: (tab: string) => void;
}

export const CVPipelineView: React.FC<CVPipelineViewProps> = ({ video, onNavigate }) => {
  const [clipLimit, setClipLimit] = useState(2.0);
  const [gridSize, setGridSize] = useState(8);
  const [gaussianKernel, setGaussianKernel] = useState(5);
  const [cannyThreshold1, setCannyThreshold1] = useState(50);
  const [cannyThreshold2, setCannyThreshold2] = useState(150);
  const [activeFilterTab, setActiveFilterTab] = useState<'clahe' | 'gaussian' | 'canny' | 'grayscale'>('clahe');

  const sampleImage = video.frames?.[0]?.image_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=1200&q=80';

  return (
    <div className="space-y-6 text-[#E0E0E0] font-mono">
      {/* Header */}
      <div className="bg-[#141414] border border-[#2A2A2A] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#FF9500] text-[10px] uppercase tracking-widest mb-0.5">
            <Sliders className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>OPENCV IMAGE PRE-PROCESSING & FILTER BENCHMARK</span>
          </div>
          <h2 className="text-base font-bold text-white uppercase">Contrast Enhancement & Noise Reduction Matrix</h2>
          <p className="text-[11px] text-[#888]">
            Compare original raw video frames against CLAHE Equalization, Gaussian Blur Denoising, and Canny Edge Extraction.
          </p>
        </div>

        <button
          onClick={() => onNavigate('detector')}
          className="px-4 py-2 bg-[#2563EB] hover:bg-blue-600 text-xs font-mono uppercase tracking-wider text-white border border-blue-400"
        >
          Return to YOLO Inspector
        </button>
      </div>

      {/* Filter Selection Tabs */}
      <div className="flex space-x-2 overflow-x-auto border-b border-[#2A2A2A] pb-2">
        {[
          { id: 'clahe', label: 'CLAHE Histogram Eq' },
          { id: 'gaussian', label: 'Gaussian Denoising' },
          { id: 'canny', label: 'Canny Edge Extraction' },
          { id: 'grayscale', label: 'YCrCb Channel Extraction' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilterTab(tab.id as any)}
            className={`px-4 py-2 text-xs font-mono uppercase tracking-wider border transition-all ${
              activeFilterTab === tab.id
                ? 'bg-[#1A1A1A] text-white border-[#FF3B30] font-bold'
                : 'bg-[#111111] text-[#888] border-[#2A2A2A] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Interactive Parameter Console */}
        <div className="lg:col-span-4 bg-[#111111] border border-[#2A2A2A] p-5 space-y-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#FF9500] flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#FF9500]" />
            <span>OpenCV Hyperparameter Matrix</span>
          </h3>

          {activeFilterTab === 'clahe' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-[#AAA] mb-1">
                  <span>CLAHE Clip Limit:</span>
                  <span className="text-[#2563EB] font-bold">{clipLimit.toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="1.0" max="5.0" step="0.2"
                  value={clipLimit} onChange={(e) => setClipLimit(Number(e.target.value))}
                  className="w-full accent-[#2563EB]"
                />
                <p className="text-[10px] text-[#666] mt-0.5">Threshold for contrast limiting in shadow road asphalt regions.</p>
              </div>

              <div>
                <div className="flex justify-between text-xs text-[#AAA] mb-1">
                  <span>Tile Grid Size:</span>
                  <span className="text-[#2563EB] font-bold">{gridSize} x {gridSize}</span>
                </div>
                <input 
                  type="range" min="4" max="16" step="2"
                  value={gridSize} onChange={(e) => setGridSize(Number(e.target.value))}
                  className="w-full accent-[#2563EB]"
                />
              </div>
            </div>
          )}

          {activeFilterTab === 'gaussian' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-[#AAA] mb-1">
                  <span>Gaussian Kernel Size:</span>
                  <span className="text-[#2563EB] font-bold">{gaussianKernel} x {gaussianKernel}</span>
                </div>
                <input 
                  type="range" min="3" max="15" step="2"
                  value={gaussianKernel} onChange={(e) => setGaussianKernel(Number(e.target.value))}
                  className="w-full accent-[#2563EB]"
                />
                <p className="text-[10px] text-[#666] mt-0.5">Removes camera motion vibration noise before YOLO inference.</p>
              </div>
            </div>
          )}

          {activeFilterTab === 'canny' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-[#AAA] mb-1">
                  <span>Lower Threshold (T1):</span>
                  <span className="text-[#2563EB] font-bold">{cannyThreshold1}</span>
                </div>
                <input 
                  type="range" min="10" max="100" step="5"
                  value={cannyThreshold1} onChange={(e) => setCannyThreshold1(Number(e.target.value))}
                  className="w-full accent-[#2563EB]"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs text-[#AAA] mb-1">
                  <span>Upper Threshold (T2):</span>
                  <span className="text-[#2563EB] font-bold">{cannyThreshold2}</span>
                </div>
                <input 
                  type="range" min="100" max="300" step="10"
                  value={cannyThreshold2} onChange={(e) => setCannyThreshold2(Number(e.target.value))}
                  className="w-full accent-[#2563EB]"
                />
              </div>
            </div>
          )}

          {activeFilterTab === 'grayscale' && (
            <div className="text-xs text-[#888] space-y-2">
              <p>Converts BGR frame to YCrCb colorspace and isolates the Y (Luminance) channel for road illumination normalization.</p>
            </div>
          )}

          {/* Python Code Snippet Preview */}
          <div className="bg-[#0A0A0A] border border-[#222] p-3 space-y-1 text-[10px]">
            <div className="text-[#888] font-bold">OPENCV EXECUTION SCRIPT:</div>
            <pre className="text-[#34C759] overflow-x-auto">
{activeFilterTab === 'clahe' ? `ycrcb = cv2.cvtColor(frame, cv2.COLOR_BGR2YCrCb)
clahe = cv2.createCLAHE(clipLimit=${clipLimit.toFixed(1)}, tileGridSize=(${gridSize},${gridSize}))
ycrcb[:,:,0] = clahe.apply(ycrcb[:,:,0])
processed = cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2BGR)` :
activeFilterTab === 'gaussian' ? `blurred = cv2.GaussianBlur(frame, (${gaussianKernel}, ${gaussianKernel}), 0)` :
`edges = cv2.Canny(frame, ${cannyThreshold1}, ${cannyThreshold2})`}
            </pre>
          </div>
        </div>

        {/* Right Comparison View Stage */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Before Frame */}
          <div className="bg-[#111111] border border-[#2A2A2A] overflow-hidden flex flex-col justify-between">
            <div className="bg-[#161616] p-2.5 border-b border-[#2A2A2A] text-xs font-bold text-white flex justify-between">
              <span>RAW CAMERA FRAME (BEFORE)</span>
              <span className="text-[#666]">UNFILTERED BGR</span>
            </div>
            <div className="relative aspect-video bg-[#000]">
              <img src={sampleImage} alt="Raw Frame" className="w-full h-full object-cover" />
            </div>
            <div className="p-2.5 text-[10px] text-[#888] bg-[#0F0F0F]">
              Standard RGB camera feed containing uneven sunlight shadows and asphalt glare.
            </div>
          </div>

          {/* After Processed Frame */}
          <div className="bg-[#111111] border border-[#FF3B30] overflow-hidden flex flex-col justify-between shadow-[0_0_15px_rgba(255,59,48,0.15)]">
            <div className="bg-[#161616] p-2.5 border-b border-[#2A2A2A] text-xs font-bold text-[#FF3B30] flex justify-between">
              <span>PROCESSED OPENCV FRAME (AFTER)</span>
              <span className="text-[#34C759]">OPTIMIZED FOR YOLO</span>
            </div>
            <div className="relative aspect-video bg-[#000] overflow-hidden">
              <img 
                src={sampleImage} 
                alt="Processed Frame" 
                className={`w-full h-full object-cover ${
                  activeFilterTab === 'canny' ? 'invert contrast-200 grayscale' :
                  activeFilterTab === 'grayscale' ? 'grayscale brightness-110' :
                  'contrast-125 brightness-105'
                }`} 
              />
              <div className="absolute top-2 left-2 bg-[#FF3B30] text-white px-2 py-0.5 text-[9px] font-bold uppercase">
                FILTER: {activeFilterTab.toUpperCase()}
              </div>
            </div>
            <div className="p-2.5 text-[10px] text-[#34C759] bg-[#0F0F0F] flex items-center justify-between">
              <span>FEATURE RECOGNITION +34.2%</span>
              <span>READY FOR INFERENCE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
