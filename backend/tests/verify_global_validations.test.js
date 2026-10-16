/**
 * Comprehensive Validation Test Suite for Connect App Global Form Validation
 */

const assert = require('assert');

// Load compiled utils from backend/dist
const {
  formatName,
  isValidName,
  normalizeEmail,
  isValidEmail,
  sanitizeIndianMobile,
  isValidIndianMobile,
  validatePassword,
  isValidPassword,
  sanitizeAadhaar,
  isValidAadhaar,
  maskAadhaar,
  formatPan,
  isValidPan,
  validateBankAccount,
  sanitizeAccountNumber,
  maskAccountNumber,
  formatIfsc,
  isValidIfsc,
  calculateAge,
  isAtLeast18YearsOld,
  getMax18DobString,
  BANK_SPECIFIC_RULES
} = require('../dist/utils/formValidation');

const { validateVendorFieldFormats } = require('../dist/utils/territoryValidation');
const { registerSchema, loginSchema, updateProfileSchema } = require('../dist/schemas/auth.schema');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('=== RUNNING CONNECT APP GLOBAL VALIDATION AUDIT TESTS ===\n');

// 1. NAME FIELD VALIDATION
console.log('[1. Name Field Validation]');
runTest('Auto-capitalize first letter of each word', () => {
  assert.strictEqual(formatName('rathika'), 'Rathika');
  assert.strictEqual(formatName('rathika rani'), 'Rathika Rani');
  assert.strictEqual(formatName('dr. a.p.j. abdul kalam'), 'Dr. A.P.J. Abdul Kalam');
});

runTest('Trim leading whitespace only and preserve inner whitespace', () => {
  assert.strictEqual(formatName('   rathika'), 'Rathika');
  assert.strictEqual(formatName('rathika   rani'), 'Rathika   Rani');
});

runTest('Preserve case for subsequent characters, do not convert all to uppercase', () => {
  assert.strictEqual(formatName('mcDonald'), 'McDonald');
  assert.strictEqual(formatName('o\'Connor'), 'O\'Connor');
});

runTest('Allow regional characters (e.g. Hindi/Tamil/Telugu/Devanagari)', () => {
  assert.strictEqual(isValidName('राधा शर्मा'), true);
  assert.strictEqual(isValidName('முருகன்'), true);
  assert.strictEqual(isValidName('రాజేష్'), true);
});

runTest('Reject empty, spaces-only, numbers or invalid symbols in personal names', () => {
  assert.strictEqual(isValidName('   '), false);
  assert.strictEqual(isValidName('Rathika123'), false);
  assert.strictEqual(isValidName('Rathika@#$'), false);
  assert.strictEqual(isValidName('A'), false); // under minLength 2
  assert.strictEqual(isValidName('Rathika Kumar'), true);
});


// 2. EMAIL VALIDATION
console.log('\n[2. Email Validation]');
runTest('Valid standard emails pass', () => {
  assert.strictEqual(isValidEmail('localpart@domain.com'), true);
  assert.strictEqual(isValidEmail('agent.rathika@connect.in'), true);
  assert.strictEqual(isValidEmail('test.merchant+orders@shop.co.in'), true);
});

runTest('Reject malformed emails (no domain, no extension, multiple @, whitespace)', () => {
  assert.strictEqual(isValidEmail('plainaddress'), false);
  assert.strictEqual(isValidEmail('@missinglocal.com'), false);
  assert.strictEqual(isValidEmail('missingdomain@.com'), false);
  assert.strictEqual(isValidEmail('missingat.com'), false);
  assert.strictEqual(isValidEmail('two@at@domain.com'), false);
  assert.strictEqual(isValidEmail('user @domain.com'), false);
  assert.strictEqual(isValidEmail('user@domain.c'), false); // TLD < 2 chars
});

runTest('Normalize email lowercases and trims', () => {
  assert.strictEqual(normalizeEmail('  Agent.Rathika@Example.COM  '), 'agent.rathika@example.com');
});


// 3. INDIAN MOBILE NUMBER VALIDATION
console.log('\n[3. Indian Mobile Number Validation]');
runTest('Valid 10-digit Indian numbers starting with 6, 7, 8, 9 pass', () => {
  assert.strictEqual(isValidIndianMobile('9876543210'), true);
  assert.strictEqual(isValidIndianMobile('8123456789'), true);
  assert.strictEqual(isValidIndianMobile('7012345678'), true);
  assert.strictEqual(isValidIndianMobile('6301234567'), true);
});

runTest('Reject numbers starting with 0, 1, 2, 3, 4, 5', () => {
  assert.strictEqual(isValidIndianMobile('0987654321'), false);
  assert.strictEqual(isValidIndianMobile('1234567890'), false);
  assert.strictEqual(isValidIndianMobile('2345678901'), false);
  assert.strictEqual(isValidIndianMobile('3456789012'), false);
  assert.strictEqual(isValidIndianMobile('4567890123'), false);
  assert.strictEqual(isValidIndianMobile('5678901234'), false);
});

runTest('Reject lengths not equal to 10 digits', () => {
  assert.strictEqual(isValidIndianMobile('987654321'), false); // 9 digits
  assert.strictEqual(isValidIndianMobile('98765432101'), false); // 11 digits
});

runTest('Clean prefix +91/91 without corrupting digits', () => {
  assert.strictEqual(sanitizeIndianMobile('+919876543210'), '9876543210');
  assert.strictEqual(sanitizeIndianMobile('919876543210'), '9876543210');
  assert.strictEqual(isValidIndianMobile('+919876543210'), true);
});


// 4. PASSWORD VALIDATION
console.log('\n[4. Password Validation]');
runTest('Valid passwords meeting requirements pass', () => {
  const result = validatePassword('Rathika@123');
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.errors.length, 0);
  assert.strictEqual(isValidPassword('Rathika@123'), true);
});

runTest('Reject passwords failing individual criteria', () => {
  // Too short (< 6 chars)
  const shortRes = validatePassword('Rat@1');
  assert.strictEqual(shortRes.valid, false);
  assert.strictEqual(shortRes.errors.some(e => e.includes('6 characters')), true);

  // Missing uppercase
  const noUpper = validatePassword('rathika@123');
  assert.strictEqual(noUpper.valid, false);
  assert.strictEqual(noUpper.errors.some(e => e.includes('uppercase')), true);

  // Missing digit
  const noDigit = validatePassword('Rathika@abc');
  assert.strictEqual(noDigit.valid, false);
  assert.strictEqual(noDigit.errors.some(e => e.includes('numeric digit')), true);

  // Missing special character
  const noSpecial = validatePassword('Rathika1234');
  assert.strictEqual(noSpecial.valid, false);
  assert.strictEqual(noSpecial.errors.some(e => e.includes('special character')), true);
});


// 5. AADHAAR NUMBER VALIDATION & MASKING
console.log('\n[5. Aadhaar Number Validation & Masking]');
runTest('Exactly 12 numeric digits pass', () => {
  assert.strictEqual(isValidAadhaar('123456789012'), true);
  assert.strictEqual(isValidAadhaar('987654321098'), true);
});

runTest('Reject invalid lengths or non-numeric characters', () => {
  assert.strictEqual(isValidAadhaar('12345678901'), false); // 11
  assert.strictEqual(isValidAadhaar('1234567890123'), false); // 13
  assert.strictEqual(isValidAadhaar('12345678901A'), false);
  assert.strictEqual(isValidAadhaar(''), false);
});

runTest('Mask Aadhaar properly for security', () => {
  assert.strictEqual(maskAadhaar('123456789012'), 'XXXX-XXXX-9012');
});


// 6. PAN CARD VALIDATION
console.log('\n[6. PAN Card Validation]');
runTest('Valid 10-char PAN format (5 letters, 4 digits, 1 letter) passes', () => {
  assert.strictEqual(isValidPan('ABCDE1234F'), true);
  assert.strictEqual(formatPan('abcde1234f'), 'ABCDE1234F');
  assert.strictEqual(isValidPan(formatPan('abcde1234f')), true);
});

runTest('Reject invalid PAN formats', () => {
  assert.strictEqual(isValidPan('ABCD12345F'), false); // 4 letters 5 digits
  assert.strictEqual(isValidPan('ABCDEF1234'), false); // 6 letters
  assert.strictEqual(isValidPan('ABCDE12345'), false); // Ends in number
  assert.strictEqual(isValidPan('12345ABCDE'), false);
  assert.strictEqual(isValidPan('ABCDE123F'), false); // 9 chars
});


// 7. BANK ACCOUNT NUMBER VALIDATION
console.log('\n[7. Bank Account Number Validation]');
runTest('Bank specific rules (SBI, HDFC, ICICI, Axis, Kotak)', () => {
  // HDFC: exactly 14 digits
  assert.strictEqual(validateBankAccount('12345678901234', 'HDFC Bank').valid, true);
  assert.strictEqual(validateBankAccount('1234567890123', 'HDFC Bank').valid, false);

  // ICICI: exactly 12 digits
  assert.strictEqual(validateBankAccount('123456789012', 'ICICI Bank').valid, true);
  assert.strictEqual(validateBankAccount('1234567890123', 'ICICI Bank').valid, false);

  // SBI: 11 to 17 digits
  assert.strictEqual(validateBankAccount('12345678901', 'State Bank of India').valid, true);
  assert.strictEqual(validateBankAccount('00000012345678901', 'SBI').valid, true);
  assert.strictEqual(validateBankAccount('1234567890', 'SBI').valid, false); // 10 digits

  // Kotak: exactly 10 digits
  assert.strictEqual(validateBankAccount('1234567890', 'Kotak Mahindra Bank').valid, true);
  assert.strictEqual(validateBankAccount('12345678901', 'Kotak').valid, false);
});

runTest('Fallback safe range 8-20 numeric digits when bank unknown', () => {
  assert.strictEqual(validateBankAccount('12345678', 'Cooperative Bank').valid, true);
  assert.strictEqual(validateBankAccount('12345678901234567890', '').valid, true);
  assert.strictEqual(validateBankAccount('1234567', '').valid, false); // 7 digits
  assert.strictEqual(validateBankAccount('123456789012345678901', '').valid, false); // 21 digits
});

runTest('Mask Account Number properly', () => {
  assert.strictEqual(maskAccountNumber('123456789012'), '••••••••9012');
});


// 8. IFSC CODE VALIDATION
console.log('\n[8. IFSC Code Validation]');
runTest('Valid 11-char IFSC code (4 uppercase, 0, 6 alphanumeric) passes', () => {
  assert.strictEqual(isValidIfsc('SBIN0001234'), true);
  assert.strictEqual(isValidIfsc('HDFC0000128'), true);
  assert.strictEqual(isValidIfsc('ICIC0000001'), true);
  assert.strictEqual(isValidIfsc(formatIfsc('sbin0001234')), true);
});

runTest('Reject invalid IFSC codes', () => {
  assert.strictEqual(isValidIfsc('SBIN1001234'), false); // 5th char not '0'
  assert.strictEqual(isValidIfsc('SBI00001234'), false); // 3 letters instead of 4
  assert.strictEqual(isValidIfsc('SBIN000123'), false); // 10 chars
  assert.strictEqual(isValidIfsc('SBIN00012345'), false); // 12 chars
  assert.strictEqual(isValidIfsc('SBIN000123@'), false); // Special char
});


// 9. DATE OF BIRTH & MINIMUM AGE (18+)
console.log('\n[9. Date of Birth and Minimum Age]');
runTest('Calculate age accounting for month, day, and leap years', () => {
  const today = new Date();
  
  // Exactly 18 years ago today
  const exact18 = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  assert.strictEqual(calculateAge(exact18), 18);
  assert.strictEqual(isAtLeast18YearsOld(exact18), true);

  // 18 years minus 1 day (i.e. turns 18 tomorrow) -> age 17
  const tomorrow18 = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate() + 1);
  assert.strictEqual(calculateAge(tomorrow18), 17);
  assert.strictEqual(isAtLeast18YearsOld(tomorrow18), false);

  // 25 years old
  const age25 = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
  assert.strictEqual(calculateAge(age25), 25);
  assert.strictEqual(isAtLeast18YearsOld(age25), true);

  // Future date
  const future = new Date(today.getFullYear() + 1, 0, 1);
  assert.strictEqual(isAtLeast18YearsOld(future), false);
});

runTest('Cutoff date string calculation', () => {
  const cutoff = getMax18DobString();
  assert.strictEqual(/^\d{4}-\d{2}-\d{2}$/.test(cutoff), true);
  assert.strictEqual(isAtLeast18YearsOld(cutoff), true);
});


// 10. BACKEND SCHEMAS & CONTROLLER VALIDATION
console.log('\n[10. Backend Integration & Schemas]');
runTest('validateVendorFieldFormats passes valid vendor data', () => {
  const res = validateVendorFieldFormats({
    ownerName: 'Ramesh Kumar',
    phone: '9876543210',
    email: 'merchant@store.com',
    panNumber: 'ABCDE1234F',
    aadhaarNumber: '123456789012',
    pincode: '600001',
    accountNumber: '12345678901234',
    bankName: 'HDFC Bank',
    ifscCode: 'HDFC0000128'
  });
  assert.strictEqual(res.valid, true);
});

runTest('validateVendorFieldFormats catches invalid mobile, email, PAN, Aadhaar, Bank', () => {
  // Invalid phone (starts with 5)
  assert.strictEqual(validateVendorFieldFormats({ phone: '5123456789' }).valid, false);
  // Invalid email
  assert.strictEqual(validateVendorFieldFormats({ email: 'bad email' }).valid, false);
  // Invalid PAN
  assert.strictEqual(validateVendorFieldFormats({ panNumber: '12345' }).valid, false);
  // Invalid Aadhaar (letters)
  assert.strictEqual(validateVendorFieldFormats({ aadhaarNumber: '12345678901A' }).valid, false);
  // Invalid Bank account for HDFC (13 digits instead of 14)
  assert.strictEqual(validateVendorFieldFormats({ accountNumber: '1234567890123', bankName: 'HDFC Bank' }).valid, false);
  // Invalid IFSC (missing 0 as 5th char)
  assert.strictEqual(validateVendorFieldFormats({ ifscCode: 'HDFC1000128' }).valid, false);
});

runTest('registerSchema accepts valid registration payload with 18+ age', () => {
  const validData = {
    name: 'Rathika Rani',
    email: 'rathika@connect.in',
    password: 'Password@123',
    phone: '9876543210',
    role: 'pincode',
    dob: '2000-01-01',
    gender: 'female'
  };
  const parsed = registerSchema.safeParse({ body: validData });
  assert.strictEqual(parsed.success, true);
  if (parsed.success) {
    assert.strictEqual(parsed.data.body.name, 'Rathika Rani');
    assert.strictEqual(parsed.data.body.email, 'rathika@connect.in');
    assert.strictEqual(parsed.data.body.phone, '9876543210');
  }
});

runTest('registerSchema rejects under-18 DOB and weak password', () => {
  const today = new Date();
  const underageDate = `${today.getFullYear() - 17}-01-01`;
  const invalidData = {
    name: 'Rathika Rani',
    email: 'rathika@connect.in',
    password: 'weak',
    phone: '9876543210',
    role: 'pincode',
    dob: underageDate
  };
  const parsed = registerSchema.safeParse({ body: invalidData });
  assert.strictEqual(parsed.success, false);
});

console.log(`\n======================================================`);
console.log(`RESULTS: ${passedTests} / ${totalTests} test cases passed successfully!`);
console.log(`======================================================\n`);
