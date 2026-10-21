import mongoose from 'mongoose';
import Agent from '../models/Agent';
import { cacheService } from '../services/cache.service';

export interface TerritoryScope {
  role: string;
  state: string;
  district: string;
  division: string;
  pincode: string;
  agentId: string;
}

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
export async function getAgentTerritoryScope(agentId: string, email?: string): Promise<TerritoryScope | null> {
  if (!agentId && !email) return null;
  const cacheKey = `scope:${agentId || email}`;

  try {
    const cachedScope = await cacheService.get<TerritoryScope>(cacheKey);
    if (cachedScope) {
      return cachedScope;
    }

    let agent: any = null;
    if (agentId && mongoose.Types.ObjectId.isValid(agentId)) {
      agent = await Agent.findById(agentId)
        .select('role level assignedTerritory territory state district division pincode assignedState assignedDistrict assignedDivision assignedPincode email')
        .lean();
    }
    if (!agent && agentId) {
      const orConditions: any[] = [
        { agentId: agentId },
        { registrationId: agentId }
      ];
      if (mongoose.Types.ObjectId.isValid(agentId)) {
        orConditions.push({ _id: new mongoose.Types.ObjectId(agentId) });
      }
      agent = await Agent.findOne({ $or: orConditions })
        .select('role level assignedTerritory territory state district division pincode assignedState assignedDistrict assignedDivision assignedPincode email')
        .lean();
    }

    if (!agent && email) {
      agent = await Agent.findOne({ email: email.toLowerCase().trim() })
        .select('role level assignedTerritory territory state district division pincode assignedState assignedDistrict assignedDivision assignedPincode email')
        .lean();
    }

    if (!agent) {
      const db = mongoose.connection.db;
      if (db) {
        const orClauses: any[] = [];
        if (agentId) {
          orClauses.push({ agentId: agentId });
          if (mongoose.Types.ObjectId.isValid(agentId)) {
            orClauses.push({ _id: new mongoose.Types.ObjectId(agentId) });
          }
          orClauses.push({ _id: agentId });
        }
        if (email) {
          orClauses.push({ email: email.toLowerCase().trim() });
        }

        if (orClauses.length > 0) {
          agent = await db.collection('users').findOne(
            { $or: orClauses },
            {
              projection: {
                role: 1,
                level: 1,
                email: 1,
                assignedTerritory: 1,
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
    }
    if (!agent) return null;

    const rawRoleStr = String(agent.role || '').toLowerCase();
    const rawLevelStr = String(agent.level || '').toLowerCase();
    let canonicalRole = 'pincode';
    if (rawRoleStr.includes('state') || rawLevelStr.includes('state') || rawLevelStr === '1') {
      canonicalRole = 'state';
    } else if (rawRoleStr.includes('district') || rawLevelStr.includes('district') || rawLevelStr === '2') {
      canonicalRole = 'district';
    } else if (rawRoleStr.includes('division') || rawLevelStr.includes('division') || rawLevelStr === '3') {
      canonicalRole = 'division';
    } else {
      canonicalRole = 'pincode';
    }

    const scope: TerritoryScope = {
      role: canonicalRole,
      state: (agent.assignedTerritory?.state || agent.territory?.state || agent.state || agent.assignedState || '').trim(),
      district: (agent.assignedTerritory?.district || agent.territory?.district || agent.district || agent.assignedDistrict || '').trim(),
      division: (agent.assignedTerritory?.division || agent.territory?.division || agent.division || agent.assignedDivision || '').trim(),
      pincode: (agent.assignedTerritory?.pincode || agent.territory?.pincode || agent.pincode || agent.assignedPincode || '').trim(),
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
 * Fetch authoritative pincodes assigned to a division from Admin Pincode Management DB
 */
export async function getDivisionPincodes(divisionName: string): Promise<string[]> {
  if (!divisionName || !divisionName.trim()) return [];
  const cleanDiv = divisionName.toLowerCase().replace(/division|manager/g, '').trim();
  const cacheKey = `divPins:${cleanDiv}`;
  
  try {
    const cached = await cacheService.get<string[]>(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) return cached;
  } catch (_) {}

  const db = mongoose.connection.db;
  if (!db) return [];

  try {
    const docs = await db.collection('pincodes').find({
      $or: [
        { division: new RegExp(cleanDiv, 'i') },
        { name: new RegExp(cleanDiv, 'i') }
      ]
    }, { projection: { code: 1, pincode: 1 } }).toArray();

    const codes = docs.map((d: any) => String(d.code || d.pincode).trim()).filter(Boolean);
    if (codes.length > 0) {
      try {
        await cacheService.set(cacheKey, codes, 300);
      } catch (_) {}
    }
    return codes;
  } catch (err) {
    console.error('Error fetching division pincodes:', err);
    return [];
  }
}

/**
 * Build territory filter for Agent model and agent directory queries.
 * Strictly enforces State -> District -> Division -> Pincode visibility hierarchy.
 * Returns { _id: null } when required territory information is missing.
 */
export function buildTerritoryFilter(scope: TerritoryScope | null, divisionPincodes?: string[]): Record<string, any> {
  // Empty or missing scope must NEVER fall back to showing all agents
  if (!scope) return { _id: null };

  const validRoles = ['state', 'district', 'division', 'pincode', 'agent', 'state_manager', 'district_agent', 'district_manager', 'division_agent', 'division_manager', 'pincode_agent'];

  const role = (scope.role || '').toLowerCase();

  if (role === 'state' || role.includes('state')) {
    if (!scope.state) return { _id: null };

    return {
      $or: [
        { 'assignedTerritory.state': exactRegex(scope.state) },
        { 'territory.state': exactRegex(scope.state) },
        { state: exactRegex(scope.state) },
        { assignedState: exactRegex(scope.state) }
      ],
      $and: [
        {
          $or: [
            { role: { $in: validRoles } },
            { level: { $in: validRoles } }
          ]
        }
      ]
    };
  }

  if (role === 'district' || role.includes('district')) {
    if (!scope.district) return { _id: null };

    const stateConditions = scope.state ? [
      {
        $or: [
          { 'assignedTerritory.state': exactRegex(scope.state) },
          { 'territory.state': exactRegex(scope.state) },
          { state: exactRegex(scope.state) },
          { assignedState: exactRegex(scope.state) }
        ]
      }
    ] : [];

    const distRoles = ['district', 'division', 'pincode', 'district_agent', 'district_manager', 'division_agent', 'division_manager', 'pincode_agent'];

    return {
      $or: [
        { role: { $in: distRoles } },
        { level: { $in: distRoles } },
        { role: 'agent', level: { $in: distRoles } }
      ],
      $and: [
        {
          $or: [
            { 'assignedTerritory.district': exactRegex(scope.district) },
            { 'territory.district': exactRegex(scope.district) },
            { district: exactRegex(scope.district) },
            { assignedDistrict: exactRegex(scope.district) }
          ]
        },
        ...stateConditions
      ]
    };
  }

  if (role === 'division' || role.includes('division')) {
    if (!scope.division) return { _id: null };

    const districtConditions = scope.district ? [
      {
        $or: [
          { 'assignedTerritory.district': exactRegex(scope.district) },
          { 'territory.district': exactRegex(scope.district) },
          { district: exactRegex(scope.district) },
          { assignedDistrict: exactRegex(scope.district) }
        ]
      }
    ] : [];

    const stateConditions = scope.state ? [
      {
        $or: [
          { 'assignedTerritory.state': exactRegex(scope.state) },
          { 'territory.state': exactRegex(scope.state) },
          { state: exactRegex(scope.state) },
          { assignedState: exactRegex(scope.state) }
        ]
      }
    ] : [];

    const divOrClauses: any[] = [
      { 'assignedTerritory.division': containsRegex(scope.division) },
      { 'territory.division': containsRegex(scope.division) },
      { division: containsRegex(scope.division) },
      { assignedDivision: containsRegex(scope.division) },
      { assignedArea: containsRegex(scope.division) }
    ];

    if (Array.isArray(divisionPincodes) && divisionPincodes.length > 0) {
      divOrClauses.push(
        { 'assignedTerritory.pincode': { $in: divisionPincodes } },
        { 'territory.pincode': { $in: divisionPincodes } },
        { pincode: { $in: divisionPincodes } },
        { assignedPincode: { $in: divisionPincodes } }
      );
    }

    const divRoles = ['division', 'pincode', 'division_agent', 'division_manager', 'pincode_agent'];

    return {
      $or: [
        { role: { $in: divRoles } },
        { level: { $in: divRoles } },
        { role: 'agent', level: { $in: divRoles } }
      ],
      $and: [
        { $or: divOrClauses },
        ...districtConditions,
        ...stateConditions
      ]
    };
  }

  if (role === 'pincode' || role.includes('pincode') || role === 'agent') {
    if (!scope.pincode) return { _id: null };

    const pinRoles = ['pincode', 'pincode_agent'];

    return {
      $or: [
        { role: { $in: pinRoles } },
        { level: { $in: pinRoles } },
        { role: 'agent', level: { $in: pinRoles } }
      ],
      $and: [
        {
          $or: [
            { _id: scope.agentId },
            { 'assignedTerritory.pincode': scope.pincode },
            { 'territory.pincode': scope.pincode },
            { pincode: scope.pincode },
            { assignedPincode: scope.pincode }
          ]
        }
      ]
    };
  }

  return { _id: null };
}

/**
 * Build territory filter for Vendor queries.
 * Strictly enforces State -> District -> Division -> Pincode vendor isolation.
 */
export function buildVendorScopeFilter(scope: TerritoryScope | null, divisionPincodes?: string[]): Record<string, any> {
  if (!scope) return { _id: null };

  const role = (scope.role || '').toLowerCase();

  if (role === 'state' || role.includes('state')) {
    if (!scope.state) return { _id: null };

    return {
      $or: [
        { state: exactRegex(scope.state) },
        { assignedState: exactRegex(scope.state) },
        { 'location.address': containsRegex(scope.state) }
      ]
    };
  }

  if (role === 'district' || role.includes('district')) {
    if (!scope.district) return { _id: null };

    const stateConditions = scope.state ? [
      {
        $or: [
          { state: exactRegex(scope.state) },
          { assignedState: exactRegex(scope.state) },
          { 'location.address': containsRegex(scope.state) }
        ]
      }
    ] : [];

    return {
      $and: [
        {
          $or: [
            { district: exactRegex(scope.district) },
            { assignedDistrict: exactRegex(scope.district) },
            { 'location.address': containsRegex(scope.district) }
          ]
        },
        ...stateConditions
      ]
    };
  }

  if (role === 'division' || role.includes('division')) {
    if (!scope.division) return { _id: null };

    const districtConditions = scope.district ? [
      {
        $or: [
          { district: exactRegex(scope.district) },
          { assignedDistrict: exactRegex(scope.district) }
        ]
      }
    ] : [];

    const stateConditions = scope.state ? [
      {
        $or: [
          { state: exactRegex(scope.state) },
          { assignedState: exactRegex(scope.state) }
        ]
      }
    ] : [];

    const divOrClauses: any[] = [
      { division: containsRegex(scope.division) },
      { assignedDivision: containsRegex(scope.division) }
    ];

    if (Array.isArray(divisionPincodes) && divisionPincodes.length > 0) {
      divOrClauses.push(
        { pincode: { $in: divisionPincodes } },
        { assignedPincode: { $in: divisionPincodes } },
        { 'location.pincode': { $in: divisionPincodes } }
      );
    }

    return {
      $and: [
        { $or: divOrClauses },
        ...districtConditions,
        ...stateConditions
      ]
    };
  }

  if (role === 'pincode' || role.includes('pincode') || role === 'agent') {
    const agentMatches: any[] = [scope.agentId];
    if (mongoose.Types.ObjectId.isValid(scope.agentId)) {
      agentMatches.push(new mongoose.Types.ObjectId(scope.agentId));
    }
    const agentFilterClauses: any[] = [
      { assignedAgent: { $in: agentMatches } },
      { agentId: { $in: agentMatches } },
      { onboardedBy: { $in: agentMatches } },
      { onboardedByAgentId: { $in: agentMatches } }
    ];

    if (scope.pincode) {
      return {
        $and: [
          {
            $or: [
              { pincode: scope.pincode },
              { assignedPincode: scope.pincode },
              { 'location.pincode': scope.pincode }
            ]
          },
          { $or: agentFilterClauses }
        ]
      };
    }
    return { $or: agentFilterClauses };
  }

  return { _id: null };
}
