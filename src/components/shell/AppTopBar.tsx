import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Command, 
  Cpu, 
  AlertOctagon, 
  Bell, 
  RefreshCw, 
  LogIn, 
  LogOut, 
  Maximize2, 
  Minimize2, 
  Menu, 
  ChevronDown,
  Layers,
  Sparkles,
  Lock
} from 'lucide-react';
import { UserRole, DetectionModel } from '../../types/inspection';
import { UserProfile, authService } from '../../services/authService';

interface AppTopBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  models: DetectionModel[];
  currentModel: DetectionModel;
  onSelectModel: (model: DetectionModel) => Promise<void> | void;
  isSwitchingModel: boolean;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  onOpenAuthModal: () => void;
  onOpenCommandPalette: () => void;
  onToggleSidebar: () => void;
  stolenAlertCount: number;
  violationCount: number;
}

export const AppTopBar: React.FC<AppTopBarProps> = ({
  activeTab,
  setActiveTab,
  currentRole,
  setCurrentRole,
  models = [],
  currentModel,
  onSelectModel,
  isSwitchingModel,
  currentUser,
  onLogout,
  onOpenAuthModal,
  onOpenCommandPalette,
  onToggleSidebar,
  stolenAlertCount,
  violationCount
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  const safeModels = Array.isArray(models) ? models : [];
  const isAdmin = currentRole === 'admin';

  // Toggle app full-screen
  const toggleAppFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Human-readable active view name for breadcrumb
  const getBreadcrumbTitle = (tabId: string) => {
    const map: Record<string, string> = {
      dashboard: 'Operations Command Dashboard',
      upload: 'Video Ingestion & Batch Queue',
      live_processing: 'Live Stream Ingestion Engine',
      driver_mode: 'Driver Cockpit HUD & Telemetry',
      stolen_alerts: 'Stolen Vehicle Real-Time Alerts',
      stolen_registry: 'ANPR Hotlist & Stolen Registry',
      violations: 'Traffic Violations & E-Challans',
      camera_grid: 'Live RTSP Camera Grid Matrix',
      cameras: 'Camera Fleet Device Registry',
      results: 'Inspection Defect Analytics',
      detector: 'YOLOv11 Tensor Detector',
      'cv-filters': 'Computer Vision Preprocessing Pipeline',
      'gps-map': 'GPS Spatial Damage Map',
      analytics: 'Road Infrastructure Analytics',
      reports: 'Inspection Reports & Compliance',
      models: 'AI Detection Model Registry',
      users: 'User Access Control & RBAC',
      'backend-code': 'FastAPI Backend Architecture',
      settings: 'System Configuration & Parameters'
    };
    return map[tabId] || 'RoadVision AI';
  };

  return (
    <header className="h-13 glass-topbar px-3 sm:px-5 flex items-center justify-between gap-3 text-xs select-none shrink-0 z-30">
      {/* Left: Sidebar Toggle, Brand & Breadcrumb */}
      <div className="flex items-center space-x-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-xl glass-pill text-slate-300 hover:text-white transition-colors"
          title="Toggle Navigation Sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Brand & Breadcrumb */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center space-x-2 cursor-pointer group text-left"
          >
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-[0_2px_12px_rgba(99,102,241,0.35),inset_0_1px_0_0_rgba(255,255,255,0.25)] group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="hidden sm:block leading-tight">
              <span className="font-semibold text-slate-100 text-xs tracking-tight group-hover:text-indigo-300 transition-colors">
                RoadVision
              </span>
              <span className="text-[10px] text-slate-400 ml-1 font-mono font-medium">v2.4</span>
            </div>
          </button>

          <span className="text-slate-600 hidden md:inline text-sm">/</span>

          <span className="text-slate-300 text-xs truncate max-w-[160px] sm:max-w-[220px] md:max-w-xs font-medium">
            {getBreadcrumbTitle(activeTab)}
          </span>
        </div>
      </div>

      {/* Center: Command Palette / Quick Search Input Pill */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
        <button
          onClick={onOpenCommandPalette}
          className="w-full h-8 glass-pill hover:border-white/20 px-3 rounded-xl flex items-center justify-between text-slate-400 hover:text-slate-200 transition-all text-xs group"
        >
          <div className="flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-300 transition-colors" />
            <span className="truncate">Search views, violations, cameras...</span>
          </div>
          <div className="flex items-center space-x-1 bg-white/[0.08] px-1.5 py-0.5 rounded text-[10px] text-slate-200 font-mono font-medium border border-white/10">
            <span>⌘K</span>
          </div>
        </button>
      </div>

      {/* Right: Quick Tools, Active Model Pill, Stolen Alerts Bell, Role & User Profile */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Mobile Search Button */}
        <button
          onClick={onOpenCommandPalette}
          className="md:hidden p-1.5 rounded-xl glass-pill text-slate-300 hover:text-white"
          title="Search (⌘K)"
        >
          <Search className="w-3.5 h-3.5" />
        </button>

        {/* Model Switcher Pill */}
        <div className="relative">
          <button
            onClick={() => setShowModelDropdown(prev => !prev)}
            disabled={!isAdmin || isSwitchingModel}
            className={`h-8 px-2.5 rounded-xl glass-pill flex items-center space-x-1.5 transition-all ${
              !isAdmin ? 'opacity-90 cursor-default' : 'cursor-pointer hover:border-indigo-400/40 hover:shadow-[0_0_12px_rgba(99,102,241,0.2)]'
            }`}
            title={isAdmin ? "Switch Active Detection Model" : "Current Vision Model"}
          >
            {isSwitchingModel ? (
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
            ) : (
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span className="text-xs font-medium text-slate-200 max-w-[90px] sm:max-w-[130px] truncate">
              {currentModel?.display_name || 'YOLOv11 XL'}
            </span>
            <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 bg-indigo-500/15 text-indigo-300 font-mono font-medium border border-indigo-400/25 rounded-md">
              CUDA
            </span>
            {isAdmin && <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {/* Model Dropdown Menu */}
          {showModelDropdown && isAdmin && (
            <div 
              className="absolute right-0 mt-1.5 w-64 glass-panel-elevated rounded-2xl p-1.5 z-50 animate-in fade-in"
              onMouseLeave={() => setShowModelDropdown(false)}
            >
              <div className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400 border-b border-white/[0.08]">
                Active Vision Model
              </div>
              <div className="py-1 space-y-0.5">
                {safeModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onSelectModel(model);
                      setShowModelDropdown(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      currentModel.model_name === model.model_name
                        ? 'bg-indigo-600/80 text-white font-medium border border-indigo-400/30 shadow-xs'
                        : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <span className="truncate">{model.display_name}</span>
                    <span className="text-[10px] opacity-75 font-mono">v{model.version}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stolen Vehicle Hotlist Alert Notification Bell */}
        <button
          onClick={() => setActiveTab('stolen_alerts')}
          className={`h-8 px-2.5 rounded-xl flex items-center space-x-1.5 transition-all relative ${
            stolenAlertCount > 0
              ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/40 shadow-[0_0_16px_rgba(244,63,94,0.3),inset_0_1px_0_0_rgba(255,255,255,0.2)]'
              : 'glass-pill text-slate-300 hover:text-white'
          }`}
          title="Stolen Vehicle Live Alerts"
        >
          <Bell className="w-3.5 h-3.5" />
          {stolenAlertCount > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-bold rounded-full shadow-xs">
              {stolenAlertCount}
            </span>
          )}
        </button>

        {/* Role Switcher Pill */}
        <div className="relative">
          <button
            onClick={() => setShowRoleDropdown(prev => !prev)}
            className={`h-8 px-2.5 rounded-xl border flex items-center space-x-1.5 transition-all ${
              currentRole === 'admin'
                ? 'bg-purple-500/15 text-purple-200 border-purple-400/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] backdrop-blur-md'
                : currentRole === 'inspector'
                ? 'bg-blue-500/15 text-blue-200 border-blue-400/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] backdrop-blur-md'
                : 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] backdrop-blur-md'
            }`}
            title="Switch User Role"
          >
            <span className="text-xs font-medium capitalize">{currentRole}</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>

          {showRoleDropdown && (
            <div 
              className="absolute right-0 mt-1.5 w-36 glass-panel-elevated rounded-2xl p-1 z-50 animate-in fade-in"
              onMouseLeave={() => setShowRoleDropdown(false)}
            >
              {(['admin', 'inspector', 'viewer'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    setCurrentRole(role);
                    setShowRoleDropdown(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs capitalize font-medium flex items-center justify-between transition-colors ${
                    currentRole === role
                      ? 'bg-indigo-600/80 text-white border border-indigo-400/30'
                      : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <span>{role}</span>
                  {currentRole === role && <span className="text-[10px]">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Auth / Profile Pill */}
        {currentUser ? (
          <div className="flex items-center space-x-2 glass-pill rounded-xl px-2.5 h-8">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-[10px] font-semibold text-white uppercase shadow-xs">
              {(currentUser.username || 'U')[0]}
            </div>
            <span className="text-xs text-slate-200 font-medium hidden xl:inline max-w-[80px] truncate">
              {currentUser.username}
            </span>
            <button
              onClick={onLogout}
              className="text-slate-400 hover:text-rose-400 transition-colors p-0.5"
              title="Logout Session"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="h-8 px-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-medium flex items-center space-x-1.5 shadow-[0_2px_12px_rgba(99,102,241,0.3),inset_0_1px_0_0_rgba(255,255,255,0.25)] transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign In</span>
          </button>
        )}

        {/* Fullscreen Button */}
        <button
          onClick={toggleAppFullscreen}
          className="p-1.5 rounded-xl glass-pill text-slate-300 hover:text-white transition-colors hidden sm:flex"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
