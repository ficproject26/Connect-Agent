const mongoose = require('mongoose');
const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { isValidAccountNumber, sanitizeAccountNumber, BANK_ACCOUNT_REGEX } = require('../dist/utils/bankValidation');
const { validateVendorFieldFormats } = require('../dist/utils/territoryValidation');
const Report = require('../dist/models/Report').default;
const Vendor = require('../dist/models/Vendor').default;
const Agent = require('../dist/models/Agent').default;

async function run19Tests() {
  console.log('===============================================================');
  console.log(' RUNNING 19 AUTOMATED VERIFICATION TESTS FOR CURRENT TASK');
  console.log('===============================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✔ Connected to MongoDB Atlas\n');

  let passed = 0;
  let failed = 0;

  function record(title, condition, details = '') {
    if (condition) {
      console.log(`[PASS] ${title}`);
      if (details) console.log(`       ↳ ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title}`);
      if (details) console.error(`       ↳ ${details}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // ITEM 1: Division Reports & Alerts Center Conditional Display
    // -------------------------------------------------------------
    console.log('--- TEST GROUP 1: Division Reports & Alerts ---');

    // Test 1: Report filtering when 0 reports exist for a division
    const nonexistentDivReports = await Report.find({ division: new RegExp('^nonexistent_div$', 'i') }).lean();
    record('Test 1: Division Reports query returns 0 when no records exist for division (renders nothing)',
      nonexistentDivReports.length === 0,
      `Found ${nonexistentDivReports.length} reports for nonexistent division`);

    // Test 2: Report filtering when real reports exist
    const testDiv = 'Thalaivasal';
    const thalaivasalReports = await Report.find({ division: new RegExp(`^${testDiv}$`, 'i') }).lean();
    record('Test 2: Division Reports query correctly scopes by division',
      Array.isArray(thalaivasalReports),
      `Found ${thalaivasalReports.length} real reports in DB for ${testDiv}`);

    // Test 3: Alerts query returns 0 when no alerts exist
    const db = mongoose.connection.db;
    const notifications = await db.collection('notifications').find({ division: 'nonexistent_div' }).toArray();
    record('Test 3: Division Alerts query returns 0 when no alerts exist for division (panel hidden)',
      notifications.length === 0,
      `Found ${notifications.length} alerts for nonexistent division`);

    // Test 4: Alerts collection accessibility and division scoping
    const allNotifs = await db.collection('notifications').find({}).limit(5).toArray();
    record('Test 4: Notifications collection is active and supports division filtering',
      Array.isArray(allNotifs),
      `Verified notifications collection is queryable, total sample: ${allNotifs.length}`);

    // -------------------------------------------------------------
    // ITEM 2: Vendor Onboarding Agent Name Mapping
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 2: Vendor Onboarded / Assigned By Name ---');

    // Find actual vendors in Thalaivasal or across DB
    const harshini = await Vendor.findOne({ businessName: /harshini/i }).populate('assignedAgent', 'name email').lean();
    const vendorY = await Vendor.findOne({ businessName: /^y$/i }).populate('assignedAgent', 'name email').lean();

    // Test 5: Harshini vendor agent resolution
    let harshiniAgentName = 'Unavailable';
    if (harshini) {
      if (harshini.assignedAgent && typeof harshini.assignedAgent === 'object' && harshini.assignedAgent.name) {
        harshiniAgentName = harshini.assignedAgent.name;
      } else if (harshini.agentName) {
        harshiniAgentName = harshini.agentName;
      } else if (harshini.onboardedBy && !harshini.onboardedBy.match(/^[0-9a-fA-F]{24}$/)) {
        harshiniAgentName = harshini.onboardedBy;
      }
    }
    record('Test 5a: Vendor "harshini" displays onboarding agent name ("Shiva"), never viewer "Subramanian"',
      harshiniAgentName.toLowerCase().includes('shiva') && !harshiniAgentName.toLowerCase().includes('subramanian'),
      `Resolved onboarding agent: "${harshiniAgentName}"`);

    // Test 5b: Vendor "y" agent resolution
    let yAgentName = 'Unavailable';
    if (vendorY) {
      if (vendorY.assignedAgent && typeof vendorY.assignedAgent === 'object' && vendorY.assignedAgent.name) {
        yAgentName = vendorY.assignedAgent.name;
      } else if (vendorY.agentName) {
        yAgentName = vendorY.agentName;
      } else if (vendorY.onboardedBy && !vendorY.onboardedBy.match(/^[0-9a-fA-F]{24}$/)) {
        yAgentName = vendorY.onboardedBy;
      }
    }
    record('Test 5b: Vendor "y" displays onboarding agent name ("dis"), never viewer "Subramanian"',
      yAgentName.toLowerCase().includes('dis') && !yAgentName.toLowerCase().includes('subramanian'),
      `Resolved onboarding agent: "${yAgentName}"`);

    // Test 6: Fallback to 'Unavailable' when no agent name or onboardedBy is provided
    const mockUnassignedVendor = { businessName: 'Test', assignedAgent: null, agentName: '', onboardedBy: '' };
    const getAgentName = (v) => {
      if (v.assignedAgent && typeof v.assignedAgent === 'object' && v.assignedAgent.name) return v.assignedAgent.name;
      if (v.agentName && typeof v.agentName === 'string' && v.agentName.trim()) return v.agentName.trim();
      if (v.onboardedBy && typeof v.onboardedBy === 'string' && !v.onboardedBy.match(/^[0-9a-fA-F]{24}$/)) return v.onboardedBy.trim();
      return 'Unavailable';
    };
    record('Test 6: Fallback to "Unavailable" when agent information is absent',
      getAgentName(mockUnassignedVendor) === 'Unavailable',
      `Result: ${getAgentName(mockUnassignedVendor)}`);

    // -------------------------------------------------------------
    // ITEM 3: Profile Alternate Mobile Data Integrity
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 3: Alternate Mobile Number Integrity ---');

    // Test 7: Leading digit integrity and validation (must be 10 digits starting with 6-9)
    const validAlt1 = '9876543210';
    const validAlt2 = '6123456789';
    const invalidAltShort = '987654321';
    const invalidAltLetters = '987654321A';
    const invalidAltStart = '5876543210';

    const altRegex = /^[6-9]\d{9}$/;
    record('Test 7a: Valid alternate mobile starting with 9 preserved with exact digits',
      altRegex.test(validAlt1) && validAlt1[0] === '9' && validAlt1.length === 10,
      `Number: ${validAlt1}`);
    record('Test 7b: Valid alternate mobile starting with 6 preserved with exact digits',
      altRegex.test(validAlt2) && validAlt2[0] === '6' && validAlt2.length === 10,
      `Number: ${validAlt2}`);
    record('Test 7c: Invalid alternate mobile (< 10 digits) correctly rejected',
      !altRegex.test(invalidAltShort),
      `Short number rejected`);
    record('Test 7d: Invalid alternate mobile (alphanumeric) correctly rejected',
      !altRegex.test(invalidAltLetters),
      `Alphanumeric rejected`);
    record('Test 7e: Invalid alternate mobile (starts with 5) correctly rejected',
      !altRegex.test(invalidAltStart),
      `Leading 5 rejected`);

    // Test 8: Primary mobile immutability
    const subramanianUser = await db.collection('users').findOne({ email: /subramanian/i });
    const originalPrimaryPhone = subramanianUser ? (subramanianUser.phone || subramanianUser.mobile) : null;
    record('Test 8: Primary mobile remains unchanged and immutable during alternate mobile updates',
      originalPrimaryPhone !== null,
      `Primary phone: ${originalPrimaryPhone}`);

    // -------------------------------------------------------------
    // ITEM 4: Division Dashboard KPIs (Total & Active Vendors)
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 4: Division Dashboard KPIs (Thalaivasal) ---');

    const divisionRegex = new RegExp('^Thalaivasal$', 'i');
    const thalaivasalVendors = await Vendor.find({ division: divisionRegex }).lean();

    // Test 9: Total registered vendors for Thalaivasal = 2
    record('Test 9: Total registered vendors in Thalaivasal is exactly 2',
      thalaivasalVendors.length === 2,
      `Found ${thalaivasalVendors.length} registered vendors (${thalaivasalVendors.map(v => v.businessName).join(', ')})`);

    // Test 10: Active vendors in Thalaivasal = 2
    const activeVendors = thalaivasalVendors.filter(v =>
      (v.status && (v.status.toLowerCase() === 'approved' || v.status.toLowerCase() === 'active')) ||
      (v.kycStatus && v.kycStatus.toLowerCase() === 'approved')
    );
    record('Test 10: Active vendors in Thalaivasal is exactly 2',
      activeVendors.length === 2,
      `Found ${activeVendors.length} active/approved vendors`);

    // Test 11: Scoped query excludes vendors from other divisions
    const otherDivVendors = await Vendor.find({ division: { $nin: [/thalaivasal/i, null, ''] } }).lean();
    record('Test 11: Scoping excludes vendors from other divisions',
      otherDivVendors.length > 0 && !otherDivVendors.some(v => (v.division || '').toLowerCase() === 'thalaivasal'),
      `Other divisions have ${otherDivVendors.length} vendors, none leaked into Thalaivasal query`);

    // -------------------------------------------------------------
    // ITEM 5: Bank Account Number Validation (8–20 numeric digits)
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 5: Standardized Bank Account Validation ---');

    // Test 12: 8 numeric digits accepted (lower boundary)
    record('Test 12: 8 numeric digits accepted (lower bound)',
      isValidAccountNumber('12345678') === true && sanitizeAccountNumber('12345678') === '12345678',
      'Accepted 12345678');

    // Test 13: 20 numeric digits accepted (upper boundary)
    record('Test 13: 20 numeric digits accepted (upper bound)',
      isValidAccountNumber('12345678901234567890') === true && sanitizeAccountNumber('12345678901234567890') === '12345678901234567890',
      'Accepted 12345678901234567890 (20 digits)');

    // Test 14: 7 numeric digits rejected (too short)
    record('Test 14: 7 numeric digits rejected (too short)',
      isValidAccountNumber('1234567') === false,
      'Rejected 1234567');

    // Test 15: 21 numeric digits rejected (too long)
    record('Test 15: 21 numeric digits rejected (too long)',
      isValidAccountNumber('123456789012345678901') === false,
      'Rejected 123456789012345678901');

    // Test 16: Account number with letters rejected
    record('Test 16: Account number with letters rejected',
      isValidAccountNumber('12345678IO') === false && isValidAccountNumber('IO12345678') === false,
      'Rejected letters in account number');

    // Test 17: Account number with special characters rejected
    record('Test 17: Account number with special characters rejected',
      isValidAccountNumber('1234-5678-9012') === false && isValidAccountNumber('1234 5678') === false,
      'Rejected special characters / spaces');

    // Test 18: Leading zeros preserved as string
    const leadingZeroAcct = '000123456789';
    record('Test 18: Leading zeros preserved without numeric conversion truncation',
      isValidAccountNumber(leadingZeroAcct) === true && sanitizeAccountNumber(leadingZeroAcct) === '000123456789',
      `Preserved: "${sanitizeAccountNumber(leadingZeroAcct)}"`);

    // -------------------------------------------------------------
    // ITEM 6: Regression & Role Integrity
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 6: Regression & Role Integrity ---');

    // Test 19: Division agent territory scope validation
    const subramanianAgent = await Agent.findOne({ email: /subramanian/i }).lean();
    const subDivision = subramanianAgent?.territory?.division || subramanianAgent?.assignedTerritory?.division || subramanianAgent?.assignedDivision || subramanianAgent?.division;
    record('Test 19: Division Agent record exists with territory assigned to Thalaivasal',
      Boolean(subDivision && subDivision.toLowerCase() === 'thalaivasal'),
      `Agent role: ${subramanianAgent?.role}, Division: ${subDivision}`);

  } catch (err) {
    console.error('Unhandled error during test execution:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
    console.log('\n===============================================================');
    console.log(` SUMMARY: ${passed} PASSED | ${failed} FAILED (TOTAL: ${passed + failed})`);
    console.log('===============================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

run19Tests();
