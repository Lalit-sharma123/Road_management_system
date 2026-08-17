import React, { useState } from 'react';
import { 
  Code2, 
  FileText, 
  Copy, 
  Check, 
  Terminal, 
  Folder, 
  Cpu, 
  Server,
  Layers
} from 'lucide-react';
import { backendFilesList } from '../types/backendFilesData';

export const BackendCodeViewer: React.FC = () => {
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const selectedFile = backendFilesList[selectedFileIdx] || backendFilesList[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 text-[#E0E0E0] font-mono">
      {/* Header */}
      <div className="bg-[#141414] border border-[#2A2A2A] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#FF9500] text-[10px] uppercase tracking-widest mb-0.5">
            <Code2 className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>PRODUCTION FASTAPI & OPENCV & YOLOV11 BACKEND ARCHITECTURE</span>
          </div>
          <h2 className="text-base font-bold text-white uppercase">Backend Source Code Inspection Repository</h2>
          <p className="text-[11px] text-[#888]">
            Full source code implementation for FastAPI routers, SQLAlchemy ORM, YOLOv11 detector wrapper, OpenCV frame processor, and Dockerfile container setup.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#252525] text-xs font-mono uppercase tracking-wider text-white border border-[#333] flex items-center space-x-2"
        >
          {copied ? <Check className="w-4 h-4 text-[#34C759]" /> : <Copy className="w-4 h-4 text-[#AAA]" />}
          <span>{copied ? 'Code Copied!' : 'Copy Active File'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left File Tree Directory Navigation */}
        <div className="lg:col-span-4 bg-[#111111] border border-[#2A2A2A] p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#FF9500] flex items-center gap-2 border-b border-[#2A2A2A] pb-2">
            <Folder className="w-4 h-4 text-[#2563EB]" />
            <span>Backend File Directory</span>
          </h3>

          <div className="space-y-1">
            {backendFilesList.map((file, idx) => {
              const isSelected = selectedFileIdx === idx;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFileIdx(idx)}
                  className={`w-full text-left p-2.5 text-xs font-mono transition-all border flex items-center justify-between ${
                    isSelected 
                      ? 'bg-[#1A1A1A] text-white border-[#FF3B30] font-bold shadow-[0_0_8px_rgba(255,59,48,0.2)]' 
                      : 'bg-[#141414] text-[#AAA] border-transparent hover:bg-[#1A1A1A] hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <FileText className={`w-3.5 h-3.5 ${isSelected ? 'text-[#FF3B30]' : 'text-[#666]'}`} />
                    <span className="truncate">{file.filename}</span>
                  </div>
                  <span className="text-[9px] uppercase px-1 py-0.2 bg-[#222] text-[#888] border border-[#333]">
                    {file.language}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Code Editor Stage */}
        <div className="lg:col-span-8 bg-[#0A0A0A] border border-[#2A2A2A] overflow-hidden flex flex-col justify-between">
          <div className="bg-[#141414] p-3 border-b border-[#2A2A2A] flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-[#FF9500]" />
              <span className="font-bold text-white">{selectedFile.path}</span>
            </div>
            <span className="text-[10px] text-[#888] uppercase">{selectedFile.purpose}</span>
          </div>

          <div className="p-4 overflow-x-auto max-h-[500px] text-xs font-mono leading-relaxed bg-[#050505]">
            <pre className="text-[#34C759]">
              <code>{selectedFile.content}</code>
            </pre>
          </div>

          <div className="bg-[#141414] p-2.5 border-t border-[#2A2A2A] text-[10px] text-[#666] flex justify-between">
            <span>FILE TYPE: {selectedFile.language.toUpperCase()}</span>
            <span>TOTAL LINES: {selectedFile.content.split('\n').length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
