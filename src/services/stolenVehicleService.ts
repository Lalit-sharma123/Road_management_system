import { apiClient } from './apiClient';
import {
  StolenVehicle,
  StolenVehicleCreateInput,
  StolenVehicleAlert,
  StolenVehicleStats,
  StolenVehicleSettings
} from '../types/stolenVehicle';

const STORAGE_VEHICLES_KEY = 'stolen_vehicles_registry_v1';
const STORAGE_ALERTS_KEY = 'stolen_alerts_history_v1';
const STORAGE_SETTINGS_KEY = 'stolen_vehicle_settings_v1';

const INITIAL_STOLEN_VEHICLES: StolenVehicle[] = [
  {
    id: 'sv-001',
    vehicle_number: 'HR26DQ5519',
    owner_name: 'Vikram Singh',
    vehicle_type: 'CAR',
    fir_number: 'FIR-2026-HR-8821',
    police_station: 'DLF Phase 2 Police Station, Gurugram',
    date_reported: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    reason: 'Armed Vehicle Theft at Cyber Hub Parking',
    priority: 'CRITICAL',
    status: 'ACTIVE',
    notes: 'Silver Hyundai Creta. Suspects heading towards NH-48 Expressway.',
    created_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString()
  },
  {
    id: 'sv-002',
    vehicle_number: 'DL01AB1234',
    owner_name: 'Rajesh Sharma',
    vehicle_type: 'CAR',
    fir_number: 'FIR-2026-DEL-1092',
    police_station: 'Connaught Place Police Station, New Delhi',
    date_reported: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
    reason: 'Vehicle Theft from Residential Driveway',
    priority: 'HIGH',
    status: 'ACTIVE',
    notes: 'White Honda City with tinted windows. Intercept on Ring Road.',
    created_at: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 3600000).toISOString()
  },
  {
    id: 'sv-003',
    vehicle_number: 'MH12DE1432',
    owner_name: 'Amitabh Deshmukh',
    vehicle_type: 'MOTORCYCLE',
    fir_number: 'FIR-2026-MH-4401',
    police_station: 'Shivaji Nagar Police Station, Pune',
    date_reported: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    reason: 'Two-Wheeler Theft from Metro Station',
    priority: 'HIGH',
    status: 'ACTIVE',
    notes: 'Black Royal Enfield Classic 350. Custom exhaust.',
    created_at: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 3600000).toISOString()
  },
  {
    id: 'sv-004',
    vehicle_number: 'KA05MK9821',
    owner_name: 'Pooja Reddy',
    vehicle_type: 'SUV',
    fir_number: 'FIR-2026-KA-3012',
    police_station: 'Indiranagar Police Station, Bengaluru',
    date_reported: new Date(Date.now() - 14 * 24 * 3600000).toISOString(),
    reason: 'Vehicle Hijack Case',
    priority: 'MEDIUM',
    status: 'RECOVERED',
    notes: 'White Toyota Fortuner. Recovered by Highway Patrol Unit 4.',
    created_at: new Date(Date.now() - 14 * 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 3600000).toISOString()
  },
  {
    id: 'sv-005',
    vehicle_number: 'UP16AX7788',
    owner_name: 'Sunil Verma',
    vehicle_type: 'CAR',
    fir_number: 'FIR-2026-UP-6672',
    police_station: 'Sector 20 Police Station, Noida',
    date_reported: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
    reason: 'Stolen Commercial Delivery Vehicle',
    priority: 'HIGH',
    status: 'ACTIVE',
    notes: 'Red Maruti Swift Dzire. Used in commercial deliveries.',
    created_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString()
  }
];

const INITIAL_ALERTS: StolenVehicleAlert[] = [
  {
    id: 'sta-001',
    stolen_vehicle_id: 'sv-001',
    vehicle_number: 'HR26DQ5519',
    owner_name: 'Vikram Singh',
    fir_number: 'FIR-2026-HR-8821',
    camera_id: 'CAM-01',
    camera_name: 'NH-48 ANPR Live Feed',
    camera_location: 'NH-48 Cyber City Gateway, Gurugram',
    latitude: 28.4595,
    longitude: 77.0266,
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    vehicle_snapshot_url: '/processed/violations/sample_vehicle.jpg',
    plate_crop_url: '/processed/violations/sample_plate.jpg',
    ocr_text: 'HR26DQ5519',
    confidence: 0.98,
    status: 'ACTIVE',
    resolved_by: undefined,
    remarks: 'Real-time ANPR match detected. Alert dispatched to Highway Intercept Patrol Unit 7.',
    created_at: new Date(Date.now() - 12 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 60000).toISOString()
  },
  {
    id: 'sta-002',
    stolen_vehicle_id: 'sv-002',
    vehicle_number: 'DL01AB1234',
    owner_name: 'Rajesh Sharma',
    fir_number: 'FIR-2026-DEL-1092',
    camera_id: 'CAM-03',
    camera_name: 'Ring Road Fixed Optical Sensor',
    camera_location: 'South Extension Flyover, Delhi',
    latitude: 28.5708,
    longitude: 77.2215,
    timestamp: new Date(Date.now() - 75 * 60000).toISOString(),
    vehicle_snapshot_url: '/processed/violations/sample_vehicle.jpg',
    plate_crop_url: '/processed/violations/sample_plate.jpg',
    ocr_text: 'DL01AB1234',
    confidence: 0.96,
    status: 'INVESTIGATING',
    resolved_by: 'Inspector R. K. Nair',
    remarks: 'Traffic police squad deployed at Moolchand junction.',
    created_at: new Date(Date.now() - 75 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 75 * 60000).toISOString()
  },
  {
    id: 'sta-003',
    stolen_vehicle_id: 'sv-003',
    vehicle_number: 'MH12DE1432',
    owner_name: 'Amitabh Deshmukh',
    fir_number: 'FIR-2026-MH-4401',
    camera_id: 'CAM-02',
    camera_name: 'Highway Patrol ANPR Mobile 2',
    camera_location: 'Western Expressway Junction',
    latitude: 18.5204,
    longitude: 73.8567,
    timestamp: new Date(Date.now() - 210 * 60000).toISOString(),
    vehicle_snapshot_url: '/processed/violations/sample_vehicle.jpg',
    plate_crop_url: '/processed/violations/sample_plate.jpg',
    ocr_text: 'MH12DE1432',
    confidence: 0.94,
    status: 'INTERCEPTED',
    resolved_by: 'Sub-Inspector Patil',
    remarks: 'Vehicle stopped and rider detained at Checkpoint Bravo.',
    created_at: new Date(Date.now() - 210 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 210 * 60000).toISOString()
  }
];

const INITIAL_SETTINGS: StolenVehicleSettings = {
  enabled: true,
  alert_cooldown_seconds: 300,
  duplicate_interval_seconds: 300,
  dashboard_notification: true,
  browser_notification: true,
  sound_alert: true,
  sms_enabled: true,
  whatsapp_enabled: false,
  email_enabled: false
};

function getStoredVehicles(): StolenVehicle[] {
  try {
    const raw = localStorage.getItem(STORAGE_VEHICLES_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_VEHICLES_KEY, JSON.stringify(INITIAL_STOLEN_VEHICLES));
      return INITIAL_STOLEN_VEHICLES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_STOLEN_VEHICLES;
  } catch {
    return INITIAL_STOLEN_VEHICLES;
  }
}

function saveStoredVehicles(list: StolenVehicle[]): void {
  try {
    localStorage.setItem(STORAGE_VEHICLES_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to save stolen vehicles to localStorage:', err);
  }
}

function getStoredAlerts(): StolenVehicleAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_ALERTS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_ALERTS_KEY, JSON.stringify(INITIAL_ALERTS));
      return INITIAL_ALERTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ALERTS;
  } catch {
    return INITIAL_ALERTS;
  }
}

function saveStoredAlerts(list: StolenVehicleAlert[]): void {
  try {
    localStorage.setItem(STORAGE_ALERTS_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to save stolen alerts to localStorage:', err);
  }
}

function calculateLocalStats(vehicles: StolenVehicle[], alerts: StolenVehicleAlert[]): StolenVehicleStats {
  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE').length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const alertsToday = alerts.filter(a => new Date(a.timestamp) >= today).length;
  const recoveredVehicles = vehicles.filter(v => v.status === 'RECOVERED').length;
  const criticalCount = alerts.filter(a => a.status === 'ACTIVE').length;

  const statusBreakdown: Record<string, number> = {};
  alerts.forEach(a => {
    statusBreakdown[a.status] = (statusBreakdown[a.status] || 0) + 1;
  });

  const priorityBreakdown: Record<string, number> = {};
  vehicles.forEach(v => {
    priorityBreakdown[v.priority] = (priorityBreakdown[v.priority] || 0) + 1;
  });

  const cameraMap: Record<string, { camera_name: string; location: string; count: number }> = {};
  alerts.forEach(a => {
    const key = a.camera_name || 'ANPR Highway';
    if (!cameraMap[key]) {
      cameraMap[key] = {
        camera_name: key,
        location: a.camera_location || 'Corridor',
        count: 0
      };
    }
    cameraMap[key].count += 1;
  });

  const dailyTrend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);
    const count = alerts.filter(a => {
      const ts = new Date(a.timestamp);
      return ts >= dayStart && ts <= dayEnd;
    }).length;
    dailyTrend.push({ date: dateStr, count });
  }

  return {
    total_stolen_vehicles: vehicles.length,
    active_alerts: activeAlerts,
    alerts_today: alertsToday,
    recovered_vehicles: recoveredVehicles,
    total_alerts_all_time: alerts.length,
    critical_alerts_count: criticalCount,
    status_breakdown: statusBreakdown,
    priority_breakdown: priorityBreakdown,
    camera_breakdown: Object.values(cameraMap),
    daily_trend: dailyTrend
  };
}

export const stolenVehicleService = {
  // ==========================================
  // Stolen Vehicle Registry Endpoints
  // ==========================================
  async getStolenVehicles(params?: {
    search?: string;
    status?: string;
    priority?: string;
    vehicle_type?: string;
    skip?: number;
    limit?: number;
  }): Promise<StolenVehicle[]> {
    try {
      const res = await apiClient.get<StolenVehicle[]>('/stolen-vehicles', { params });
      if (Array.isArray(res.data) && res.data.length > 0) {
        saveStoredVehicles(res.data);
        return res.data;
      }
    } catch (e) {
      // Gracefully fall back to local storage
    }

    let list = getStoredVehicles();

    if (params?.status && params.status !== 'ALL') {
      list = list.filter(v => v.status.toUpperCase() === params.status?.toUpperCase());
    }
    if (params?.priority && params.priority !== 'ALL') {
      list = list.filter(v => v.priority.toUpperCase() === params.priority?.toUpperCase());
    }
    if (params?.vehicle_type && params.vehicle_type !== 'ALL') {
      list = list.filter(v => v.vehicle_type.toUpperCase() === params.vehicle_type?.toUpperCase());
    }
    if (params?.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      list = list.filter(v =>
        v.vehicle_number.toLowerCase().includes(q) ||
        v.fir_number.toLowerCase().includes(q) ||
        (v.owner_name && v.owner_name.toLowerCase().includes(q)) ||
        (v.police_station && v.police_station.toLowerCase().includes(q))
      );
    }

    return list;
  },

  async getStolenVehicleById(id: string): Promise<StolenVehicle> {
    try {
      const res = await apiClient.get<StolenVehicle>(`/stolen-vehicles/${id}`);
      if (res.data) return res.data;
    } catch (e) {
      // Fall through
    }
    const vehicles = getStoredVehicles();
    const found = vehicles.find(v => v.id === id);
    if (found) return found;
    throw new Error('Stolen vehicle record not found');
  },

  async createStolenVehicle(data: StolenVehicleCreateInput): Promise<StolenVehicle> {
    const newId = `sv-${Date.now()}`;
    const newVehicle: StolenVehicle = {
      id: newId,
      vehicle_number: data.vehicle_number.toUpperCase().trim(),
      owner_name: data.owner_name?.trim() || '',
      vehicle_type: data.vehicle_type || 'CAR',
      fir_number: data.fir_number.trim(),
      police_station: data.police_station.trim(),
      date_reported: data.date_reported || new Date().toISOString(),
      reason: data.reason || 'Vehicle Theft',
      priority: data.priority || 'HIGH',
      status: data.status || 'ACTIVE',
      notes: data.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const vehicles = getStoredVehicles();
    saveStoredVehicles([newVehicle, ...vehicles]);

    try {
      await apiClient.post<StolenVehicle>('/stolen-vehicles', data);
    } catch (e) {
      console.info('Backend unavailable for remote vehicle sync; saved locally.');
    }

    return newVehicle;
  },

  async updateStolenVehicle(id: string, data: Partial<StolenVehicleCreateInput>): Promise<StolenVehicle> {
    const vehicles = getStoredVehicles();
    let updated: StolenVehicle | null = null;
    const newList = vehicles.map(v => {
      if (v.id === id) {
        updated = {
          ...v,
          ...data,
          vehicle_number: (data.vehicle_number || v.vehicle_number).toUpperCase().trim(),
          updated_at: new Date().toISOString()
        };
        return updated;
      }
      return v;
    });

    if (updated) {
      saveStoredVehicles(newList);
    }

    try {
      await apiClient.put<StolenVehicle>(`/stolen-vehicles/${id}`, data);
    } catch (e) {
      console.info('Backend unavailable for update sync; updated locally.');
    }

    return updated || vehicles[0];
  },

  async deleteStolenVehicle(id: string): Promise<{ status: string; message: string }> {
    const vehicles = getStoredVehicles();
    saveStoredVehicles(vehicles.filter(v => v.id !== id));

    try {
      await apiClient.delete<{ status: string; message: string }>(`/stolen-vehicles/${id}`);
    } catch (e) {
      console.info('Backend unavailable for vehicle deletion sync; deleted locally.');
    }

    return { status: 'success', message: 'Vehicle deleted from registry' };
  },

  async markAsRecovered(id: string, notes?: string): Promise<StolenVehicle> {
    return this.updateStolenVehicle(id, {
      status: 'RECOVERED',
      notes: notes ? `[RECOVERED on ${new Date().toLocaleDateString()}]: ${notes}` : undefined
    });
  },

  // ==========================================
  // Stolen Vehicle Alerts Endpoints
  // ==========================================
  async getStolenAlerts(params?: {
    search?: string;
    status?: string;
    camera_id?: string;
    days?: number;
    skip?: number;
    limit?: number;
  }): Promise<StolenVehicleAlert[]> {
    try {
      const res = await apiClient.get<StolenVehicleAlert[]>('/stolen-alerts', { params });
      if (Array.isArray(res.data) && res.data.length > 0) {
        saveStoredAlerts(res.data);
        return res.data;
      }
    } catch (e) {
      // Gracefully fall back to local storage
    }

    let list = getStoredAlerts();

    if (params?.status && params.status !== 'ALL') {
      list = list.filter(a => a.status.toUpperCase() === params.status?.toUpperCase());
    }
    if (params?.camera_id && params.camera_id !== 'ALL') {
      list = list.filter(a => a.camera_id === params.camera_id);
    }
    if (params?.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      list = list.filter(a =>
        a.vehicle_number.toLowerCase().includes(q) ||
        (a.fir_number && a.fir_number.toLowerCase().includes(q)) ||
        (a.owner_name && a.owner_name.toLowerCase().includes(q)) ||
        (a.camera_name && a.camera_name.toLowerCase().includes(q)) ||
        (a.camera_location && a.camera_location.toLowerCase().includes(q))
      );
    }

    return list;
  },

  async getLiveAlerts(limit: number = 10): Promise<StolenVehicleAlert[]> {
    try {
      const res = await apiClient.get<StolenVehicleAlert[]>('/stolen-alerts/live', {
        params: { limit }
      });
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch (e) {
      // Fall through
    }

    const alerts = getStoredAlerts();
    return alerts.filter(a => a.status === 'ACTIVE' || a.status === 'INVESTIGATING').slice(0, limit);
  },

  async getStats(): Promise<StolenVehicleStats> {
    try {
      const res = await apiClient.get<StolenVehicleStats>('/stolen-alerts/stats');
      if (res.data && typeof res.data.total_stolen_vehicles === 'number') {
        return res.data;
      }
    } catch (e) {
      // Fall through
    }

    const vehicles = getStoredVehicles();
    const alerts = getStoredAlerts();
    return calculateLocalStats(vehicles, alerts);
  },

  async resolveAlert(payload: {
    alert_id: string;
    status: string;
    resolved_by: string;
    remarks?: string;
  }): Promise<StolenVehicleAlert> {
    const alerts = getStoredAlerts();
    let updatedAlert: StolenVehicleAlert | null = null;
    const nowIso = new Date().toISOString();
    const newAlerts = alerts.map(a => {
      if (a.id === payload.alert_id) {
        const remarkEntry = payload.remarks
          ? `[${payload.status} by ${payload.resolved_by} on ${new Date().toLocaleDateString()}]: ${payload.remarks}`
          : undefined;
        updatedAlert = {
          ...a,
          status: payload.status,
          resolved_by: payload.resolved_by,
          remarks: remarkEntry ? `${a.remarks || ''}\n${remarkEntry}`.trim() : a.remarks,
          updated_at: nowIso
        };
        return updatedAlert;
      }
      return a;
    });

    if (updatedAlert) {
      saveStoredAlerts(newAlerts);
    }

    try {
      await apiClient.post<StolenVehicleAlert>('/stolen-alerts/resolve', payload);
    } catch (e) {
      console.info('Backend unavailable for alert resolution sync; updated locally.');
    }

    return updatedAlert || alerts[0];
  },

  getExportCsvUrl(status?: string): string {
    return `/api/v1/stolen-alerts/export/csv${status ? `?status=${encodeURIComponent(status)}` : ''}`;
  },

  async simulateDetection(plateNumber: string = 'HR26DQ5519'): Promise<{ status: string; alert?: StolenVehicleAlert; message: string }> {
    const cleanPlate = plateNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const vehicles = getStoredVehicles();
    const matched = vehicles.find(v => v.vehicle_number.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanPlate);
    const nowIso = new Date().toISOString();

    const newAlert: StolenVehicleAlert = {
      id: `sta-${Date.now()}`,
      stolen_vehicle_id: matched ? matched.id : 'sv-001',
      vehicle_number: matched ? matched.vehicle_number : plateNumber,
      owner_name: matched ? matched.owner_name : 'Registered Vehicle Owner',
      fir_number: matched ? matched.fir_number : 'FIR-2026-POL-9912',
      camera_id: 'CAM-01',
      camera_name: 'NH-48 ANPR Live Feed',
      camera_location: 'NH-48 Cyber City Gateway, Gurugram',
      latitude: 28.4595,
      longitude: 77.0266,
      timestamp: nowIso,
      vehicle_snapshot_url: '/processed/violations/sample_vehicle.jpg',
      plate_crop_url: '/processed/violations/sample_plate.jpg',
      ocr_text: plateNumber,
      confidence: 0.98,
      status: 'ACTIVE',
      remarks: 'Simulated ANPR real-time detection intercept trigger.',
      created_at: nowIso,
      updated_at: nowIso
    };

    const alerts = getStoredAlerts();
    saveStoredAlerts([newAlert, ...alerts]);

    try {
      const res = await apiClient.post('/stolen-alerts/simulate', null, {
        params: { plate_number: plateNumber }
      });
      if (res.data) return res.data;
    } catch (e) {
      // Return simulated alert response
    }

    return {
      status: 'alert_dispatched',
      alert: newAlert,
      message: `🚨 Stolen Vehicle Alert dispatched for plate ${newAlert.vehicle_number} at ${newAlert.camera_location}`
    };
  },

  // ==========================================
  // Settings Endpoints
  // ==========================================
  async getSettings(): Promise<StolenVehicleSettings> {
    try {
      const res = await apiClient.get<StolenVehicleSettings>('/stolen-vehicles/config/settings');
      if (res.data) return res.data;
    } catch (e) {
      // Fall through
    }
    try {
      const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return INITIAL_SETTINGS;
  },

  async updateSettings(settings: StolenVehicleSettings): Promise<StolenVehicleSettings> {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch {}

    try {
      const res = await apiClient.put<StolenVehicleSettings>('/stolen-vehicles/config/settings', settings);
      if (res.data) return res.data;
    } catch (e) {
      console.info('Backend settings sync skipped; saved locally.');
    }

    return settings;
  }
};
