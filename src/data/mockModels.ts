import { DetectionModel, UserAccount, AuditLog } from '../types/inspection';

export const initialModels: DetectionModel[] = [
  {
    id: 'm-damage',
    model_name: 'best.pt',
    display_name: 'Road Damage Detector (best.pt)',
    weight_path: 'backend/weights/best.pt',
    enabled: true,
    version: '1.0.0',
    description: 'Dedicated specialized model for road surface defect detection: pothole, longitudinal_crack, transverse_crack, alligator_crack, missing_asphalt, broken_road.',
    is_default: true
  },
  {
    id: 'm-vehicle',
    model_name: 'yolov8n.pt',
    display_name: 'Vehicle Classification Engine (yolov8n.pt)',
    weight_path: 'backend/weights/yolov8n.pt',
    enabled: true,
    version: '8.2.0',
    description: 'Dedicated specialized model for traffic volume and vehicle classification: car, truck, bus, motorcycle, bicycle, person.',
    is_default: false
  },
  {
    id: 'm-helmet',
    model_name: 'helmet.pt',
    display_name: 'Helmet Safety Auditor (helmet.pt)',
    weight_path: 'backend/weights/helmet.pt',
    enabled: true,
    version: '1.2.0',
    description: 'Dedicated specialized model for two-wheeler rider safety compliance: helmet, no_helmet.',
    is_default: false
  },
  {
    id: 'm-plate',
    model_name: 'numberplate-yolo-v26n.pt',
    display_name: 'Number Plate Auditor (numberplate-yolo-v26n.pt)',
    weight_path: 'backend/weights/numberplate-yolo-v26n.pt',
    enabled: true,
    version: '2.6.0',
    description: 'Dedicated specialized model for vehicle license plate localization and bounding extraction.',
    is_default: false
  },
  {
    id: 'm-helmet-plate',
    model_name: 'helmet_numberplate.pt',
    display_name: 'Combined Safety & Plate Auditor (helmet_numberplate.pt)',
    weight_path: 'backend/weights/helmet_numberplate.pt',
    enabled: true,
    version: '1.0.0',
    description: 'Backwards compatibility alias unified model for simultaneous rider helmet and vehicle license plate auditing.',
    is_default: false
  }
];

export const initialUsers: UserAccount[] = [
  {
    id: 'u-1',
    username: 'admin.sterling',
    email: 'admin.sterling@dot.gov',
    role: 'admin',
    created_at: '2026-01-15'
  },
  {
    id: 'u-2',
    username: 'inspector.vance',
    email: 'inspector.vance@dot.gov',
    role: 'inspector',
    created_at: '2026-02-01'
  },
  {
    id: 'u-3',
    username: 'viewer.public',
    email: 'audit.viewer@dot.gov',
    role: 'viewer',
    created_at: '2026-03-10'
  }
];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-07-28 04:15:22',
    user: 'admin.sterling',
    role: 'admin',
    action: 'MODEL_SWITCH',
    details: 'Switched active YOLO model to Road Damage Detector (best.pt).'
  },
  {
    id: 'log-2',
    timestamp: '2026-07-28 03:40:11',
    user: 'inspector.vance',
    role: 'inspector',
    action: 'RUN_DETECTION',
    details: 'Executed multi-model YOLO defect & vehicle detection with best.pt and yolov8n.pt.'
  },
  {
    id: 'log-3',
    timestamp: '2026-07-28 02:12:05',
    user: 'admin.sterling',
    role: 'admin',
    action: 'USER_ROLE_CHANGE',
    details: 'Updated role for user inspector.vance to INSPECTOR with video upload permissions.'
  }
];
