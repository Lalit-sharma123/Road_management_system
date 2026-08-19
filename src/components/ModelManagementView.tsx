import React, { useState } from 'react';
import { 
  Boxes, 
  CheckCircle2, 
  XCircle, 
  Power, 
  Star, 
  Cpu, 
  HardDrive, 
  Plus, 
  ShieldAlert, 
  Zap, 
  RefreshCw, 
  Database,
  Lock,
  Search,
  Check,
  AlertTriangle,
  Trash2,
  Upload,
  FileCode
} from 'lucide-react';
import { DetectionModel, UserRole } from '../types/inspection';

interface ModelManagementViewProps {
  currentRole: UserRole;
  models: DetectionModel[];
  currentModel: DetectionModel;
  onSelectModel: (model: DetectionModel) => Promise<void> | void;
  onToggleModelEnabled: (modelId: string) => void;
  onSetDefaultModel: (modelId: string) => void;
  onAddModel: (newModel: Omit<DetectionModel, 'id'>) => void;
  onDeleteModel?: (modelId: string) => void;
  isSwitching: boolean;
}

export const ModelManagementView: React.FC<ModelManagementViewProps> = ({
  currentRole,
  models = [],
  currentModel,
  onSelectModel,
  onToggleModelEnabled,
  onSetDefaultModel,
  onAddModel,
  onDeleteModel,
  isSwitching
}) => {
  const safeModels = Array.isArray(models) ? models : [];
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newWeightPath, setNewWeightPath] = useState('');
  const [newVersion, setNewVersion] = useState('11.0.0');
  const [newDescription, setNewDescription] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isAdmin = currentRole === 'admin';

  const filteredModels = safeModels.filter(m => 
    m.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.model_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setNewWeightPath(`weights/${file.name}`);
      if (!newModelName) {
        setNewModelName(fileNameWithoutExt.toLowerCase().replace(/[^a-z0-9]/g, '-'));
      }
      if (!newDisplayName) {
        setNewDisplayName(`YOLO ${fileNameWithoutExt.toUpperCase()}`);
      }
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelName || !newDisplayName || !newWeightPath) return;

    onAddModel({
      model_name: newModelName.trim().toLowerCase(),
      display_name: newDisplayName.trim(),
      weight_path: newWeightPath.trim(),
      enabled: true,
      version: newVersion.trim() || '1.0.0',
      description: newDescription.trim() || 'Custom uploaded PyTorch .pt model weights.'
    });

    setNewModelName('');
    setNewDisplayName('');
    setNewWeightPath('');
    setNewDescription('');
    setUploadedFile(null);
    setShowAddModal(false);
  };

  if (!isAdmin) {
    return (
      <div className="bg-[#141414] border border-[#2A2A2A] p-8 text-center space-y-4 max-w-2xl mx-auto my-12 font-mono">
        <div className="w-12 h-12 bg-[#FF3B30]/10 border border-[#FF3B30] flex items-center justify-center mx-auto text-[#FF3B30]">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white uppercase tracking-wider">Access Restricted (Admin Required)</h2>
        <p className="text-xs text-[#888]">
          You are currently logged in with role <span className="text-[#FF9500] font-bold uppercase">[{currentRole}]</span>. 
          Model registry configuration, model activation/deactivation, and weight file management require <span className="text-[#A855F7] font-bold">ADMIN</span> authorization.
        </p>
        <div className="p-3 bg-[#111] border border-[#222] text-[10px] text-[#666]">
          HTTP 403 Forbidden // Insufficient RBAC JWT Scope
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#E0E0E0] font-mono">
      {/* Header Banner */}
      <div className="bg-[#141414] border border-[#2A2A2A] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#A855F7] text-[10px] uppercase tracking-widest mb-0.5">
            <Boxes className="w-3.5 h-3.5" />
            <span>ADMINISTRATOR CONTROL PANEL // MODEL REGISTRY</span>
          </div>
          <h2 className="text-base font-bold text-white uppercase">Ultralytics YOLO Model Registry & Lifecycle Management</h2>
          <p className="text-[11px] text-[#888]">
            Manage installed models, version tags, weight paths, enable/disable status, default defaults, and upload new .pt weight files.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-mono uppercase tracking-wider border border-blue-400 flex items-center space-x-2 shadow-[0_0_10px_rgba(37,99,235,0.3)]"
          >
            <Upload className="w-4 h-4" />
            <span>Upload New .pt Model</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-[#111] border border-[#222] p-3">
          <div className="text-[10px] text-[#888] uppercase font-bold">Installed Models</div>
          <div className="text-lg font-bold text-white font-mono mt-0.5">{models.length} Models</div>
        </div>
        <div className="bg-[#111] border border-[#222] p-3">
          <div className="text-[10px] text-[#888] uppercase font-bold">Current Model</div>
          <div className="text-xs font-bold text-[#FF3B30] font-mono truncate mt-1">{currentModel.display_name}</div>
        </div>
        <div className="bg-[#111] border border-[#222] p-3">
          <div className="text-[10px] text-[#888] uppercase font-bold">Enabled Models</div>
          <div className="text-lg font-bold text-[#34C759] font-mono mt-0.5">{models.filter(m => m.enabled).length} Active</div>
        </div>
        <div className="bg-[#111] border border-[#222] p-3">
          <div className="text-[10px] text-[#888] uppercase font-bold">Default Model</div>
          <div className="text-xs font-bold text-[#FF9500] font-mono truncate mt-1">
            {models.find(m => m.is_default)?.display_name || currentModel.display_name}
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between bg-[#141414] border border-[#2A2A2A] px-3 py-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#666] absolute left-3 top-2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search installed models by name, version, or description..."
            className="w-full bg-[#1A1A1A] border border-[#333] pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#2563EB]"
          />
        </div>
        <div className="text-[10px] text-[#888] uppercase">
          Installed Models: {filteredModels.length} / {models.length}
        </div>
      </div>

      {/* Models Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredModels.map((model) => {
          const isActive = currentModel.model_name === model.model_name;

          return (
            <div
              key={model.id}
              className={`bg-[#111111] border p-4 space-y-3 relative transition-all ${
                isActive
                  ? 'border-[#FF3B30] bg-[#161212] shadow-[0_0_12px_rgba(255,59,48,0.15)]'
                  : model.enabled
                  ? 'border-[#2A2A2A] hover:border-[#444]'
                  : 'border-[#222] opacity-60 bg-[#0B0B0B]'
              }`}
            >
              {/* Top Header Row */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <h3 className="text-sm font-bold text-white font-mono">{model.display_name}</h3>
                    <span className="text-[9px] bg-[#1A1A1A] border border-[#333] px-1.5 py-0.2 text-[#AAA]">
                      Version: {model.version}
                    </span>
                    {isActive && (
                      <span className="text-[9px] bg-[#FF3B30] text-white font-bold px-1.5 py-0.2 uppercase tracking-wider">
                        CURRENT MODEL
                      </span>
                    )}
                    {model.is_default && (
                      <span className="text-[9px] bg-[#FF9500]/20 text-[#FF9500] border border-[#FF9500]/40 font-bold px-1.5 py-0.2 uppercase">
                        DEFAULT MODEL
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#FF9500] font-mono mt-0.5">{model.model_name}</p>
                </div>

                <div className="flex items-center space-x-1.5">
                  {/* Enable / Disable Toggle Button */}
                  <button
                    onClick={() => onToggleModelEnabled(model.id)}
                    title={model.enabled ? 'Disable Model' : 'Enable Model'}
                    className={`p-1.5 border text-xs flex items-center gap-1 ${
                      model.enabled
                        ? 'bg-[#34C759]/10 border-[#34C759]/40 text-[#34C759]'
                        : 'bg-[#FF3B30]/10 border-[#FF3B30]/40 text-[#FF3B30]'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-bold">{model.enabled ? 'ENABLED' : 'DISABLED'}</span>
                  </button>

                  {/* Delete Button */}
                  {onDeleteModel && (
                    <button
                      onClick={() => setDeleteConfirmId(model.id)}
                      disabled={isActive}
                      title={isActive ? 'Cannot delete current active model' : 'Delete model'}
                      className={`p-1.5 border text-xs ${
                        isActive 
                          ? 'bg-[#141414] border-[#222] text-[#444] cursor-not-allowed'
                          : 'bg-[#FF3B30]/10 border-[#FF3B30]/30 hover:bg-[#FF3B30]/20 text-[#FF3B30]'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <span className="text-[10px] text-[#666] uppercase font-bold block mb-0.5">Description:</span>
                <p className="text-xs text-[#AAA] leading-relaxed font-mono">
                  {model.description}
                </p>
              </div>

              {/* Weight Path & Status Metadata */}
              <div className="bg-[#181818] border border-[#222] p-2 text-[10px] space-y-1 font-mono">
                <div className="flex justify-between text-[#888]">
                  <span className="font-bold text-[#AAA]">WEIGHT PATH:</span>
                  <span className="text-slate-300 font-bold truncate max-w-[240px]">{model.weight_path}</span>
                </div>
                <div className="flex justify-between text-[#888]">
                  <span className="font-bold text-[#AAA]">STATUS:</span>
                  <span className={model.enabled ? "text-[#34C759] font-bold" : "text-[#FF3B30] font-bold"}>
                    {model.enabled ? "ACTIVE IN REGISTRY" : "DISABLED"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-[#222]">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onSetDefaultModel(model.id)}
                    disabled={model.is_default}
                    className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider border flex items-center space-x-1 ${
                      model.is_default
                        ? 'bg-[#141414] text-[#555] border-[#222] cursor-not-allowed'
                        : 'bg-[#1A1A1A] hover:bg-[#252525] text-[#FF9500] border-[#FF9500]/40'
                    }`}
                  >
                    <Star className="w-3 h-3" />
                    <span>{model.is_default ? 'DEFAULT MODEL' : 'SET DEFAULT'}</span>
                  </button>
                </div>

                <button
                  onClick={() => onSelectModel(model)}
                  disabled={isActive || !model.enabled || isSwitching}
                  className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider font-bold border flex items-center space-x-1.5 transition-all ${
                    isActive
                      ? 'bg-[#FF3B30]/20 text-[#FF3B30] border-[#FF3B30] cursor-default'
                      : !model.enabled
                      ? 'bg-[#141414] text-[#444] border-[#222] cursor-not-allowed'
                      : 'bg-[#2563EB] hover:bg-blue-600 text-white border-blue-400 shadow-[0_0_8px_rgba(37,99,235,0.3)]'
                  }`}
                >
                  {isSwitching && !isActive ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : isActive ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  <span>{isActive ? 'CURRENT MODEL' : 'ACTIVATE MODEL'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#FF3B30] p-6 max-w-md w-full space-y-4 font-mono">
            <div className="flex items-center space-x-2 text-[#FF3B30]">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold uppercase">Confirm Model Deletion</h3>
            </div>
            <p className="text-xs text-[#AAA]">
              Are you sure you want to delete this model weight entry from the registry? The corresponding .pt weight file will be unlinked.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 bg-[#1A1A1A] text-[#888] hover:text-white text-xs uppercase"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onDeleteModel) onDeleteModel(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-1.5 bg-[#FF3B30] hover:bg-red-600 text-white text-xs font-bold uppercase"
              >
                Delete Model
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload New .pt Model Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] p-6 max-w-lg w-full space-y-4 font-mono">
            <div className="flex justify-between items-center border-b border-[#2A2A2A] pb-3">
              <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#2563EB]" />
                <span>Upload & Register New .pt Model Weights</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#888] hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              {/* File Upload Drop Zone */}
              <div>
                <label className="block text-[10px] font-bold text-[#AAA] uppercase mb-1">Select .pt PyTorch Weight File</label>
                <div className="border border-dashed border-[#444] bg-[#1A1A1A] p-4 text-center relative hover:border-[#2563EB] transition-all">
                  <input
                    type="file"
                    accept=".pt,.pth,.bin,.onnx"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileCode className="w-8 h-8 text-[#2563EB] mx-auto mb-1" />
                  {uploadedFile ? (
                    <div className="text-[#34C759] font-bold text-xs">{uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(1)} MB)</div>
                  ) : (
                    <div className="text-[11px] text-[#888]">
                      Click or drag and drop custom trained <span className="text-[#2563EB] font-bold">.pt / .onnx</span> weight binary file here
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#AAA] uppercase mb-1">Model Identifier (model_name)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. yolov11x-custom-highway"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#333] px-3 py-1.5 text-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#AAA] uppercase mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. YOLO11 Extra Large Highway Model"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#333] px-3 py-1.5 text-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#AAA] uppercase mb-1">Weight Path (weight_path)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. weights/yolov11x-custom.pt"
                  value={newWeightPath}
                  onChange={(e) => setNewWeightPath(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#333] px-3 py-1.5 text-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-[#AAA] uppercase mb-1">Version</label>
                  <input
                    type="text"
                    placeholder="11.2.0"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#333] px-3 py-1.5 text-white focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#AAA] uppercase mb-1">Status</label>
                  <div className="bg-[#1A1A1A] border border-[#333] px-3 py-1.5 text-[#34C759] font-bold">
                    ENABLED
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#AAA] uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Provide technical details about custom model training dataset..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#333] px-3 py-1.5 text-white focus:outline-none focus:border-[#2563EB]"
                />
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
                  className="px-4 py-1.5 bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                >
                  Upload & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

