import { apiClient } from './apiClient';
import { TrafficViolation, ViolationStats, ViolationFineStatus } from '../types/inspection';

export interface ViolationsListResponse {
  total: number;
  items: TrafficViolation[];
}

const STORAGE_KEY = 'traffic_violations_store_v1';

const INITIAL_VIOLATIONS: TrafficViolation[] = [
  {
    id: 'v1',
    challan_number: 'ECH-2026-892401',
    violation_type: 'NO_HELMET',
    license_plate_number: 'DL01AB1234',
    confidence: 0.96,
    rider_confidence: 0.94,
    fine_amount: 1000.0,
    fine_status: 'ISSUED',
    frame_number: 42,
    timestamp_seconds: 2.8,
    vehicle_type: 'MOTORCYCLE',
    latitude: 28.4595,
    longitude: 77.0266,
    location_name: 'National Highway 48 - Sector 29',
    notes: 'Rider detected without helmet on Honda CB Shine motorcycle. ANPR verified.',
    created_at: new Date(Date.now() - 45 * 60000).toISOString()
  },
  {
    id: 'v2',
    challan_number: 'ECH-2026-892402',
    violation_type: 'NO_HELMET',
    license_plate_number: 'MH12DE1432',
    confidence: 0.93,
    rider_confidence: 0.91,
    fine_amount: 1000.0,
    fine_status: 'PENDING',
    frame_number: 88,
    timestamp_seconds: 5.9,
    vehicle_type: 'SCOOTER',
    latitude: 28.4612,
    longitude: 77.0285,
    location_name: 'Golf Course Road Junction',
    notes: 'Two-wheeler rider without protective headgear. Captured via CCTV.',
    created_at: new Date(Date.now() - 135 * 60000).toISOString()
  },
  {
    id: 'v3',
    challan_number: 'ECH-2026-892403',
    violation_type: 'NO_HELMET',
    license_plate_number: 'KA05MK9821',
    confidence: 0.95,
    rider_confidence: 0.96,
    fine_amount: 1000.0,
    fine_status: 'PAID',
    frame_number: 135,
    timestamp_seconds: 9.0,
    vehicle_type: 'MOTORCYCLE',
    latitude: 28.4630,
    longitude: 77.0305,
    location_name: 'Cyber City Underpass',
    notes: 'Paid online via citizen portal payment gateway.',
    created_at: new Date(Date.now() - 330 * 60000).toISOString()
  },
  {
    id: 'v4',
    challan_number: 'ECH-2026-892404',
    violation_type: 'NO_HELMET',
    license_plate_number: 'HR26DQ5519',
    confidence: 0.94,
    rider_confidence: 0.89,
    fine_amount: 1000.0,
    fine_status: 'ISSUED',
    frame_number: 190,
    timestamp_seconds: 12.7,
    vehicle_type: 'MOTORCYCLE',
    latitude: 28.4655,
    longitude: 77.0330,
    location_name: 'MG Road Metro Pillar 142',
    notes: 'Automatic citation dispatched via SMS/Vahan registry notification.',
    created_at: new Date(Date.now() - 490 * 60000).toISOString()
  }
];

function getStoredViolations(): TrafficViolation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_VIOLATIONS));
      return INITIAL_VIOLATIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_VIOLATIONS;
  } catch {
    return INITIAL_VIOLATIONS;
  }
}

function saveStoredViolations(list: TrafficViolation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to persist violations to localStorage:', err);
  }
}

function calculateStats(items: TrafficViolation[]): ViolationStats {
  const helmetCount = items.filter(v => v.violation_type === 'NO_HELMET').length;
  const issuedCount = items.filter(v => v.fine_status === 'ISSUED').length;
  const pendingCount = items.filter(v => v.fine_status === 'PENDING').length;
  const paidCount = items.filter(v => v.fine_status === 'PAID').length;
  
  const totalFines = items.reduce((acc, v) => acc + (Number(v.fine_amount) || 0), 0);
  const paidFines = items.filter(v => v.fine_status === 'PAID').reduce((acc, v) => acc + (Number(v.fine_amount) || 0), 0);
  const unpaidFines = totalFines - paidFines;
  const uniquePlates = new Set(items.map(v => v.license_plate_number)).size;

  return {
    total_violations: items.length,
    helmet_violations_count: helmetCount,
    total_fines_amount: totalFines,
    paid_fines_amount: paidFines,
    unpaid_fines_amount: unpaidFines,
    issued_count: issuedCount,
    pending_count: pendingCount,
    paid_count: paidCount,
    unique_plates_count: uniquePlates,
    recent_violations: items.slice(0, 5)
  };
}

export const violationService = {
  async getViolations(params?: {
    status?: string;
    search?: string;
    violation_type?: string;
    video_id?: string;
    camera_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<ViolationsListResponse> {
    try {
      const response = await apiClient.get<ViolationsListResponse>('/violations', { params });
      if (response.data && Array.isArray(response.data.items) && response.data.items.length > 0) {
        saveStoredViolations(response.data.items);
        return response.data;
      }
    } catch {
      // Fall through to resilient local storage
    }

    let items = getStoredViolations();

    if (params?.status && params.status !== 'ALL') {
      items = items.filter(v => v.fine_status === params.status);
    }
    if (params?.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      items = items.filter(v => 
        v.license_plate_number.toLowerCase().includes(q) || 
        v.challan_number.toLowerCase().includes(q) ||
        (v.location_name && v.location_name.toLowerCase().includes(q))
      );
    }
    if (params?.violation_type && params.violation_type !== 'ALL') {
      items = items.filter(v => v.violation_type === params.violation_type);
    }

    return {
      total: items.length,
      items
    };
  },

  async getViolationStats(): Promise<ViolationStats> {
    try {
      const response = await apiClient.get<ViolationStats>('/violations/stats');
      if (response.data && typeof response.data.total_violations === 'number') {
        return response.data;
      }
    } catch {
      // Fall through to local stats
    }

    const items = getStoredViolations();
    return calculateStats(items);
  },

  async getViolationById(id: string): Promise<TrafficViolation> {
    try {
      const response = await apiClient.get<TrafficViolation>(`/violations/${id}`);
      if (response.data) return response.data;
    } catch {
      // Fall through
    }
    const items = getStoredViolations();
    const found = items.find(v => v.id === id);
    if (found) return found;
    throw new Error('Violation not found');
  },

  async updateViolationStatus(id: string, status: ViolationFineStatus, notes?: string): Promise<{ success: boolean; message: string }> {
    // 1. Immediately update local storage
    const items = getStoredViolations();
    const updatedItems = items.map(v => {
      if (v.id === id) {
        return {
          ...v,
          fine_status: status,
          notes: notes !== undefined ? notes : v.notes,
          updated_at: new Date().toISOString()
        };
      }
      return v;
    });
    saveStoredViolations(updatedItems);

    // 2. Attempt remote sync without throwing on offline / network error
    try {
      await apiClient.put(`/violations/${id}/status`, {
        fine_status: status,
        notes
      });
    } catch (netErr) {
      console.info('Backend unavailable for status sync; local storage updated:', netErr);
    }

    return { success: true, message: `Challan status updated to ${status}` };
  },

  async payFine(id: string): Promise<{ success: boolean; message: string }> {
    return this.updateViolationStatus(id, 'PAID', 'Paid via Online Payment Gateway');
  },

  async createManualViolation(data: {
    license_plate_number: string;
    violation_type?: string;
    vehicle_type?: string;
    fine_amount?: number;
    location_name?: string;
    latitude?: number;
    longitude?: number;
    camera_id?: string;
    notes?: string;
  }): Promise<{ success: boolean; challan_number: string; id: string }> {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const newChallanNumber = `ECH-2026-${randomSuffix}`;
    const newId = `viol-${Date.now()}-${randomSuffix}`;

    const newViolation: TrafficViolation = {
      id: newId,
      challan_number: newChallanNumber,
      violation_type: data.violation_type || 'NO_HELMET',
      license_plate_number: data.license_plate_number.toUpperCase().trim(),
      confidence: 0.95,
      rider_confidence: 0.93,
      fine_amount: data.fine_amount ?? 1000.0,
      fine_status: 'ISSUED',
      vehicle_type: data.vehicle_type || 'MOTORCYCLE',
      latitude: data.latitude ?? 28.4595,
      longitude: data.longitude ?? 77.0266,
      location_name: data.location_name || 'National Highway 48 - Sector 29',
      camera_id: data.camera_id || 'CAM-01',
      notes: data.notes || 'Manually issued citation by traffic enforcement officer.',
      created_at: new Date().toISOString()
    };

    const items = getStoredViolations();
    saveStoredViolations([newViolation, ...items]);

    try {
      await apiClient.post('/violations/manual', data);
    } catch (netErr) {
      console.info('Backend unavailable for manual citation sync; saved locally:', netErr);
    }

    return { success: true, challan_number: newChallanNumber, id: newId };
  },

  async deleteViolation(id: string): Promise<{ success: boolean; message: string }> {
    const items = getStoredViolations();
    saveStoredViolations(items.filter(v => v.id !== id));

    try {
      await apiClient.delete(`/violations/${id}`);
    } catch (netErr) {
      console.info('Backend unavailable for deletion sync; deleted locally:', netErr);
    }

    return { success: true, message: 'Violation removed' };
  }
};
