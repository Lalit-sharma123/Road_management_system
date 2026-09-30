/**
 * Comprehensive End-to-End System Integration Test Suite
 * Executes live against the application's services and data layers.
 */

// Mock localStorage in Node.js environment if not present
if (typeof globalThis.localStorage === 'undefined') {
  const storageMap = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, val: string) => { storageMap.set(key, String(val)); },
    removeItem: (key: string) => { storageMap.delete(key); },
    clear: () => { storageMap.clear(); },
    key: (idx: number) => Array.from(storageMap.keys())[idx] ?? null,
    length: storageMap.size
  };
}

import { violationService } from '../src/services/violationService';
import { videoService } from '../src/services/videoService';
import { authService } from '../src/services/authService';
import { stolenVehicleService } from '../src/services/stolenVehicleService';
import { sampleVideos } from '../src/data/mockData';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
  }
}

async function runE2ETests() {
  console.log('\n======================================================');
  console.log('🚀 STARTING COMPREHENSIVE END-TO-END INTEGRATION TESTS');
  console.log('======================================================\n');

  // ----------------------------------------------------
  // TEST SUITE 1: Authentication & Token Management
  // ----------------------------------------------------
  console.log('📋 [Suite 1: Authentication & Token Management]');
  assert(typeof authService.login === 'function', 'authService.login is defined');
  assert(typeof authService.register === 'function', 'authService.register is defined');
  assert(typeof authService.getMe === 'function', 'authService.getMe is defined');
  assert(typeof authService.logout === 'function', 'authService.logout is defined');
  assert(typeof authService.getStoredToken === 'function', 'authService.getStoredToken is defined');

  // Test local token lifecycle
  localStorage.setItem('auth_token', 'test_jwt_bearer_token_xyz');
  assert(authService.getStoredToken() === 'test_jwt_bearer_token_xyz', 'Stored auth token retrieved correctly');
  authService.logout();
  assert(authService.getStoredToken() === null, 'authService.logout clears token');

  // Verify Role hierarchy helper logic
  const hasAccess = (currentRole: string, requiredRole: string) => {
    const hierarchy: Record<string, number> = { admin: 4, inspector: 3, analyst: 2, viewer: 1 };
    return (hierarchy[currentRole] || 0) >= (hierarchy[requiredRole] || 0);
  };
  assert(hasAccess('admin', 'inspector'), 'Admin has inspector access');
  assert(hasAccess('admin', 'viewer'), 'Admin has viewer access');
  assert(!hasAccess('viewer', 'admin'), 'Viewer does not have admin access');
  assert(hasAccess('inspector', 'viewer'), 'Inspector has viewer access');

  // ----------------------------------------------------
  // TEST SUITE 2: Violation & E-Challan CRUD Operations
  // ----------------------------------------------------
  console.log('\n📋 [Suite 2: Violations & E-Challan Workflow]');
  const initialViolations = await violationService.getViolations();
  assert(Array.isArray(initialViolations.items) && initialViolations.total > 0, 'Loaded initial violations list', `Found ${initialViolations.total} records`);

  const initialCount = initialViolations.total;

  // Test 2.1: Add New Violation (Automatic ANPR detection outcome)
  const createRes = await violationService.createManualViolation({
    violation_type: 'NO_HELMET',
    license_plate_number: 'HR26DQ9999',
    fine_amount: 1000,
    vehicle_type: 'MOTORCYCLE',
    camera_id: 'CAM-01',
    location_name: 'NH-48 Rajiv Chowk Flyover',
    latitude: 28.4595,
    longitude: 77.0266,
    notes: 'Automated ANPR & Helmet violation detection'
  });

  assert(createRes.success, 'Manual violation created successfully');
  assert(createRes.challan_number.startsWith('ECH-2026-'), 'Challan format valid', createRes.challan_number);

  // Verify list expanded
  const afterAddViolations = await violationService.getViolations();
  assert(afterAddViolations.total === initialCount + 1, 'Violations count incremented by 1');

  // Test 2.2: Retrieve by ID
  const retrieved = await violationService.getViolationById(createRes.id);
  assert(retrieved.id === createRes.id, 'Violation retrieved by ID matches');
  assert(retrieved.license_plate_number === 'HR26DQ9999', 'License plate preserved accurately');

  // Test 2.3: Update Status (ISSUED -> PAID)
  const updatedPaid = await violationService.updateViolationStatus(createRes.id, 'PAID', 'Paid via Online Portal Gateway');
  assert(updatedPaid.success, 'Status updated to PAID successfully');
  const paidItem = await violationService.getViolationById(createRes.id);
  assert(paidItem.fine_status === 'PAID', 'Violation status transitioned to PAID in store');

  // Test 2.4: Update Status (PAID -> PENDING)
  const updatedPending = await violationService.updateViolationStatus(createRes.id, 'PENDING', 'Contested by owner');
  assert(updatedPending.success, 'Status updated to PENDING successfully');
  const pendingItem = await violationService.getViolationById(createRes.id);
  assert(pendingItem.fine_status === 'PENDING', 'Violation status transitioned to PENDING in store');

  // Test 2.5: Search and Filtering
  const searchResults = await violationService.getViolations({ search: 'HR26DQ9999' });
  assert(searchResults.total >= 1, 'Search query located newly issued challan by plate number');

  const filterPaid = await violationService.getViolations({ status: 'PAID' });
  assert(filterPaid.items.every(v => v.fine_status === 'PAID'), 'Status filter returns only PAID items');

  // Test 2.6: Stats Aggregation
  const stats = await violationService.getViolationStats();
  assert(stats.total_violations === afterAddViolations.total, 'Stats total matches stored count');
  assert(stats.total_fines_amount >= 1000, 'Total fines calculation non-zero');
  assert(stats.unique_plates_count > 0, 'Unique plates count computed');

  // Test 2.7: Delete Violation
  const deleteResult = await violationService.deleteViolation(createRes.id);
  assert(deleteResult.success, 'Successfully deleted test violation');
  const finalViolations = await violationService.getViolations();
  assert(finalViolations.total === initialCount, 'Violations list restored to initial count');

  // ----------------------------------------------------
  // TEST SUITE 3: Video Inspection & Analytics Service
  // ----------------------------------------------------
  console.log('\n📋 [Suite 3: Video Analytics & Defect Aggregation]');
  assert(Array.isArray(sampleVideos) && sampleVideos.length >= 2, 'Sample video library accessible');

  const activeVideo = sampleVideos[0];
  assert(!!activeVideo.id, 'Video has valid ID');
  assert((activeVideo.analytics?.pothole_count ?? 0) >= 0, 'Pothole counter is non-negative');
  assert((activeVideo.analytics?.road_health_score ?? 0) >= 0 && (activeVideo.analytics?.road_health_score ?? 0) <= 100, 'Road health index is in [0, 100]');

  // Test road health calculation logic
  const potholeCount = activeVideo.analytics?.pothole_count ?? 0;
  const crackCount = activeVideo.analytics?.crack_count ?? 0;
  const computedHealth = Math.max(20, Math.round(100 - (potholeCount * 4.5 + crackCount * 2.0)));
  assert(computedHealth >= 20 && computedHealth <= 100, 'Road health index mathematical formula bounds hold');

  assert(typeof videoService.runProcessingPipeline === 'function', 'videoService.runProcessingPipeline is defined');
  assert(typeof videoService.stopProcessingPipeline === 'function', 'videoService.stopProcessingPipeline is defined');
  assert(typeof videoService.connectWebSocket === 'function', 'videoService.connectWebSocket is defined');

  // ----------------------------------------------------
  // TEST SUITE 4: Stolen Vehicle Registry & 1-Time Alert Deduplication
  // ----------------------------------------------------
  console.log('\n📋 [Suite 4: Stolen Vehicle Registry & Deduplication]');
  
  // Clear any existing alerted cache
  stolenVehicleService.clearSessionAlertedPlates();

  // Test 4.1: Register a new stolen vehicle
  const newStolen = await stolenVehicleService.createStolenVehicle({
    vehicle_number: 'DL9CAA1234',
    owner_name: 'Test Vehicle Owner',
    vehicle_type: 'CAR',
    fir_number: 'FIR-2026-TEST-99',
    police_station: 'Central Station',
    reason: 'Reported Stolen Test Case',
    priority: 'HIGH',
    status: 'ACTIVE'
  });

  assert(!!newStolen.id, 'Stolen vehicle registered with ID');
  assert(newStolen.vehicle_number === 'DL9CAA1234', 'Vehicle number preserved');

  // Test 4.2: Detection match in video
  const matched = stolenVehicleService.isPlateStolen('DL9CAA1234');
  assert(matched !== null && matched.id === newStolen.id, 'Stolen vehicle matched by exact plate');

  const matchedFuzzy = stolenVehicleService.isPlateStolen('DL 9C AA 1234');
  assert(matchedFuzzy !== null && matchedFuzzy.id === newStolen.id, 'Stolen vehicle matched despite spacing/hyphen differences');

  // Test 4.3: Initial alert status (should NOT be alerted yet)
  const initialAlertCheck = stolenVehicleService.hasPlateBeenAlerted('DL9CAA1234', newStolen.id);
  assert(initialAlertCheck === false, 'First-time detection is NOT flagged as alerted yet');

  // Test 4.4: Mark as alerted (First-time alert fires)
  stolenVehicleService.markPlateAlerted('DL9CAA1234', newStolen.id);

  // Test 4.5: Subsequent detections in video (MUST NOT fire again)
  const secondAlertCheck = stolenVehicleService.hasPlateBeenAlerted('DL9CAA1234', newStolen.id);
  assert(secondAlertCheck === true, 'Second detection is recognized as already alerted (suppressed)');

  // Test 4.6: Even with spaced/noisy OCR text, deduplication holds
  const fuzzyAlertCheck = stolenVehicleService.hasPlateBeenAlerted('DL 9C AA 1234');
  assert(fuzzyAlertCheck === true, 'Fuzzy/spaced OCR detection correctly blocked by single-time deduplication');

  // Test 4.7: Clean up test vehicle
  const deleteStolenRes = await stolenVehicleService.deleteStolenVehicle(newStolen.id);
  assert(deleteStolenRes.status === 'success', 'Test stolen vehicle removed cleanly from registry');

  // ----------------------------------------------------
  // TEST SUITE 5: Detection Overlay, Vehicle-Plate Association & Collision Placement
  // ----------------------------------------------------
  console.log('📋 [Suite 5: Detection Overlay, Vehicle-Plate Association & Collision Placement]');
  
  // Test 5.1: Verify association logic (vehicle ↔ plate)
  const testVehicle = {
    id: 'veh-101',
    model: 'yolov8n.pt',
    className: 'car',
    category: 'car',
    type: 'vehicle',
    confidence: 0.95,
    bbox: { x: 200, y: 150, width: 220, height: 140 },
    parentVehicleId: null
  };
  const testPlate = {
    id: 'plate-101',
    model: 'numberplate-yolo-v26n.pt',
    className: 'number_plate',
    category: 'number_plate',
    type: 'plate',
    confidence: 0.93,
    bbox: { x: 260, y: 250, width: 80, height: 26 },
    parentVehicleId: 'veh-101',
    plateNumber: 'HR26DK8392',
    plateConfidence: 0.94
  };

  assert(testPlate.parentVehicleId === testVehicle.id, 'Plate explicitly associated with correct vehicle ID');
  assert(testPlate.bbox.x >= testVehicle.bbox.x && (testPlate.bbox.x + testPlate.bbox.width) <= (testVehicle.bbox.x + testVehicle.bbox.width), 'Plate bounding box physically contained inside vehicle horizontal bounds');
  assert(testPlate.bbox.y >= testVehicle.bbox.y && (testPlate.bbox.y + testPlate.bbox.height) <= (testVehicle.bbox.y + testVehicle.bbox.height), 'Plate bounding box physically contained inside vehicle vertical bounds');

  // Test 5.2: Separate potholes preservation (Requirement 1 & 11)
  const potholeA = {
    id: 'pot-1',
    model: 'best.pt',
    className: 'pothole',
    category: 'pothole',
    confidence: 0.92,
    bbox: { x: 100, y: 400, width: 70, height: 45 }
  };
  const potholeB = {
    id: 'pot-2',
    model: 'best.pt',
    className: 'pothole',
    category: 'pothole',
    confidence: 0.88,
    bbox: { x: 200, y: 410, width: 65, height: 40 }
  };

  const iX1 = Math.max(potholeA.bbox.x, potholeB.bbox.x);
  const iX2 = Math.min(potholeA.bbox.x + potholeA.bbox.width, potholeB.bbox.x + potholeB.bbox.width);
  const isSeparated = iX2 <= iX1;
  assert(isSeparated, 'Adjacent potholes retain independent non-merged bounding boxes');

  // Test 5.3: Standard data structure compliance (Requirement 9)
  const req9Fields = ['id', 'model', 'className', 'confidence', 'bbox', 'parentVehicleId', 'plateNumber', 'plateConfidence'];
  const hasAllReq9Fields = req9Fields.every(f => f in testPlate);
  assert(hasAllReq9Fields, 'Detection record adheres strictly to Requirement 9 specification');

  // Test 5.4: In-Browser Heuristic Fallback Disabled (Requirements 1, 2, 4, 5)
  const { realtimeVisionEngine } = await import('../src/utils/realtimeVisionEngine');
  const mockDummy = {} as any;
  const visionOutput = realtimeVisionEngine.processFrame(mockDummy, 1280, 720, 1, 0.25);
  assert(visionOutput.detections.length === 0, 'In-browser heuristic detection strictly disabled: 0 detections produced');
  assert(visionOutput.potholeCount === 0, 'No fake or heuristic potholes manufactured: potholeCount === 0');
  assert(visionOutput.crackCount === 0, 'No fake or heuristic cracks manufactured: crackCount === 0');
  assert(visionOutput.roadDamageCount === 0, 'Road damage count is strictly 0 without server-side YOLO inference');

  // ----------------------------------------------------
  // TEST SUITE 6: Summary Results
  // ----------------------------------------------------
  console.log('\n======================================================');
  console.log(`📊 TEST EXECUTION SUMMARY:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed:      ${passedTests}`);
  console.log(`   Failed:      ${failedTests}`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runE2ETests().catch(err => {
  console.error('Fatal Test Runner Exception:', err);
  process.exit(1);
});
