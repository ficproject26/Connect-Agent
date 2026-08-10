import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Agent from '../models/Agent';
import { generateToken } from '../utils/jwt';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  role: z.enum(['state', 'district', 'division', 'pincode', 'delivery_partner', 'technician']),
  dob: z.string().optional().or(z.date().optional()),
  gender: z.string().optional(),
  qualification: z.string().optional(),
  experience: z.string().optional(),
  previousCompany: z.string().optional(),
  territory: z.object({
    state: z.string().optional().default(''),
    district: z.string().optional().default(''),
    division: z.string().optional().default(''),
    pincode: z.string().optional().default('')
  }).optional(),
  kycDocs: z.object({
    aadhaarCard: z.string().optional().default(''),
    panCard: z.string().optional().default(''),
    passportPhoto: z.string().optional().default(''),
    signature: z.string().optional().default(''),
    cancelledCheque: z.string().optional().default(''),
    educationalCertificates: z.string().optional().default('')
  }).optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
});

export const register = async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    
    // Parse dob to Date object or undefined if invalid
    let parsedDob: Date | undefined;
    if (validatedData.dob) {
      const d = new Date(validatedData.dob);
      if (!isNaN(d.getTime())) {
        parsedDob = d;
      }
    }

    // Check if agent already exists by email
    const existingAgentEmail = await Agent.findOne({ email: validatedData.email.toLowerCase() });
    if (existingAgentEmail) {
      return res.status(400).json({ message: 'Email address is already registered. Please use another email or log in.' });
    }

    // Check if agent already exists by phone
    const existingAgentPhone = await Agent.findOne({ phone: validatedData.phone });
    if (existingAgentPhone) {
      return res.status(400).json({ message: 'Phone number is already registered. Please use another phone number.' });
    }

    const agentRole = validatedData.role;
    const cleanTerritory = {
      state: validatedData.territory?.state || '',
      district: agentRole === 'state' ? '' : (validatedData.territory?.district || ''),
      division: (agentRole === 'state' || agentRole === 'district') ? '' : (validatedData.territory?.division || ''),
      pincode: agentRole === 'pincode' ? (validatedData.territory?.pincode || '') : (validatedData.territory?.pincode || '')
    };

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

    let territoryParts: string[] = [];
    if (agentRole === 'state') territoryParts = [cleanTerritory.state].filter(Boolean);
    else if (agentRole === 'district') territoryParts = [cleanTerritory.state, cleanTerritory.district].filter(Boolean);
    else if (agentRole === 'division') territoryParts = [cleanTerritory.state, cleanTerritory.district, cleanTerritory.division].filter(Boolean);
    else territoryParts = [cleanTerritory.state, cleanTerritory.district, cleanTerritory.division, cleanTerritory.pincode].filter(Boolean);

    const assignedAreaStr = territoryParts.join(' / ');

    const newAgent = new Agent({
      ...validatedData,
      territory: cleanTerritory,
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
              password: newAgent.password,
              role: 'agent',
              level: validatedData.role,
              assignedArea: assignedAreaStr,
              registrationId,
              status: 'pending',
              kycStatus: 'pending',
              isActive: false,
              kyc: {
                aadhaarImage: validatedData.kycDocs?.aadhaarCard || '',
                panImage: validatedData.kycDocs?.panCard || '',
                selfie: validatedData.kycDocs?.passportPhoto || '',
                businessProofImage: validatedData.kycDocs?.signature || ''
              },
              createdAt: new Date()
            }
          },
          { upsert: true }
        );
      }
    } catch (syncError) {
      console.error('Error syncing user to admin collection:', syncError);
    }

    // Return registration information (success screen requirements)
    const agentObj = newAgent.toObject();
    const { password, ...agentData } = agentObj;

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
    
    const agent = await Agent.findOne({ email: validatedData.email.toLowerCase() });
    if (!agent) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await agent.comparePassword(validatedData.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Sync latest status from admin users collection if updated by Admin
    try {
      const db = mongoose.connection.db;
      if (db) {
        const userDoc = await db.collection('users').findOne({ email: validatedData.email.toLowerCase() });
        if (userDoc && userDoc.status) {
          const uStatus = String(userDoc.status).toLowerCase();
          if (uStatus === 'approved' && agent.kycStatus !== 'approved') {
            agent.kycStatus = 'approved';
            await agent.save();
          } else if (uStatus === 'rejected' && agent.kycStatus !== 'rejected') {
            agent.kycStatus = 'rejected';
            agent.rejectionReason = userDoc.rejectionReason || 'Rejected by Admin';
            await agent.save();
          }
        }
      }
    } catch (statusSyncErr) {
      console.error('Error syncing status from admin collection:', statusSyncErr);
    }

    // Workflow validation: Rejected agents blocked with reason, pending/approved agents log in seamlessly
    if (agent.kycStatus === 'rejected') {
      return res.status(403).json({
        message: `Your registration application was rejected. Reason: ${agent.rejectionReason || 'No reason provided.'}`,
        status: 'rejected',
        rejectionReason: agent.rejectionReason || 'No reason provided.',
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
        status: (agent.kycStatus === 'approved' || agent.status === 'approved' || agent.status === 'active') ? 'active' : 'pending_approval'
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
    const agentId = (req as any).agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const agent = await Agent.findById(agentId).select('-password');
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Sync latest status from admin users collection if updated by Admin
    try {
      const db = mongoose.connection.db;
      if (db) {
        const userDoc = await db.collection('users').findOne({ email: agent.email.toLowerCase() });
        if (userDoc && userDoc.status) {
          const uStatus = String(userDoc.status).toLowerCase();
          if (uStatus === 'approved' && agent.kycStatus !== 'approved') {
            agent.kycStatus = 'approved';
            await agent.save();
          } else if (uStatus === 'rejected' && agent.kycStatus !== 'rejected') {
            agent.kycStatus = 'rejected';
            agent.rejectionReason = userDoc.rejectionReason || 'Rejected by Admin';
            await agent.save();
          }
        }
      }
    } catch (statusSyncErr) {
      console.error('Error syncing status from admin collection in getMe:', statusSyncErr);
    }

    return res.status(200).json({ agent });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const allowedFields = ['name', 'phone', 'territory'];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const agent = await Agent.findByIdAndUpdate(
      agentId,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password');

    if (!agent) return res.status(404).json({ message: 'Agent not found' });
    return res.status(200).json({ message: 'Profile updated', agent });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Internal server error' });
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
