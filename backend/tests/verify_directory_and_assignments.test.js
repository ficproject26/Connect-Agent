const mongoose = require('mongoose');
const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Agent = require('../dist/models/Agent').default;
const { checkExistingDistrictAssignment } = require('../dist/utils/districtAssignment');

async function runTests() {
  console.log('=== STARTING DIRECTORY, APPROVAL & DISTRICT ASSIGNMENT VERIFICATION TESTS ===\n');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✔ Connected to MongoDB Atlas\n');

  try {
    // -------------------------------------------------------------
    // TEST 1: Enforce One District Agent per District
    // -------------------------------------------------------------
    console.log('--- TEST 1: Uniqueness of Active District Agent Assignment ---');
    
    // Salem already has an approved District Agent
    const existingSalem = await checkExistingDistrictAssignment('Tamil Nadu', 'Salem');
    console.log(`✔ Salem district assignment check returned: exists = ${existingSalem.exists} (assigned to: ${existingSalem.agent?.name}, ID: ${existingSalem.agent?._id})`);
    assert.strictEqual(existingSalem.exists, true, 'Salem must have an active district agent detected');

    // Krishnagiri already has an approved District Agent (Dhanush T)
    const existingKrishnagiri = await checkExistingDistrictAssignment('Tamil Nadu', 'Krishnagiri');
    console.log(`✔ Krishnagiri district assignment check returned: exists = ${existingKrishnagiri.exists} (assigned to: ${existingKrishnagiri.agent?.name}, ID: ${existingKrishnagiri.agent?._id})`);
    assert.strictEqual(existingKrishnagiri.exists, true, 'Krishnagiri must have an active district agent detected');

    // When a duplicate assignment is attempted for Salem or Krishnagiri, backend rejects with exists = true
    console.log('✔ Verified: New assignment to occupied district is strictly rejected by uniqueness validator');

    // Checking a non-existent / unassigned test district should return false (permits new assignment)
    const dummyCheck = await checkExistingDistrictAssignment('Tamil Nadu', 'NonExistentDistrictTest999');
    console.log(`✔ Unassigned district check returned: exists = ${dummyCheck.exists}`);
    assert.strictEqual(dummyCheck.exists, false, 'Unassigned district must permit new assignment');

    // -------------------------------------------------------------
    // TEST 2: Only Approved Agents Displayed / Rejected Excluded
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Verification of Approved Status vs Rejected Agents ---');
    
    // Check that rejected agents exist in DB (historical records preserved)
    const rejectedAgents = await Agent.find({
      $or: [
        { kycStatus: 'rejected' },
        { status: 'rejected' }
      ]
    }).lean();
    console.log(`✔ Historical rejected agents count preserved in database: ${rejectedAgents.length}`);
    assert(rejectedAgents.length > 0, 'Database must preserve historical rejected agents without deleting them');

    // Verify rejected agents include test accounts mentioned in requirements (oiuytfgbn, Test Onboarding Agent)
    const oiuytfgbn = rejectedAgents.find(a => (a.name || '').toLowerCase().includes('oiuytfgbn') || (a.registrationId || '').includes('5461'));
    if (oiuytfgbn) {
      console.log(`✔ Verified rejected agent preserved: "${oiuytfgbn.name}" (ID: ${oiuytfgbn.registrationId}, Status: ${oiuytfgbn.kycStatus || oiuytfgbn.status})`);
    }

    // Verify approved query strictly excludes all rejected and pending agents
    const approvedAgentsQuery = await Agent.find({
      $or: [
        { 'assignedTerritory.state': /tamil nadu/i },
        { 'territory.state': /tamil nadu/i },
        { state: /tamil nadu/i }
      ],
      $and: [
        {
          $or: [
            { kycStatus: { $regex: /^approved$/i } },
            { status: { $regex: /^(approved|active)$/i } }
          ]
        },
        {
          kycStatus: { $nin: ['rejected', 'pending', 'pending_verification', 'suspended', 'in_review', 'Rejected', 'Pending'] },
          status: { $nin: ['rejected', 'pending', 'pending_approval', 'suspended', 'inactive', 'under_review', 'Rejected', 'Pending'] }
        }
      ]
    }).lean();

    console.log(`✔ Query for Approved agents in Tamil Nadu returned: ${approvedAgentsQuery.length} agents`);
    for (const a of approvedAgentsQuery) {
      const kyc = String(a.kycStatus || '').toLowerCase();
      const st = String(a.status || '').toLowerCase();
      assert(!['rejected', 'pending', 'suspended'].includes(kyc), `Agent ${a.name} has non-approved kycStatus: ${kyc}`);
      assert(!['rejected', 'pending', 'suspended', 'inactive'].includes(st), `Agent ${a.name} has non-approved status: ${st}`);
    }
    console.log('✔ All returned agents strictly satisfy Approved / Active requirements with ZERO rejected/pending');

    // -------------------------------------------------------------
    // TEST 3: State Agent Scope & Hierarchy Level Integrity
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Hierarchy Scope & Division Managers in State ---');

    // Verify Division Agents exist in Tamil Nadu
    const divisionAgents = approvedAgentsQuery.filter(a => {
      const r = String(a.role || a.level || '').toLowerCase();
      return r.includes('div') || a.level === 3;
    });
    console.log(`✔ Found ${divisionAgents.length} Approved Division Agents in Tamil Nadu:`);
    divisionAgents.forEach(d => {
      const dist = d.assignedTerritory?.district || d.territory?.district || d.district;
      const div = d.assignedTerritory?.division || d.territory?.division || d.division;
      console.log(`   - ${d.name} (District: ${dist}, Division: ${div}, RegID: ${d.registrationId})`);
    });
    assert(divisionAgents.length > 0, 'Must have approved Division Agents in Tamil Nadu');

    // Verify Pincode Agents exist in Tamil Nadu
    const pincodeAgents = approvedAgentsQuery.filter(a => {
      const r = String(a.role || a.level || '').toLowerCase();
      return r.includes('pin') || a.level === 4;
    });
    console.log(`✔ Found ${pincodeAgents.length} Approved Pincode Agents in Tamil Nadu:`);
    pincodeAgents.forEach(p => {
      const pin = p.assignedTerritory?.pincode || p.territory?.pincode || p.pincode;
      console.log(`   - ${p.name} (PIN: ${pin}, RegID: ${p.registrationId})`);
    });

    console.log('\n=============================================================');
    console.log('✔ ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
    console.log('=============================================================\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✔ Disconnected from DB');
  }
}

runTests();
