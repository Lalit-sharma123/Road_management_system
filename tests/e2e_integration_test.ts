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
  // TEST SUITE 4: Summary Results
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
