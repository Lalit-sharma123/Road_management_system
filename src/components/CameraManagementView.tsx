import React, { useState } from 'react';
import { CameraDevice, CameraType, CameraStatus, UserRole } from '../types/inspection';
import {
  Video,
  Plus,
  Trash2,
  Edit,
  Play,
  Square,
  RefreshCw,
  Search,
  Sliders,
  Radio,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Globe,
  Settings,
  Tv
} from 'lucide-react';

interface CameraManagementViewProps {
  cameras: CameraDevice[];
  currentRole: UserRole;
  onAddCamera: (camera: Omit<CameraDevice, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateCamera: (camera: CameraDevice) => void;
  onDeleteCamera: (id: string) => void;
  onSelectCameraForLive: (camera: CameraDevice) => void;
  showToast: (title: string, desc: string, type?: 'success' | 'warning') => void;
}

export const CameraManagementView: React.FC<CameraManagementViewProps> = ({
  cameras,
  currentRole,
  onAddCamera,
  onUpdateCamera,
  onDeleteCamera,
  onSelectCameraForLive,
  showToast
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CameraDevice | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    camera_name: '',
    camera_type: 'cctv' as CameraType,
    stream_url: '',
    latitude: 28.6139,
    longitude: 77.2090,
    location_name: '',
    description: '',
    fps: 30,
    resolution: '1920x1080',
    status: 'online' as CameraStatus,
    is_active: true
  });

  const handleOpenAddModal = () => {
    setEditingCamera(null);
    setFormData({
      camera_name: '',
      camera_type: 'cctv',
      stream_url: 'rtsp://admin:pass@192.168.1.100:554/live',
      latitude: 28.6139,
      longitude: 77.2090,
      location_name: 'Main Highway Sector 4',
      description: 'High-definition 1080p surveillance unit.',
      fps: 30,
      resolution: '1920x1080',
      status: 'online',
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cam: CameraDevice) => {
    setEditingCamera(cam);
    setFormData({
      camera_name: cam.camera_name,
      camera_type: cam.camera_type,
      stream_url: cam.stream_url,
      latitude: cam.latitude,
      longitude: cam.longitude,
      location_name: cam.location_name || '',
      description: cam.description || '',
      fps: cam.fps,
      resolution: cam.resolution,
      status: cam.status,
      is_active: cam.is_active
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.camera_name.trim() || !formData.stream_url.trim()) {
      showToast('Validation Error', 'Camera name and stream URL are required.', 'warning');
      return;
    }

    if (editingCamera) {
      onUpdateCamera({
        ...editingCamera,
        ...formData,
        updated_at: new Date().toISOString()
      });
      showToast('Camera Updated', `Updated configuration for ${formData.camera_name}`);
    } else {
      onAddCamera(formData);
      showToast('Camera Added', `Registered camera stream '${formData.camera_name}'`);
    }
    setIsModalOpen(false);
  };

  const filteredCameras = cameras.filter((cam) => {
    const matchesSearch =
      cam.camera_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cam.location_name && cam.location_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      cam.stream_url.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || cam.camera_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || cam.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusBadge = (status: CameraStatus) => {
    switch (status) {
      case 'online':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Online
          </span>
        );
      case 'busy':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Processing
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            Maintenance
          </span>
        );
      case 'offline':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/30">
            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
            Offline
          </span>
        );
    }
  };

  const getTypeBadge = (type: CameraType) => {
    const labels: Record<CameraType, { label: string; bg: string }> = {
      cctv: { label: 'CCTV', bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
      rtsp: { label: 'RTSP Stream', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
      webcam: { label: 'USB Webcam', bg: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
      dashcam: { label: 'Dashcam', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
      drone: { label: 'Drone UAV', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
      mobile: { label: 'Mobile Stream', bg: 'bg-pink-500/20 text-pink-300 border-pink-500/30' }
    };
    const item = labels[type] || { label: type, bg: 'bg-slate-500/20 text-slate-300' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${item.bg}`}>
        {item.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 rounded-xl text-blue-400 border border-blue-500/30">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">Enterprise Camera Registry</h2>
              <p className="text-sm text-slate-400">
                Manage CCTV, RTSP streams, Dashcams, Drones, and USB Webcams with WebSocket inference workers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            Register Camera
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, URL, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="md:col-span-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Stream Types</option>
            <option value="cctv">CCTV</option>
            <option value="rtsp">RTSP Stream</option>
            <option value="webcam">Webcam</option>
            <option value="dashcam">Dashcam</option>
            <option value="drone">Drone UAV</option>
            <option value="mobile">Mobile Stream</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Operational Statuses</option>
            <option value="online">Online</option>
            <option value="busy">Processing</option>
            <option value="maintenance">Maintenance</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        <div className="md:col-span-1 flex items-center justify-center">
          <div className="text-xs font-medium text-slate-400 bg-slate-900 border border-slate-800 px-3 py-2.5 rounded-xl w-full text-center">
            {filteredCameras.length} Units
          </div>
        </div>
      </div>

      {/* Camera Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCameras.map((cam) => (
          <div
            key={cam.id}
            className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-all group"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getTypeBadge(cam.camera_type)}
                    {getStatusBadge(cam.status)}
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                    {cam.camera_name}
                  </h3>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenEditModal(cam)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    title="Edit Camera Settings"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteCamera(cam.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Delete Camera"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="space-y-2.5 bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 mb-4 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-500" />
                    Stream URL:
                  </span>
                  <span className="font-mono text-slate-300 truncate max-w-[180px]" title={cam.stream_url}>
                    {cam.stream_url}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    Location:
                  </span>
                  <span className="text-slate-200 truncate max-w-[180px]">
                    {cam.location_name || `${cam.latitude.toFixed(3)}, ${cam.longitude.toFixed(3)}`}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span>Stream Spec:</span>
                  <span className="text-slate-300 font-medium">
                    {cam.resolution} @ {cam.fps} FPS
                  </span>
                </div>
              </div>
            </div>

            {/* Live Metrics & Actions */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <p className="text-slate-500">Road Health</p>
                  <p className="font-bold text-emerald-400">{cam.road_health ?? 85.0}%</p>
                </div>
                <div>
                  <p className="text-slate-500">Detections</p>
                  <p className="font-bold text-amber-400">{cam.detection_count ?? 0}</p>
                </div>
                <div>
                  <p className="text-slate-500">Vehicles</p>
                  <p className="font-bold text-blue-400">{cam.vehicle_count ?? 0}</p>
                </div>
              </div>

              <button
                onClick={() => onSelectCameraForLive(cam)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-xl text-xs font-semibold transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                Live Stream
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Camera Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingCamera ? 'Edit Camera Configuration' : 'Register New Camera Feed'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Camera Name</label>
                <input
                  type="text"
                  required
                  value={formData.camera_name}
                  onChange={(e) => setFormData({ ...formData, camera_name: e.target.value })}
                  placeholder="e.g. Highway 101 North - Cam 1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Camera Type</label>
                  <select
                    value={formData.camera_type}
                    onChange={(e) => setFormData({ ...formData, camera_type: e.target.value as CameraType })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="cctv">CCTV</option>
                    <option value="rtsp">RTSP Stream</option>
                    <option value="webcam">Webcam</option>
                    <option value="dashcam">Dashcam</option>
                    <option value="drone">Drone UAV</option>
                    <option value="mobile">Mobile Stream</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Initial Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as CameraStatus })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="online">Online</option>
                    <option value="busy">Processing</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Stream Endpoint / RTSP URL / Device Index
                </label>
                <input
                  type="text"
                  required
                  value={formData.stream_url}
                  onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
                  placeholder="rtsp://admin:pass@192.168.1.100:554/live or 0 for webcam"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Location Name</label>
                <input
                  type="text"
                  value={formData.location_name}
                  onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                  placeholder="Connaught Place Junction, New Delhi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">FPS Target</label>
                  <input
                    type="number"
                    value={formData.fps}
                    onChange={(e) => setFormData({ ...formData, fps: parseInt(e.target.value) || 30 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Resolution</label>
                  <input
                    type="text"
                    value={formData.resolution}
                    onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                    placeholder="1920x1080"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl"
                >
                  {editingCamera ? 'Save Changes' : 'Register Camera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
