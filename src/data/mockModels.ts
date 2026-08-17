import { DetectionModel, UserAccount, AuditLog } from '../types/inspection';

export const initialModels: DetectionModel[] = [
  {
    id: 'm-1',
    model_name: 'yolov11s',
    display_name: 'YOLO11 Small',
    weight_path: 'weights/yolov11s-pothole.pt',
    enabled: true,
    version: '11.0.1',
    description: 'Fast, lightweight object detector optimized for real-time mobile/dashcam road inspection.',
    is_default: false
  },
  {
    id: 'm-2',
    model_name: 'yolov11n',
    display_name: 'YOLO11 Nano',
    weight_path: 'weights/yolov11n-pothole.pt',
    enabled: true,
    version: '11.0.0',
    description: 'Ultra-fast nano model for resource-constrained edge hardware and high FPS video streams.',
    is_default: false
  },
  {
    id: 'm-3',
    model_name: 'yolov11m',
    display_name: 'YOLO11 Medium',
    weight_path: 'weights/yolov11m-pothole.pt',
    enabled: true,
    version: '11.0.2',
    description: 'Balanced performance & mAP for standard highway inspection and crack severity classification.',
    is_default: false
  },
  {
    id: 'm-4',
    model_name: 'yolov11l',
    display_name: 'YOLO11 Large',
    weight_path: 'weights/yolov11l-pothole.pt',
    enabled: true,
    version: '11.0.2',
    description: 'High accuracy model detecting fine longitudinal and transverse asphalt micro-cracks.',
    is_default: false
  },
  {
    id: 'm-5',
    model_name: 'yolov11x',
    display_name: 'YOLO11 Extra Large',
    weight_path: 'weights/yolov11x-pothole.pt',
    enabled: true,
    version: '11.0.3',
    description: 'Production flagship model with maximum mAP@0.5:0.95 for official municipal road audits.',
    is_default: true
  },
  {
    id: 'm-6',
    model_name: 'yolov8n',
    display_name: 'YOLOv8n',
    weight_path: 'weights/yolov8n-rdd2022.pt',
    enabled: true,
    version: '8.1.0',
    description: 'Legacy Ultralytics YOLOv8 nano model trained on Global Road Damage Detection 2022 dataset.',
    is_default: false
  },
  {
    id: 'm-7',
    model_name: 'yolov8s',
    display_name: 'YOLOv8s',
    weight_path: 'weights/yolov8s-rdd2022.pt',
    enabled: true,
    version: '8.1.0',
    description: 'Legacy Ultralytics YOLOv8 small model with low memory footprint.',
    is_default: false
  },
  {
    id: 'm-8',
    model_name: 'yolov8m',
    display_name: 'YOLOv8m',
    weight_path: 'weights/yolov8m-rdd2022.pt',
    enabled: true,
    version: '8.1.1',
    description: 'Legacy Ultralytics YOLOv8 medium model.',
    is_default: false
  },
  {
    id: 'm-9',
    model_name: 'yolov8l',
    display_name: 'YOLOv8l',
    weight_path: 'weights/yolov8l-rdd2022.pt',
    enabled: true,
    version: '8.1.1',
    description: 'Legacy Ultralytics YOLOv8 large model.',
    is_default: false
  },
  {
    id: 'm-10',
    model_name: 'yolov8x',
    display_name: 'YOLOv8x',
    weight_path: 'weights/yolov8x-rdd2022.pt',
    enabled: true,
    version: '8.1.2',
    description: 'Legacy Ultralytics YOLOv8 extra large model.',
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
    details: 'Switched active YOLO model from yolov8n to YOLO11 Extra Large (yolov11x).'
  },
  {
    id: 'log-2',
    timestamp: '2026-07-28 03:40:11',
    user: 'inspector.vance',
    role: 'inspector',
    action: 'RUN_DETECTION',
    details: 'Executed YOLOv11 defect detection on highway_inspection_section_A.mp4.'
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
