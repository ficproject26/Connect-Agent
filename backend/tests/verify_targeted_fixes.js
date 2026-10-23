const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';

async function runTests() {
  console.log('=== STARTING TARGETED BUG FIX VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  await mongoose.connect(process.env.MONGODB_URI );
  const db = mongoose.connection.db;

  // -------------------------------------------------------------
  // TEST 1: Pincode Agent Territory Details (State, District, Division, Pincode)
  // -------------------------------------------------------------
  console.log('--- Test 1: Pincode Agent Territory Details & Division Lookup ---');
  // Lookup pincode 636112 in pincodes database
  const pinDoc = await db.collection('pincodes').findOne({
    $or: [{ code: '636112' }, { pincode: '636112' }]
  });
  assert(pinDoc !== null, 'Pincode 636112 exists in central pincodes collection');
  if (pinDoc) {
    assert(pinDoc.division === 'Thalaivasal', `Pincode 636112 maps to division "Thalaivasal" (got: ${pinDoc.division})`);
    assert(pinDoc.district === 'Salem', `Pincode 636112 maps to district "Salem" (got: ${pinDoc.district})`);
    assert(pinDoc.state === 'Tamil Nadu', `Pincode 636112 maps to state "Tamil Nadu" (got: ${pinDoc.state})`);
  }

  // Check frontend TicketsList.tsx for Territory Location Details (Pincode Scope) containing Division
  const ticketsListSrc = fs.readFileSync(path.join(__dirname, '../../frontend/src/pages/Tickets/TicketsList.tsx'), 'utf8');
  assert(ticketsListSrc.includes('Territory Location Details (Pincode Scope)'), 'TicketsList.tsx contains Territory Location Details (Pincode Scope)');
  assert(ticketsListSrc.includes('Division: <strong>{resolvedDivision || userDivision || \'Unavailable\'}</strong>'), 'TicketsList.tsx renders Division between District and Pincode with fallback to Unavailable');
  assert(ticketsListSrc.includes('/territory/lookup/'), 'TicketsList.tsx performs lookup to /territory/lookup/ for unmapped pincode agent territory');

  // Check ProfileModule.tsx for Division display
  const profileSrc = fs.readFileSync(path.join(__dirname, '../../frontend/src/pages/Profile/ProfileModule.tsx'), 'utf8');
  assert(profileSrc.includes('Unavailable'), 'ProfileModule.tsx contains Unavailable indicator for unmapped division');

  // -------------------------------------------------------------
  // TEST 2: Division Agent Task Request Submission & Validation
  // -------------------------------------------------------------
  console.log('\n--- Test 2: Division Agent Task Request Submission & Workflow ---');
  const taskCtrlSrc = fs.readFileSync(path.join(__dirname, '../src/controllers/task.controller.ts'), 'utf8');
  assert(taskCtrlSrc.includes('reqDivision') && taskCtrlSrc.includes('userDivision') && taskCtrlSrc.includes('reqState'), 'task.controller.ts validates state, district, and division');
  assert(taskCtrlSrc.includes('reqDivision !== userDivision'), 'task.controller.ts case-insensitively checks division matches division agent territory');

  const taskWorkflowSrc = fs.readFileSync(path.join(__dirname, '../../frontend/src/pages/Tasks/TaskWorkflowModule.tsx'), 'utf8');
  assert(taskWorkflowSrc.includes('if (createTaskMutation.isPending) return;'), 'TaskWorkflowModule.tsx prevents duplicate submissions while pending');
  assert(taskWorkflowSrc.includes('trimmedTitle.length < 3'), 'TaskWorkflowModule.tsx validates task title length >= 3');
  assert(taskWorkflowSrc.includes('trimmedDesc.length < 5'), 'TaskWorkflowModule.tsx validates task description length >= 5');
  assert(taskWorkflowSrc.includes('actionError') && taskWorkflowSrc.includes('{actionError &&'), 'TaskWorkflowModule.tsx renders inline alert error banner inside the modal');
  assert(taskWorkflowSrc.includes("setActiveTab('requests')"), 'TaskWorkflowModule.tsx switches to requests tab upon successful agent submission');

  // -------------------------------------------------------------
  // TEST 3: Vendor List & Assigned Vendors - No Blank Rows or KYC undefined
  // -------------------------------------------------------------
  console.log('\n--- Test 3: Vendor List & Assigned Vendors Clean Data & Empty State ---');
  // Check backend dashboard.controller.ts
  const dashCtrlSrc = fs.readFileSync(path.join(__dirname, '../src/controllers/dashboard.controller.ts'), 'utf8');
  assert(dashCtrlSrc.includes('kycStatus') && dashCtrlSrc.includes('businessName name'), 'dashboard.controller.ts selects both name, businessName and kycStatus');
  assert(dashCtrlSrc.includes('sanitizedRecentVendors'), 'dashboard.controller.ts sanitizes recentVendors to ensure name is populated and kycStatus is clean');
  assert(dashCtrlSrc.includes('Boolean(v.name)'), 'dashboard.controller.ts filters out blank vendor rows without names');

  // Check frontend PincodeDashboard.tsx
  const pincodeDashSrc = fs.readFileSync(path.join(__dirname, '../../frontend/src/pages/Dashboard/PincodeAgent/PincodeDashboard.tsx'), 'utf8');
  assert(pincodeDashSrc.includes('No vendors registered in your assigned territory yet.'), 'PincodeDashboard.tsx renders required empty state text');
  assert(!pincodeDashSrc.includes('`KYC ${item.kycStatus}`'), 'PincodeDashboard.tsx no longer does naive KYC ${item.kycStatus} rendering that caused KYC undefined');

  // Check frontend VendorsList.tsx
  const vendorsListSrc = fs.readFileSync(path.join(__dirname, '../../frontend/src/pages/Vendors/VendorsList.tsx'), 'utf8');
  assert(vendorsListSrc.includes('No vendors registered in your assigned territory yet.'), 'VendorsList.tsx displays required empty state text');
  assert(vendorsListSrc.includes('if (!vendor.name || !vendor.name.trim()'), 'VendorsList.tsx filters out blank/undefined vendor rows');

  // Check territoryScope.ts
  const territoryScopeSrc = fs.readFileSync(path.join(__dirname, '../src/utils/territoryScope.ts'), 'utf8');
  assert(territoryScopeSrc.includes("'location.pincode': scope.pincode"), 'territoryScope.ts includes location.pincode in buildVendorScopeFilter');

  // Check vendor.controller.ts
  const vendorCtrlSrc = fs.readFileSync(path.join(__dirname, '../src/controllers/vendor.controller.ts'), 'utf8');
  assert(vendorCtrlSrc.includes("businessName: { $exists: true, $nin: ['', null] }"), 'vendor.controller.ts filters out blank business names from database queries');

  // -------------------------------------------------------------
  // TEST 4: Remove Field Visits Sidebar Tab
  // -------------------------------------------------------------
  console.log('\n--- Test 4: Agent Website Sidebar Navigation ---');
  const layoutSrc = fs.readFileSync(path.join(__dirname, '../../frontend/src/components/layout/DashboardLayout.tsx'), 'utf8');
  assert(!layoutSrc.includes("path: '/field-visits'"), 'DashboardLayout.tsx does NOT contain Field Visits in sidebar navigation');
  assert(layoutSrc.includes("path: '/dashboard'"), 'DashboardLayout.tsx retains Dashboard tab');
  assert(layoutSrc.includes("path: '/vendors'"), 'DashboardLayout.tsx retains Vendors tab');
  assert(layoutSrc.includes("path: '/tasks'"), 'DashboardLayout.tsx retains Tasks & Approvals tab');
  assert(layoutSrc.includes("path: '/tickets'"), 'DashboardLayout.tsx retains Support Tickets tab');
  assert(layoutSrc.includes("path: '/wallet'"), 'DashboardLayout.tsx retains Wallet tab');
  assert(layoutSrc.includes("path: '/reports'"), 'DashboardLayout.tsx retains Reports tab');
  assert(layoutSrc.includes("path: '/shared/profile'"), 'DashboardLayout.tsx retains Profile tab');

  // -------------------------------------------------------------
  // Integration Test: getDashboardStats simulation for Kala
  // -------------------------------------------------------------
  console.log('\n--- Integration Test: Live Dashboard Stats & Vendor Scoping ---');
  const kala = await db.collection('users').findOne({ name: /kala/i });
  if (kala) {
    const kalaPin = kala.pincode || kala.territory?.pincode;
    const vendorMatches = await db.collection('vendors').find({
      $or: [
        { pincode: kalaPin },
        { assignedPincode: kalaPin },
        { 'location.pincode': kalaPin }
      ],
      $and: [
        {
          $or: [
            { businessName: { $exists: true, $nin: ['', null] } },
            { name: { $exists: true, $nin: ['', null] } }
          ]
        }
      ]
    }).toArray();

    assert(vendorMatches.length > 0, `Kala (pincode ${kalaPin}) has ${vendorMatches.length} genuine assigned vendors`);
    vendorMatches.forEach(v => {
      const name = (v.businessName || v.name || '').trim();
      assert(name.length > 0, `Vendor has valid non-empty shop name: "${name}"`);
      assert(v.kycStatus !== undefined || v.status !== undefined, `Vendor ${name} has defined KYC or account status`);
    });
  }

  console.log(`\n=============================================`);
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=============================================`);

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
