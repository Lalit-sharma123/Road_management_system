import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Activity, 
  Video, 
  Radio, 
  Car, 
  AlertOctagon, 
  ShieldAlert, 
  FileSpreadsheet, 
  Tv, 
  Camera, 
  BarChart3, 
  Crosshair, 
  Sliders, 
  MapPin, 
  Boxes, 
  Users, 
  Code2, 
  Settings,
  ArrowRight,
  Sparkles,
  Command
} from 'lucide-react';
import { UserRole, DetectionModel } from '../../types/inspection';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tabId: string) => void;
  currentRole: UserRole;
  models: DetectionModel[];
  onSelectModel: (model: DetectionModel) => void;
}

interface CommandItem {
  id: string;
  type: 'tab' | 'action' | 'model';
  title: string;
  category: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  payload?: any;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  currentRole,
  models,
  onSelectModel
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commandItems: CommandItem[] = [
    { id: 'dashboard', type: 'tab', title: 'Dashboard Overview', category: 'Navigation', description: 'View system-wide inspection summary and telemetry', icon: Activity },
    { id: 'upload', type: 'tab', title: 'Video Ingestion & Batch Queue', category: 'Navigation', description: 'Upload road footage and reorder batch priority', icon: Video },
    { id: 'live_processing', type: 'tab', title: 'Live Stream Monitor', category: 'Navigation', description: 'Monitor real-time RTSP/WebRTC feeds and detections', icon: Radio },
    { id: 'driver_mode', type: 'tab', title: 'Driver Cockpit Mode', category: 'Navigation', description: 'Full-screen HUD for field survey drivers with audio alerts', icon: Car },
    { id: 'stolen_alerts', type: 'tab', title: 'Stolen Vehicle Real-Time Alerts', category: 'Enforcement', description: 'View ANPR stolen vehicle intercepts and dispatch alerts', icon: AlertOctagon },
    { id: 'stolen_registry', type: 'tab', title: 'ANPR Hotlist Registry', category: 'Enforcement', description: 'Manage stolen vehicle wanted hotlist and police FIR records', icon: ShieldAlert },
    { id: 'violations', type: 'tab', title: 'E-Challans & Violations', category: 'Enforcement', description: 'Review helmet, speed, and triple riding violations', icon: FileSpreadsheet },
    { id: 'camera_grid', type: 'tab', title: 'Live Matrix Grid Wall', category: 'Fleet', description: 'Inspect 9x multi-camera concurrent RTSP streams', icon: Tv },
    { id: 'cameras', type: 'tab', title: 'Camera Device Registry', category: 'Fleet', description: 'Manage edge hardware, IP cameras, and RTSP streams', icon: Camera },
    { id: 'results', type: 'tab', title: 'Inspection Results & Damage Cards', category: 'Analytics', description: 'Detailed damage classification, Potholes & Cracks', icon: BarChart3 },
    { id: 'detector', type: 'tab', title: 'YOLOv11 Tensor Engine', category: 'Vision', description: 'Inspect bounding boxes and class probabilities', icon: Crosshair },
    { id: 'cv-filters', type: 'tab', title: 'CV Preprocessing Pipeline', category: 'Vision', description: 'Tune CLAHE, Gaussian blur, Canny edge detection', icon: Sliders },
    { id: 'gps-map', type: 'tab', title: 'GPS Spatial Damage Map', category: 'GIS', description: 'View geospatial damage clusters and heatmaps', icon: MapPin },
    { id: 'analytics', type: 'tab', title: 'Defect Analytics & Trends', category: 'Analytics', description: 'Temporal analysis, severity charts, and metrics', icon: BarChart3 },
    { id: 'reports', type: 'tab', title: 'Compliance & Export Reports', category: 'Reports', description: 'Export PDF, Excel, and CSV highway reports', icon: FileSpreadsheet },
    { id: 'models', type: 'tab', title: 'Model Registry & Weights', category: 'System', description: 'Manage YOLOv8, YOLOv10, and YOLO11 models', icon: Boxes },
    { id: 'users', type: 'tab', title: 'User Roles & Access Control', category: 'System', description: 'Manage accounts and RBAC permissions', icon: Users },
    { id: 'backend-code', type: 'tab', title: 'FastAPI Backend Architecture', category: 'Developer', description: 'View backend source files, routes, and schemas', icon: Code2 },
    { id: 'settings', type: 'tab', title: 'System Parameters & Settings', category: 'System', description: 'Configure confidence, frame skip, and Ollama LLM', icon: Settings }
  ];

  // Also include models as switch actions if admin
  if (currentRole === 'admin') {
    models.forEach((m) => {
      commandItems.push({
        id: `switch_model_${m.id}`,
        type: 'model',
        title: `Switch Model: ${m.display_name}`,
        category: 'Quick Action',
        description: `Load ${m.weight_path} into CUDA runtime`,
        icon: Boxes,
        payload: m
      });
    });
  }

  const filteredItems = commandItems.filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Global shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open
          inputRef.current?.focus();
        }
      }

      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleExecute(filteredItems[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex]);

  const handleExecute = (item: CommandItem) => {
    if (item.type === 'tab') {
      onSelectTab(item.id);
    } else if (item.type === 'model' && item.payload) {
      onSelectModel(item.payload);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 select-none">
      <div 
        className="w-full max-w-xl glass-panel-elevated rounded-2xl overflow-hidden flex flex-col max-h-[75vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/[0.08] gap-3">
          <Search className="w-4 h-4 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, tool, or view to jump to..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg glass-pill text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={() => handleExecute(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-600/20 text-white border border-indigo-400/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]'
                      : 'text-slate-300 hover:bg-white/[0.05] border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`p-1.5 rounded-lg transition-colors ${isSelected ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white/[0.06] text-slate-400 border border-white/[0.06]'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white flex items-center gap-2">
                        <span className="truncate">{item.title}</span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-white/[0.06] border border-white/10 text-slate-300 rounded-md uppercase font-mono">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 flex items-center gap-1 shrink-0 ml-2">
                    <span className="text-[10px] hidden sm:inline">Jump</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              No matching commands or views for "{query}".
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="h-9 border-t border-white/[0.08] px-4 bg-white/[0.02] flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center space-x-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <div className="flex items-center space-x-1 text-slate-300">
            <Command className="w-3 h-3 text-indigo-400" />
            <span>QUICK LAUNCH</span>
          </div>
        </div>
      </div>
    </div>
  );
};
