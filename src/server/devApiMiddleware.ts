import type { Plugin, Connect } from 'vite';
import { IncomingMessage, ServerResponse } from 'http';

interface StoredComplaint {
  id: string;
  complaint_number: string;
  road_name: string;
  road_authority: string;
  assigned_department: string;
  severity: string;
  description: string;
  status: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

const memoryComplaints: StoredComplaint[] = [
  {
    id: 'cmp_seed_001',
    complaint_number: 'GRV-2026-00109',
    road_name: 'National Highway 44 (Kashmir-Kanyakumari Corridor)',
    road_authority: 'National Highways Authority of India (NHAI)',
    assigned_department: 'NHAI Regional Field Unit & Pavement Division',
    severity: 'critical',
    description: 'Deep hazardous cavity on express lane near chainage 142.2. Critical collision risk for two-wheelers and high-speed commuters.',
    status: 'In Progress',
    latitude: 28.6139,
    longitude: 77.2090,
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: 'cmp_seed_002',
    complaint_number: 'GRV-2026-00110',
    road_name: 'Outer Ring Road (Sector 62 Junction)',
    road_authority: 'State Public Works Department (PWD)',
    assigned_department: 'State PWD Road Maintenance Cell',
    severity: 'high',
    description: 'Asphalt rutting and series of edge cracks creating sudden wheel destabilization during lane change.',
    status: 'Under Review',
    latitude: 28.5355,
    longitude: 77.3910,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'cmp_seed_003',
    complaint_number: 'GRV-2026-00111',
    road_name: 'MG Road Urban Arterial Link',
    road_authority: 'Municipal Corporation Urban Infrastructure Division',
    assigned_department: 'Municipal PWD Infrastructure Wing',
    severity: 'medium',
    description: 'Transverse thermal fracture expanding following heavy monsoon runoff near central drainage curb.',
    status: 'Resolved',
    latitude: 28.4595,
    longitude: 77.0266,
    created_at: new Date(Date.now() - 3600000 * 96).toISOString(),
  }
];

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.end(JSON.stringify(data));
}

export function devApiPlugin(): Plugin {
  return {
    name: 'dev-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        const url = req.url || '';
        const method = req.method || 'GET';

        // Only intercept /api/ routes if no external backend URL is set
        if (!url.startsWith('/api/') && !url.startsWith('/driver/') && !url.startsWith('/violations') && !url.startsWith('/stolen-vehicles')) {
          return next();
        }

        // Handle CORS preflight
        if (method === 'OPTIONS') {
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          return res.end();
        }

        // Clean path to match without query string
        const [cleanPath] = url.split('?');
        const normalized = cleanPath.replace(/^\/api\/v1/, '').replace(/^\/api/, '');

        // 1. Driver Complaints Endpoints
        if ((normalized === '/driver/complaints' || cleanPath.endsWith('/driver/complaints')) && method === 'POST') {
          const body = await parseJsonBody(req);
          const ticketNum = `CMP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
          const roadAuth = body.road_authority || 'National Highways Authority of India (NHAI)';

          const complaint: StoredComplaint = {
            id: `cmp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            complaint_number: ticketNum,
            road_name: body.road_name || 'Highway Segment',
            road_authority: roadAuth,
            assigned_department: `${roadAuth} Maintenance Division`,
            severity: body.severity || 'high',
            description: body.description || 'Hazardous road defect identified via onboard Driver Assistance System.',
            status: 'Submitted',
            latitude: Number(body.latitude) || 28.6139,
            longitude: Number(body.longitude) || 77.2090,
            created_at: new Date().toISOString()
          };

          memoryComplaints.unshift(complaint);
          return sendJson(res, 200, {
            status: 'success',
            message: `Pothole complaint ${ticketNum} filed successfully with ${roadAuth}.`,
            complaint
          });
        }

        if ((normalized === '/driver/complaints' || cleanPath.endsWith('/driver/complaints')) && method === 'GET') {
          return sendJson(res, 200, {
            total: memoryComplaints.length,
            complaints: memoryComplaints
          });
        }

        // 2. Driver Stats & Telemetry
        if (normalized === '/driver/stats') {
          return sendJson(res, 200, {
            session_potholes: 3,
            today_potholes: 14,
            road_potholes: 5,
            total_complaints: memoryComplaints.length,
            current_road: 'NH-44 Delhi-Agra Expressway'
          });
        }

        if (normalized === '/driver/potholes') {
          return sendJson(res, 200, {
            total: 3,
            potholes: [
              {
                id: 'pot_01',
                latitude: 28.6145,
                longitude: 77.2095,
                severity: 'critical',
                road_name: 'NH-44 Expressway',
                road_authority: 'NHAI',
                confidence: 0.94,
                detected_at: new Date().toISOString()
              },
              {
                id: 'pot_02',
                latitude: 28.6180,
                longitude: 77.2140,
                severity: 'high',
                road_name: 'NH-44 Expressway',
                road_authority: 'NHAI',
                confidence: 0.88,
                detected_at: new Date(Date.now() - 120000).toISOString()
              }
            ]
          });
        }

        if (normalized === '/driver/telemetry/potholes' || normalized === '/driver/pothole-telemetry') {
          const now = Date.now();
          const windowMins = 10;
          const intervals = [];
          const seedPotholes = [2, 1, 3, 2, 4, 1, 3, 2, 5, 3];
          let totalPotholes = 0;
          let totalCracks = 0;

          for (let i = windowMins - 1; i >= 0; i--) {
            const timeAtMin = new Date(now - i * 60000);
            const label = i === 0 ? 'Now' : `-${i}m`;
            const pCount = seedPotholes[(windowMins - 1 - i) % seedPotholes.length];
            const cCount = Math.max(0, Math.floor(pCount * 0.75));
            totalPotholes += pCount;
            totalCracks += cCount;

            intervals.push({
              interval: label,
              timestamp: timeAtMin.getTime(),
              minutes_ago: i,
              potholes: pCount,
              cracks: cCount,
              critical_count: pCount >= 4 ? 2 : pCount >= 2 ? 1 : 0,
              high_count: pCount > 0 ? Math.ceil(pCount * 0.6) : 0,
              medium_count: pCount > 0 ? Math.floor(pCount * 0.4) : 0,
              low_count: 0,
              frequency_density: +(pCount / 1.0).toFixed(2),
              severity_index: +(7.5 + (pCount * 0.35)).toFixed(1)
            });
          }

          const currentFreq = +(intervals[intervals.length - 1].potholes).toFixed(1);
          const peakFreq = Math.max(...intervals.map(it => it.potholes));

          return sendJson(res, 200, {
            status: 'success',
            timestamp: new Date().toISOString(),
            pothole_count: totalPotholes,
            crack_count: totalCracks,
            total_defects: totalPotholes + totalCracks,
            density_per_km: +(totalPotholes / 3.4).toFixed(2),
            current_frequency_per_min: currentFreq,
            peak_frequency_per_min: peakFreq,
            time_window_minutes: windowMins,
            categories: {
              pothole: totalPotholes,
              alligator_crack: Math.floor(totalCracks * 0.6),
              longitudinal_crack: Math.ceil(totalCracks * 0.4)
            },
            frequency_timeline: intervals
          });
        }

        if (normalized === '/analytics/live-telemetry') {
          const now = Date.now();
          const intervals = [];
          const seedPotholes = [2, 1, 3, 2, 4, 1, 3, 2, 5, 3];
          let totalP = 0;
          let totalC = 0;

          for (let i = 9; i >= 0; i--) {
            const timeAtMin = new Date(now - i * 60000);
            const pCount = seedPotholes[(9 - i) % seedPotholes.length];
            const cCount = Math.max(0, Math.floor(pCount * 0.7));
            totalP += pCount;
            totalC += cCount;

            intervals.push({
              interval: i === 0 ? 'Now' : `-${i}m`,
              timestamp: timeAtMin.getTime(),
              minutes_ago: i,
              potholes: pCount,
              cracks: cCount,
              critical_count: pCount >= 3 ? 1 : 0,
              high_count: pCount > 0 ? Math.ceil(pCount * 0.6) : 0,
              medium_count: pCount > 0 ? Math.floor(pCount * 0.4) : 0,
              low_count: 0,
              frequency_density: +(pCount / 1.0).toFixed(2),
              severity_index: +(7.5 + (pCount * 0.35)).toFixed(1)
            });
          }

          return sendJson(res, 200, {
            status: 'success',
            timestamp: new Date().toISOString(),
            road_health: {
              average_road_health_score: 78.4,
              total_inspected_sections: 14,
              rating: 'Moderate Distress'
            },
            pothole_telemetry: {
              pothole_count: totalP,
              crack_count: totalC,
              total_defects: totalP + totalC,
              density_per_km: +(totalP / 3.4).toFixed(2),
              current_frequency_per_min: +(intervals[intervals.length - 1].potholes).toFixed(1),
              peak_frequency_per_min: Math.max(...intervals.map(it => it.potholes)),
              time_window_minutes: 10,
              categories: {
                pothole: totalP,
                alligator_crack: 8,
                longitudinal_crack: 6,
                transverse_crack: 4,
                missing_asphalt: 2
              },
              frequency_timeline: intervals
            },
            severity_scoring: {
              severities: {
                low: 12,
                medium: 18,
                high: 22,
                critical: 8
              },
              critical_count: 8,
              formula_weights: {
                weight_area: 0.40,
                weight_confidence: 0.30,
                weight_category: 0.30
              },
              estimated_budget: {
                pothole_repairs: 45000,
                crack_sealing: 22000,
                critical_re_asphalt: 85000,
                total_estimated_budget: 152000
              }
            },
            stolen_vehicle_telemetry: {
              total_stolen_registered: 18,
              active_alerts_count: 3,
              intercepted_count: 5,
              alerts_today_count: 2,
              intercept_rate: 62.5,
              timeline: [
                { day: 'Mon', alerts: 1 },
                { day: 'Tue', alerts: 2 },
                { day: 'Wed', alerts: 0 },
                { day: 'Thu', alerts: 3 },
                { day: 'Fri', alerts: 2 },
                { day: 'Sat', alerts: 1 },
                { day: 'Sun', alerts: 2 }
              ],
              recent_intercepts: []
            },
            traffic_mobility: {
              total_vehicles: 480,
              vehicles_by_type: {
                car: 260,
                truck: 95,
                bus: 45,
                motorcycle: 65,
                auto: 15
              }
            },
            violations_enforcement: {
              total_violations: 24,
              helmet_violations: 14,
              total_fines_amount: 24000,
              paid_fines_amount: 9500,
              violations_breakdown: [
                { category: 'No Helmet', challans: 14, fines: 14000, fill: '#FF3B30' },
                { category: 'Over-Speeding', challans: 6, fines: 6000, fill: '#FF9500' },
                { category: 'Wrong Lane', challans: 4, fines: 4000, fill: '#FFD60A' }
              ]
            },
            monthly_trends: {
              months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
              potholes: [14, 18, 22, 19, 28, 32],
              cracks: [10, 12, 16, 14, 20, 24],
              stolen_alerts: [1, 2, 1, 3, 2, 4],
              average_health_score: [85, 83, 81, 80, 78, 77]
            }
          });
        }

        if (normalized === '/driver/performance') {
          return sendJson(res, 200, {
            telemetry: {
              is_cuda: true,
              device_name: 'NVIDIA TensorRT / CUDA 12.4 Acceleration',
              gpu_allocated_mb: 1824.5,
              gpu_reserved_mb: 2450.0,
              gpu_total_mb: 8192.0,
              gpu_utilization_pct: 22.8,
              fps: 28.4,
              total_frames_processed: 1420,
              avg_latency_ms: 18.2,
              min_latency_ms: 14.1,
              max_latency_ms: 22.8,
              dropped_frames: 0,
              latency_history: [18.2, 17.9, 18.5, 18.1, 17.8, 18.4, 18.0, 18.2, 17.6, 18.9],
              pipeline_status: 'optimal',
              cpu_percent: 18.5,
              gpu_percent: 42.0,
              memory_used_mb: 312,
              memory_total_mb: 8192,
              active_streams: 1,
              frame_skip_ratio: 0.2
            },
            stage_breakdown_ms: {
              capture: 4.1,
              preprocessing: 6.2,
              yolo_inference: 14.8,
              distance_depth: 3.5,
              postprocessing_tts: 5.6
            }
          });
        }

        if (normalized === '/driver/settings' && (method === 'POST' || method === 'PUT')) {
          const body = await parseJsonBody(req);
          return sendJson(res, 200, {
            status: 'success',
            message: 'Driver assistance parameters updated successfully',
            settings: body
          });
        }

        // 3. Auth routes
        if (normalized === '/auth/login' || normalized === '/auth/register') {
          return sendJson(res, 200, {
            access_token: 'mock_jwt_token_admin_2026',
            token_type: 'bearer',
            user: {
              id: 'usr_admin_01',
              email: 'inspector@nhai.gov.in',
              username: 'admin',
              full_name: 'Chief Road Safety Officer',
              role: 'admin',
              is_active: true
            }
          });
        }

        if (normalized === '/auth/me') {
          return sendJson(res, 200, {
            id: 'usr_admin_01',
            email: 'inspector@nhai.gov.in',
            username: 'admin',
            full_name: 'Chief Road Safety Officer',
            role: 'admin',
            is_active: true
          });
        }

        // 4. Dashboard & Analytics routes
        if (normalized === '/dashboard/summary') {
          return sendJson(res, 200, {
            total_inspections: 142,
            total_violations: 68,
            total_stolen_alerts: 5,
            potholes_detected: 384,
            average_road_health: 78.4,
            active_cameras: 12,
            pending_complaints: memoryComplaints.filter(c => c.status !== 'Resolved').length
          });
        }

        // 5. YOLO Models & Cameras
        if (normalized === '/models') {
          return sendJson(res, 200, [
            {
              id: 'm-5',
              model_name: 'yolov11x',
              display_name: 'YOLO11 Extra Large',
              weight_path: 'weights/yolov11x-pothole.pt',
              enabled: true,
              version: '11.0.3',
              description: 'Production flagship model with maximum mAP for road inspections.',
              is_default: true,
              status: 'active'
            },
            {
              id: 'm-3',
              model_name: 'yolov11m',
              display_name: 'YOLO11 Medium',
              weight_path: 'weights/yolov11m-pothole.pt',
              enabled: true,
              version: '11.0.2',
              description: 'Balanced performance & mAP for standard highway inspection.',
              is_default: false,
              status: 'active'
            }
          ]);
        }

        if (normalized === '/models/telemetry') {
          return sendJson(res, 200, {
            fps: 29.2,
            latency_ms: 18.4,
            gpu_utilization: 44.5,
            memory_used_mb: 312,
            active_model: 'yolov11x',
            frames_processed: 1420
          });
        }

        // Fallback for any other /api route: Return 200 with standard payload
        return sendJson(res, 200, {
          status: 'success',
          message: 'Operation processed successfully',
          data: []
        });
      });
    }
  };
}
