import mongoose from 'mongoose';
import Agent from '../models/Agent';

export interface TerritoryScope {
  role: string;
  state: string;
  district: string;
  division: string;
  pincode: string;
  agentId: string;
}

import { cacheService } from '../services/cache.service';

/**
 * Invalidate cached territory scope when agent details change
 */
export async function invalidateAgentTerritoryScope(agentId: string): Promise<void> {
  if (!agentId) return;
  await cacheService.del(`scope:${agentId}`);
}

/**
 * Fetch territory scope of the authenticated agent.
 * Checks cache first, then Agent model and fallback users collection using tight projections.
 */
export async function getAgentTerritoryScope(agentId: string): Promise<TerritoryScope | null> {
  if (!agentId) return null;
  const cacheKey = `scope:${agentId}`;

  try {
    const cachedScope = await cacheService.get<TerritoryScope>(cacheKey);
    if (cachedScope) {
      return cachedScope;
    }

    let agent: any = await Agent.findById(agentId)
      .select('role level territory state district division pincode assignedState assignedDistrict assignedDivision assignedPincode')
      .lean();

    if (!agent) {
      const db = mongoose.connection.db;
      if (db) {
        agent = await db.collection('users').findOne(
          { _id: agentId as any },
          {
            projection: {
              role: 1,
              level: 1,
              territory: 1,
              state: 1,
              district: 1,
              division: 1,
              pincode: 1,
              assignedState: 1,
              assignedDistrict: 1,
              assignedDivision: 1,
              assignedPincode: 1
            }
          }
        );
      }
    }
    if (!agent) return null;

    const rawRole = (agent.role || agent.level || 'pincode').toLowerCase();
    const normalizedRole = rawRole === 'agent' ? (agent.level || 'pincode').toLowerCase() : rawRole;

    const scope: TerritoryScope = {
      role: normalizedRole,
      state: (agent.territory?.state || agent.state || agent.assignedState || '').trim(),
      district: (agent.territory?.district || agent.district || agent.assignedDistrict || '').trim(),
      division: (agent.territory?.division || agent.division || agent.assignedDivision || '').trim(),
      pincode: (agent.territory?.pincode || agent.pincode || agent.assignedPincode || '').trim(),
      agentId: agent._id.toString()
    };

    // Cache scope for 60 seconds
    await cacheService.set(cacheKey, scope, 60);

    return scope;
  } catch (error) {
    console.error('Error fetching agent territory scope:', error);
    return null;
  }
}

const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactRegex = (str: string) => new RegExp(`^\\s*${escapeRegex(str.trim())}\\s*$`, 'i');
const containsRegex = (str: string) => new RegExp(escapeRegex(str.trim()), 'i');

/**
 * Build territory filter for Agent model and agent directory queries.
 * Strictly enforces State -> District -> Division -> Pincode visibility hierarchy.
 * Returns { _id: null } when required territory information is missing.
 */
export function buildTerritoryFilter(scope: TerritoryScope | null): Record<string, any> {
  // Empty or missing scope must NEVER fall back to showing all agents
  if (!scope) return { _id: null };

  if (scope.role === 'state') {
    if (!scope.state) return { _id: null };

    return {
      role: { $in: ['district', 'division', 'pincode'] },
      $or: [
        { 'territory.state': exactRegex(scope.state) },
        { state: exactRegex(scope.state) }
      ]
    };
  }

  if (scope.role === 'district') {
    if (!scope.district) return { _id: null };

    const stateConditions = scope.state ? [
      {
        $or: [
          { 'territory.state': exactRegex(scope.state) },
          { state: exactRegex(scope.state) }
        ]
      }
    ] : [];

    return {
      role: { $in: ['division', 'pincode'] },
      $and: [
        {
          $or: [
            { 'territory.district': exactRegex(scope.district) },
            { district: exactRegex(scope.district) }
          ]
        },
        ...stateConditions
      ]
    };
  }

  if (scope.role === 'division') {
    if (!scope.division) return { _id: null };

    const districtConditions = scope.district ? [
      {
        $or: [
          { 'territory.district': exactRegex(scope.district) },
          { district: exactRegex(scope.district) }
        ]
      }
    ] : [];

    const stateConditions = scope.state ? [
      {
        $or: [
          { 'territory.state': exactRegex(scope.state) },
          { state: exactRegex(scope.state) }
        ]
      }
    ] : [];

    return {
      role: 'pincode',
      $and: [
        {
          $or: [
            { 'territory.division': containsRegex(scope.division) },
            { division: containsRegex(scope.division) }
          ]
        },
        ...districtConditions,
        ...stateConditions
      ]
    };
  }

  if (scope.role === 'pincode') {
    if (!scope.pincode) return { _id: null };

    return {
      role: 'pincode',
      $or: [
        { _id: scope.agentId },
        { 'territory.pincode': scope.pincode },
        { pincode: scope.pincode }
      ]
    };
  }

  return { _id: null };
}

/**
 * Build territory filter for Vendor queries.
 * Strictly enforces State -> District -> Division -> Pincode vendor isolation.
 */
export function buildVendorScopeFilter(scope: TerritoryScope | null): Record<string, any> {
  if (!scope) return { _id: null };

  if (scope.role === 'state') {
    if (!scope.state) return { _id: null };

    return {
      $or: [
        { state: exactRegex(scope.state) },
        { 'location.address': containsRegex(scope.state) }
      ]
    };
  }

  if (scope.role === 'district') {
    if (!scope.district) return { _id: null };

    const stateConditions = scope.state ? [
      {
        $or: [
          { state: exactRegex(scope.state) },
          { 'location.address': containsRegex(scope.state) }
        ]
      }
    ] : [];

    return {
      $and: [
        {
          $or: [
            { district: exactRegex(scope.district) },
            { 'location.address': containsRegex(scope.district) }
          ]
        },
        ...stateConditions
      ]
    };
  }

  if (scope.role === 'division') {
    if (!scope.division) return { _id: null };

    const districtConditions = scope.district ? [
      {
        $or: [
          { district: exactRegex(scope.district) },
          { 'location.address': containsRegex(scope.district) }
        ]
      }
    ] : [];

    return {
      $and: [
        {
          $or: [
            { division: containsRegex(scope.division) },
            { 'location.address': containsRegex(scope.division) }
          ]
        },
        ...districtConditions
      ]
    };
  }

  if (scope.role === 'pincode') {
    if (scope.pincode) {
      return {
        $or: [
          { pincode: scope.pincode },
          { assignedAgent: scope.agentId }
        ]
      };
    }
    return { assignedAgent: scope.agentId };
  }

  return { _id: null };
}
