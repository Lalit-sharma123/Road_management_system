import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Key, 
  Trash2, 
  UserCheck, 
  Lock, 
  Activity, 
  CheckCircle2, 
  FileText,
  ShieldAlert,
  Search
} from 'lucide-react';
import { UserAccount, UserRole, AuditLog } from '../types/inspection';

interface UserManagementViewProps {
  currentRole: UserRole;
  users: UserAccount[];
  onAddUser: (user: Omit<UserAccount, 'id' | 'created_at'>) => void;
  onDeleteUser: (userId: string) => void;
  onChangeUserRole: (userId: string, newRole: UserRole) => void;
  auditLogs: AuditLog[];
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  currentRole,
  users,
  onAddUser,
  onDeleteUser,
  onChangeUserRole,
  auditLogs
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('inspector');
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = currentRole === 'admin';

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email) return;

    onAddUser({
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      role: role
    });

    setUsername('');
    setEmail('');
    setRole('inspector');
    setShowAddModal(false);
  };

  if (!isAdmin) {
    return (
      <div className="bg-[#141414] border border-[#2A2A2A] p-8 text-center space-y-4 max-w-2xl mx-auto my-12 font-mono">
        <div className="w-12 h-12 bg-[#FF3B30]/10 border border-[#FF3B30] flex items-center justify-center mx-auto text-[#FF3B30]">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white uppercase tracking-wider">Access Restricted (Admin Only)</h2>
        <p className="text-xs text-[#888]">
          User account administration, JWT token provisioning, role assignments, and system audit log access require <span className="text-[#A855F7] font-bold">ADMIN</span> credentials.
        </p>
        <div className="p-3 bg-[#111] border border-[#222] text-[10px] text-[#666]">
          HTTP 403 Forbidden // Insufficient RBAC JWT Scope
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 text-[#E0E0E0] font-mono">
      {/* Header Banner */}
      <div className="bg-[#141414] border border-[#2A2A2A] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#A855F7] text-[10px] uppercase tracking-widest mb-0.5">
            <Users className="w-3.5 h-3.5" />
            <span>ROLE BASED ACCESS CONTROL (RBAC) // USER ENGINE</span>
          </div>
          <h2 className="text-base font-bold text-white uppercase">User & Permission Management</h2>
          <p className="text-[11px] text-[#888]">
            Provision inspector credentials, modify access scopes, manage JWT authentication tokens, and inspect system audit logs.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-[#A855F7] hover:bg-purple-600 text-white text-xs font-mono uppercase tracking-wider border border-purple-400 flex items-center space-x-2 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision New User</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: User List & Role Assignment */}
        <div className="lg:col-span-7 bg-[#111111] border border-[#2A2A2A] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#FF9500] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#FF9500]" />
              <span>Registered System Accounts</span>
            </h3>
            <span className="text-[10px] text-[#34C759] bg-[#34C759]/10 border border-[#34C759]/30 px-2 py-0.5 font-bold">
              JWT SIGNED // HS256
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[#666] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search user account or email..."
              className="w-full bg-[#1A1A1A] border border-[#333] pl-9 pr-3 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="bg-[#141414] border border-[#262626] p-3 flex items-center justify-between gap-3 hover:border-[#444]"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white">{user.username}</span>
                    <span className={`text-[9px] px-2 py-0.2 uppercase font-bold border ${
                      user.role === 'admin'
                        ? 'bg-[#A855F7]/10 text-[#A855F7] border-[#A855F7]/30'
                        : user.role === 'inspector'
                        ? 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30'
                        : 'bg-[#34C759]/10 text-[#34C759] border-[#34C759]/30'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#777]">{user.email} // Joined: {user.created_at}</div>
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={user.role}
                    onChange={(e) => onChangeUserRole(user.id, e.target.value as UserRole)}
                    className="bg-[#1D1D1D] border border-[#333] px-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#A855F7]"
                  >
                    <option value="admin">ADMIN</option>
                    <option value="inspector">INSPECTOR</option>
                    <option value="viewer">VIEWER</option>
                  </select>

                  <button
                    onClick={() => onDeleteUser(user.id)}
                    title="Delete User"
                    className="p-1.5 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Security Audit Trail */}
        <div className="lg:col-span-5 bg-[#111111] border border-[#2A2A2A] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#A855F7] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#A855F7]" />
              <span>Security Audit Trail</span>
            </h3>
            <span className="text-[10px] text-[#888]">LIVE LOGS</span>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div key={log.id} className="bg-[#141414] border border-[#222] p-2.5 text-[10px] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[#FF9500] font-bold">{log.action}</span>
                  <span className="text-[#666]">{log.timestamp}</span>
                </div>
                <div className="text-slate-300">{log.details}</div>
                <div className="text-[#555] text-[9px]">
                  EXECUTOR: <span className="text-purple-300">{log.user}</span> [{log.role.toUpperCase()}]
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Provision User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] p-6 max-w-md w-full space-y-4 font-mono">
            <div className="flex justify-between items-center border-b border-[#2A2A2A] pb-3">
              <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#A855F7]" />
                <span>Provision Inspector Account</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#888] hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-[#AAA] uppercase mb-1">Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. inspector.taylor"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#333] px-3 py-1.5 text-white focus:outline-none focus:border-[#A855F7]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#AAA] uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. taylor@dot.gov"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#333] px-3 py-1.5 text-white focus:outline-none focus:border-[#A855F7]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#AAA] uppercase mb-1">Assigned Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-[#1A1A1A] border border-[#333] px-3 py-1.5 text-white focus:outline-none focus:border-[#A855F7]"
                >
                  <option value="admin">ADMIN (Full Control)</option>
                  <option value="inspector">INSPECTOR (Upload & Process)</option>
                  <option value="viewer">VIEWER (Read Only)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#2A2A2A]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-[#1A1A1A] text-[#888] hover:text-white text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#A855F7] hover:bg-purple-600 text-white text-xs font-bold uppercase tracking-wider"
                >
                  Issue Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
