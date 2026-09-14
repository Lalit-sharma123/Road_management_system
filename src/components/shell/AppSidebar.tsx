import React from 'react';
import { 
  ShieldAlert, 
  AlertOctagon,
  Car,
  Video, 
  Radio,
  Crosshair, 
  Sliders, 
  MapPin, 
  BarChart3, 
  FileSpreadsheet, 
  Code2, 
  Settings,
  Boxes,
  Users,
  Tv,
  Camera,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  Activity
} from 'lucide-react';
import { UserRole } from '../../types/inspection';

interface NavSection {
  title: string;
  items: {
    id: string;
    label: string;
    shortLabel?: string;
    icon: React.ComponentType<{ className?: string }>;
    roles: string[];
    badge?: number | string;
    badgeColor?: string;
    pulse?: boolean;
    adminOnly?: boolean;
  }[];
}

interface AppSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentRole: UserRole;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  stolenAlertCount: number;
  violationCount: number;
  queueCount?: number;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  setActiveTab,
  currentRole,
  isCollapsed,
  setIsCollapsed,
  isOpenMobile,
  setIsOpenMobile,
  stolenAlertCount,
  violationCount,
  queueCount = 0
}) => {
  const navSections: NavSection[] = [
    {
      title: 'Operations',
      items: [
        { 
          id: 'dashboard', 
          label: 'Dashboard Overview', 
          shortLabel: 'Dashboard',
          icon: Activity, 
          roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] 
        },
        { 
          id: 'upload', 
          label: 'Video Batch Queue', 
          shortLabel: 'Uploads',
          icon: Video, 
          roles: ['super_admin', 'admin', 'operator', 'inspector'],
          badge: queueCount > 0 ? queueCount : undefined,
          badgeColor: 'bg-blue-600'
        },
        { 
          id: 'live_processing', 
          label: 'Live Stream Monitor', 
          shortLabel: 'Live Feed',
          icon: Radio, 
          roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'],
          badge: 'LIVE',
          badgeColor: 'bg-emerald-600',
          pulse: true
        },
        { 
          id: 'driver_mode', 
          label: 'Driver Cockpit HUD', 
          shortLabel: 'Driver',
          icon: Car, 
          roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] 
        }
      ]
    },
    {
      title: 'Enforcement & Fleet',
      items: [
        { 
          id: 'stolen_alerts', 
          label: 'Stolen Vehicle Alerts', 
          shortLabel: 'Alerts',
          icon: AlertOctagon, 
          roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'],
          badge: stolenAlertCount > 0 ? stolenAlertCount : undefined,
          badgeColor: 'bg-red-600',
          pulse: stolenAlertCount > 0
        },
        { 
          id: 'stolen_registry', 
          label: 'ANPR Hotlist Registry', 
          shortLabel: 'Hotlist',
          icon: ShieldAlert, 
          roles: ['super_admin', 'admin', 'operator', 'inspector'] 
        },
        { 
          id: 'violations', 
          label: 'E-Challans & Violations', 
          shortLabel: 'Challans',
          icon: FileSpreadsheet, 
          roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'],
          badge: violationCount > 0 ? violationCount : undefined,
          badgeColor: 'bg-amber-600'
        },
        { 
          id: 'camera_grid', 
          label: 'Live Matrix Wall', 
          shortLabel: 'Matrix',
          icon: Tv, 
          roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] 
        },
        { 
          id: 'cameras', 
          label: 'Camera Fleet Devices', 
          shortLabel: 'Cameras',
          icon: Camera, 
          roles: ['super_admin', 'admin', 'operator', 'inspector'] 
        }
      ]
    },
    {
      title: 'Vision & Spatial',
      items: [
        { 
          id: 'results', 
          label: 'Inspection Results', 
          shortLabel: 'Results',
          icon: BarChart3, 
          roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] 
        },
        { 
          id: 'detector', 
          label: 'YOLOv11 Tensor Engine', 
          shortLabel: 'Detector',
          icon: Crosshair, 
          roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] 
        },
        { 
          id: 'cv-filters', 
          label: 'CV Pipeline Tuner', 
          shortLabel: 'Filters',
          icon: Sliders, 
          roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] 
        },
        { 
          id: 'gps-map', 
          label: 'GPS Spatial Map', 
          shortLabel: 'GIS Map',
          icon: MapPin, 
          roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] 
        },
        { 
          id: 'analytics', 
          label: 'Defect Analytics', 
          shortLabel: 'Analytics',
          icon: BarChart3, 
          roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] 
        },
        { 
          id: 'reports', 
          label: 'Compliance Reports', 
          shortLabel: 'Reports',
          icon: FileSpreadsheet, 
          roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] 
        }
      ]
    },
    {
      title: 'System & Config',
      items: [
        { 
          id: 'models', 
          label: 'Model Registry', 
          shortLabel: 'Models',
          icon: Boxes, 
          roles: ['super_admin', 'admin'], 
          adminOnly: true 
        },
        { 
          id: 'users', 
          label: 'User Roles & RBAC', 
          shortLabel: 'Users',
          icon: Users, 
          roles: ['super_admin', 'admin'], 
          adminOnly: true 
        },
        { 
          id: 'backend-code', 
          label: 'FastAPI Code Inspector', 
          shortLabel: 'API Code',
          icon: Code2, 
          roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] 
        },
        { 
          id: 'settings', 
          label: 'System Settings', 
          shortLabel: 'Settings',
          icon: Settings, 
          roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] 
        }
      ]
    }
  ];

  const handleSelectTab = (id: string, isForbidden: boolean) => {
    if (isForbidden) return;
    setActiveTab(id);
    if (isOpenMobile) {
      setIsOpenMobile(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      {/* Sidebar Container with Glassmorphism */}
      <aside
        className={`
          fixed lg:static top-0 bottom-0 left-0 z-40
          glass-sidebar flex flex-col justify-between
          transition-all duration-200 select-none
          ${isCollapsed ? 'w-16' : 'w-64'}
          ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Top Header / App Branding */}
        <div className="h-13 border-b border-white/[0.08] px-3.5 flex items-center justify-between shrink-0">
          {!isCollapsed ? (
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-[0_2px_12px_rgba(99,102,241,0.35),inset_0_1px_0_0_rgba(255,255,255,0.25)]">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs text-slate-100 tracking-tight flex items-center gap-1.5">
                  <span>RoadVision</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 font-mono rounded-md border border-indigo-400/20">AI</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">Control Center</div>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-[0_2px_12px_rgba(99,102,241,0.35),inset_0_1px_0_0_rgba(255,255,255,0.25)]">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-xl glass-pill text-slate-300 hover:text-white transition-colors"
            title={isCollapsed ? "Expand Navigation" : "Collapse Navigation"}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2.5 space-y-4 text-xs no-scrollbar">
          {navSections.map((section, sIdx) => {
            // Check if user has permission for at least one item
            const visibleItems = section.items.filter(
              item => !item.adminOnly || currentRole === 'admin'
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={sIdx} className="space-y-1">
                {/* Section Header */}
                {!isCollapsed ? (
                  <div className="px-2.5 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    {section.title}
                  </div>
                ) : (
                  <div className="h-px bg-white/[0.08] my-2 mx-1" />
                )}

                {/* Items in Section */}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const isForbidden = !item.roles.includes(currentRole);

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectTab(item.id, isForbidden)}
                        disabled={isForbidden}
                        title={isCollapsed ? item.label : undefined}
                        className={`
                          w-full flex items-center rounded-xl text-left transition-all duration-150 group relative
                          ${isCollapsed ? 'justify-center p-2.5' : 'space-x-2.5 px-2.5 py-2'}
                          ${
                            isActive
                              ? 'bg-indigo-600/20 text-indigo-200 font-semibold border border-indigo-400/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18),0_2px_12px_rgba(99,102,241,0.2)] backdrop-blur-md'
                              : isForbidden
                              ? 'text-slate-600 cursor-not-allowed opacity-40'
                              : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
                          }
                        `}
                      >
                        <Icon 
                          className={`
                            shrink-0 transition-colors
                            ${isCollapsed ? 'w-4 h-4' : 'w-4 h-4'}
                            ${isActive ? 'text-indigo-300' : isForbidden ? 'text-slate-600' : 'text-slate-400 group-hover:text-slate-200'}
                          `} 
                        />

                        {!isCollapsed && (
                          <span className="truncate flex-1 text-xs">
                            {item.label}
                          </span>
                        )}

                        {/* Badge / Pill */}
                        {item.badge !== undefined && (
                          <span 
                            className={`
                              ${item.badgeColor || 'bg-indigo-600'} 
                              text-white font-semibold text-[10px] px-1.5 py-0.5 rounded-full leading-none shadow-xs
                              ${item.pulse ? 'animate-pulse' : ''}
                              ${isCollapsed ? 'absolute -top-1 -right-1 ring-2 ring-slate-900' : ''}
                            `}
                          >
                            {item.badge}
                          </span>
                        )}

                        {/* Collapsed Tooltip Bubble */}
                        {isCollapsed && (
                          <div className="hidden group-hover:block absolute left-full ml-2.5 px-3 py-1.5 glass-panel-elevated text-slate-100 text-xs font-medium rounded-xl whitespace-nowrap z-50 pointer-events-none">
                            {item.label}
                            {item.adminOnly && <span className="ml-1.5 text-[10px] text-purple-400">[Admin]</span>}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Sidebar Status / Quick Actions */}
        <div className="p-2.5 border-t border-white/[0.08] shrink-0">
          {!isCollapsed ? (
            <div className="glass-panel rounded-xl p-2.5 text-xs text-slate-400 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-200 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Pipeline Active</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-medium">94 FPS</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">YOLOv11 Tensor Engine</p>
            </div>
          ) : (
            <div className="flex justify-center" title="Telemetry Pipeline Nominal">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
