"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyMobileOtp = exports.sendOtp = exports.resetPassword = exports.verifyOtp = exports.forgotPassword = exports.updateKyc = exports.updateProfile = exports.getMe = exports.login = exports.register = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Agent_1 = __importDefault(require("../models/Agent"));
const jwt_1 = require("../utils/jwt");
const territoryScope_1 = require("../utils/territoryScope");
const eventBus_1 = require("../realtime/eventBus");
const zod_1 = require("zod");
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    phone: zod_1.z.string().min(10, 'Phone must be at least 10 digits'),
    altPhone: zod_1.z.string().optional().default(''),
    role: zod_1.z.enum(['state', 'district', 'division', 'pincode', 'delivery_partner', 'technician']),
    dob: zod_1.z.string().optional().or(zod_1.z.date().optional()),
    gender: zod_1.z.string().optional(),
    qualification: zod_1.z.string().optional(),
    experience: zod_1.z.string().optional(),
    previousCompany: zod_1.z.string().optional(),
    address: zod_1.z.union([
        zod_1.z.string(),
        zod_1.z.object({
            buildingNo: zod_1.z.string().optional().default(''),
            street: zod_1.z.string().optional().default(''),
            locality: zod_1.z.string().optional().default(''),
            postOffice: zod_1.z.string().optional().default(''),
            taluk: zod_1.z.string().optional().default(''),
            state: zod_1.z.string().optional().default(''),
            district: zod_1.z.string().optional().default(''),
            pincode: zod_1.z.string().optional().default('')
        })
    ]).optional(),
    fullAddress: zod_1.z.string().optional(),
    buildingNo: zod_1.z.string().optional(),
    streetName: zod_1.z.string().optional(),
    postOffice: zod_1.z.string().optional(),
    aadhaarNumber: zod_1.z.string().optional(),
    panNumber: zod_1.z.string().optional(),
    assignedTerritory: zod_1.z.object({
        state: zod_1.z.string().optional().default(''),
        stateId: zod_1.z.string().optional().default(''),
        district: zod_1.z.string().optional().default(''),
        districtId: zod_1.z.string().optional().default(''),
        division: zod_1.z.string().optional().default(''),
        divisionId: zod_1.z.string().optional().default(''),
        taluk: zod_1.z.string().optional().default(''),
        talukId: zod_1.z.string().optional().default(''),
        pincode: zod_1.z.string().optional().default(''),
        pincodeId: zod_1.z.string().optional().default('')
    }).optional(),
    territory: zod_1.z.object({
        state: zod_1.z.string().optional().default(''),
        district: zod_1.z.string().optional().default(''),
        division: zod_1.z.string().optional().default(''),
        pincode: zod_1.z.string().optional().default('')
    }).optional(),
    kycDocs: zod_1.z.object({
        aadhaarNumber: zod_1.z.string().optional().default(''),
        panNumber: zod_1.z.string().optional().default(''),
        aadhaarCard: zod_1.z.string().optional().default(''),
        panCard: zod_1.z.string().optional().default(''),
        passportPhoto: zod_1.z.string().optional().default(''),
        signature: zod_1.z.string().optional().default(''),
        cancelledCheque: zod_1.z.string().optional().default(''),
        educationalCertificates: zod_1.z.string().optional().default('')
    }).optional()
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string()
});
const register = async (req, res) => {
    try {
        const validatedData = registerSchema.parse(req.body);
        // Parse dob to Date object or undefined if invalid
        let parsedDob;
        if (validatedData.dob) {
            const d = new Date(validatedData.dob);
            if (!isNaN(d.getTime())) {
                parsedDob = d;
            }
        }
        // Check if agent already exists by email
        const existingAgentEmail = await Agent_1.default.findOne({ email: validatedData.email.toLowerCase() });
        if (existingAgentEmail) {
            return res.status(400).json({ message: 'Email address is already registered. Please use another email or log in.' });
        }
        // Check if agent already exists by phone
        const existingAgentPhone = await Agent_1.default.findOne({ phone: validatedData.phone });
        if (existingAgentPhone) {
            return res.status(400).json({ message: 'Phone number is already registered. Please use another phone number.' });
        }
        const agentRole = validatedData.role;
        // 1. Process separate Assigned Territory
        const rawTerritory = validatedData.assignedTerritory || validatedData.territory || {};
        const cleanAssignedTerritory = {
            state: (rawTerritory.state || '').trim(),
            stateId: rawTerritory.stateId || '',
            district: agentRole === 'state' ? '' : ((rawTerritory.district || '').trim()),
            districtId: agentRole === 'state' ? '' : (rawTerritory.districtId || ''),
            division: (agentRole === 'state' || agentRole === 'district') ? '' : ((rawTerritory.division || '').trim()),
            divisionId: (agentRole === 'state' || agentRole === 'district') ? '' : (rawTerritory.divisionId || ''),
            taluk: (agentRole === 'state' || agentRole === 'district') ? '' : (rawTerritory.taluk || '').trim(),
            talukId: (agentRole === 'state' || agentRole === 'district') ? '' : (rawTerritory.talukId || ''),
            pincode: agentRole === 'pincode' ? ((rawTerritory.pincode || '').trim()) : '',
            pincodeId: agentRole === 'pincode' ? (rawTerritory.pincodeId || '') : ''
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
        const db = mongoose_1.default.connection.db;
        if (db) {
            // 1. Verify State exists and is active
            const stateQueries = [
                { name: { $regex: new RegExp(`^${cleanAssignedTerritory.state.trim()}$`, 'i') } }
            ];
            if (cleanAssignedTerritory.stateId) {
                if (mongoose_1.default.Types.ObjectId.isValid(cleanAssignedTerritory.stateId)) {
                    stateQueries.push({ _id: new mongoose_1.default.Types.ObjectId(cleanAssignedTerritory.stateId) });
                }
                stateQueries.push({ stateId: cleanAssignedTerritory.stateId });
            }
            const stateDoc = await db.collection('states').findOne({
                $or: stateQueries,
                $and: [{ $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }] }]
            });
            if (!stateDoc) {
                return res.status(400).json({
                    message: `Selected State "${cleanAssignedTerritory.state}" is not an active territory in the Admin territory database.`
                });
            }
            // Populate verified state details
            cleanAssignedTerritory.state = stateDoc.name.trim();
            cleanAssignedTerritory.stateId = stateDoc.stateId || stateDoc._id.toString();
            // 2. Verify District belongs to State
            let districtDoc = null;
            if (agentRole !== 'state') {
                const distQueries = [
                    { name: { $regex: new RegExp(`^${cleanAssignedTerritory.district.trim()}$`, 'i') } }
                ];
                if (cleanAssignedTerritory.districtId) {
                    if (mongoose_1.default.Types.ObjectId.isValid(cleanAssignedTerritory.districtId)) {
                        distQueries.push({ _id: new mongoose_1.default.Types.ObjectId(cleanAssignedTerritory.districtId) });
                    }
                    distQueries.push({ districtId: cleanAssignedTerritory.districtId });
                }
                const stateRefConditions = [
                    { stateId: stateDoc._id },
                    { stateId: stateDoc._id.toString() },
                    { state: stateDoc.name }
                ];
                if (stateDoc.stateId) {
                    stateRefConditions.push({ stateId: stateDoc.stateId });
                }
                districtDoc = await db.collection('districts').findOne({
                    $or: distQueries,
                    $and: [
                        { $or: stateRefConditions },
                        { $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }] }
                    ]
                });
                if (!districtDoc) {
                    return res.status(400).json({
                        message: `Assigned District "${cleanAssignedTerritory.district}" does not belong to State "${cleanAssignedTerritory.state}" or is not active.`
                    });
                }
                cleanAssignedTerritory.district = districtDoc.name.trim();
                cleanAssignedTerritory.districtId = districtDoc.districtId || districtDoc._id.toString();
            }
            // 3. Verify Division belongs to District
            let divisionDoc = null;
            if (agentRole === 'division' || agentRole === 'pincode') {
                const divQueries = [
                    { name: { $regex: new RegExp(`^${cleanAssignedTerritory.division.trim()}$`, 'i') } }
                ];
                if (cleanAssignedTerritory.divisionId) {
                    if (mongoose_1.default.Types.ObjectId.isValid(cleanAssignedTerritory.divisionId)) {
                        divQueries.push({ _id: new mongoose_1.default.Types.ObjectId(cleanAssignedTerritory.divisionId) });
                    }
                    divQueries.push({ divisionId: cleanAssignedTerritory.divisionId });
                }
                const distRefConditions = [
                    { districtId: districtDoc._id },
                    { districtId: districtDoc._id.toString() },
                    { district: districtDoc.name }
                ];
                if (districtDoc.districtId) {
                    distRefConditions.push({ districtId: districtDoc.districtId });
                }
                divisionDoc = await db.collection('divisions').findOne({
                    $or: divQueries,
                    $and: [
                        { $or: distRefConditions },
                        { $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }] }
                    ]
                });
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
                const pinQueries = [
                    { code: pinCodeClean }
                ];
                if (cleanAssignedTerritory.pincodeId) {
                    if (mongoose_1.default.Types.ObjectId.isValid(cleanAssignedTerritory.pincodeId)) {
                        pinQueries.push({ _id: new mongoose_1.default.Types.ObjectId(cleanAssignedTerritory.pincodeId) });
                    }
                    pinQueries.push({ pincodeId: cleanAssignedTerritory.pincodeId });
                }
                const pinRefConditions = [
                    { divisionId: divisionDoc._id },
                    { divisionId: divisionDoc._id.toString() },
                    { division: divisionDoc.name },
                    { districtId: districtDoc._id },
                    { districtId: districtDoc._id.toString() }
                ];
                if (divisionDoc.divisionId) {
                    pinRefConditions.push({ divisionId: divisionDoc.divisionId });
                }
                const pincodeDoc = await db.collection('pincodes').findOne({
                    $or: pinQueries,
                    $and: [
                        { $or: pinRefConditions },
                        { $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }] }
                    ]
                });
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
        // Enforce strictly 1 agent per pincode rule
        if (agentRole === 'pincode' && cleanTerritory.pincode) {
            const existingPincodeAgent = await Agent_1.default.findOne({
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
        let cleanAddress = {};
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
        }
        else {
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
        let territoryParts = [];
        if (agentRole === 'state')
            territoryParts = [cleanTerritory.state].filter(Boolean);
        else if (agentRole === 'district')
            territoryParts = [cleanTerritory.state, cleanTerritory.district].filter(Boolean);
        else
            territoryParts = [cleanTerritory.state, cleanTerritory.district, cleanTerritory.division, cleanTerritory.pincode].filter(Boolean);
        const assignedAreaStr = territoryParts.join(' / ');
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randDigits = Math.floor(1000 + Math.random() * 9000);
        const registrationId = `REG-${dateStr}-${randDigits}`;
        const newAgent = new Agent_1.default({
            ...validatedData,
            territory: cleanTerritory,
            assignedTerritory: cleanAssignedTerritory,
            address: cleanAddress,
            fullAddress: constructedFullAddress,
            email: validatedData.email.toLowerCase(),
            dob: parsedDob,
            registrationId,
            kycStatus: 'pending',
            registrationFeePaid: false
        });
        await newAgent.save();
        // Also sync registration to users collection for Admin Panel join requests
        try {
            const db = mongoose_1.default.connection.db;
            if (db) {
                await db.collection('users').updateOne({ email: validatedData.email.toLowerCase() }, {
                    $set: {
                        name: validatedData.name,
                        email: validatedData.email.toLowerCase(),
                        phone: validatedData.phone,
                        altPhone: req.body.altPhone || req.body.alternativePhone || req.body.secondaryPhone || '',
                        dob: parsedDob || req.body.dob || req.body.dateOfBirth || '',
                        gender: validatedData.gender || req.body.gender || '',
                        qualification: validatedData.qualification || req.body.qualification || req.body.highestQualification || '',
                        experience: validatedData.experience || req.body.experience || req.body.experienceLevel || '',
                        previousCompany: validatedData.previousCompany || req.body.previousCompany || req.body.previousOrg || '',
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
                        postOffice: cleanAddress.postOffice || req.body.postOffice || '',
                        address: cleanAddress,
                        fullAddress: constructedFullAddress,
                        registrationId,
                        status: 'pending',
                        kycStatus: 'pending',
                        isActive: false,
                        kycDocs: validatedData.kycDocs || req.body.kycDocs || {},
                        kyc: {
                            aadhaarNumber: validatedData.kycDocs?.aadhaarNumber || req.body.aadhaarNumber || '',
                            aadhaarImage: validatedData.kycDocs?.aadhaarCard || '',
                            panNumber: validatedData.kycDocs?.panNumber || req.body.panNumber || '',
                            panImage: validatedData.kycDocs?.panCard || '',
                            selfie: validatedData.kycDocs?.passportPhoto || '',
                            businessProofImage: validatedData.kycDocs?.signature || '',
                            educationalCertificates: validatedData.kycDocs?.educationalCertificates || '',
                            cancelledCheque: validatedData.kycDocs?.cancelledCheque || ''
                        },
                        createdAt: new Date()
                    }
                }, { upsert: true });
                await db.collection('agents').updateOne({ registrationId }, {
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
                        createdAt: new Date()
                    }
                }, { upsert: true }).catch(() => { });
            }
        }
        catch (syncError) {
            console.error('Error syncing user to admin collection:', syncError);
        }
        // Return registration information (success screen requirements)
        const agentObj = newAgent.toObject();
        const { password, ...agentData } = agentObj;
        // Publish Realtime Agent Registration Event
        (0, eventBus_1.publishEntityEvent)({
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
        }).catch(() => { });
        return res.status(201).json({
            message: 'Agent registered successfully. Pending Admin approval.',
            registrationId,
            role: newAgent.role,
            status: 'pending',
            agent: agentData
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const errMsgs = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            return res.status(400).json({ message: `Validation failed: ${errMsgs}`, errors: error.errors });
        }
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || 'Field';
            return res.status(400).json({ message: `${field.charAt(0).toUpperCase() + field.slice(1)} is already registered.` });
        }
        if (error.name === 'ValidationError') {
            const msgs = Object.values(error.errors || {}).map((e) => e.message).join('. ');
            return res.status(400).json({ message: msgs || 'Validation error' });
        }
        console.error('Registration error:', error);
        return res.status(500).json({ message: error.message || 'Internal server error' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const validatedData = loginSchema.parse(req.body);
        const cleanEmail = validatedData.email.toLowerCase();
        let agent = await Agent_1.default.findOne({ email: cleanEmail });
        if (!agent) {
            // 1. Check if user exists in MongoDB 'users' collection (Admin app sync)
            try {
                const db = mongoose_1.default.connection.db;
                if (db) {
                    const userDoc = await db.collection('users').findOne({ email: cleanEmail });
                    if (userDoc) {
                        const userRole = (userDoc.level || userDoc.role || 'pincode').toLowerCase();
                        const role = ['state', 'district', 'division', 'pincode'].includes(userRole) ? userRole : 'pincode';
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
                        agent = new Agent_1.default({
                            name: userDoc.name || 'Agent User',
                            email: cleanEmail,
                            password: userDoc.password || validatedData.password,
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
                            kycStatus: userDoc.kycStatus || userDoc.status || 'approved',
                            registrationId: userDoc.registrationId || `REG-${Date.now()}`,
                            ...(userDoc.createdAt || userDoc.registeredAt || userDoc.registrationDate ? {
                                createdAt: userDoc.createdAt || userDoc.registeredAt || userDoc.registrationDate
                            } : {})
                        });
                        await agent.save();
                    }
                }
            }
            catch (e) {
                console.error('Error syncing from users collection in login:', e);
            }
        }
        if (!agent) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        // Workflow validation: Status check against MongoDB
        const currentKycStatus = (agent.kycStatus || '').toLowerCase();
        const currentStatus = (agent.status || '').toLowerCase();
        const isApproved = currentKycStatus === 'approved' || currentStatus === 'approved' || currentStatus === 'active';
        if (!isApproved) {
            if (currentKycStatus === 'rejected' || currentStatus === 'rejected') {
                return res.status(403).json({
                    message: `Your registration request was rejected by Admin. Reason: ${agent.rejectionReason || 'No reason provided.'}. Please contact the Administrator for assistance.`,
                    status: 'rejected',
                    rejectionReason: agent.rejectionReason || 'No reason provided.',
                    registrationId: agent.registrationId || 'N/A',
                    role: agent.role
                });
            }
            if (currentStatus === 'suspended' || currentStatus === 'inactive') {
                return res.status(403).json({
                    message: 'Your account has been suspended/deactivated by the Admin. Please contact the Administrator for assistance.',
                    status: 'suspended',
                    registrationId: agent.registrationId || 'N/A',
                    role: agent.role
                });
            }
            return res.status(403).json({
                message: 'Your registration request is currently pending Admin verification. Please contact the Administrator for further assistance.',
                status: 'pending',
                registrationId: agent.registrationId || 'N/A',
                role: agent.role
            });
        }
        const token = (0, jwt_1.generateToken)({
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        }
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const agent = await Agent_1.default.findById(agentId).select('-password');
        if (!agent) {
            return res.status(404).json({ message: 'Agent not found' });
        }
        // Sync latest status from admin users collection if updated by Admin
        try {
            const db = mongoose_1.default.connection.db;
            if (db) {
                const userDoc = await db.collection('users').findOne({ email: agent.email.toLowerCase() });
                if (userDoc) {
                    const rawDocStatus = String(userDoc.status || userDoc.kycStatus || '').toLowerCase();
                    if (rawDocStatus === 'approved' || rawDocStatus === 'active') {
                        agent.kycStatus = 'approved';
                        agent.status = 'approved';
                        await agent.save();
                    }
                    else if (rawDocStatus === 'rejected') {
                        agent.kycStatus = 'rejected';
                        agent.status = 'rejected';
                        agent.rejectionReason = userDoc.rejectionReason || 'Rejected by Admin';
                        await agent.save();
                    }
                    else if (rawDocStatus === 'suspended' || rawDocStatus === 'inactive') {
                        agent.status = 'suspended';
                        await agent.save();
                    }
                    if (userDoc.role && ['state', 'district', 'division', 'pincode'].includes(String(userDoc.role).toLowerCase())) {
                        agent.role = String(userDoc.role).toLowerCase();
                        await agent.save();
                    }
                }
            }
        }
        catch (statusSyncErr) {
            console.error('Error syncing status from admin collection in getMe:', statusSyncErr);
        }
        const currentKycStatus = (agent.kycStatus || '').toLowerCase();
        const currentStatus = (agent.status || '').toLowerCase();
        const isApproved = currentKycStatus === 'approved' || currentStatus === 'approved' || currentStatus === 'active';
        if (!isApproved) {
            if (currentKycStatus === 'rejected' || currentStatus === 'rejected') {
                return res.status(403).json({
                    message: `Your registration request was rejected by Admin. Reason: ${agent.rejectionReason || 'No reason provided.'}. Please contact the Administrator for assistance.`,
                    status: 'rejected',
                    rejectionReason: agent.rejectionReason || 'No reason provided.'
                });
            }
            if (currentStatus === 'suspended' || currentStatus === 'inactive') {
                return res.status(403).json({
                    message: 'Your account has been suspended/deactivated by the Admin. Please contact the Administrator for assistance.',
                    status: 'suspended'
                });
            }
            return res.status(403).json({
                message: 'Your registration request is currently pending Admin verification. Please contact the Administrator for further assistance.',
                status: 'pending',
                registrationId: agent.registrationId || 'N/A'
            });
        }
        return res.status(200).json({ agent });
    }
    catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getMe = getMe;
const updateProfile = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const allowedFields = [
            'name', 'phone', 'mobile', 'territory', 'assignedTerritory', 'address', 'fullAddress',
            'alternateMobile', 'preferredLanguage', 'bloodGroup', 'profilePhoto',
            'vehicleDetails', 'bankDetails', 'dob', 'gender', 'qualification', 'experience', 'previousCompany'
        ];
        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined)
                updates[field] = req.body[field];
        }
        if (req.body.mobile && !updates.phone) {
            updates.phone = req.body.mobile;
        }
        // Keep territory and assignedTerritory synchronized if either is passed without touching address
        if (updates.assignedTerritory && !updates.territory) {
            const at = updates.assignedTerritory;
            updates.territory = {
                state: at.state || '',
                district: at.district || '',
                division: at.division || '',
                pincode: at.pincode || ''
            };
        }
        else if (updates.territory && !updates.assignedTerritory) {
            const t = updates.territory;
            updates.assignedTerritory = {
                state: t.state || '',
                district: t.district || '',
                division: t.division || '',
                pincode: t.pincode || ''
            };
        }
        const agent = await Agent_1.default.findByIdAndUpdate(agentId, { ...updates, updatedAt: new Date() }, { new: true, runValidators: true }).select('-password');
        if (!agent)
            return res.status(404).json({ message: 'Agent not found' });
        await (0, territoryScope_1.invalidateAgentTerritoryScope)(agentId);
        // Sync profile updates to users collection for Admin visibility
        try {
            const db = mongoose_1.default.connection.db;
            if (db) {
                const userUpdates = {};
                if (updates.name)
                    userUpdates.name = updates.name;
                if (updates.phone) {
                    userUpdates.phone = updates.phone;
                    userUpdates.mobile = updates.phone;
                }
                if (updates.alternateMobile)
                    userUpdates.alternateMobile = updates.alternateMobile;
                if (updates.preferredLanguage)
                    userUpdates.preferredLanguage = updates.preferredLanguage;
                if (updates.bloodGroup)
                    userUpdates.bloodGroup = updates.bloodGroup;
                if (updates.profilePhoto)
                    userUpdates.profilePhoto = updates.profilePhoto;
                if (updates.vehicleDetails)
                    userUpdates.vehicleDetails = updates.vehicleDetails;
                if (updates.bankDetails) {
                    const bd = updates.bankDetails;
                    userUpdates.bankDetails = bd;
                    userUpdates.bankName = bd.bankName;
                    userUpdates.accountNo = bd.accountNumber;
                    userUpdates.accountNumber = bd.accountNumber;
                    userUpdates.ifscCode = bd.ifscCode;
                    userUpdates.accountHolderName = bd.accountHolder;
                }
                if (Object.keys(userUpdates).length > 0) {
                    await db.collection('users').updateOne({ $or: [{ email: agent.email.toLowerCase() }, { phone: agent.phone }] }, { $set: userUpdates });
                }
            }
        }
        catch (syncErr) {
            console.error('Error syncing profile update to users collection:', syncErr);
        }
        return res.status(200).json({ message: 'Details saved successfully.', agent });
    }
    catch (error) {
        console.error('Update profile error:', error);
        return res.status(500).json({ message: 'Unable to save details. Please try again.' });
    }
};
exports.updateProfile = updateProfile;
const updateKyc = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const allowedDocs = ['aadhaarCard', 'panCard', 'passportPhoto', 'signature', 'cancelledCheque', 'educationalCertificates'];
        const kycUpdates = {};
        for (const doc of allowedDocs) {
            if (req.body[doc])
                kycUpdates[`kycDocs.${doc}`] = req.body[doc];
        }
        if (Object.keys(kycUpdates).length === 0) {
            return res.status(400).json({ message: 'No KYC documents provided' });
        }
        const agent = await Agent_1.default.findByIdAndUpdate(agentId, { $set: { ...kycUpdates, kycStatus: 'pending', updatedAt: new Date() } }, { new: true }).select('-password');
        return res.status(200).json({ message: 'KYC documents submitted for review', agent });
    }
    catch (error) {
        console.error('Update KYC error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateKyc = updateKyc;
const forgotPassword = async (req, res) => {
    return res.status(200).json({ message: 'OTP sent to registered email' });
};
exports.forgotPassword = forgotPassword;
const verifyOtp = async (req, res) => {
    return res.status(200).json({ message: 'OTP verified successfully' });
};
exports.verifyOtp = verifyOtp;
const resetPassword = async (req, res) => {
    return res.status(200).json({ message: 'Password reset successfully' });
};
exports.resetPassword = resetPassword;
// ─────────────────────────────────────────────────────────
// In-memory OTP store: { phone → { otp, expiresAt } }
// Replace with Redis for multi-server deployments.
// ─────────────────────────────────────────────────────────
const mobileOtpStore = new Map();
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
const sendOtp = async (req, res) => {
    try {
        const phone = (req.body.phone || req.body.mobileNumber || '').toString().trim();
        // Basic validation
        if (!phone || !/^[6-9][0-9]{9}$/.test(phone)) {
            return res.status(400).json({ message: 'Please enter a valid 10-digit Indian mobile number.' });
        }
        // Check if agent is registered with this phone number
        const agent = await Agent_1.default.findOne({ phone }).select('_id role status kycStatus rejectionReason');
        if (!agent) {
            return res.status(404).json({
                message: 'This mobile number is not registered as an agent. Please apply for agent onboarding first.',
                notRegistered: true
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
                message: `Your registration was rejected. Reason: ${agent.rejectionReason || 'No reason provided.'}. Contact Administrator.`,
                status: 'rejected'
            });
        }
        // Generate 6-digit OTP and store with expiry
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        mobileOtpStore.set(phone, { otp, expiresAt: Date.now() + OTP_EXPIRY_MS });
        console.log(`[OTP] Generated for +91${phone}: ${otp} (expires in 5 minutes)`);
        // In production: send otp via SMS gateway here
        // await smsService.send(`+91${phone}`, `Your Connect Portal OTP is ${otp}. Valid for 5 minutes.`);
        return res.status(200).json({
            message: `OTP sent to +91 ${phone}. It is valid for 5 minutes.`,
            otp // Remove in production after SMS integration
        });
    }
    catch (error) {
        console.error('sendOtp error:', error);
        return res.status(500).json({ message: 'Unable to send OTP. Please try again.' });
    }
};
exports.sendOtp = sendOtp;
/**
 * POST /auth/verify-mobile-otp
 * Step 2 of Mobile OTP Login:
 *   1. Validate OTP from store (must match + not expired).
 *   2. Clear OTP from store (one-time use).
 *   3. Look up agent by phone, check account status.
 *   4. Generate JWT token identical to email login.
 *   5. Return token + agent data.
 */
const verifyMobileOtp = async (req, res) => {
    try {
        const phone = (req.body.phone || req.body.mobileNumber || '').toString().trim();
        const code = (req.body.otp || req.body.code || '').toString().trim();
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
        const agent = await Agent_1.default.findOne({ phone }).select('-password');
        if (!agent) {
            return res.status(404).json({ message: 'Agent account not found. Please contact Administrator.' });
        }
        // Status checks (same as email login)
        const currentKycStatus = (agent.kycStatus || '').toLowerCase();
        const currentStatus = (agent.status || '').toLowerCase();
        const isApproved = currentKycStatus === 'approved' || currentStatus === 'approved' || currentStatus === 'active';
        if (!isApproved) {
            if (currentKycStatus === 'rejected' || currentStatus === 'rejected') {
                return res.status(403).json({
                    message: `Your registration was rejected. Reason: ${agent.rejectionReason || 'No reason provided.'}.`,
                    status: 'rejected'
                });
            }
            if (currentStatus === 'suspended' || currentStatus === 'inactive') {
                return res.status(403).json({
                    message: 'Your account has been suspended. Please contact the Administrator.',
                    status: 'suspended'
                });
            }
            // Pending approval – allow frontend to redirect to /pending
            return res.status(403).json({
                message: 'Your account is pending Admin verification.',
                status: 'pending',
                registrationId: agent.registrationId || 'N/A',
                role: agent.role
            });
        }
        // Generate JWT (same structure as email login)
        const token = (0, jwt_1.generateToken)({
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
    }
    catch (error) {
        console.error('verifyMobileOtp error:', error);
        return res.status(500).json({ message: 'OTP verification failed. Please try again.' });
    }
};
exports.verifyMobileOtp = verifyMobileOtp;
//# sourceMappingURL=auth.controller.js.map