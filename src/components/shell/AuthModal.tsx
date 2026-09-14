import React, { useState } from 'react';
import { User, X, RefreshCw, Lock, ShieldCheck } from 'lucide-react';
import { UserRole } from '../../types/inspection';
import { authService, UserProfile } from '../../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (user: UserProfile) => void;
  setCurrentRole: (role: UserRole) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  setCurrentRole
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [registerRole, setRegisterRole] = useState<UserRole>('inspector');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

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
        onClose();
        setUsername('');
        setPassword('');
      } else {
        await authService.register({
          username,
          password,
          full_name: fullName,
          email,
          role: registerRole
        });
        await authService.login(username, password);
        const me = await authService.getMe();
        if (onLoginSuccess) onLoginSuccess(me);
        setCurrentRole(me.role);
        onClose();
        setUsername('');
        setPassword('');
        setFullName('');
        setEmail('');
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.detail || err.message || 'Authentication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="glass-panel-elevated w-full max-w-sm p-6 relative space-y-4 shadow-2xl rounded-2xl animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg glass-pill transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>SECURITY & ACCESS CONTROL</span>
        </div>

        <h3 className="text-base font-semibold text-white tracking-tight">
          {authMode === 'login' ? 'Workstation Authentication' : 'Register Operator'}
        </h3>

        {authError && (
          <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 rounded-xl">
            {authError}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin or inspector"
              className="glass-input w-full p-2.5 text-xs text-white rounded-xl placeholder-slate-500"
            />
          </div>

          {authMode === 'register' && (
            <>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. A. Sterling"
                  className="glass-input w-full p-2.5 text-xs text-white rounded-xl placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. inspector@roadvision.ai"
                  className="glass-input w-full p-2.5 text-xs text-white rounded-xl placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Role</label>
                <select
                  value={registerRole}
                  onChange={(e) => setRegisterRole(e.target.value as UserRole)}
                  className="glass-input w-full p-2.5 text-xs text-white rounded-xl"
                >
                  <option value="inspector" className="bg-slate-900 text-white">Inspector</option>
                  <option value="admin" className="bg-slate-900 text-white">Admin</option>
                  <option value="viewer" className="bg-slate-900 text-white">Viewer</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="glass-input w-full p-2.5 text-xs text-white rounded-xl placeholder-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-600 hover:from-indigo-600 hover:to-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl mt-2 flex items-center justify-center gap-2 shadow-[0_2px_12px_rgba(99,102,241,0.35),inset_0_1px_0_0_rgba(255,255,255,0.2)] transition-all"
          >
            {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>{authMode === 'login' ? 'Authenticate Session' : 'Create Account'}</span>
          </button>
        </form>

        <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
          <span>{authMode === 'login' ? "New operator?" : 'Existing operator?'}</span>
          <button
            onClick={() => {
              setAuthError(null);
              setAuthMode(authMode === 'login' ? 'register' : 'login');
            }}
            className="text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            {authMode === 'login' ? 'Register Account' : 'Login Here'}
          </button>
        </div>
      </div>
    </div>
  );
};
