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
  excludeAgentId?: string
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

  if (excludeAgentId) {
    const excludeObjId = mongoose.Types.ObjectId.isValid(excludeAgentId)
      ? new mongoose.Types.ObjectId(excludeAgentId)
      : excludeAgentId;
    query._id = { $ne: excludeObjId };
  }

  // Check Agent collection
  const existingAgent = await Agent.findOne(query).lean();
  if (existingAgent) {
    return { exists: true, agent: existingAgent };
  }

  // Also check users collection for active approved assignments
  try {
    const db = mongoose.connection.db;
    if (db) {
      const userQuery: any = {
        role: { $in: ['district', 'district_agent', 'district_manager', 'District Admin'] },
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
      if (excludeAgentId) {
        userQuery._id = { $ne: excludeAgentId };
      }
      const existingUser = await db.collection('users').findOne(userQuery);
      if (existingUser) {
        return { exists: true, agent: existingUser };
      }
    }
  } catch (e) {
    console.error('Error checking district assignment in users collection:', e);
  }

  return { exists: false };
}
