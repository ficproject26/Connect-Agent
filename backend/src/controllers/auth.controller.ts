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
    
    // Check if agent already exists by email
    const existingAgentEmail = await Agent.findOne({ email: validatedData.email.toLowerCase() });
    if (existingAgentEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Check if agent already exists by phone
    const existingAgentPhone = await Agent.findOne({ phone: validatedData.phone });
    if (existingAgentPhone) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    // Generate unique Registration ID: REG-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randDigits = Math.floor(1000 + Math.random() * 9000);
    const registrationId = `REG-${dateStr}-${randDigits}`;

    const newAgent = new Agent({
      ...validatedData,
      email: validatedData.email.toLowerCase(),
      registrationId,
      kycStatus: 'pending',
      registrationFeePaid: false
    });

    await newAgent.save();

    // Also sync registration to users collection for Admin Panel join requests
    try {
      const db = mongoose.connection.db;
      if (db) {
        const assignedAreaStr = validatedData.territory?.state || validatedData.territory?.district || validatedData.territory?.division || validatedData.territory?.pincode || '';
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
              isActive: false,
              kyc: {
                aadhaarImage: validatedData.kycDocs?.aadhaarCard || '',
                panImage: validatedData.kycDocs?.panCard || '',
                selfie: validatedData.kycDocs?.passportPhoto || ''
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
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error' });
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

    // Workflow validation: Approved (Login Enabled) / Pending Approval / Rejected (Show Reason)
    if (agent.kycStatus === 'pending') {
      return res.status(403).json({
        message: 'Your registration has been submitted successfully. You can log in only after Admin approval.',
        status: 'pending',
        registrationId: agent.registrationId || 'N/A',
        role: agent.role
      });
    }

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
      agent: agentData
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

    if (!agent) return res.status(404).json({ message: 'Agent not found' });
    return res.status(200).json({ message: 'KYC documents submitted for review', agent });
  } catch (error) {
    console.error('Update KYC error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
