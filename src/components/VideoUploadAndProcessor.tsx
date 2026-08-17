import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Play, 
  Video, 
  Settings2,
  Cpu,
  Terminal,
  CheckCircle2,
  FileText,
  Database,
  Radio,
  Layers,
  Sparkles,
  ArrowRight,
  Loader2,
  Check,
  AlertTriangle
} from 'lucide-react';
import { InspectionVideo, UserRole } from '../types/inspection';
import { videoService } from '../services/videoService';

interface VideoUploadAndProcessorProps {
  videos: InspectionVideo[];
  onAddVideo: (video: InspectionVideo) => void;
  onNavigate: (tab: string) => void;
  currentRole: UserRole;
}

export type PipelineStage = 
  | 'Uploading' 
  | 'Extracting Frames' 
  | 'Running YOLO' 
  | 'Generating Report' 
  | 'Saving Results' 
  | 'Finished';

interface WebSocketMessage {
  stage: PipelineStage;
  progress: number;
  message: string;
  timestamp: string;
}

export const VideoUploadAndProcessor: React.FC<VideoUploadAndProcessorProps> = ({
  videos: _videos,
  onAddVideo,
  onNavigate,
  currentRole
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [frameSkip, setFrameSkip] = useState(2);
  const [confThreshold, setConfThreshold] = useState(0.35);
  const [enableClahe, setEnableClahe] = useState(true);
  const [enableGaussianBlur, setEnableGaussianBlur] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  
  const [currentStage, setCurrentStage] = useState<PipelineStage>('Uploading');
  const [processProgress, setProcessProgress] = useState(0);
  const [wsLogs, setWsLogs] = useState<WebSocketMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const pipelineStagesList: { name: PipelineStage; desc: string; targetProgress: number }[] = [
    { name: 'Uploading', desc: 'FastAPI Multipart Ingestion', targetProgress: 15 },
    { name: 'Extracting Frames', desc: 'OpenCV 30 FPS Frame Slicing', targetProgress: 35 },
    { name: 'Running YOLO', desc: 'YOLOv11 Tensor Inference', targetProgress: 65 },
    { name: 'Generating Report', desc: 'ReportLab PDF Certificate Build', targetProgress: 82 },
    { name: 'Saving Results', desc: 'Database Telemetry Persistence', targetProgress: 95 },
    { name: 'Finished', desc: 'Pipeline Completed & Verified', targetProgress: 100 }
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['mp4', 'avi', 'mov', 'mkv'].includes(ext || '')) {
        setProcessingError('Unsupported file format. Please upload MP4, AVI, MOV, or MKV.');
        return;
      }
      if (file.size > 200 * 1024 * 1024) { // 200MB safety limit
        setProcessingError('File size exceeds maximum allowed limit (200MB).');
        return;
      }
      setProcessingError(null);
      setSelectedFile(file);
      setVideoTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const addLog = (stage: PipelineStage, progress: number, message: string) => {
    setCurrentStage(stage);
    setProcessProgress(progress);
    setWsLogs((prev) => [
      ...prev,
      {
        stage,
        progress,
        message,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  const handleStartProcessing = async () => {
    if (!videoTitle) {
      setProcessingError('Please provide a video title.');
      return;
    }

    if (currentRole === 'viewer') {
      alert('Viewers cannot run video processing pipelines. Please switch to Inspector or Admin role.');
      return;
    }

    setIsProcessing(true);
    setProcessProgress(0);
    setWsLogs([]);
    setProcessingError(null);
    setCurrentStage('Uploading');

    const clientId = `client-${Date.now()}`;

    // Establish WebSocket Connection for Live Broadcast
    try {
      wsRef.current = videoService.connectWebSocket(
        clientId,
        (wsData) => {
          if (wsData.stage && wsData.message) {
            const stageName = wsData.stage as PipelineStage;
            if (['Uploading', 'Extracting Frames', 'Running YOLO', 'Generating Report', 'Saving Results', 'Finished'].includes(stageName)) {
              addLog(stageName, wsData.progress || 50, wsData.message);
            }
          }
        },
        () => {
          console.warn('WebSocket connection error, falling back to REST response status.');
        }
      );
    } catch (wsErr) {
      console.warn('WebSocket connection failed:', wsErr);
    }

    try {
      // Step 0: Ensure any previous running processing pipeline is stopped cleanly
      await videoService.stopProcessingPipeline().catch(() => {});

      // Step 1: Upload Video File
      addLog('Uploading', 10, selectedFile ? `Uploading ${selectedFile.name} (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)...` : 'Uploading video file...');
      
      let uploadedVideo: InspectionVideo;

      if (selectedFile) {
        uploadedVideo = await videoService.uploadVideo(
          selectedFile,
          videoTitle,
          (pct) => {
            const uploadProg = Math.round(pct * 0.2); // 0-20% progress
            setProcessProgress(uploadProg);
          }
        );
      } else {
        // Fallback placeholder upload request if no file selected but title provided
        throw new Error('Please select a video file (.mp4, .avi, .mov, .mkv) to upload.');
      }

      addLog('Uploading', 20, `Video uploaded successfully with ID: ${uploadedVideo.id}`);

      // Add uploaded video to app state
      onAddVideo(uploadedVideo);

      // Step 2: Trigger AI Computer Vision Processing in background
      addLog('Extracting Frames', 35, `Triggering background OpenCV frame extraction & YOLO detection stream...`);

      // Fire processing request (backend handles streaming over WebSocket)
      videoService.runProcessingPipeline({
        video_id: uploadedVideo.id,
        confidence_threshold: confThreshold,
        frame_skip: frameSkip,
        enable_histogram_equalization: enableClahe,
        enable_gaussian_blur: enableGaussianBlur,
      }).catch((err) => {
        console.warn('Background processing pipeline returned error:', err);
      });

      // Step 3: Switch immediately to Live Processing Page
      setIsProcessing(false);
      if (wsRef.current) wsRef.current.close();
      onNavigate('live_processing');

    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data?.detail 
        || (err as Error).message 
        || 'An error occurred during video upload and processing.';
      
      setProcessingError(errorMsg);
      addLog('Finished', 0, `Error: ${errorMsg}`);
      setIsProcessing(false);
      if (wsRef.current) wsRef.current.close();
    }
  };

  const getStageIndex = (stage: PipelineStage) => {
    return pipelineStagesList.findIndex(s => s.name === stage);
  };

  const currentStageIdx = getStageIndex(currentStage);


  return (
    <div className="space-y-6 text-[#E0E0E0] font-mono">
      <div className="bg-[#141414] border border-[#2A2A2A] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#2563EB] text-[10px] uppercase tracking-widest mb-0.5">
            <Radio className="w-3.5 h-3.5 text-[#2563EB] animate-pulse" />
            <span>FASTAPI WEBSOCKET REAL-TIME PIPELINE ENGINE</span>
          </div>
          <h2 className="text-base font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#FF9500]" />
            <span>Video Ingestion & Computer Vision Pipeline</span>
          </h2>
          <p className="text-[11px] text-[#888] mt-0.5">
            FastAPI WebSocket live status stream: Uploading → Extracting Frames → Running YOLO → Generating Report → Saving Results → Finished.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-[#1B1B1B] border border-[#333] px-3 py-1.5 text-xs">
          <span className="w-2 h-2 rounded-full bg-[#34C759] animate-ping" />
          <span className="text-[#888]">WS ENDPOINT:</span>
          <span className="text-[#34C759] font-mono font-bold">/ws/process/v1</span>
        </div>
      </div>

      {/* Error Banner */}
      {processingError && (
        <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/40 p-4 text-xs font-mono text-[#FF3B30] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#FF3B30]" />
            <span>{processingError}</span>
          </div>
          <button 
            onClick={() => setProcessingError(null)}
            className="text-white hover:underline uppercase text-[10px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Feature 9: Animated Progress Bar & FastAPI WebSocket Realtime Processing Console */}
      {isProcessing && (
        <div className="bg-[#111111] border-2 border-[#2563EB] p-6 space-y-6 shadow-[0_0_20px_rgba(37,99,235,0.2)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#2A2A2A] pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <Loader2 className="w-5 h-5 text-[#2563EB] animate-spin" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  FastAPI WebSocket Stream Active: <span className="text-[#FF9500]">{currentStage}</span>
                </h3>
              </div>
              <p className="text-[11px] text-[#888] mt-1">
                Real-time bi-directional pipeline socket broadcasting GPU tensor telemetry.
              </p>
            </div>

            <div className="text-right font-mono">
              <span className="text-2xl font-extrabold text-[#2563EB]">{processProgress}%</span>
              <div className="text-[10px] text-[#888] uppercase">PIPELINE COMPLETION</div>
            </div>
          </div>

          {/* Animated Glowing Striped Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-[#1A1A1A] border border-[#333] h-4 overflow-hidden relative rounded-none p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-[#2563EB] via-blue-500 to-[#34C759] transition-all duration-500 relative overflow-hidden shadow-[0_0_12px_#2563EB]"
                style={{ width: `${processProgress}%` }}
              >
                {/* Animated Diagonal Stripe Overlay */}
                <div 
                  className="absolute inset-0 w-full h-full opacity-30 animate-[pulse_1s_infinite]"
                  style={{
                    backgroundImage: 'linear-gradient(45deg, rgba(255, 255, 255, 0.3) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.3) 50%, rgba(255, 255, 255, 0.3) 75%, transparent 75%, transparent)',
                    backgroundSize: '1rem 1rem'
                  }}
                />
              </div>
            </div>

            <div className="flex justify-between text-[10px] text-[#888]">
              <span>STAGE: {currentStageIdx + 1} OF 6</span>
              <span className="text-[#34C759] font-bold uppercase">{currentStage === 'Finished' ? '✔ ALL STAGES COMPLETE' : '⚡ WEBSOCKET BROADCASTING'}</span>
            </div>
          </div>

          {/* 6 Stage Indicators Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {pipelineStagesList.map((stg, idx) => {
              const isDone = idx < currentStageIdx || currentStage === 'Finished';
              const isCurrent = idx === currentStageIdx && currentStage !== 'Finished';

              return (
                <div
                  key={stg.name}
                  className={`p-2.5 border text-xs font-mono transition-all flex flex-col justify-between space-y-2 ${
                    isDone
                      ? 'bg-[#34C759]/10 border-[#34C759]/50 text-white'
                      : isCurrent
                      ? 'bg-[#2563EB]/20 border-[#2563EB] text-white font-bold shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                      : 'bg-[#141414] border-[#222] text-[#666]'
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold">0{idx + 1}.</span>
                    {isDone ? (
                      <Check className="w-3.5 h-3.5 text-[#34C759]" />
                    ) : isCurrent ? (
                      <Loader2 className="w-3.5 h-3.5 text-[#2563EB] animate-spin" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-[#333]" />
                    )}
                  </div>

                  <div>
                    <div className="text-[11px] font-bold uppercase">{stg.name}</div>
                    <div className="text-[9px] text-[#888] line-clamp-1">{stg.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live FastAPI WebSocket Log Feed */}
          <div className="bg-[#0B0B0B] border border-[#2A2A2A] p-3 font-mono text-[11px] space-y-1.5 max-h-40 overflow-y-auto">
            <div className="text-[10px] text-[#888] border-b border-[#222] pb-1 uppercase font-bold flex justify-between">
              <span>FastAPI WebSocket Event Stream</span>
              <span className="text-[#34C759]">WS ACTIVE</span>
            </div>
            {wsLogs.map((log, i) => (
              <div key={i} className="flex items-center space-x-2 text-slate-300">
                <span className="text-[#2563EB]">[{log.timestamp}]</span>
                <span className="text-[#FF9500] font-bold">[{log.stage}]</span>
                <span className="text-white flex-1">{log.message}</span>
                <span className="text-[#34C759] font-bold">{log.progress}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload Drop Zone */}
        <div className="lg:col-span-7 bg-[#111111] border border-[#2A2A2A] p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#FF9500] flex items-center space-x-2">
            <Upload className="w-4 h-4 text-[#2563EB]" />
            <span>SELECT VIDEO STREAM FILE</span>
          </h3>

          {currentRole === 'viewer' && (
            <div className="p-3 bg-[#FF9500]/10 border border-[#FF9500]/40 text-[#FF9500] text-xs font-mono">
              <strong>RBAC NOTICE:</strong> You are logged in as <span className="uppercase font-bold">[VIEWER]</span>. Video upload and pipeline execution are disabled. Please switch role to INSPECTOR or ADMIN.
            </div>
          )}

          <div className={`border-2 border-dashed p-8 text-center transition-all bg-[#0F0F0F] relative ${
            currentRole === 'viewer'
              ? 'border-[#222] opacity-50 cursor-not-allowed'
              : 'border-[#333] hover:border-[#2563EB]'
          }`}>
            <input 
              type="file" 
              accept="video/mp4,video/avi,video/quicktime,video/x-matroska" 
              onChange={handleFileSelect}
              disabled={currentRole === 'viewer' || isProcessing}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <Video className="w-10 h-10 text-[#666] mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              {selectedFile ? selectedFile.name : 'DRAG & DROP INSPECTION VIDEO FILE HERE, OR CLICK TO BROWSE'}
            </p>
            <p className="text-[10px] text-[#666] mt-1">Supported formats: MP4, AVI, MOV, MKV (Max 500MB)</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#AAA] mb-1">Inspection Section Title</label>
              <input
                type="text"
                placeholder="e.g., NH-48 Highway Corridor Inspection"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                disabled={isProcessing}
                className="w-full bg-[#1A1A1A] border border-[#333] px-3.5 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#2563EB] font-mono disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Processing Configuration Settings */}
        <div className="lg:col-span-5 bg-[#111111] border border-[#2A2A2A] p-6 space-y-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#FF9500] flex items-center space-x-2">
            <Settings2 className="w-4 h-4 text-[#2563EB]" />
            <span>CV PIPELINE HYPERPARAMETERS</span>
          </h3>

          <div className="space-y-4">
            {/* Frame Skip */}
            <div>
              <div className="flex justify-between text-xs font-bold text-[#AAA] mb-1">
                <span>Frame Skipping Rate</span>
                <span className="text-[#2563EB]">Every {frameSkip}th Frame</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="15" 
                value={frameSkip} 
                onChange={(e) => setFrameSkip(Number(e.target.value))}
                disabled={isProcessing}
                className="w-full accent-[#2563EB] cursor-pointer disabled:opacity-50"
              />
              <p className="text-[10px] text-[#666] mt-0.5">Higher values increase frame processing throughput.</p>
            </div>

            {/* Confidence Threshold */}
            <div>
              <div className="flex justify-between text-xs font-bold text-[#AAA] mb-1">
                <span>YOLOv11 Confidence Threshold</span>
                <span className="text-[#2563EB]">{(confThreshold * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" 
                min="0.10" 
                max="0.90" 
                step="0.05"
                value={confThreshold} 
                onChange={(e) => setConfThreshold(Number(e.target.value))}
                disabled={isProcessing}
                className="w-full accent-[#2563EB] cursor-pointer disabled:opacity-50"
              />
            </div>

            {/* Toggle Switches */}
            <div className="space-y-2 pt-2 border-t border-[#2A2A2A]">
              <label className="flex items-center justify-between text-xs text-[#AAA] cursor-pointer">
                <span>CLAHE Histogram Equalization</span>
                <input 
                  type="checkbox" 
                  checked={enableClahe} 
                  onChange={(e) => setEnableClahe(e.target.checked)}
                  disabled={isProcessing}
                  className="bg-[#1A1A1A] border-[#333] text-[#2563EB] focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-[#AAA] cursor-pointer">
                <span>Gaussian Denoising Blur</span>
                <input 
                  type="checkbox" 
                  checked={enableGaussianBlur} 
                  onChange={(e) => setEnableGaussianBlur(e.target.checked)}
                  disabled={isProcessing}
                  className="bg-[#1A1A1A] border-[#333] text-[#2563EB] focus:ring-0"
                />
              </label>
            </div>
          </div>

          {/* Start Processing Button */}
          <button
            onClick={handleStartProcessing}
            disabled={!videoTitle || isProcessing || currentRole === 'viewer'}
            className={`w-full py-2.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 border ${
              videoTitle && !isProcessing && currentRole !== 'viewer'
                ? 'bg-[#2563EB] hover:bg-blue-600 text-white border-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.3)]' 
                : 'bg-[#1A1A1A] text-[#555] border-[#2A2A2A] cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>FastAPI WS Pipeline Executing...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Execute FastAPI WS Pipeline</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

