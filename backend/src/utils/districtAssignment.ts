import mongoose from 'mongoose';
import Agent from '../models/Agent';

const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactRegex = (str: string) => new RegExp(`^\\s*${escapeRegex(str.trim())}\\s*$`, 'i');

/**
 * Validates whether an active approved District Agent is already assigned to a given district.
 * Enforces strictly maximum 1 active District Agent assignment per district.
 */
export async function checkExistingDistrictAssignment(
  state: string,
  district: string,
  districtId?: string,
  excludeAgentId?: string,
  excludeEmail?: string
): Promise<{ exists: boolean; agent?: any }> {
  if (!district || !district.trim()) return { exists: false };

  const normDist = district.trim();
  const normState = (state || '').trim();

  const districtConditions: any[] = [
    { 'assignedTerritory.district': exactRegex(normDist) },
    { 'territory.district': exactRegex(normDist) },
    { district: exactRegex(normDist) },
    { assignedDistrict: exactRegex(normDist) }
  ];

  if (districtId && districtId.trim()) {
    districtConditions.push({ 'assignedTerritory.districtId': districtId.trim() });
    districtConditions.push({ districtId: districtId.trim() });
  }

  const query: any = {
    role: { $in: ['district', 'district_agent', 'district_manager'] },
    $or: districtConditions,
    $and: [
      {
        $or: [
          { kycStatus: { $regex: /^approved$/i } },
          { status: { $regex: /^(approved|active)$/i } }
        ]
      },
      { kycStatus: { $nin: ['rejected', 'pending', 'pending_verification', 'suspended', 'in_review', 'Rejected', 'Pending'] } },
      { status: { $nin: ['rejected', 'pending', 'pending_approval', 'suspended', 'inactive', 'under_review', 'Rejected', 'Pending'] } }
    ]
  };

  if (normState) {
    query.$and.push({
      $or: [
        { 'assignedTerritory.state': exactRegex(normState) },
        { 'territory.state': exactRegex(normState) },
        { state: exactRegex(normState) },
        { assignedState: exactRegex(normState) }
      ]
    });
  }

  let agentEmailToExclude = (excludeEmail || '').toLowerCase().trim();
  const excludeIds: any[] = [];
  if (excludeAgentId) {
    excludeIds.push(String(excludeAgentId));
    if (mongoose.Types.ObjectId.isValid(excludeAgentId)) {
      excludeIds.push(new mongoose.Types.ObjectId(excludeAgentId));
    }
    if (!agentEmailToExclude) {
      try {
        const found = await Agent.findById(excludeAgentId).select('email').lean();
        if (found?.email) {
          agentEmailToExclude = found.email.toLowerCase().trim();
        }
      } catch (_) {}
    }
  }

  if (excludeIds.length > 0) {
    query._id = { $nin: excludeIds };
    if (agentEmailToExclude) {
      query.email = { $ne: agentEmailToExclude };
    }
  }

  // Check Agent collection
  const existingAgent = await Agent.findOne(query).lean();
  if (existingAgent) {
    return { exists: true, agent: existingAgent };
  }

  // Also check users collection for active approved assignments (strictly Agent role only)
  try {
    const db = mongoose.connection.db;
    if (db) {
      const userQuery: any = {
        role: {
          $in: ['district', 'district_agent', 'district_lead'],
          $nin: ['admin', 'super-admin', 'superadmin', 'District Admin', 'Division Admin', 'Pincode Admin', 'State Admin', 'manager', 'state_manager', 'district_manager', 'division_manager', 'pincode_manager', 'Vendor', 'vendor', 'Customer', 'customer']
        },
        $or: districtConditions,
        $and: [
          {
            $or: [
              { kycStatus: { $regex: /^(approved|verified)$/i } },
              { status: { $regex: /^(approved|active)$/i } }
            ]
          },
          { kycStatus: { $nin: ['rejected', 'pending', 'pending_verification', 'under_review', 'Rejected', 'Pending'] } },
          { status: { $nin: ['rejected', 'pending', 'pending_approval', 'suspended', 'inactive', 'under_review', 'Rejected', 'Pending'] } }
        ]
      };
      if (normState) {
        userQuery.$and.push({
          $or: [
            { 'assignedTerritory.state': exactRegex(normState) },
            { 'territory.state': exactRegex(normState) },
            { state: exactRegex(normState) },
            { assignedState: exactRegex(normState) }
          ]
        });
      }
      if (excludeIds.length > 0) {
        userQuery._id = { $nin: excludeIds };
      }
      if (agentEmailToExclude) {
        userQuery.email = { $ne: agentEmailToExclude };
      }
      const existingUser = await db.collection('users').findOne(userQuery);
      if (existingUser) {
        const uId = String(existingUser._id || '');
        const uRole = String(existingUser.role || '').toLowerCase();
        // Strictly exclude non-agent user types
        if (!/^(ADM-|usr_mgr|MGR-|cust_|ven-)/i.test(uId) && !/admin|manager|vendor|customer/i.test(uRole)) {
          return { exists: true, agent: existingUser };
        }
      }
    }
  } catch (e) {
    console.error('Error checking district assignment in users collection:', e);
  }

  return { exists: false };
}
