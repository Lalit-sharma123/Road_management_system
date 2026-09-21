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
const SESSION_ALERTED_PLATES_KEY = 'stolen_plates_alerted_session_v1';

const sessionAlertedPlatesSet = new Set<string>();

// Pre-hydrate session deduplication tracker from sessionStorage
try {
  const rawSession = typeof window !== 'undefined' ? sessionStorage.getItem(SESSION_ALERTED_PLATES_KEY) : null;
  if (rawSession) {
    const list: string[] = JSON.parse(rawSession);
    if (Array.isArray(list)) {
      list.forEach(p => sessionAlertedPlatesSet.add(String(p).toUpperCase().replace(/[^A-Z0-9]/g, '')));
    }
  }
} catch (e) {}

const INITIAL_STOLEN_VEHICLES: StolenVehicle[] = [];

const INITIAL_ALERTS: StolenVehicleAlert[] = [];

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
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
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
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
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
      list = list.filter(v => (v.status || '').toUpperCase() === (params.status || '').toUpperCase());
    }
    if (params?.priority && params.priority !== 'ALL') {
      list = list.filter(v => (v.priority || '').toUpperCase() === (params.priority || '').toUpperCase());
    }
    if (params?.vehicle_type && params.vehicle_type !== 'ALL') {
      list = list.filter(v => (v.vehicle_type || '').toUpperCase() === (params.vehicle_type || '').toUpperCase());
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
    video_id?: string;
    session_id?: string;
    days?: number;
    skip?: number;
    limit?: number;
  }): Promise<StolenVehicleAlert[]> {
    try {
      const res = await apiClient.get<StolenVehicleAlert[]>('/stolen-alerts', { params });
      if (Array.isArray(res.data)) {
        if (res.data.length > 0) {
          saveStoredAlerts(res.data);
        }
        return res.data;
      }
    } catch (e) {
      // Gracefully fall back to local storage
    }

    let list = getStoredAlerts();

    if (params?.video_id) {
      list = list.filter(a => a.video_id === params.video_id || a.stream_id === params.video_id);
    }
    if (params?.session_id) {
      list = list.filter(a => a.session_id === params.session_id);
    }
    if (params?.status && params.status !== 'ALL') {
      list = list.filter(a => (a.status || '').toUpperCase() === (params.status || '').toUpperCase());
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
      if (Array.isArray(res.data)) {
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

  async recordLiveAlert(alertData: Partial<StolenVehicleAlert> & { vehicle_number?: string }): Promise<StolenVehicleAlert> {
    const rawPlate = alertData.vehicle_number || alertData.ocr_text || '';
    const cleanPlate = rawPlate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const alerts = getStoredAlerts();
    const nowIso = new Date().toISOString();

    const existingIdx = alerts.findIndex(a => {
      const aPlate = (a.vehicle_number || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      return (alertData.id && a.id === alertData.id) || (cleanPlate && aPlate === cleanPlate);
    });

    let updatedOrCreatedAlert: StolenVehicleAlert;

    if (existingIdx >= 0) {
      const prev = alerts[existingIdx];
      const newCount = Math.max(prev.detection_count || 1, (alertData.detection_count || 1));
      updatedOrCreatedAlert = {
        ...prev,
        ...alertData,
        id: prev.id,
        detection_count: newCount,
        last_detected_at: alertData.last_detected_at || nowIso,
        confidence: Math.max(prev.confidence || 0, alertData.confidence || 0),
        remarks: alertData.remarks || prev.remarks,
        updated_at: nowIso
      };
      alerts[existingIdx] = updatedOrCreatedAlert;
    } else {
      updatedOrCreatedAlert = {
        id: alertData.id || `sta-${Date.now()}`,
        stolen_vehicle_id: alertData.stolen_vehicle_id,
        vehicle_number: alertData.vehicle_number || rawPlate || 'UNKNOWN',
        owner_name: alertData.owner_name || 'Registered Owner on File',
        fir_number: alertData.fir_number || 'POLICE-FIR-ACTIVE',
        camera_id: alertData.camera_id || 'CAM-01',
        camera_name: alertData.camera_name || 'Surveillance ANPR Camera',
        camera_location: alertData.camera_location || 'City Surveillance Corridor',
        latitude: alertData.latitude || 28.4595,
        longitude: alertData.longitude || 77.0266,
        timestamp: alertData.timestamp || nowIso,
        first_detected_at: alertData.first_detected_at || alertData.timestamp || nowIso,
        last_detected_at: alertData.last_detected_at || nowIso,
        vehicle_snapshot_url: alertData.vehicle_snapshot_url || '/processed/violations/sample_vehicle.jpg',
        plate_crop_url: alertData.plate_crop_url || '/processed/violations/sample_plate.jpg',
        ocr_text: alertData.ocr_text || alertData.vehicle_number || rawPlate,
        confidence: alertData.confidence || 0.95,
        status: alertData.status || 'ACTIVE',
        source: alertData.source || 'video',
        video_id: alertData.video_id,
        session_id: alertData.session_id,
        detection_count: alertData.detection_count || 1,
        remarks: alertData.remarks || `Stolen vehicle detected: ${alertData.vehicle_number || rawPlate}`,
        created_at: alertData.created_at || nowIso,
        updated_at: nowIso
      };
      alerts.unshift(updatedOrCreatedAlert);
    }

    saveStoredAlerts(alerts);
    return updatedOrCreatedAlert;
  },

  getExportCsvUrl(status?: string): string {
    return `/api/v1/stolen-alerts/export/csv${status ? `?status=${encodeURIComponent(status)}` : ''}`;
  },

  async simulateDetection(plateNumber: string = 'HR26DQ5519'): Promise<{ status: string; alert?: StolenVehicleAlert; message: string }> {
    const cleanPlate = String(plateNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const vehicles = getStoredVehicles();
    const matched = vehicles.find(v => (v.vehicle_number || '').toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanPlate);
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
  },

  // ==========================================
  // Single-Alert Deduplication & Stolen Matching
  // ==========================================
  normalizePlate(plateStr: string): string {
    return String(plateStr || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  },

  /**
   * Fast synchronous lookup to check if a detected number plate belongs to
   * an active registered stolen vehicle.
   */
  isPlateStolen(plateStr: string): StolenVehicle | null {
    const norm = this.normalizePlate(plateStr);
    if (!norm || norm.length < 4) return null;

    const vehicles = getStoredVehicles();

    // 1. Exact normalized match
    const exact = vehicles.find(v => {
      const vNorm = this.normalizePlate(v.vehicle_number);
      const active = (v.status || '').toUpperCase() !== 'RECOVERED' && (v.status || '').toUpperCase() !== 'INACTIVE';
      return active && vNorm === norm;
    });
    if (exact) return exact;

    // 2. Substring & 1-character OCR error tolerance for plate text >= 5 chars
    for (const v of vehicles) {
      const active = (v.status || '').toUpperCase() !== 'RECOVERED' && (v.status || '').toUpperCase() !== 'INACTIVE';
      if (!active) continue;

      const vNorm = this.normalizePlate(v.vehicle_number);
      if (vNorm.length >= 5 && norm.length >= 5) {
        if (vNorm.includes(norm) || norm.includes(vNorm)) {
          return v;
        }
        if (vNorm.length === norm.length) {
          let diffs = 0;
          for (let i = 0; i < vNorm.length; i++) {
            if (vNorm[i] !== norm[i]) diffs++;
            if (diffs > 1) break;
          }
          if (diffs <= 1) return v;
        }
      }
    }
    return null;
  },

  /**
   * Guarantees an alert for a detected stolen plate is sent ONLY ONE TIME.
   * Subsequent detections in the same video/session return true, suppressing repeat alert messages.
   */
  hasPlateBeenAlerted(plateStr: string, vehicleId?: string | null): boolean {
    const norm = this.normalizePlate(plateStr);
    if (!norm && !vehicleId) return false;

    if (norm && sessionAlertedPlatesSet.has(norm)) return true;
    if (vehicleId && sessionAlertedPlatesSet.has(vehicleId)) return true;

    // Check if the plate matches an active registered stolen vehicle
    const matched = norm ? this.isPlateStolen(norm) : null;
    if (matched) {
      const matchNorm = this.normalizePlate(matched.vehicle_number);
      if (sessionAlertedPlatesSet.has(matchNorm)) return true;
      if (matched.id && sessionAlertedPlatesSet.has(matched.id)) return true;
    }

    try {
      if (typeof window !== 'undefined') {
        const raw = sessionStorage.getItem(SESSION_ALERTED_PLATES_KEY) || localStorage.getItem(SESSION_ALERTED_PLATES_KEY);
        if (raw) {
          const list: string[] = JSON.parse(raw);
          if (Array.isArray(list)) {
            if (norm && list.includes(norm)) {
              sessionAlertedPlatesSet.add(norm);
              return true;
            }
            if (vehicleId && list.includes(vehicleId)) {
              sessionAlertedPlatesSet.add(vehicleId);
              return true;
            }
            if (matched) {
              const matchNorm = this.normalizePlate(matched.vehicle_number);
              if (list.includes(matchNorm) || (matched.id && list.includes(matched.id))) {
                sessionAlertedPlatesSet.add(matchNorm);
                return true;
              }
            }
          }
        }
      }
    } catch {}
    return false;
  },

  /**
   * Marks a plate as alerted so it is never alerted again during this inspection/session.
   */
  markPlateAlerted(plateStr: string, vehicleId?: string | null): void {
    const norm = this.normalizePlate(plateStr);
    if (!norm && !vehicleId) return;

    if (norm) sessionAlertedPlatesSet.add(norm);
    if (vehicleId) sessionAlertedPlatesSet.add(vehicleId);

    // If it matches a registered stolen vehicle, mark the canonical registration number and ID too
    const matched = norm ? this.isPlateStolen(norm) : null;
    if (matched) {
      const matchNorm = this.normalizePlate(matched.vehicle_number);
      sessionAlertedPlatesSet.add(matchNorm);
      if (matched.id) sessionAlertedPlatesSet.add(matched.id);
    }

    try {
      if (typeof window !== 'undefined') {
        const raw = sessionStorage.getItem(SESSION_ALERTED_PLATES_KEY) || localStorage.getItem(SESSION_ALERTED_PLATES_KEY);
        const list: string[] = raw ? JSON.parse(raw) : [];
        let modified = false;

        const toAdd = [norm, vehicleId, matched ? this.normalizePlate(matched.vehicle_number) : null, matched?.id].filter(Boolean) as string[];
        toAdd.forEach(item => {
          if (!list.includes(item)) {
            list.push(item);
            modified = true;
          }
        });

        if (modified) {
          sessionStorage.setItem(SESSION_ALERTED_PLATES_KEY, JSON.stringify(list));
          localStorage.setItem(SESSION_ALERTED_PLATES_KEY, JSON.stringify(list));
        }
      }
    } catch {}
  },

  /**
   * Clears the session deduplication tracker.
   */
  clearSessionAlertedPlates(): void {
    sessionAlertedPlatesSet.clear();
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(SESSION_ALERTED_PLATES_KEY);
      }
    } catch {}
  }
};
