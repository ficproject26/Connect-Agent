import { uploadBase64ToS3 } from '../config/s3';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Agent from '../models/Agent';
import { generateToken } from '../utils/jwt';
import { invalidateAgentTerritoryScope } from '../utils/territoryScope';
import { checkExistingDistrictAssignment } from '../utils/districtAssignment';
import { publishEntityEvent } from '../realtime/eventBus';
import { AUTHORIZED_AGENT_ROLES, normalizeToAgentRole } from '../middleware/auth.middleware';
import { z } from 'zod';
import {
  isValidName,
  formatName,
  isValidEmail,
  normalizeEmail,
  isValidIndianMobile,
  sanitizeIndianMobile,
  validatePassword,
  isValidAadhaar,
  sanitizeAadhaar,
  isValidPan,
  formatPan,
  isAtLeast18YearsOld,
  validateBankAccount,
  sanitizeAccountNumber,
  isValidIfsc,
  formatIfsc
} from '../utils/formValidation';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').refine(val => isValidName(val), {
    message: 'Name contains invalid characters.'
  }).transform(val => formatName(val)),
  email: z.string().refine(val => isValidEmail(val), {
    message: 'Please enter a valid email address (e.g. name@example.com).'
  }).transform(val => normalizeEmail(val)),
  password: z.string().refine(val => validatePassword(val).valid, {
    message: 'Password must be at least 6 characters and contain at least one uppercase letter, one number, and one special character (e.g. Rathika@123).'
  }),
  phone: z.string().transform(val => sanitizeIndianMobile(val)).refine(val => isValidIndianMobile(val), {
    message: 'Mobile number must start with 6, 7, 8, or 9 and be exactly 10 digits.'
  }),
  altPhone: z.string().optional().default('').refine(val => !val || isValidIndianMobile(val), {
    message: 'Alternate mobile number must start with 6, 7, 8, or 9 and be exactly 10 digits.'
  }).transform(val => val ? sanitizeIndianMobile(val) : ''),
  role: z.enum(['state', 'district', 'division', 'pincode', 'delivery_partner', 'technician']),
  dob: z.string().optional().or(z.date().optional()),
  gender: z.string().optional(),
  qualification: z.string().optional(),
  experience: z.string().optional(),
  previousCompany: z.string().optional(),
  address: z.union([
    z.string(),
    z.object({
      buildingNo: z.string().optional().default(''),
      street: z.string().optional().default(''),
      locality: z.string().optional().default(''),
      postOffice: z.string().optional().default(''),
      taluk: z.string().optional().default(''),
      state: z.string().optional().default(''),
      district: z.string().optional().default(''),
      pincode: z.string().optional().default('')
    })
  ]).optional(),
  fullAddress: z.string().optional(),
  buildingNo: z.string().optional(),
  streetName: z.string().optional(),
  postOffice: z.string().optional(),
  aadhaarNumber: z.string().optional().refine(val => !val || isValidAadhaar(val), {
    message: 'Aadhaar number must be exactly 12 numeric digits.'
  }).transform(val => val ? sanitizeAadhaar(val) : ''),
  panNumber: z.string().optional().refine(val => !val || isValidPan(val), {
    message: 'PAN number must be 10 characters in format ABCDE1234F (5 letters, 4 digits, 1 letter).'
  }).transform(val => val ? formatPan(val) : ''),
  assignedTerritory: z.object({
    state: z.string().optional().default(''),
    stateId: z.string().optional().default(''),
    district: z.string().optional().default(''),
    districtId: z.string().optional().default(''),
    division: z.string().optional().default(''),
    divisionId: z.string().optional().default(''),
    taluk: z.string().optional().default(''),
    talukId: z.string().optional().default(''),
    pincode: z.string().optional().default(''),
    pincodeId: z.string().optional().default('')
  }).optional(),
  territory: z.object({
    state: z.string().optional().default(''),
    district: z.string().optional().default(''),
    division: z.string().optional().default(''),
    pincode: z.string().optional().default('')
  }).optional(),
  kycDocs: z.object({
    aadhaarNumber: z.string().optional().default(''),
    panNumber: z.string().optional().default(''),
    aadhaarCard: z.string().optional().default(''),
    panCard: z.string().optional().default(''),
    passportPhoto: z.string().optional().default(''),
    signature: z.string().optional().default(''),
    cancelledCheque: z.string().optional().default(''),
    educationalCertificates: z.string().optional().default('')
  }).optional(),
  bankDetails: z.object({
    accountHolderName: z.string().trim().min(2, 'Account Holder Name is required'),
    bankName: z.string().trim().min(2, 'Bank Name is required'),
    bankBranch: z.string().trim().min(2, 'Bank Branch Name is required'),
    accountNumber: z.string().trim().regex(/^\d+$/, 'Account Number must contain numeric digits only').min(6, 'Account Number must be at least 6 digits').max(20, 'Account Number cannot exceed 20 digits'),
    ifscCode: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'IFSC Code must follow the Indian format (e.g. SBIN0001234)')
  }).optional(),
  accountHolderName: z.string().optional(),
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
});

export const register = async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    
    // Parse dob to Date object and validate 18+ requirement
    let parsedDob: Date | undefined;
    if (validatedData.dob) {
      const d = new Date(validatedData.dob);
      if (!isNaN(d.getTime())) {
        if (!isAtLeast18YearsOld(d)) {
          return res.status(400).json({ message: 'You must be at least 18 years old to register.' });
        }
        parsedDob = d;
      }
    }

    // Check if agent already exists by email in Agent collection
    const existingAgentEmail = await Agent.findOne({ email: validatedData.email.toLowerCase() });
    if (existingAgentEmail) {
      return res.status(400).json({ message: 'Email address is already registered. Please use another email or log in.' });
    }

    // Check if agent already exists by phone
    const existingAgentPhone = await Agent.findOne({ phone: validatedData.phone });
    if (existingAgentPhone) {
      return res.status(400).json({ message: 'Phone number is already registered. Please use another phone number.' });
    }

    // Enforce Shared Email & Cross-Role Isolation: Prevent overwriting or auto-converting existing accounts in users collection
    const db = mongoose.connection.db;
    if (db) {
      const existingUser = await db.collection('users').findOne({ email: validatedData.email.toLowerCase() });
      if (existingUser) {
        const existingRole = String(existingUser.role || existingUser.level || '').toLowerCase();
        if (existingRole && !['agent', validatedData.role].includes(existingRole)) {
          return res.status(400).json({
            message: `An account with this email address already exists with the role of '${existingUser.role || existingRole}'. Cross-role account conversion is not permitted.`
          });
        } else {
          return res.status(400).json({
            message: 'An agent registration for this email address already exists.'
          });
        }
      }
    }

    const agentRole = validatedData.role;

    // 1. Process separate Assigned Territory
    const rawTerritory: any = validatedData.assignedTerritory || validatedData.territory || {};
    const cleanAssignedTerritory = {
      state: (rawTerritory.state || '').trim(),
      stateId: (rawTerritory as any).stateId || '',
      district: agentRole === 'state' ? '' : ((rawTerritory.district || '').trim()),
      districtId: agentRole === 'state' ? '' : ((rawTerritory as any).districtId || ''),
      division: (agentRole === 'state' || agentRole === 'district') ? '' : ((rawTerritory.division || '').trim()),
      divisionId: (agentRole === 'state' || agentRole === 'district') ? '' : ((rawTerritory as any).divisionId || ''),
      taluk: (agentRole === 'state' || agentRole === 'district') ? '' : ((rawTerritory as any).taluk || '').trim(),
      talukId: (agentRole === 'state' || agentRole === 'district') ? '' : ((rawTerritory as any).talukId || ''),
      pincode: agentRole === 'pincode' ? ((rawTerritory.pincode || '').trim()) : '',
      pincodeId: agentRole === 'pincode' ? ((rawTerritory as any).pincodeId || '') : ''
    };

    // Role-based territory validation
    if (!cleanAssignedTerritory.state) {
      return res.status(400).json({ message: 'Assigned State is required for territory jurisdiction.' });
    }
    if (agentRole !== 'state' && !cleanAssignedTerritory.district) {
      return res.status(400).json({ message: 'Assigned District is required for District/Division/Pincode Agent.' });
    }
    if ((agentRole === 'division' || agentRole === 'pincode') && !cleanAssignedTerritory.division) {
      return res.status(400).json({ message: 'Assigned Division is required for Division/Pincode Agent.' });
    }
    if (agentRole === 'pincode' && !cleanAssignedTerritory.pincode) {
      return res.status(400).json({ message: 'Assigned PIN Code is required for Pincode Agent.' });
    }

    // Server-side Territory Hierarchy Verification against Admin Territory Database
    const territoryDb = db || mongoose.connection.db;
    if (territoryDb) {
      // 1. Verify State exists and is active
      const stateQueries: any[] = [
        { name: { $regex: new RegExp(`^${cleanAssignedTerritory.state.trim()}$`, 'i') } }
      ];
      if (cleanAssignedTerritory.stateId) {
        if (mongoose.Types.ObjectId.isValid(cleanAssignedTerritory.stateId)) {
          stateQueries.push({ _id: new mongoose.Types.ObjectId(cleanAssignedTerritory.stateId) });
        }
        stateQueries.push({ stateId: cleanAssignedTerritory.stateId });
      }

      let stateDoc = await territoryDb.collection('states').findOne({
        $or: stateQueries,
        $and: [{ $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }] }]
      });

      if (!stateDoc && db && db !== territoryDb) {
        stateDoc = await db.collection('states').findOne({
          $or: stateQueries,
          $and: [{ $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }] }]
        });
      }

      if (!stateDoc) {
        const canonicalMatch = [
          { name: 'Tamil Nadu', stateId: 'ST-TAM-4607', code: 'TN' },
          { name: 'Karnataka', stateId: 'ST-KAR-0001', code: 'KAR' },
          { name: 'Gujarat', stateId: 'ST-GJ', code: 'GJ' },
          { name: 'Pondicherry', stateId: 'ST-PY', code: 'PY' }
        ].find(s => s.name.toLowerCase() === cleanAssignedTerritory.state.trim().toLowerCase());

        if (canonicalMatch) {
          stateDoc = {
            _id: canonicalMatch.stateId as any,
            stateId: canonicalMatch.stateId,
            name: canonicalMatch.name,
            code: canonicalMatch.code,
            status: 'Active'
          };
        }
      }

      if (!stateDoc) {
        return res.status(400).json({
          message: `Selected State "${cleanAssignedTerritory.state}" is not an active territory in the Admin territory database.`
        });
      }

      // Populate verified state details
      cleanAssignedTerritory.state = stateDoc.name.trim();
      cleanAssignedTerritory.stateId = stateDoc.stateId || stateDoc._id.toString();

      // 2. Verify District belongs to State
      let districtDoc: any = null;
      if (agentRole !== 'state') {
        const distQueries: any[] = [
          { name: { $regex: new RegExp(`^${cleanAssignedTerritory.district.trim()}$`, 'i') } }
        ];
        if (cleanAssignedTerritory.districtId) {
          if (mongoose.Types.ObjectId.isValid(cleanAssignedTerritory.districtId)) {
            distQueries.push({ _id: new mongoose.Types.ObjectId(cleanAssignedTerritory.districtId) });
          }
          distQueries.push({ districtId: cleanAssignedTerritory.districtId });
        }

        const stateRefConditions: any[] = [
          { stateId: stateDoc._id },
          { stateId: stateDoc._id.toString() },
          { state: stateDoc.name }
        ];
        if (stateDoc.stateId) {
          stateRefConditions.push({ stateId: stateDoc.stateId });
        }

        districtDoc = await territoryDb.collection('districts').findOne({
          $or: distQueries,
          $and: [
            { $or: stateRefConditions },
            { $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }] }
          ]
        });

        if (!districtDoc && db && db !== territoryDb) {
          districtDoc = await db.collection('districts').findOne({
            $or: distQueries,
            $and: [
              { $or: stateRefConditions },
              { $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }] }
            ]
          });
        }

        if (!districtDoc) {
          return res.status(400).json({
            message: `Assigned District "${cleanAssignedTerritory.district}" does not belong to State "${cleanAssignedTerritory.state}" or is not active.`
          });
        }

        cleanAssignedTerritory.district = districtDoc.name.trim();
        cleanAssignedTerritory.districtId = districtDoc.districtId || districtDoc._id.toString();
      }

      // 3. Verify Division belongs to District
      let divisionDoc: any = null;
      if (agentRole === 'division' || agentRole === 'pincode') {
        const divQueries: any[] = [
          { name: { $regex: new RegExp(`^${cleanAssignedTerritory.division.trim()}$`, 'i') } }
        ];
        if (cleanAssignedTerritory.divisionId) {
          if (mongoose.Types.ObjectId.isValid(cleanAssignedTerritory.divisionId)) {
            divQueries.push({ _id: new mongoose.Types.ObjectId(cleanAssignedTerritory.divisionId) });
          }
          divQueries.push({ divisionId: cleanAssignedTerritory.divisionId });
        }

        const distRefConditions: any[] = [
          { districtId: districtDoc._id },
          { districtId: districtDoc._id.toString() },
          { district: districtDoc.name }
        ];
        if (districtDoc.districtId) {
          distRefConditions.push({ districtId: districtDoc.districtId });
        }

        divisionDoc = await territoryDb.collection('divisions').findOne({
          $or: divQueries,
          $and: [
            { $or: distRefConditions },
            { $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }] }
          ]
        });

        if (!divisionDoc && db && db !== territoryDb) {
          divisionDoc = await db.collection('divisions').findOne({
            $or: divQueries,
            $and: [
              { $or: distRefConditions },
              { $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }] }
            ]
          });
        }

        if (!divisionDoc) {
          return res.status(400).json({
            message: `Assigned Division "${cleanAssignedTerritory.division}" does not belong to District "${cleanAssignedTerritory.district}" or is not active.`
          });
        }

        cleanAssignedTerritory.division = divisionDoc.name.trim();
        cleanAssignedTerritory.divisionId = divisionDoc.divisionId || divisionDoc._id.toString();
        if (!cleanAssignedTerritory.taluk && (divisionDoc.talukInfo || divisionDoc.taluk)) {
          cleanAssignedTerritory.taluk = divisionDoc.talukInfo || divisionDoc.taluk;
        }
      }

      // 4. Verify Pincode belongs to Division/District
      if (agentRole === 'pincode') {
        const pinCodeClean = cleanAssignedTerritory.pincode.replace(/\D/g, '').slice(0, 6);
        const pinQueries: any[] = [
          { code: pinCodeClean }
        ];
        if (cleanAssignedTerritory.pincodeId) {
          if (mongoose.Types.ObjectId.isValid(cleanAssignedTerritory.pincodeId)) {
            pinQueries.push({ _id: new mongoose.Types.ObjectId(cleanAssignedTerritory.pincodeId) });
          }
          pinQueries.push({ pincodeId: cleanAssignedTerritory.pincodeId });
        }

        const pinRefConditions: any[] = [
          { divisionId: divisionDoc._id },
          { divisionId: divisionDoc._id.toString() },
          { division: divisionDoc.name },
          { districtId: districtDoc._id },
          { districtId: districtDoc._id.toString() }
        ];
        if (divisionDoc.divisionId) {
          pinRefConditions.push({ divisionId: divisionDoc.divisionId });
        }

        let pincodeDoc = await territoryDb.collection('pincodes').findOne({
          $or: pinQueries,
          $and: [
            { $or: pinRefConditions },
            { $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }] }
          ]
        });

        if (!pincodeDoc && db && db !== territoryDb) {
          pincodeDoc = await db.collection('pincodes').findOne({
            $or: pinQueries,
            $and: [
              { $or: pinRefConditions },
              { $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }] }
            ]
          });
        }

        if (!pincodeDoc) {
          return res.status(400).json({
            message: `Assigned PIN Code "${cleanAssignedTerritory.pincode}" does not belong to Division "${cleanAssignedTerritory.division}" or is not active.`
          });
        }

        cleanAssignedTerritory.pincode = String(pincodeDoc.code).trim();
        cleanAssignedTerritory.pincodeId = pincodeDoc.pincodeId || pincodeDoc._id.toString();
        if (pincodeDoc.taluk) {
          cleanAssignedTerritory.taluk = pincodeDoc.taluk;
        }
      }
    }

    const cleanTerritory = {
      state: cleanAssignedTerritory.state,
      district: cleanAssignedTerritory.district,
      division: cleanAssignedTerritory.division,
      pincode: cleanAssignedTerritory.pincode
    };

    // Enforce strictly 1 active District Agent per district rule
    if (agentRole === 'district' && cleanTerritory.district) {
      const existingDistrictAgent = await checkExistingDistrictAssignment(
        cleanTerritory.state,
        cleanTerritory.district,
        cleanAssignedTerritory.districtId
      );
      if (existingDistrictAgent.exists) {
        return res.status(400).json({
          message: 'A District Agent is already assigned to this district.'
        });
      }
    }

    // Enforce strictly 1 agent per pincode rule
    if (agentRole === 'pincode' && cleanTerritory.pincode) {
      const existingPincodeAgent = await Agent.findOne({
        role: 'pincode',
        'territory.pincode': cleanTerritory.pincode
      });
      if (existingPincodeAgent) {
        return res.status(400).json({
          message: `Pincode ${cleanTerritory.pincode} is already assigned to agent "${existingPincodeAgent.name}". Only 1 agent per pincode is allowed.`
        });
      }
    }

    // 2. Process separate Address Details (Physical / Contact Address)
    let cleanAddress: any = {};
    if (typeof validatedData.address === 'object' && validatedData.address !== null) {
      cleanAddress = {
        buildingNo: (validatedData.address.buildingNo || validatedData.buildingNo || '').trim(),
        street: (validatedData.address.street || validatedData.streetName || '').trim(),
        locality: (validatedData.address.locality || '').trim(),
        postOffice: (validatedData.address.postOffice || validatedData.postOffice || '').trim(),
        taluk: (validatedData.address.taluk || '').trim(),
        state: (validatedData.address.state || '').trim(),
        district: (validatedData.address.district || '').trim(),
        pincode: (validatedData.address.pincode || '').trim()
      };
    } else {
      cleanAddress = {
        buildingNo: (validatedData.buildingNo || '').trim(),
        street: (validatedData.streetName || '').trim(),
        locality: '',
        postOffice: (validatedData.postOffice || '').trim(),
        taluk: '',
        state: '',
        district: '',
        pincode: ''
      };
    }

    const constructedFullAddress = [
      cleanAddress.buildingNo,
      cleanAddress.street,
      cleanAddress.locality,
      cleanAddress.postOffice ? `PO: ${cleanAddress.postOffice}` : '',
      cleanAddress.taluk ? `Taluk: ${cleanAddress.taluk}` : '',
      cleanAddress.district,
      cleanAddress.state ? `${cleanAddress.state}${cleanAddress.pincode ? ` - ${cleanAddress.pincode}` : ''}` : cleanAddress.pincode
    ].filter(Boolean).join(', ') || validatedData.fullAddress || (typeof validatedData.address === 'string' ? validatedData.address : '');

    let territoryParts: string[] = [];
    if (agentRole === 'state') territoryParts = [cleanTerritory.state].filter(Boolean);
    else if (agentRole === 'district') territoryParts = [cleanTerritory.state, cleanTerritory.district].filter(Boolean);
    else territoryParts = [cleanTerritory.state, cleanTerritory.district, cleanTerritory.division, cleanTerritory.pincode].filter(Boolean);
    const assignedAreaStr = territoryParts.join(' / ');

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randDigits = Math.floor(1000 + Math.random() * 9000);
    const registrationId = `REG-${dateStr}-${randDigits}`;

    const cleanAlt = String(validatedData.altPhone || (req.body as any).alternateMobile || (req.body as any).alternativePhone || (req.body as any).secondaryPhone || '').trim();

    // Upload base64 KYC documents to S3
    if (validatedData.kycDocs && typeof validatedData.kycDocs === 'object') {
      const docFields = ['aadhaarCard', 'panCard', 'passportPhoto', 'signature', 'cancelledCheque', 'educationalCertificates'];
      for (const field of docFields) {
        const val = (validatedData.kycDocs as any)[field];
        if (typeof val === 'string' && val.startsWith('data:')) {
          try {
            const upRes = await uploadBase64ToS3(val, 'agent_docs/kyc', `reg_${Date.now()}_${field}`);
            (validatedData.kycDocs as any)[field] = upRes.durableUrl || upRes.url || upRes.key;
          } catch (e) {
            console.error(`Failed to upload KYC doc ${field} to S3:`, e);
          }
        }
      }
    }

    const rawBank = (validatedData as any).bankDetails || (req.body as any).bankDetails || {};
    const cleanBankDetails = {
      accountHolderName: String(rawBank.accountHolderName || rawBank.accountHolder || (req.body as any).accountHolderName || (validatedData as any).accountHolderName || '').trim(),
      accountHolder: String(rawBank.accountHolderName || rawBank.accountHolder || (req.body as any).accountHolderName || (validatedData as any).accountHolderName || '').trim(),
      bankName: String(rawBank.bankName || (req.body as any).bankName || (validatedData as any).bankName || '').trim(),
      bankBranch: String(rawBank.bankBranch || rawBank.branchName || (req.body as any).bankBranch || (req.body as any).branchName || (validatedData as any).bankBranch || '').trim(),
      branchName: String(rawBank.bankBranch || rawBank.branchName || (req.body as any).bankBranch || (req.body as any).branchName || (validatedData as any).bankBranch || '').trim(),
      accountNumber: String(rawBank.accountNumber || (req.body as any).accountNumber || (validatedData as any).accountNumber || '').replace(/\D/g, '').trim(),
      ifscCode: String(rawBank.ifscCode || (req.body as any).ifscCode || (validatedData as any).ifscCode || '').toUpperCase().trim()
    };

    const newAgent = new Agent({
      ...validatedData,
      alternateMobile: cleanAlt,
      altPhone: cleanAlt,
      territory: cleanTerritory,
      assignedTerritory: cleanAssignedTerritory,
      address: cleanAddress,
      fullAddress: constructedFullAddress,
      bankDetails: cleanBankDetails,
      email: validatedData.email.toLowerCase(),
      dob: parsedDob,
      registrationId,
      kycStatus: 'pending',
      registrationFeePaid: false
    });

    await newAgent.save();

    // Also sync registration to users collection for Admin Panel join requests
    try {
      const db = mongoose.connection.db;
      if (db) {
        await db.collection('users').updateOne(
          { email: validatedData.email.toLowerCase() },
          {
            $set: {
              name: validatedData.name,
              email: validatedData.email.toLowerCase(),
              phone: validatedData.phone,
              altPhone: cleanAlt,
              alternateMobile: cleanAlt,
              dob: parsedDob || (req.body as any).dob || (req.body as any).dateOfBirth || '',
              gender: validatedData.gender || (req.body as any).gender || '',
              qualification: validatedData.qualification || (req.body as any).qualification || (req.body as any).highestQualification || '',
              experience: validatedData.experience || (req.body as any).experience || (req.body as any).experienceLevel || '',
              previousCompany: validatedData.previousCompany || (req.body as any).previousCompany || (req.body as any).previousOrg || '',
              password: newAgent.password,
              role: 'agent',
              level: validatedData.role,
              territory: cleanTerritory,
              assignedTerritory: cleanAssignedTerritory,
              assignedArea: assignedAreaStr,
              assignedState: cleanTerritory.state,
              assignedDistrict: cleanTerritory.district,
              assignedDivision: cleanTerritory.division,
              state: cleanTerritory.state,
              district: cleanTerritory.district,
              division: cleanTerritory.division,
              pincode: cleanTerritory.pincode,
              postOffice: cleanAddress.postOffice || (req.body as any).postOffice || '',
              address: cleanAddress,
              fullAddress: constructedFullAddress,
              registrationId,
              status: 'pending',
              kycStatus: 'pending',
              isActive: false,
              kycDocs: validatedData.kycDocs || (req.body as any).kycDocs || {},
              kyc: {
                aadhaarNumber: (validatedData.kycDocs as any)?.aadhaarNumber || (req.body as any).aadhaarNumber || '',
                aadhaarImage: validatedData.kycDocs?.aadhaarCard || '',
                panNumber: (validatedData.kycDocs as any)?.panNumber || (req.body as any).panNumber || '',
                panImage: validatedData.kycDocs?.panCard || '',
                selfie: validatedData.kycDocs?.passportPhoto || '',
                businessProofImage: validatedData.kycDocs?.signature || '',
                educationalCertificates: (validatedData.kycDocs as any)?.educationalCertificates || '',
                cancelledCheque: (validatedData.kycDocs as any)?.cancelledCheque || ''
              },
              bankDetails: cleanBankDetails,
              createdAt: new Date()
            }
          },
          { upsert: true }
        );

        await db.collection('agents').updateOne(
          { registrationId },
          {
            $set: {
              registrationId,
              name: validatedData.name,
              email: validatedData.email.toLowerCase(),
              phone: validatedData.phone,
              role: validatedData.role,
              level: validatedData.role,
              status: 'pending',
              kycStatus: 'pending',
              isActive: false,
              isApproved: false,
              territory: cleanTerritory,
              assignedArea: assignedAreaStr,
              bankDetails: cleanBankDetails,
              createdAt: new Date()
            }
          },
          { upsert: true }
        ).catch(() => {});
      }
    } catch (syncError) {
      console.error('Error syncing user to admin collection:', syncError);
    }

    // Return registration information (success screen requirements)
    const agentObj = newAgent.toObject();
    const { password, ...agentData } = agentObj;

    // Publish Realtime Agent Registration Event
    publishEntityEvent({
      event: 'ENTITY_CREATED',
      entity: 'agent',
      entityId: newAgent._id.toString(),
      action: 'created',
      scope: {
        state: cleanTerritory.state,
        district: cleanTerritory.district,
        division: cleanTerritory.division,
        pincode: cleanTerritory.pincode
      },
      data: {
        _id: newAgent._id,
        registrationId,
        name: newAgent.name,
        role: newAgent.role,
        status: newAgent.status
      }
    }).catch(() => {});

    return res.status(201).json({
      message: 'Agent registered successfully. Pending Admin approval.',
      registrationId,
      role: newAgent.role,
      status: 'pending',
      agent: agentData
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const errMsgs = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return res.status(400).json({ message: `Validation failed: ${errMsgs}`, errors: error.errors });
    }
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'Field';
      return res.status(400).json({ message: `${field.charAt(0).toUpperCase() + field.slice(1)} is already registered.` });
    }
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors || {}).map((e: any) => e.message).join('. ');
      return res.status(400).json({ message: msgs || 'Validation error' });
    }
    console.error('Registration error:', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const cleanEmail = validatedData.email.toLowerCase().trim();
    
    let agent = await Agent.findOne({ email: cleanEmail });

    if (!agent) {
      // 1. Check if user exists in MongoDB 'users' collection (Admin app sync)
      try {
        const db = mongoose.connection.db;
        if (db) {
          const userDoc = await db.collection('users').findOne({ email: cleanEmail });
          if (userDoc) {
            const canonicalUserRole = normalizeToAgentRole(userDoc.role, userDoc.level);

            // Strict Role Isolation: Block non-agent accounts (customers, vendors) from logging into Agent Portal
            if (!canonicalUserRole) {
              return res.status(403).json({
                message: `Access denied: Account registered as '${userDoc.role || userDoc.level || 'different role'}' is not authorized to access the Agent Portal. Please use the application intended for your role.`,
                role: userDoc.role || userDoc.level
              });
            }

            // Verify password for synced user from users collection
            if (!userDoc.password) {
              return res.status(401).json({ message: 'Invalid email or password' });
            }
            const isPasswordMatch = await bcrypt.compare(validatedData.password, userDoc.password);
            if (!isPasswordMatch) {
              return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Enforce account status check before creating or logging in
            const rawStatus = String(userDoc.status || userDoc.kycStatus || 'pending').toLowerCase();
            if (rawStatus === 'suspended' || rawStatus === 'inactive') {
              return res.status(403).json({
                message: 'Your account has been suspended or deactivated. Please contact the Administrator.',
                status: 'suspended',
                role: canonicalUserRole
              });
            }
            if (rawStatus === 'rejected') {
              return res.status(403).json({
                message: `Your registration request was rejected by Admin. Reason: ${userDoc.rejectionReason || 'No reason provided.'}.`,
                status: 'rejected',
                rejectionReason: userDoc.rejectionReason,
                role: canonicalUserRole
              });
            }
            if (rawStatus !== 'approved' && rawStatus !== 'active') {
              return res.status(403).json({
                message: 'Your registration request is currently pending Admin verification. Please contact the Administrator for further assistance.',
                status: 'pending',
                registrationId: userDoc.registrationId || 'N/A',
                role: canonicalUserRole
              });
            }

            // Sync verified approved agent to Agent collection
            const role = canonicalUserRole;
            const rawAssigned = userDoc.assignedTerritory || userDoc.territory || {};
            const cleanAssigned = {
              state: (rawAssigned.state || userDoc.state || userDoc.assignedState || '').trim(),
              stateId: (rawAssigned.stateId || '').trim(),
              district: (rawAssigned.district || userDoc.district || userDoc.assignedDistrict || '').trim(),
              districtId: (rawAssigned.districtId || '').trim(),
              division: (rawAssigned.division || userDoc.division || userDoc.assignedDivision || '').trim(),
              divisionId: (rawAssigned.divisionId || '').trim(),
              taluk: (rawAssigned.taluk || userDoc.taluk || '').trim(),
              talukId: (rawAssigned.talukId || '').trim(),
              pincode: (rawAssigned.pincode || userDoc.pincode || userDoc.assignedPincode || '').trim(),
              pincodeId: (rawAssigned.pincodeId || '').trim()
            };

            const cleanAddressDoc = userDoc.address && typeof userDoc.address === 'object' ? {
              buildingNo: userDoc.address.buildingNo || '',
              street: userDoc.address.street || '',
              locality: userDoc.address.locality || '',
              postOffice: userDoc.address.postOffice || userDoc.postOffice || '',
              taluk: userDoc.address.taluk || userDoc.taluk || '',
              state: userDoc.address.state || '',
              district: userDoc.address.district || '',
              pincode: userDoc.address.pincode || ''
            } : {};

            agent = new Agent({
              name: userDoc.name || 'Agent User',
              email: cleanEmail,
              password: userDoc.password,
              phone: userDoc.phone || userDoc.mobile || '',
              role: role,
              assignedTerritory: cleanAssigned,
              territory: {
                state: cleanAssigned.state,
                district: cleanAssigned.district,
                division: cleanAssigned.division,
                pincode: cleanAssigned.pincode
              },
              address: cleanAddressDoc,
              fullAddress: userDoc.fullAddress || (typeof userDoc.address === 'string' ? userDoc.address : ''),
              kycStatus: 'approved',
              status: 'approved',
              registrationId: userDoc.registrationId || `REG-${Date.now()}`
            });
            await agent.save();
          }
        }
      } catch (e) {
        console.error('Error syncing from users collection in login:', e);
      }
    }

    if (!agent) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 1. Authoritative Password Verification
    const isPasswordValid = await agent.comparePassword(validatedData.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 2. Strict Role Isolation Verification
    const canonicalAgentRole = normalizeToAgentRole(agent.role);
    if (!canonicalAgentRole) {
      return res.status(403).json({
        message: `Access denied: Role '${agent.role}' is not authorized to access the Agent application.`,
        role: agent.role
      });
    }
    if (agent.role !== canonicalAgentRole) {
      agent.role = canonicalAgentRole as any;
      await agent.save();
    }

    // 3. Realtime Status Check against database
    // Also sync latest status from admin users collection if updated by Admin
    try {
      const db = mongoose.connection.db;
      if (db) {
        const userDoc = await db.collection('users').findOne({ email: cleanEmail });
        if (userDoc) {
          const rawDocStatus = String(userDoc.status || userDoc.kycStatus || '').trim().toLowerCase();
          const flagUserApproved = userDoc.isApproved === true || userDoc.isActive === true;
          if (rawDocStatus === 'rejected') {
            agent.kycStatus = 'rejected';
            agent.status = 'rejected';
            agent.rejectionReason = userDoc.rejectionReason || agent.rejectionReason;
            await agent.save();
          } else if (rawDocStatus === 'suspended' || rawDocStatus === 'inactive' || rawDocStatus === 'revoked') {
            agent.status = 'suspended';
            await agent.save();
          } else if (rawDocStatus === 'approved' || rawDocStatus === 'active' || rawDocStatus === 'verified' || flagUserApproved) {
            if (agent.kycStatus !== 'approved' || agent.status !== 'approved') {
              agent.kycStatus = 'approved';
              agent.status = 'approved';
              await agent.save();
            }
          }
        }
      }
    } catch (_) {}

    const currentKycStatus = String(agent.kycStatus || '').trim().toLowerCase();
    const currentStatus = String(agent.status || '').trim().toLowerCase();
    const flagApproved = (agent as any).isApproved === true || (agent as any).isActive === true;

    if (currentKycStatus === 'rejected' || currentStatus === 'rejected') {
      return res.status(403).json({
        message: `Your registration request was rejected by Admin. Reason: ${agent.rejectionReason || 'No reason provided.'}. Please contact the Administrator for assistance.`,
        status: 'rejected',
        rejectionReason: agent.rejectionReason || 'No reason provided.',
        registrationId: agent.registrationId || 'N/A',
        role: agent.role
      });
    }

    if (currentStatus === 'suspended' || currentStatus === 'inactive' || currentStatus === 'revoked' || currentStatus === 'deleted' || currentKycStatus === 'revoked') {
      return res.status(403).json({
        message: 'Your account has been suspended/deactivated by the Admin. Please contact the Administrator for assistance.',
        status: 'suspended',
        registrationId: agent.registrationId || 'N/A',
        role: agent.role
      });
    }

    const hasApprovedKyc = currentKycStatus === 'approved' || currentKycStatus === 'verified';
    const hasApprovedStatus = currentStatus === 'approved' || currentStatus === 'active';
    const isPendingDoc = currentKycStatus === 'pending' || currentKycStatus === 'pending_verification' || currentStatus === 'pending' || currentStatus === 'pending_approval' || currentStatus === 'pending_sub_admin_approval';

    const isApproved = (hasApprovedKyc || hasApprovedStatus || flagApproved) && !isPendingDoc;

    if (!isApproved) {
      // Pending account: deny access and DO NOT issue token
      return res.status(403).json({
        message: 'Your registration request is currently pending Admin verification. Please contact the Administrator for further assistance.',
        status: 'pending',
        registrationId: agent.registrationId || 'N/A',
        role: agent.role
      });
    }

    const token = generateToken({
      agentId: agent._id.toString(),
      role: agent.role,
      email: agent.email
    });

    const agentObj = agent.toObject();
    const { password, ...agentData } = agentObj;

    return res.status(200).json({
      message: 'Login successful',
      token,
      agent: {
        ...agentData,
        status: 'active',
        kycStatus: 'approved'
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const agentPayload = (req as any).agent;
    const agentId = agentPayload?.agentId;
    const email = agentPayload?.email;

    if (!agentId && !email) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    let agent = null;
    if (agentId && mongoose.Types.ObjectId.isValid(agentId)) {
      agent = await Agent.findById(agentId).select('-password');
    }
    if (!agent && agentId) {
      const orClauses: any[] = [
        { agentId: agentId },
        { registrationId: agentId }
      ];
      if (mongoose.Types.ObjectId.isValid(agentId)) {
        orClauses.push({ _id: new mongoose.Types.ObjectId(agentId) });
      }
      agent = await Agent.findOne({ $or: orClauses }).select('-password');
    }
    if (!agent && email) {
      agent = await Agent.findOne({ email: email.toLowerCase() }).select('-password');
    }

    // Authoritative check in 'users' collection if not in Agent collection, strictly requiring an agent role
    if (!agent) {
      const db = mongoose.connection.db;
      if (db) {
        const userOrClauses: any[] = [];
        if (agentId && mongoose.Types.ObjectId.isValid(agentId)) {
          userOrClauses.push({ _id: new mongoose.Types.ObjectId(agentId) });
        }
        if (agentId) {
          userOrClauses.push({ _id: agentId });
          userOrClauses.push({ agentId: agentId });
        }
        if (email) {
          userOrClauses.push({ email: email.toLowerCase() });
        }

        const userDoc = await db.collection('users').findOne({ $or: userOrClauses });
        if (userDoc) {
          const rawRole = String(userDoc.level || userDoc.role || '').toLowerCase();
          const isAgent = AUTHORIZED_AGENT_ROLES.includes(rawRole as any);

          if (!isAgent) {
            return res.status(403).json({
              message: `Access denied: Account registered as '${userDoc.role || userDoc.level || 'different role'}' is not authorized for the Agent Portal.`,
              role: userDoc.role || userDoc.level
            });
          }

          const rawAssigned = userDoc.assignedTerritory || userDoc.territory || {};

          agent = new Agent({
            ...(userDoc._id ? { _id: userDoc._id } : {}),
            name: userDoc.name || 'Agent User',
            email: (userDoc.email || email).toLowerCase(),
            password: userDoc.password || 'synced_user',
            phone: userDoc.phone || userDoc.mobile || '',
            role: rawRole,
            assignedTerritory: {
              state: (rawAssigned.state || userDoc.state || userDoc.assignedState || '').trim(),
              district: (rawAssigned.district || userDoc.district || userDoc.assignedDistrict || '').trim(),
              division: (rawAssigned.division || userDoc.division || userDoc.assignedDivision || '').trim(),
              pincode: (rawAssigned.pincode || userDoc.pincode || userDoc.assignedPincode || '').trim()
            },
            territory: {
              state: (rawAssigned.state || userDoc.state || userDoc.assignedState || '').trim(),
              district: (rawAssigned.district || userDoc.district || userDoc.assignedDistrict || '').trim(),
              division: (rawAssigned.division || userDoc.division || userDoc.assignedDivision || '').trim(),
              pincode: (rawAssigned.pincode || userDoc.pincode || userDoc.assignedPincode || '').trim()
            },
            kycStatus: userDoc.kycStatus || userDoc.status || 'pending',
            status: userDoc.status || 'pending',
            registrationId: userDoc.registrationId || `REG-${Date.now()}`
          });
          try {
            await agent.save();
          } catch (saveErr) {
            agent = await Agent.findOne({ email: (userDoc.email || email).toLowerCase() }).select('-password');
          }
        }
      }
    }

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Role check: Enforce Agent Role authorization
    const agentRole = String(agent.role || '').toLowerCase();
    if (!AUTHORIZED_AGENT_ROLES.includes(agentRole as any)) {
      return res.status(403).json({
        message: `Access denied: Role '${agent.role}' is not authorized for the Agent application.`,
        role: agent.role
      });
    }

    // Sync latest status from admin users collection if updated by Admin
    try {
      const db = mongoose.connection.db;
      if (db) {
        let hasChanges = false;
        const userDoc = await db.collection('users').findOne({ email: agent.email.toLowerCase() });
        if (userDoc) {
          const rawDocStatus = String(userDoc.status || userDoc.kycStatus || '').trim().toLowerCase();
          const flagUserApproved = userDoc.isApproved === true || userDoc.isActive === true;
          if ((rawDocStatus === 'approved' || rawDocStatus === 'active' || rawDocStatus === 'verified' || flagUserApproved) && (agent.kycStatus !== 'approved' || agent.status !== 'approved')) {
            agent.kycStatus = 'approved';
            agent.status = 'approved';
            hasChanges = true;
          } else if (rawDocStatus === 'rejected' && agent.status !== 'rejected') {
            agent.kycStatus = 'rejected';
            agent.status = 'rejected';
            agent.rejectionReason = userDoc.rejectionReason || 'Rejected by Admin';
            hasChanges = true;
          } else if ((rawDocStatus === 'suspended' || rawDocStatus === 'inactive' || rawDocStatus === 'revoked') && agent.status !== 'suspended') {
            agent.status = 'suspended';
            hasChanges = true;
          }

          if (userDoc.role && ['state', 'district', 'division', 'pincode'].includes(String(userDoc.role).toLowerCase()) && agent.role !== String(userDoc.role).toLowerCase()) {
            agent.role = String(userDoc.role).toLowerCase() as any;
            hasChanges = true;
          }

          // Sync territory if present in admin user record
          const docState = (userDoc.assignedTerritory?.state || userDoc.territory?.state || userDoc.state || userDoc.assignedState || '').trim();
          const docDistrict = (userDoc.assignedTerritory?.district || userDoc.territory?.district || userDoc.district || userDoc.assignedDistrict || '').trim();
          const docDivision = (userDoc.assignedTerritory?.division || userDoc.territory?.division || userDoc.division || userDoc.assignedDivision || '').trim();
          const docPincode = (userDoc.assignedTerritory?.pincode || userDoc.territory?.pincode || userDoc.pincode || userDoc.assignedPincode || '').trim();

          if (docState && (!agent.territory?.state || !(agent as any).assignedTerritory?.state)) {
            const rawAgent = agent as any;
            if (!rawAgent.territory) rawAgent.territory = {};
            if (!rawAgent.assignedTerritory) rawAgent.assignedTerritory = {};
            rawAgent.territory.state = rawAgent.territory.state || docState;
            rawAgent.assignedTerritory.state = rawAgent.assignedTerritory.state || docState;
            if (docDistrict) {
              rawAgent.territory.district = rawAgent.territory.district || docDistrict;
              rawAgent.assignedTerritory.district = rawAgent.assignedTerritory.district || docDistrict;
            }
            if (docDivision) {
              rawAgent.territory.division = rawAgent.territory.division || docDivision;
              rawAgent.assignedTerritory.division = rawAgent.assignedTerritory.division || docDivision;
            }
            if (docPincode) {
              rawAgent.territory.pincode = rawAgent.territory.pincode || docPincode;
              rawAgent.assignedTerritory.pincode = rawAgent.assignedTerritory.pincode || docPincode;
            }
            hasChanges = true;
          }
        }

        // Ensure territory object state is fallback-populated from address if still blank
        if (!agent.territory?.state && agent.address?.state) {
          const rawAgent = agent as any;
          if (!rawAgent.territory) rawAgent.territory = {};
          if (!rawAgent.assignedTerritory) rawAgent.assignedTerritory = {};
          rawAgent.territory.state = agent.address.state;
          rawAgent.assignedTerritory.state = agent.address.state;
          hasChanges = true;
        }

        // Ensure division is resolved from central territory database for Pincode agents if blank
        const rawAgentAny = agent as any;
        const effectivePin = (agent.territory?.pincode || rawAgentAny.assignedTerritory?.pincode || rawAgentAny.pincode || rawAgentAny.assignedPincode || '').trim();
        const effectiveDiv = (agent.territory?.division || rawAgentAny.assignedTerritory?.division || rawAgentAny.division || rawAgentAny.assignedDivision || '').trim();

        if (!effectiveDiv && effectivePin) {
          const pinDoc = await db.collection('pincodes').findOne({
            $or: [{ code: effectivePin }, { pincode: effectivePin }]
          });
          if (pinDoc && pinDoc.division) {
            const rawAgent = agent as any;
            if (!rawAgent.territory) rawAgent.territory = {};
            if (!rawAgent.assignedTerritory) rawAgent.assignedTerritory = {};
            rawAgent.territory.division = pinDoc.division.trim();
            rawAgent.assignedTerritory.division = pinDoc.division.trim();
            rawAgent.division = pinDoc.division.trim();
            rawAgent.assignedDivision = pinDoc.division.trim();
            hasChanges = true;
          }
        }

        if (hasChanges) {
          await agent.save();
        }
      }
    } catch (statusSyncErr) {
      console.error('Error syncing status from admin collection in getMe:', statusSyncErr);
    }

    const currentKycStatus = String(agent.kycStatus || '').trim().toLowerCase();
    const currentStatus = String(agent.status || '').trim().toLowerCase();
    const flagApproved = (agent as any).isApproved === true || (agent as any).isActive === true;

    if (currentKycStatus === 'rejected' || currentStatus === 'rejected') {
      return res.status(403).json({
        message: `Your registration request was rejected by Admin. Reason: ${agent.rejectionReason || 'No reason provided.'}. Please contact the Administrator for assistance.`,
        status: 'rejected',
        rejectionReason: agent.rejectionReason || 'No reason provided.'
      });
    }

    if (currentStatus === 'suspended' || currentStatus === 'inactive' || currentStatus === 'revoked' || currentStatus === 'deleted' || currentKycStatus === 'revoked') {
      return res.status(403).json({
        message: 'Your account has been suspended/deactivated by the Admin. Please contact the Administrator for assistance.',
        status: 'suspended'
      });
    }

    const hasApprovedKyc = currentKycStatus === 'approved' || currentKycStatus === 'verified';
    const hasApprovedStatus = currentStatus === 'approved' || currentStatus === 'active';
    const isPendingDoc = currentKycStatus === 'pending' || currentKycStatus === 'pending_verification' || currentStatus === 'pending' || currentStatus === 'pending_approval' || currentStatus === 'pending_sub_admin_approval';

    const isApproved = (hasApprovedKyc || hasApprovedStatus || flagApproved) && !isPendingDoc;

    if (!isApproved) {
      return res.status(403).json({
        message: 'Your registration request is currently pending Admin verification. Please contact the Administrator for further assistance.',
        status: 'pending',
        registrationId: agent.registrationId || 'N/A'
      });
    }

    const effectiveAlt = String(agent.alternateMobile || agent.altPhone || (agent as any).alternativePhone || (agent as any).secondaryPhone || '').trim();
    agent.alternateMobile = effectiveAlt;
    agent.altPhone = effectiveAlt;

    const agentObj: any = agent.toObject ? agent.toObject() : { ...agent };
    delete agentObj.password;
    agentObj.status = 'active';
    agentObj.kycStatus = 'approved';

    return res.status(200).json({ agent: agentObj });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const allowedFields = [
      'name', 'phone', 'mobile', 'territory', 'assignedTerritory', 'address', 'fullAddress',
      'alternateMobile', 'altPhone', 'preferredLanguage', 'bloodGroup', 'profilePhoto',
      'vehicleDetails', 'bankDetails', 'dob', 'gender', 'qualification', 'experience', 'previousCompany'
    ];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (req.body.mobile && !updates.phone) {
      updates.phone = req.body.mobile;
    }

    if (updates.name) {
      const rawName = String(updates.name).trim();
      if (!isValidName(rawName)) {
        return res.status(400).json({ message: 'Name contains invalid characters or does not meet length requirements.' });
      }
      updates.name = formatName(rawName);
    }

    if (updates.phone) {
      const rawPhone = String(updates.phone).trim();
      if (!isValidIndianMobile(rawPhone)) {
        return res.status(400).json({ message: 'Mobile number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.' });
      }
      updates.phone = sanitizeIndianMobile(rawPhone);
    }

    if (req.body.alternateMobile !== undefined || req.body.altPhone !== undefined) {
      const rawAlt = String(req.body.alternateMobile !== undefined ? req.body.alternateMobile : req.body.altPhone).trim();
      if (rawAlt) {
        if (!isValidIndianMobile(rawAlt)) {
          return res.status(400).json({ message: 'Alternate mobile number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.' });
        }
        updates.alternateMobile = sanitizeIndianMobile(rawAlt);
        updates.altPhone = sanitizeIndianMobile(rawAlt);
      } else {
        updates.alternateMobile = '';
        updates.altPhone = '';
      }
    }

    if (updates.bankDetails) {
      const bd = updates.bankDetails as any;
      if (bd.accountNumber) {
        const accValidation = validateBankAccount(bd.accountNumber, bd.bankName);
        if (!accValidation.valid) {
          return res.status(400).json({ message: accValidation.error || 'Invalid account number.' });
        }
        bd.accountNumber = sanitizeAccountNumber(bd.accountNumber);
      }
      if (bd.ifscCode) {
        const ifsc = formatIfsc(bd.ifscCode);
        if (!isValidIfsc(ifsc)) {
          return res.status(400).json({ message: 'Invalid IFSC code format (e.g. SBIN0001234).' });
        }
        bd.ifscCode = ifsc;
      }
      if (bd.accountHolder) {
        bd.accountHolder = formatName(String(bd.accountHolder).trim());
      }
    }

    // Keep territory and assignedTerritory synchronized if either is passed without touching address
    if (updates.assignedTerritory && !updates.territory) {
      const at = updates.assignedTerritory as any;
      updates.territory = {
        state: at.state || '',
        district: at.district || '',
        division: at.division || '',
        pincode: at.pincode || ''
      };
    } else if (updates.territory && !updates.assignedTerritory) {
      const t = updates.territory as any;
      updates.assignedTerritory = {
        state: t.state || '',
        district: t.district || '',
        division: t.division || '',
        pincode: t.pincode || ''
      };
    }

    const currentAgent = await Agent.findById(agentId);
    if (!currentAgent) return res.status(404).json({ message: 'Agent not found' });

    // If updating territory for a District Agent, ensure no other active District Agent exists in that district
    if ((currentAgent.role === 'district' || (updates as any).role === 'district') && (updates.assignedTerritory || updates.territory)) {
      const at: any = updates.assignedTerritory || updates.territory;
      const targetDist = (at.district || '').trim();
      const targetState = (at.state || currentAgent.territory?.state || '').trim();
      const targetDistId = (at.districtId || '').trim();

      if (targetDist) {
        const distCheck = await checkExistingDistrictAssignment(
          targetState,
          targetDist,
          targetDistId,
          agentId
        );
        if (distCheck.exists) {
          return res.status(400).json({
            message: 'A District Agent is already assigned to this district.'
          });
        }
      }
    }

    const agent = await Agent.findByIdAndUpdate(
      agentId,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password');

    if (!agent) return res.status(404).json({ message: 'Agent not found' });
    await invalidateAgentTerritoryScope(agentId);

    // Sync profile updates to users collection for Admin visibility
    try {
      const db = mongoose.connection.db;
      if (db) {
        const userUpdates: Record<string, any> = {};
        if (updates.name) userUpdates.name = updates.name;
        if (updates.phone) { userUpdates.phone = updates.phone; userUpdates.mobile = updates.phone; }
        if (updates.alternateMobile !== undefined) {
          userUpdates.alternateMobile = updates.alternateMobile;
          userUpdates.altPhone = updates.alternateMobile;
        }
        if (updates.preferredLanguage) userUpdates.preferredLanguage = updates.preferredLanguage;
        if (updates.bloodGroup) userUpdates.bloodGroup = updates.bloodGroup;
        if (updates.profilePhoto) userUpdates.profilePhoto = updates.profilePhoto;
        if (updates.vehicleDetails) userUpdates.vehicleDetails = updates.vehicleDetails;
        if (updates.bankDetails) {
          const bd = updates.bankDetails as any;
          userUpdates.bankDetails = bd;
          userUpdates.bankName = bd.bankName;
          userUpdates.accountNo = bd.accountNumber;
          userUpdates.accountNumber = bd.accountNumber;
          userUpdates.ifscCode = bd.ifscCode;
          userUpdates.accountHolderName = bd.accountHolder;
        }
        if (Object.keys(userUpdates).length > 0) {
          await db.collection('users').updateOne(
            { $or: [{ email: agent.email.toLowerCase() }, { phone: agent.phone }] },
            { $set: userUpdates }
          );
        }
      }
    } catch (syncErr) {
      console.error('Error syncing profile update to users collection:', syncErr);
    }

    return res.status(200).json({ message: 'Details saved successfully.', agent });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Unable to save details. Please try again.' });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required.' });
    }

    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: 'Agent account not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, agent.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password entered is incorrect.' });
    }

    const pwdValidation = validatePassword(newPassword);
    if (!pwdValidation.valid) {
      return res.status(400).json({ message: pwdValidation.errors[0] || 'New password does not meet requirements.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    agent.password = hashedPassword;
    agent.updatedAt = new Date();
    await agent.save();

    // Also sync password to users collection if present
    const db = mongoose.connection.db;
    if (db) {
      await db.collection('users').updateOne(
        { email: agent.email.toLowerCase() },
        { $set: { password: hashedPassword, updatedAt: new Date() } }
      ).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (error) {
    console.error('changePassword error:', error);
    return res.status(500).json({ message: 'Internal server error while updating password.' });
  }
};

export const updateKyc = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const allowedDocs = ['aadhaarCard', 'panCard', 'passportPhoto', 'signature', 'cancelledCheque', 'educationalCertificates'];
    const kycUpdates: Record<string, string> = {};
    for (const doc of allowedDocs) {
      if (req.body[doc]) kycUpdates[`kycDocs.${doc}`] = req.body[doc];
    }

    if (Object.keys(kycUpdates).length === 0) {
      return res.status(400).json({ message: 'No KYC documents provided' });
    }

    const agent = await Agent.findByIdAndUpdate(
      agentId,
      { $set: { ...kycUpdates, kycStatus: 'pending', updatedAt: new Date() } },
      { new: true }
    ).select('-password');

    return res.status(200).json({ message: 'KYC documents submitted for review', agent });
  } catch (error) {
    console.error('Update KYC error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  return res.status(200).json({ message: 'OTP sent to registered email' });
};

export const verifyOtp = async (req: Request, res: Response) => {
  return res.status(200).json({ message: 'OTP verified successfully' });
};

export const resetPassword = async (req: Request, res: Response) => {
  return res.status(200).json({ message: 'Password reset successfully' });
};

// ─────────────────────────────────────────────────────────
// In-memory OTP store: { phone → { otp, expiresAt } }
// Replace with Redis for multi-server deployments.
// ─────────────────────────────────────────────────────────
const mobileOtpStore = new Map<string, { otp: string; expiresAt: number }>();

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * POST /auth/send-otp
 * Step 1 of Mobile OTP Login:
 *   1. Validate the phone number format.
 *   2. Check if any Agent is registered with that phone.
 *   3. Check account status – reject suspended/inactive accounts early.
 *   4. Generate a 6-digit OTP, store it with a 5-minute expiry.
 *   5. Return the OTP in the response (in production, send via SMS gateway).
 */
export const sendOtp = async (req: Request, res: Response) => {
  try {
    const phone: string = (req.body.phone || req.body.mobileNumber || '').toString().trim();

    // Basic validation
    if (!phone || !/^[6-9][0-9]{9}$/.test(phone)) {
      return res.status(400).json({ message: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    // Check if agent is registered with this phone number
    let agent = await Agent.findOne({ phone }).select('_id role status kycStatus rejectionReason');

    if (!agent) {
      const db = mongoose.connection.db;
      if (db) {
        const uDoc = await db.collection('users').findOne({ phone });
        if (uDoc) {
          const uRole = String(uDoc.level || uDoc.role || '').toLowerCase();
          const isAgent = AUTHORIZED_AGENT_ROLES.includes(uRole as any);
          if (!isAgent) {
            return res.status(403).json({
              message: `This mobile number is registered with role '${uDoc.role || uDoc.level}' and is not authorized to log into the Agent Portal.`,
              role: uDoc.role || uDoc.level
            });
          }
          agent = {
            _id: uDoc._id,
            role: uRole,
            status: uDoc.status || 'pending',
            kycStatus: uDoc.kycStatus || uDoc.status || 'pending',
            rejectionReason: uDoc.rejectionReason
          } as any;
        }
      }
    }

    if (!agent) {
      return res.status(404).json({
        message: 'This mobile number is not registered as an agent. Please apply for agent onboarding first.',
        notRegistered: true
      });
    }

    // Role check
    const agentRole = String(agent.role || '').toLowerCase();
    if (!AUTHORIZED_AGENT_ROLES.includes(agentRole as any)) {
      return res.status(403).json({
        message: `Account with role '${agent.role}' is not authorized for the Agent Portal.`,
        role: agent.role
      });
    }

    // Reject suspended / rejected accounts immediately
    const status = (agent.status || '').toLowerCase();
    const kycStatus = (agent.kycStatus || '').toLowerCase();

    if (status === 'suspended' || status === 'inactive') {
      return res.status(403).json({
        message: 'Your account has been suspended. Please contact the Administrator.',
        status: 'suspended'
      });
    }

    if (kycStatus === 'rejected' || status === 'rejected') {
      return res.status(403).json({
        message: `Your registration was rejected. Reason: ${(agent as any).rejectionReason || 'No reason provided.'}. Contact Administrator.`,
        status: 'rejected'
      });
    }

    // Generate 6-digit OTP and store with expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    mobileOtpStore.set(phone, { otp, expiresAt: Date.now() + OTP_EXPIRY_MS });

    console.log(`[OTP] Generated for +91${phone}: ${otp} (expires in 5 minutes)`);

    return res.status(200).json({
      message: `OTP sent to +91 ${phone}. It is valid for 5 minutes.`,
      otp // Remove in production after SMS integration
    });
  } catch (error) {
    console.error('sendOtp error:', error);
    return res.status(500).json({ message: 'Unable to send OTP. Please try again.' });
  }
};

/**
 * POST /auth/verify-mobile-otp
 * Step 2 of Mobile OTP Login:
 *   1. Validate OTP from store (must match + not expired).
 *   2. Clear OTP from store (one-time use).
 *   3. Look up agent by phone, check account status.
 *   4. Generate JWT token identical to email login.
 *   5. Return token + agent data.
 */
export const verifyMobileOtp = async (req: Request, res: Response) => {
  try {
    const phone: string = (req.body.phone || req.body.mobileNumber || '').toString().trim();
    const code: string = (req.body.otp || req.body.code || '').toString().trim();

    if (!phone || !code) {
      return res.status(400).json({ message: 'Phone number and OTP are required.' });
    }

    if (!/^[6-9][0-9]{9}$/.test(phone)) {
      return res.status(400).json({ message: 'Invalid phone number format.' });
    }

    if (!/^[0-9]{6}$/.test(code)) {
      return res.status(400).json({ message: 'OTP must be a 6-digit number.' });
    }

    // Retrieve stored OTP
    const stored = mobileOtpStore.get(phone);

    if (!stored) {
      return res.status(400).json({
        message: 'No OTP was requested for this number. Please click "Get OTP" first.',
        expired: true
      });
    }

    if (Date.now() > stored.expiresAt) {
      mobileOtpStore.delete(phone);
      return res.status(400).json({
        message: 'OTP has expired (5-minute limit). Please request a new OTP.',
        expired: true
      });
    }

    if (stored.otp !== code) {
      return res.status(400).json({ message: 'Incorrect OTP. Please check and try again.' });
    }

    // OTP is valid – consume it (one-time use)
    mobileOtpStore.delete(phone);

    // Fetch full agent record
    let agent = await Agent.findOne({ phone }).select('-password');

    if (!agent) {
      return res.status(404).json({ message: 'Agent account not found. Please contact Administrator.' });
    }

    // Sync status if updated by Admin in users collection
    try {
      const db = mongoose.connection.db;
      if (db) {
        const userDoc = await db.collection('users').findOne({ phone });
        if (userDoc) {
          const rawDocStatus = String(userDoc.status || userDoc.kycStatus || '').toLowerCase();
          if (rawDocStatus === 'rejected') {
            agent.kycStatus = 'rejected';
            agent.status = 'rejected';
            agent.rejectionReason = userDoc.rejectionReason || agent.rejectionReason;
            await agent.save();
          } else if (rawDocStatus === 'suspended' || rawDocStatus === 'inactive') {
            agent.status = 'suspended';
            await agent.save();
          } else if (rawDocStatus === 'approved' || rawDocStatus === 'active') {
            if (agent.kycStatus !== 'approved' || agent.status !== 'approved') {
              agent.kycStatus = 'approved';
              agent.status = 'approved';
              await agent.save();
            }
          }
        }
      }
    } catch (_) {}

    // Strict Role Isolation Check
    const agentRole = String(agent.role || '').toLowerCase();
    if (!AUTHORIZED_AGENT_ROLES.includes(agentRole as any)) {
      return res.status(403).json({
        message: `Access denied: Role '${agent.role}' is not authorized for the Agent Portal.`,
        role: agent.role
      });
    }

    // Status checks
    const currentKycStatus = (agent.kycStatus || '').toLowerCase();
    const currentStatus = (agent.status || '').toLowerCase();
    const isApproved = currentKycStatus === 'approved' || currentStatus === 'approved' || currentStatus === 'active';

    if (!isApproved) {
      if (currentKycStatus === 'rejected' || currentStatus === 'rejected') {
        return res.status(403).json({
          message: `Your registration was rejected. Reason: ${(agent as any).rejectionReason || 'No reason provided.'}.`,
          status: 'rejected'
        });
      }
      if (currentStatus === 'suspended' || currentStatus === 'inactive') {
        return res.status(403).json({
          message: 'Your account has been suspended. Please contact the Administrator.',
          status: 'suspended'
        });
      }
      // Pending approval – fail closed (NO TOKEN ISSUED)
      return res.status(403).json({
        message: 'Your account is pending Admin verification. Access to dashboard is denied until approved.',
        status: 'pending',
        registrationId: agent.registrationId || 'N/A',
        role: agent.role
      });
    }

    // Generate JWT (only for approved, active, authorized agents)
    const token = generateToken({
      agentId: agent._id.toString(),
      role: agent.role,
      email: agent.email
    });

    const agentObj = agent.toObject();

    return res.status(200).json({
      message: 'OTP verified. Login successful.',
      token,
      agent: {
        ...agentObj,
        status: 'active',
        kycStatus: 'approved'
      }
    });
  } catch (error) {
    console.error('verifyMobileOtp error:', error);
    return res.status(500).json({ message: 'OTP verification failed. Please try again.' });
  }
};

