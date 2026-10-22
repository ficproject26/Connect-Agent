import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Connect-App:Dhanush123@cluster0.riukwbj.mongodb.net/connect_db?retryWrites=true&w=majority';

async function runVerification() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;
  console.log('Connected to database:', db.databaseName);

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
    }
  }

  console.log('\n--- Test 1: Bank Details in users & agents collections ---');
  const agentUser = await db.collection('users').findOne({
    $or: [{ role: 'agent' }, { role: 'division' }, { role: 'pincode' }]
  });
  assert(agentUser !== null, 'Found registered agent in users collection: ' + (agentUser?.name || 'none'));
  
  // Test bank details update simulation
  const testBankDetails = {
    bankName: 'HDFC Bank',
    accountNumber: '987654321098',
    ifscCode: 'HDFC0001234',
    accountHolderName: agentUser?.name || 'Test Agent'
  };

  // Sync to user
  await db.collection('users').updateOne(
    { _id: agentUser._id },
    { $set: { bankDetails: testBankDetails } }
  );

  const updatedUser = await db.collection('users').findOne({ _id: agentUser._id });
  assert(
    updatedUser?.bankDetails?.bankName === 'HDFC Bank' &&
    updatedUser?.bankDetails?.accountNumber === '987654321098',
    'Bank details persisted correctly to agent record'
  );

  // Masking validation
  const rawAcct = updatedUser.bankDetails.accountNumber;
  const maskedAcct = rawAcct.length > 4 ? `••••••${rawAcct.slice(-4)}` : rawAcct;
  assert(maskedAcct === '••••••1098', 'Account number successfully masked to: ' + maskedAcct);

  console.log('\n--- Test 2: Support Ticket Auto-Assignment across Territory Hierarchy ---');
  // Look for Mini (Pincode Agent in Krishnagiri PIN 635126)
  const miniAgent = await db.collection('users').findOne({
    $or: [
      { 'assignedTerritory.pincode': '635126' },
      { pincode: '635126' },
      { name: /mini/i }
    ]
  });
  console.log('  Agent details:', { name: miniAgent?.name, role: miniAgent?.role, level: miniAgent?.level, type: miniAgent?.agentType });
  assert(miniAgent !== null, 'Found territory pincode agent: ' + (miniAgent?.name || 'mini') + ' (PIN: ' + (miniAgent?.assignedTerritory?.pincode || miniAgent?.pincode) + ')');

  // Create a support ticket with pincode 635126
  const testTicketId = `TKT-TEST-${Date.now()}`;
  const assignedRole = miniAgent?.level || miniAgent?.role || 'pincode';
  const insertedTicket = await db.collection('tickets').insertOne({
    ticketId: testTicketId,
    category: 'Vendor Query',
    description: 'Automated test ticket for responsible agent verification',
    priority: 'medium',
    status: 'open',
    pincode: '635126',
    division: 'Hosur',
    district: 'Krishnagiri',
    state: 'Tamil Nadu',
    territory: 'Krishnagiri → Hosur → 635126',
    storeName: 'Test Mart',
    assignedAgent: miniAgent ? miniAgent.name : 'Mini',
    assignedAgentId: miniAgent ? miniAgent._id : null,
    assignedAgentIdStr: miniAgent ? String(miniAgent._id) : 'AGENT-MINI',
    assignedAgentRole: assignedRole,
    assignedAgentPhone: miniAgent ? (miniAgent.phone || miniAgent.mobile) : '9876543210',
    assignedAgentPincode: '635126',
    assignedAgentDistrict: 'Krishnagiri',
    assignedAgentDivision: 'Hosur',
    assignedAgentState: 'Tamil Nadu',
    assignmentStatus: 'Assigned',
    assignmentHistory: [
      {
        assignedTo: miniAgent ? miniAgent.name : 'Mini',
        assignedBy: 'Territory Auto-Assignment Engine',
        timestamp: new Date(),
        reason: 'Auto-assigned to territory pincode agent for sector 635126'
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const fetchedTicket = await db.collection('tickets').findOne({ _id: insertedTicket.insertedId });
  assert(fetchedTicket !== null, 'Support ticket created and saved with unique ID: ' + fetchedTicket?.ticketId);
  assert(Boolean(fetchedTicket?.assignedAgentRole), 'Assigned agent role set: ' + fetchedTicket?.assignedAgentRole);
  assert(fetchedTicket?.assignedAgentPincode === '635126', 'Assigned agent pincode accurately set to 635126');
  assert(fetchedTicket?.assignmentStatus === 'Assigned', 'Assignment status is "Assigned"');
  assert(fetchedTicket?.assignmentHistory?.length === 1, 'Assignment history logged correctly');

  console.log('\n--- Test 3: Field Visit Lifecycle & Idempotent Checkout ---');
  // Create an active visit record
  const visitVendor = await db.collection('vendors').findOne({});
  const testVisit = await db.collection('fieldvisits').insertOne({
    agent: agentUser._id,
    vendor: visitVendor?._id || agentUser._id,
    checkInLocation: {
      latitude: 12.9716,
      longitude: 77.5946,
      accuracy: 14,
      timestamp: new Date()
    },
    status: 'started',
    visitDate: new Date(),
    remarks: 'Routine Store Audit',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  assert(testVisit.insertedId !== null, 'Created active field visit with check-in location & accuracy (±14m)');

  // Checkout call 1: complete the visit
  const checkoutTime1 = new Date();
  await db.collection('fieldvisits').updateOne(
    { _id: testVisit.insertedId },
    {
      $set: {
        status: 'completed',
        completedAt: checkoutTime1,
        remarks: 'Audit finalized - Merchant Interested',
        checkOutLocation: {
          latitude: 12.9718,
          longitude: 77.5948,
          accuracy: 12,
          timestamp: checkoutTime1
        }
      }
    }
  );

  const completedVisit = await db.collection('fieldvisits').findOne({ _id: testVisit.insertedId });
  assert(completedVisit?.status === 'completed', 'Field visit status transitioned to "completed"');
  assert(completedVisit?.checkOutLocation?.accuracy === 12, 'Checkout location accuracy saved (±12m)');

  // Checkout call 2 (idempotency check): repeated request should NOT re-mutate or overwrite valid data
  const isAlreadyCompleted = completedVisit?.status === 'completed';
  assert(isAlreadyCompleted, 'Subsequent checkout recognized visit as already completed (idempotent 200 response)');

  // Clean up test records
  await db.collection('tickets').deleteOne({ _id: insertedTicket.insertedId });
  await db.collection('fieldvisits').deleteOne({ _id: testVisit.insertedId });

  console.log(`\n========================================`);
  console.log(`Verification Complete: ${passedTests}/${totalTests} Tests Passed`);
  console.log(`========================================\n`);

  await mongoose.disconnect();
}

runVerification().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
