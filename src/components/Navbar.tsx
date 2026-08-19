import React, { useState } from 'react';
import { 
  ShieldAlert, 
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
  RefreshCw,
  Lock,
  Cpu,
  LogIn,
  LogOut,
  User,
  X
} from 'lucide-react';
import { UserRole, DetectionModel } from '../types/inspection';
import { authService, UserProfile } from '../services/authService';

interface NavbarProps {
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
  onLoginSuccess?: (user: UserProfile) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
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
  onLoginSuccess
}) => {
  const safeModels = Array.isArray(models) ? models : [];
  const isAdmin = currentRole === 'admin';
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Auth Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [registerRole, setRegisterRole] = useState<UserRole>('inspector');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: ShieldAlert, roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] },
    { id: 'violations', label: 'E-Challans & Violations', icon: ShieldAlert, roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] },
    { id: 'driver_mode', label: 'Driver Mode', icon: Car, roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] },
    { id: 'camera_grid', label: 'Live Matrix', icon: Tv, roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] },
    { id: 'cameras', label: 'Camera Registry', icon: Camera, roles: ['super_admin', 'admin', 'operator', 'inspector'] },
    { id: 'upload', label: 'Video Upload', icon: Video, roles: ['super_admin', 'admin', 'operator', 'inspector'] },
    { id: 'live_processing', label: 'Live Stream', icon: Radio, roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] },
    { id: 'results', label: 'Results Dashboard', icon: BarChart3, roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] },
    { id: 'detector', label: 'YOLO Detector', icon: Crosshair, roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] },
    { id: 'cv-filters', label: 'CV Pipeline', icon: Sliders, roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] },
    { id: 'gps-map', label: 'GPS Mapping', icon: MapPin, roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet, roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] },
    { id: 'models', label: 'Model Registry', icon: Boxes, roles: ['super_admin', 'admin'], adminOnly: true },
    { id: 'users', label: 'User Roles', icon: Users, roles: ['super_admin', 'admin'], adminOnly: true },
    { id: 'backend-code', label: 'Backend Code', icon: Code2, roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['super_admin', 'admin', 'operator', 'inspector', 'viewer'] }
  ];

  const handleModelDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    const targetModel = safeModels.find(m => m.model_name === selectedName);
    if (targetModel && isAdmin) {
      onSelectModel(targetModel);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);

    try {
      if (authMode === 'login') {
        await authService.login(username, password);
        const me = await authService.getMe();
        if (onLoginSuccess) onLoginSuccess(me);
        setCurrentRole(me.role);
        setShowAuthModal(false);
        setUsername('');
        setPassword('');
      } else {
        await authService.register({
          username,
          password,
          email,
          full_name: fullName,
          role: registerRole
        });
        // Auto login after registration
        await authService.login(username, password);
        const me = await authService.getMe();
        if (onLoginSuccess) onLoginSuccess(me);
        setCurrentRole(me.role);
        setShowAuthModal(false);
        setUsername('');
        setPassword('');
        setEmail('');
        setFullName('');
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail 
        || 'Authentication failed. Please check your credentials.';
      setAuthError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <header className="bg-[#141414] border-b border-[#2A2A2A] text-[#E0E0E0] sticky top-0 z-50">
      {/* Top Technical Status Header Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between px-4 sm:px-6 py-2.5 border-b border-[#2A2A2A] bg-[#111111] gap-3">
        {/* Left Status Indicator & Title */}
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-[#FF3B30] rounded-full animate-pulse shadow-[0_0_8px_#FF3B30]"></div>
          <div className="flex flex-col">
            <h1 className="text-sm sm:text-base font-bold tracking-tight uppercase italic font-mono text-white flex items-center gap-2">
              <span>Smart Road Damage Detection</span>
              <span className="text-[10px] not-italic px-1.5 py-0.2 bg-[#FF9500]/20 text-[#FF9500] border border-[#FF9500]/40 font-mono rounded">
                v1.1.0
              </span>
            </h1>
            <span className="text-[9px] font-mono opacity-50 hidden sm:inline">
              OPENCV 4.9 // ULTRALYTICS YOLO LOCAL INFERENCE
            </span>
          </div>
        </div>

        {/* Center: Detection Model Switcher Dropdown */}
        <div className="flex items-center gap-2 bg-[#1A1A1A] border border-[#333] px-3 py-1.5 shadow-inner">
          <Cpu className="w-4 h-4 text-[#FF3B30] shrink-0" />
          <div className="flex flex-col">
            <span className="text-[9px] font-mono uppercase tracking-wider text-[#888] font-bold flex items-center gap-1">
              Detection Model
              {!isAdmin && <Lock className="w-2.5 h-2.5 text-[#FF9500]" title="Admin Role Required to Switch Models" />}
            </span>

            <div className="flex items-center gap-1">
              {isSwitchingModel ? (
                <div className="flex items-center gap-1.5 text-xs text-[#2563EB] font-bold font-mono py-0.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading {currentModel.display_name}...</span>
                </div>
              ) : (
                <select
                  value={currentModel.model_name}
                  onChange={handleModelDropdownChange}
                  disabled={!isAdmin || isSwitchingModel}
                  className={`bg-transparent text-xs font-mono font-bold uppercase focus:outline-none cursor-pointer pr-2 ${
                    !isAdmin ? 'text-[#AAA] cursor-not-allowed' : 'text-white hover:text-[#FF3B30]'
                  }`}
                >
                  {safeModels.map((model) => (
                    <option key={model.id} value={model.model_name} className="bg-[#1A1A1A] text-white">
                      {model.display_name} ({model.version}) {!model.enabled ? '[DISABLED]' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <span className="text-[9px] px-1.5 py-0.5 bg-[#2563EB]/20 text-[#2563EB] border border-[#2563EB]/40 font-mono font-bold uppercase ml-1">
            {currentModel.model_name}
          </span>
        </div>

        {/* Right User & Role Controls */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3 border-r border-[#2A2A2A] pr-3">
              <div className="text-right">
                <p className="text-[9px] font-mono opacity-50 uppercase leading-none">{currentUser.role.toUpperCase()}</p>
                <p className="text-xs font-bold font-mono text-slate-200">{currentUser.full_name || currentUser.username}</p>
              </div>
              <div className="w-7 h-7 bg-[#2563EB] border border-blue-400 flex items-center justify-center font-mono text-xs font-bold text-white uppercase">
                {currentUser.username.substring(0, 2)}
              </div>
              <button
                onClick={onLogout}
                title="Logout JWT Session"
                className="p-1.5 bg-[#1A1A1A] hover:bg-[#FF3B30]/20 text-[#AAA] hover:text-[#FF3B30] border border-[#333] hover:border-[#FF3B30] transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setAuthMode('login');
                setShowAuthModal(true);
              }}
              className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-mono uppercase tracking-wider border border-blue-400 flex items-center gap-1.5 shadow-[0_0_8px_rgba(37,99,235,0.3)]"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>JWT Login</span>
            </button>
          )}

          {/* Role Switcher */}
          <div className="flex items-center gap-1 bg-[#1A1A1A] p-1 border border-[#2A2A2A]">
            <span className="text-[9px] font-mono opacity-50 px-1 hidden sm:inline">ROLE:</span>
            {(['admin', 'inspector', 'viewer'] as UserRole[]).map((role) => (
              <button
                key={role}
                onClick={() => setCurrentRole(role)}
                className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider transition-all border ${
                  currentRole === role
                    ? role === 'admin'
                      ? 'bg-[#A855F7] text-white border-[#A855F7] font-bold shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                      : role === 'inspector'
                      ? 'bg-[#2563EB] text-white border-[#2563EB] font-bold shadow-[0_0_8px_rgba(37,99,235,0.4)]'
                      : 'bg-[#34C759] text-black border-[#34C759] font-bold'
                    : 'text-[#888] border-transparent hover:text-white hover:bg-[#2A2A2A]'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="px-4 sm:px-6 bg-[#141414]">
        <div className="flex space-x-1 overflow-x-auto no-scrollbar py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isForbidden = !item.roles.includes(currentRole);

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (!isForbidden) {
                    setActiveTab(item.id);
                  }
                }}
                disabled={isForbidden}
                className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-all border ${
                  isActive
                    ? 'bg-[#1A1A1A] text-white border-[#FF3B30] font-bold shadow-[0_0_10px_rgba(255,59,48,0.2)]'
                    : isForbidden
                    ? 'text-[#444] border-transparent cursor-not-allowed opacity-50'
                    : 'text-[#888] border-transparent hover:text-white hover:bg-[#1C1C1C]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#FF3B30]' : isForbidden ? 'text-[#444]' : 'text-[#666]'}`} />
                <span>{item.label}</span>
                {item.adminOnly && (
                  <span className="text-[8px] bg-[#A855F7]/20 text-[#A855F7] border border-[#A855F7]/40 px-1 font-bold">
                    ADMIN
                  </span>
                )}
                {isForbidden && <Lock className="w-3 h-3 text-[#555]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Auth Modal (Login / Register) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#333] max-w-md w-full p-6 shadow-2xl relative font-mono space-y-4">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-[#888] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-[#2563EB] text-xs uppercase tracking-widest">
              <User className="w-4 h-4" />
              <span>FASTAPI JWT AUTHENTICATION</span>
            </div>

            <h3 className="text-lg font-bold text-white uppercase">
              {authMode === 'login' ? 'System Login' : 'Register User'}
            </h3>

            {authError && (
              <div className="p-3 bg-[#FF3B30]/10 border border-[#FF3B30]/30 text-xs text-[#FF3B30]">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase text-[#888] mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or inspector"
                  className="w-full bg-[#1A1A1A] border border-[#333] p-2 text-xs text-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-[10px] uppercase text-[#888] mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Dr. A. Sterling"
                      className="w-full bg-[#1A1A1A] border border-[#333] p-2 text-xs text-white focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-[#888] mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. inspector@roadsystem.com"
                      className="w-full bg-[#1A1A1A] border border-[#333] p-2 text-xs text-white focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-[#888] mb-1">Role</label>
                    <select
                      value={registerRole}
                      onChange={(e) => setRegisterRole(e.target.value as UserRole)}
                      className="w-full bg-[#1A1A1A] border border-[#333] p-2 text-xs text-white focus:outline-none focus:border-[#2563EB]"
                    >
                      <option value="inspector">Inspector</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] uppercase text-[#888] mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1A1A1A] border border-[#333] p-2 text-xs text-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider border border-blue-400 mt-2 flex items-center justify-center gap-2"
              >
                {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{authMode === 'login' ? 'Authenticate' : 'Create Account'}</span>
              </button>
            </form>

            <div className="pt-2 border-t border-[#222] flex items-center justify-between text-xs text-[#888]">
              <span>{authMode === 'login' ? "Don't have an account?" : 'Already registered?'}</span>
              <button
                onClick={() => {
                  setAuthError(null);
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                }}
                className="text-[#2563EB] hover:underline uppercase text-[11px]"
              >
                {authMode === 'login' ? 'Register Here' : 'Login Here'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

