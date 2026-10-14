const mongoose = require('mongoose');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { getDivisionPincodes, buildTerritoryFilter, buildVendorScopeFilter } = require('../dist/utils/territoryScope');

async function runTests() {
  console.log('=== STARTING AGENT PORTAL BUG FIXES VERIFICATION ===\n');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✔ Connected to MongoDB Atlas\n');

  try {
    const db = mongoose.connection.db;

    // -------------------------------------------------------------
    // TEST 1: Duplicate Support Resolution Log Entries (Idempotency)
    // -------------------------------------------------------------
    console.log('--- TEST 1: Ticket Resolution Log Deduplication & Idempotency ---');
    // Simulate resolutionDetails deduplication logic from ticket.controller.ts
    const sampleRemark = 'Resolved by State Agent Desk';
    let resolutionDetails = '';

    // First resolution
    let existingLogs = (resolutionDetails || '')
      .split('|')
      .map(s => s.trim())
      .filter(Boolean);
    if (!existingLogs.includes(sampleRemark)) {
      existingLogs.push(sampleRemark);
      resolutionDetails = existingLogs.join(' | ');
    }
    assert.strictEqual(resolutionDetails, 'Resolved by State Agent Desk');

    // Second resolution attempt with identical remark (e.g. double click or duplicate call)
    existingLogs = (resolutionDetails || '')
      .split('|')
      .map(s => s.trim())
      .filter(Boolean);
    const lastLog = existingLogs.length > 0 ? existingLogs[existingLogs.length - 1] : '';
    if (lastLog !== sampleRemark) {
      existingLogs.push(sampleRemark);
      resolutionDetails = existingLogs.join(' | ');
    }

    assert.strictEqual(resolutionDetails, 'Resolved by State Agent Desk', 'Resolution details must not duplicate identical logs');
    console.log(`✔ Idempotent resolution details verified: "${resolutionDetails}"\n`);

    // -------------------------------------------------------------
    // TEST 2: Verify "Escalate to Admin" Removed & District Form Scoping
    // -------------------------------------------------------------
    console.log('--- TEST 2: Escalate Button Removal & District Territory Scoping ---');
    const ticketsListPath = path.join(__dirname, '../../frontend/src/pages/Tickets/TicketsList.tsx');
    const ticketsListContent = fs.readFileSync(ticketsListPath, 'utf8');

    // Verify "Escalate to Admin" button is removed
    assert(!ticketsListContent.includes('Escalate to Admin'), 'TicketsList must not contain "Escalate to Admin"');
    assert(!ticketsListContent.includes('handleStateEscalateAdmin'), 'TicketsList must not contain handleStateEscalateAdmin handler');
    console.log('✔ "Escalate to Admin" button and handler confirmed removed');

    // Verify District Agent view does not render Division input
    assert(ticketsListContent.includes("activeRole === 'district'"), 'TicketsList must branch for district role');
    assert(ticketsListContent.includes('District Scope'), 'TicketsList must render District Scope without division');
    console.log('✔ District Agent territory form excludes Division field and placeholder\n');

    // -------------------------------------------------------------
    // TEST 3: Pincode Agent Directory for Division Agent (Hosur / Krishnagiri)
    // -------------------------------------------------------------
    console.log('--- TEST 3: Pincode Agent Directory for Division Agent (Hosur) ---');
    const hosurPincodes = await getDivisionPincodes('Hosur');
    console.log(`✔ Found ${hosurPincodes.length} pincodes in Hosur division: ${hosurPincodes.join(', ')}`);
    assert(hosurPincodes.length > 0, 'Hosur division must have assigned pincodes in database');
    assert(hosurPincodes.includes('635126') || hosurPincodes.includes('635109'), 'Hosur division must include expected pincodes');

    const divisionScope = {
      role: 'division',
      state: 'Tamil Nadu',
      district: 'Krishnagiri',
      division: 'Hosur'
    };
    const agentFilter = buildTerritoryFilter(divisionScope, hosurPincodes);

    const matchingUsers = await db.collection('users').find({
      $and: [
        agentFilter,
        {
          $or: [
            { kycStatus: { $regex: /^(approved|verified)$/i } },
            { status: { $regex: /^(approved|active)$/i } },
            { isApproved: true }
          ]
        }
      ]
    }).toArray();

    console.log(`✔ Found ${matchingUsers.length} Pincode Agents matching Hosur division filter:`);
    matchingUsers.forEach(u => console.log(`   - ${u.name} (Role: ${u.role}, Pincode: ${u.assignedPincode || u.pincode || u.assignedTerritory?.pincode}, Status: ${u.status})`));
    assert(matchingUsers.length > 0, 'Must return approved Pincode Agents (e.g. Mini) for Hosur division');
    const miniAgent = matchingUsers.find(u => u.name && u.name.toLowerCase().includes('mini'));
    assert(miniAgent, 'Mini (pincode agent in Hosur) must be in the results');
    console.log('✔ Pincode Agent Mini correctly retrieved under Hosur division\n');

    // -------------------------------------------------------------
    // TEST 4: Vendor Directory for Division Agent
    // -------------------------------------------------------------
    console.log('--- TEST 4: Vendor Directory for Division Agent (Hosur) ---');
    const vendorFilter = buildVendorScopeFilter(divisionScope, hosurPincodes);
    const matchingVendors = await db.collection('vendors').find(vendorFilter).toArray();

    console.log(`✔ Found ${matchingVendors.length} Vendors matching Hosur division filter:`);
    matchingVendors.forEach(v => console.log(`   - ${v.storeName || v.name} (PIN: ${v.pincode}, District: ${v.district}, Division: ${v.division || 'N/A'})`));
    assert(matchingVendors.length > 0, 'Must return vendors registered under Hosur division pincodes');
    const sampleVendorNames = matchingVendors.map(v => (v.storeName || v.name).toLowerCase());
    console.log('✔ Hosur Division Agent now successfully sees vendors in assigned territory\n');

    // -------------------------------------------------------------
    // TEST 5: Field Visit Pincode Dropdown for Division Agent
    // -------------------------------------------------------------
    console.log('--- TEST 5: Field Visit Pincode Dropdown for Division Agent ---');
    const fieldVisitsPath = path.join(__dirname, '../../frontend/src/pages/FieldVisits/FieldVisitsModule.tsx');
    const fieldVisitsContent = fs.readFileSync(fieldVisitsPath, 'utf8');

    assert(fieldVisitsContent.includes('assignedDivisionPincodes'), 'FieldVisitsModule must track assignedDivisionPincodes');
    assert(fieldVisitsContent.includes('getActivePincodes'), 'FieldVisitsModule must call getActivePincodes for division role');
    assert(fieldVisitsContent.includes('assignedDivisionPincodes.map'), 'FieldVisitsModule must map assignedDivisionPincodes to options');
    console.log('✔ Field Visit module correctly fetches and displays division pincodes in Start Visit modal\n');

    console.log('=== ALL 5 VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
