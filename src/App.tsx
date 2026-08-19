import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardOverview } from './components/DashboardOverview';
import { VideoUploadAndProcessor } from './components/VideoUploadAndProcessor';
import { LiveProcessing } from './components/LiveProcessing';
import { ResultsDashboard } from './components/ResultsDashboard';
import { YOLODetectorView } from './components/YOLODetectorView';
import { CVPipelineView } from './components/CVPipelineView';
import { GpsMappingView } from './components/GpsMappingView';
import { AnalyticsView } from './components/AnalyticsView';
import { ReportsView } from './components/ReportsView';
import { ModelManagementView } from './components/ModelManagementView';
import { UserManagementView } from './components/UserManagementView';
import { CameraManagementView } from './components/CameraManagementView';
import { CameraLiveGridView } from './components/CameraLiveGridView';
import { DriverModeView } from './components/DriverModeView';
import { ViolationsView } from './components/ViolationsView';
import { BackendCodeViewer } from './components/BackendCodeViewer';
import { SettingsView } from './components/SettingsView';
import { sampleVideos } from './data/mockData';
import { sampleCameras } from './data/mockCameras';
import { initialModels, initialUsers, initialAuditLogs } from './data/mockModels';
import { InspectionVideo, UserRole, DetectionModel, UserAccount, AuditLog, CameraDevice } from './types/inspection';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { authService, UserProfile } from './services/authService';
import { videoService } from './services/videoService';
import { cameraService, modelService, userService, logService } from './services/systemService';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<InspectionVideo[]>(sampleVideos);
  const [selectedVideo, setSelectedVideo] = useState<InspectionVideo>(sampleVideos[0]);

  // Model Switcher & Registry State
  const [models, setModels] = useState<DetectionModel[]>(initialModels);
  const [currentModel, setCurrentModel] = useState<DetectionModel>(initialModels[4]); // YOLO11 Extra Large
  const [isSwitchingModel, setIsSwitchingModel] = useState<boolean>(false);

  // User Accounts & Audit Logs State
  const [users, setUsers] = useState<UserAccount[]>(initialUsers);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);

  // Cameras State & Handlers
  const [cameras, setCameras] = useState<CameraDevice[]>(sampleCameras);

  // Initial fetch from backend APIs
  useEffect(() => {
    // Restore JWT Session
    const token = authService.getStoredToken();
    if (token) {
      authService.getMe()
        .then((user) => {
          setCurrentUser(user);
          setCurrentRole(user.role);
        })
        .catch(() => {
          authService.logout();
          setCurrentUser(null);
        });
    }

    // Fetch initial videos
    videoService.listVideos()
      .then((serverVideos) => {
        if (Array.isArray(serverVideos) && serverVideos.length > 0) {
          setVideos(serverVideos);
          setSelectedVideo(serverVideos[0]);
        }
      })
      .catch(() => {});

    // Fetch initial cameras
    cameraService.listCameras()
      .then((serverCameras) => {
        if (Array.isArray(serverCameras) && serverCameras.length > 0) {
          setCameras(serverCameras);
        }
      })
      .catch(() => {});

    // Fetch initial models
    modelService.listModels()
      .then((serverModels) => {
        if (Array.isArray(serverModels) && serverModels.length > 0) {
          setModels(serverModels);
          const active = serverModels.find(m => m.is_default || m.enabled) || serverModels[0];
          if (active) setCurrentModel(active);
        }
      })
      .catch(() => {});

    // Fetch initial users
    userService.listUsers()
      .then((serverUsers) => {
        if (Array.isArray(serverUsers) && serverUsers.length > 0) {
          setUsers(serverUsers);
        }
      })
      .catch(() => {});

    // Fetch audit logs
    logService.listLogs()
      .then((serverLogs) => {
        if (Array.isArray(serverLogs) && serverLogs.length > 0) {
          setAuditLogs(serverLogs);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setCurrentRole('viewer');
    showToast('Logged Out', 'JWT session invalidated successfully.');
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    showToast('Authenticated', `Welcome back, ${user.full_name || user.username}!`);
  };

  const handleAddCamera = async (newCamData: Omit<CameraDevice, 'id' | 'created_at' | 'updated_at'>) => {
    const createdCam = await cameraService.createCamera(newCamData);
    setCameras([createdCam, ...cameras]);
    logService.createLog({
      action: 'CAMERA_ADDED',
      category: 'CAMERA',
      details: `Added new camera stream: ${createdCam.camera_name}`,
      user_email: currentUser?.email || 'admin@roadvision.ai'
    }).catch(() => {});
    showToast('Camera Added', `Registered ${createdCam.camera_name} in camera fleet.`);
  };

  const handleUpdateCamera = async (updatedCam: CameraDevice) => {
    const res = await cameraService.updateCamera(updatedCam.id, updatedCam);
    setCameras(cameras.map((c) => (c.id === updatedCam.id ? res : c)));
    showToast('Camera Updated', `Updated configuration for ${updatedCam.camera_name}`);
  };

  const handleDeleteCamera = async (camId: string) => {
    await cameraService.deleteCamera(camId);
    setCameras(cameras.filter((c) => c.id !== camId));
    logService.createLog({
      action: 'CAMERA_DELETED',
      category: 'CAMERA',
      details: `Deregistered camera ID ${camId}`,
      user_email: currentUser?.email || 'admin@roadvision.ai'
    }).catch(() => {});
    showToast('Camera Removed', 'Deregistered camera feed from system.');
  };

  // Toast Notifications
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'warning' } | null>(null);

  // System Settings State
  const [ollamaUrl, setOllamaUrl] = useState<string>('http://localhost:11434');
  const [selectedModel, setSelectedModel] = useState<string>('llama3.1');
  const [yoloModel, setYoloModel] = useState<string>(initialModels[4].weight_path);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.35);
  const [frameSkip, setFrameSkip] = useState<number>(5);

  const showToast = (title: string, desc: string, type: 'success' | 'warning' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAddVideo = (newVid: InspectionVideo) => {
    setVideos([newVid, ...videos]);
    setSelectedVideo(newVid);
    showToast('Video Stream Processed', `Ingested ${newVid.title} with 14ms average inference latency.`);
  };

  // Dynamic Detection Model Switcher Handler (POST /api/models/select)
  const handleSelectModel = async (targetModel: DetectionModel) => {
    if (currentRole !== 'admin') {
      showToast('RBAC Restricted', 'Only users with ADMIN role can switch detection models.', 'warning');
      return;
    }

    if (targetModel.model_name === currentModel.model_name) return;

    setIsSwitchingModel(true);

    // Simulate FastAPI REST API network latency
    await new Promise((resolve) => setTimeout(resolve, 800));

    setCurrentModel(targetModel);
    setYoloModel(targetModel.weight_path);
    setIsSwitchingModel(false);

    // Append Audit Log Entry
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: currentRole === 'admin' ? 'admin.sterling' : 'inspector.vance',
      role: currentRole,
      action: 'MODEL_SWITCH',
      details: `Active model switched from ${currentModel.display_name} to ${targetModel.display_name} (${targetModel.weight_path})`
    };
    setAuditLogs([newLog, ...auditLogs]);

    showToast(
      'Model Loaded Successfully',
      `Switched CUDA detection model to ${targetModel.display_name} (${targetModel.version})`
    );
  };

  const handleToggleModelEnabled = (modelId: string) => {
    if (currentRole !== 'admin') return;

    setModels(models.map(m => {
      if (m.id === modelId) {
        return { ...m, enabled: !m.enabled };
      }
      return m;
    }));

    showToast('Model Registry Updated', 'Toggled detection model activation status.');
  };

  const handleSetDefaultModel = (modelId: string) => {
    if (currentRole !== 'admin') return;

    setModels(models.map(m => ({
      ...m,
      is_default: m.id === modelId
    })));

    showToast('Default Model Updated', 'New default model set for future inference workers.');
  };

  const handleAddModel = (newModelData: Omit<DetectionModel, 'id'>) => {
    const newModel: DetectionModel = {
      ...newModelData,
      id: `m-${Date.now()}`
    };
    setModels([...models, newModel]);
    showToast('Custom Weights Registered', `Registered ${newModel.display_name} in model registry.`);
  };

  const handleDeleteModel = (modelId: string) => {
    if (currentRole !== 'admin') return;
    const target = models.find(m => m.id === modelId);
    if (!target) return;
    if (target.model_name === currentModel.model_name) {
      showToast('Cannot Delete Active Model', 'Switch to another model before deleting this model.', 'warning');
      return;
    }
    setModels(models.filter(m => m.id !== modelId));
    showToast('Model Removed', `Deleted model ${target.display_name} from registry.`);
  };

  const handleAddUser = (userData: Omit<UserAccount, 'id' | 'created_at'>) => {
    const newUser: UserAccount = {
      ...userData,
      id: `u-${Date.now()}`,
      created_at: new Date().toISOString().split('T')[0]
    };
    setUsers([...users, newUser]);

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: 'admin.sterling',
      role: 'admin',
      action: 'USER_PROVISION',
      details: `Created user ${newUser.username} with role ${newUser.role.toUpperCase()}`
    };
    setAuditLogs([newLog, ...auditLogs]);

    showToast('User Account Provisioned', `Issued JWT credentials for ${newUser.username}`);
  };

  const handleDeleteUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    setUsers(users.filter(u => u.id !== userId));

    if (target) {
      showToast('User Revoked', `Removed user account ${target.username}`);
    }
  };

  const handleChangeUserRole = (userId: string, newRole: UserRole) => {
    setUsers(users.map(u => {
      if (u.id === userId) {
        return { ...u, role: newRole };
      }
      return u;
    }));

    showToast('Role Scope Updated', `Updated user role assignment to ${newRole.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#E0E0E0] font-sans flex flex-col justify-between border-[6px] sm:border-[12px] border-[#1A1A1A] selection:bg-[#FF3B30] selection:text-white relative">
      {/* Dynamic Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 max-w-sm bg-[#141414] border border-[#2A2A2A] p-3 shadow-2xl flex items-start gap-3 font-mono animate-bounce-short">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-[#34C759] shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-[#FF9500] shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h4 className="text-xs font-bold text-white uppercase">{toastMessage.title}</h4>
            <p className="text-[10px] text-[#AAA] mt-0.5">{toastMessage.desc}</p>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-[#666] hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Navigation */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        models={models}
        currentModel={currentModel}
        onSelectModel={handleSelectModel}
        isSwitchingModel={isSwitchingModel}
        currentUser={currentUser}
        onLogout={handleLogout}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'dashboard' && (
          <DashboardOverview 
            videos={videos}
            onSelectVideo={setSelectedVideo}
            onNavigate={setActiveTab}
            currentRole={currentRole}
          />
        )}

        {activeTab === 'violations' && (
          <ViolationsView 
            currentRole={currentRole}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'driver_mode' && (
          <DriverModeView />
        )}


        {activeTab === 'camera_grid' && (
          <CameraLiveGridView
            cameras={cameras}
            onSelectCamera={(cam) => {
              setActiveTab('live_processing');
              showToast('Feed Selected', `Focusing live vision stream for ${cam.camera_name}`);
            }}
            showToast={showToast}
          />
        )}

        {activeTab === 'cameras' && (
          <CameraManagementView
            cameras={cameras}
            currentRole={currentRole}
            onAddCamera={handleAddCamera}
            onUpdateCamera={handleUpdateCamera}
            onDeleteCamera={handleDeleteCamera}
            onSelectCameraForLive={(cam) => {
              setActiveTab('live_processing');
              showToast('Feed Selected', `Focusing live vision stream for ${cam.camera_name}`);
            }}
            showToast={showToast}
          />
        )}

        {activeTab === 'upload' && (
          <VideoUploadAndProcessor 
            videos={videos}
            onAddVideo={handleAddVideo}
            onNavigate={setActiveTab}
            currentRole={currentRole}
          />
        )}

        {activeTab === 'live_processing' && (
          <LiveProcessing 
            videoId={selectedVideo?.id || 'default-vid'}
            video={selectedVideo}
            onNavigate={setActiveTab}
            onProcessingComplete={(completedVid) => {
              setSelectedVideo(completedVid);
              handleAddVideo(completedVid);
            }}
          />
        )}

        {activeTab === 'results' && (
          <ResultsDashboard 
            video={selectedVideo}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'detector' && (
          <YOLODetectorView 
            video={selectedVideo}
            onNavigate={setActiveTab}
            currentModel={currentModel}
          />
        )}

        {activeTab === 'cv-filters' && (
          <CVPipelineView 
            video={selectedVideo}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'gps-map' && (
          <GpsMappingView 
            video={selectedVideo}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView 
            video={selectedVideo}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView 
            video={selectedVideo}
            currentRole={currentRole}
            selectedModel={selectedModel}
          />
        )}

        {activeTab === 'models' && (
          <ModelManagementView 
            currentRole={currentRole}
            models={models}
            currentModel={currentModel}
            onSelectModel={handleSelectModel}
            onToggleModelEnabled={handleToggleModelEnabled}
            onSetDefaultModel={handleSetDefaultModel}
            onAddModel={handleAddModel}
            onDeleteModel={handleDeleteModel}
            isSwitching={isSwitchingModel}
          />
        )}

        {activeTab === 'users' && (
          <UserManagementView 
            currentRole={currentRole}
            users={users}
            onAddUser={handleAddUser}
            onDeleteUser={handleDeleteUser}
            onChangeUserRole={handleChangeUserRole}
            auditLogs={auditLogs}
          />
        )}

        {activeTab === 'backend-code' && (
          <BackendCodeViewer />
        )}

        {activeTab === 'settings' && (
          <SettingsView 
            currentRole={currentRole}
            ollamaUrl={ollamaUrl}
            setOllamaUrl={setOllamaUrl}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            yoloModel={yoloModel}
            setYoloModel={setYoloModel}
            confidenceThreshold={confidenceThreshold}
            setConfidenceThreshold={setConfidenceThreshold}
            frameSkip={frameSkip}
            setFrameSkip={setFrameSkip}
          />
        )}
      </main>

      {/* Technical Dashboard System Footer */}
      <footer className="h-auto py-2 bg-[#1A1A1A] border-t border-[#2A2A2A] px-4 sm:px-6 text-[9px] font-mono text-[#888] flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[#34C759] rounded-full animate-pulse"></span>
          <span>
            BACKEND: FastAPI 0.111 // DETECTOR: [{currentModel.display_name.toUpperCase()}] // OLLAMA [{selectedModel.toUpperCase()}] // PostgreSQL 16.2
          </span>
        </div>
        <div className="hidden md:block">
          ACTIVE WEIGHTS: {currentModel.weight_path} // ROLE: [{currentRole.toUpperCase()}]
        </div>
        <div>MEMORY_USAGE: 4.2GB / 16GB // DISK: 24% // CUDA_0: ONLINE</div>
      </footer>
    </div>
  );
}
