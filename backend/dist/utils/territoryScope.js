"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateAgentTerritoryScope = invalidateAgentTerritoryScope;
exports.getAgentTerritoryScope = getAgentTerritoryScope;
exports.getDivisionPincodes = getDivisionPincodes;
exports.buildTerritoryFilter = buildTerritoryFilter;
exports.buildVendorScopeFilter = buildVendorScopeFilter;
const mongoose_1 = __importDefault(require("mongoose"));
const Agent_1 = __importDefault(require("../models/Agent"));
const cache_service_1 = require("../services/cache.service");
/**
 * Invalidate cached territory scope when agent details change
 */
async function invalidateAgentTerritoryScope(agentId) {
    if (!agentId)
        return;
    await cache_service_1.cacheService.del(`scope:${agentId}`);
}
/**
 * Fetch territory scope of the authenticated agent.
 * Checks cache first, then Agent model and fallback users collection using tight projections.
 */
async function getAgentTerritoryScope(agentId, email) {
    if (!agentId && !email)
        return null;
    const cacheKey = `scope:${agentId || email}`;
    try {
        const cachedScope = await cache_service_1.cacheService.get(cacheKey);
        if (cachedScope) {
            return cachedScope;
        }
        let agent = null;
        if (agentId && mongoose_1.default.Types.ObjectId.isValid(agentId)) {
            agent = await Agent_1.default.findById(agentId)
                .select('role level assignedTerritory territory state district division pincode assignedState assignedDistrict assignedDivision assignedPincode email')
                .lean();
        }
        if (!agent && agentId) {
            const orConditions = [
                { agentId: agentId },
                { registrationId: agentId }
            ];
            if (mongoose_1.default.Types.ObjectId.isValid(agentId)) {
                orConditions.push({ _id: new mongoose_1.default.Types.ObjectId(agentId) });
            }
            agent = await Agent_1.default.findOne({ $or: orConditions })
                .select('role level assignedTerritory territory state district division pincode assignedState assignedDistrict assignedDivision assignedPincode email')
                .lean();
        }
        if (!agent && email) {
            agent = await Agent_1.default.findOne({ email: email.toLowerCase().trim() })
                .select('role level assignedTerritory territory state district division pincode assignedState assignedDistrict assignedDivision assignedPincode email')
                .lean();
        }
        if (!agent) {
            const db = mongoose_1.default.connection.db;
            if (db) {
                const orClauses = [];
                if (agentId) {
                    orClauses.push({ agentId: agentId });
                    if (mongoose_1.default.Types.ObjectId.isValid(agentId)) {
                        orClauses.push({ _id: new mongoose_1.default.Types.ObjectId(agentId) });
                    }
                    orClauses.push({ _id: agentId });
                }
                if (email) {
                    orClauses.push({ email: email.toLowerCase().trim() });
                }
                if (orClauses.length > 0) {
                    agent = await db.collection('users').findOne({ $or: orClauses }, {
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
                    });
                }
            }
        }
        if (!agent)
            return null;
        const rawRole = (agent.role || agent.level || 'pincode').toLowerCase();
        const normalizedRole = rawRole === 'agent' ? (agent.level || 'pincode').toLowerCase() : rawRole;
        const scope = {
            role: normalizedRole,
            state: (agent.assignedTerritory?.state || agent.territory?.state || agent.state || agent.assignedState || '').trim(),
            district: (agent.assignedTerritory?.district || agent.territory?.district || agent.district || agent.assignedDistrict || '').trim(),
            division: (agent.assignedTerritory?.division || agent.territory?.division || agent.division || agent.assignedDivision || '').trim(),
            pincode: (agent.assignedTerritory?.pincode || agent.territory?.pincode || agent.pincode || agent.assignedPincode || '').trim(),
            agentId: agent._id.toString()
        };
        // Cache scope for 60 seconds
        await cache_service_1.cacheService.set(cacheKey, scope, 60);
        return scope;
    }
    catch (error) {
        console.error('Error fetching agent territory scope:', error);
        return null;
    }
}
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactRegex = (str) => new RegExp(`^\\s*${escapeRegex(str.trim())}\\s*$`, 'i');
const containsRegex = (str) => new RegExp(escapeRegex(str.trim()), 'i');
/**
 * Fetch authoritative pincodes assigned to a division from Admin Pincode Management DB
 */
async function getDivisionPincodes(divisionName) {
    if (!divisionName || !divisionName.trim())
        return [];
    const cleanDiv = divisionName.toLowerCase().replace(/division|manager/g, '').trim();
    const cacheKey = `divPins:${cleanDiv}`;
    try {
        const cached = await cache_service_1.cacheService.get(cacheKey);
        if (cached && Array.isArray(cached) && cached.length > 0)
            return cached;
    }
    catch (_) { }
    const db = mongoose_1.default.connection.db;
    if (!db)
        return [];
    try {
        const docs = await db.collection('pincodes').find({
            $or: [
                { division: new RegExp(cleanDiv, 'i') },
                { name: new RegExp(cleanDiv, 'i') }
            ]
        }, { projection: { code: 1, pincode: 1 } }).toArray();
        const codes = docs.map((d) => String(d.code || d.pincode).trim()).filter(Boolean);
        if (codes.length > 0) {
            try {
                await cache_service_1.cacheService.set(cacheKey, codes, 300);
            }
            catch (_) { }
        }
        return codes;
    }
    catch (err) {
        console.error('Error fetching division pincodes:', err);
        return [];
    }
}
/**
 * Build territory filter for Agent model and agent directory queries.
 * Strictly enforces State -> District -> Division -> Pincode visibility hierarchy.
 * Returns { _id: null } when required territory information is missing.
 */
function buildTerritoryFilter(scope, divisionPincodes) {
    // Empty or missing scope must NEVER fall back to showing all agents
    if (!scope)
        return { _id: null };
    const validRoles = ['state', 'district', 'division', 'pincode', 'agent', 'state_manager', 'district_agent', 'district_manager', 'division_agent', 'division_manager', 'pincode_agent'];
    if (scope.role === 'state') {
        if (!scope.state)
            return { _id: null };
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
    if (scope.role === 'district') {
        if (!scope.district)
            return { _id: null };
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
    if (scope.role === 'division') {
        if (!scope.division)
            return { _id: null };
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
        const divOrClauses = [
            { 'assignedTerritory.division': containsRegex(scope.division) },
            { 'territory.division': containsRegex(scope.division) },
            { division: containsRegex(scope.division) },
            { assignedDivision: containsRegex(scope.division) }
        ];
        if (Array.isArray(divisionPincodes) && divisionPincodes.length > 0) {
            divOrClauses.push({ 'assignedTerritory.pincode': { $in: divisionPincodes } }, { 'territory.pincode': { $in: divisionPincodes } }, { pincode: { $in: divisionPincodes } }, { assignedPincode: { $in: divisionPincodes } });
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
    if (scope.role === 'pincode') {
        if (!scope.pincode)
            return { _id: null };
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
function buildVendorScopeFilter(scope, divisionPincodes) {
    if (!scope)
        return { _id: null };
    if (scope.role === 'state') {
        if (!scope.state)
            return { _id: null };
        return {
            $or: [
                { state: exactRegex(scope.state) },
                { assignedState: exactRegex(scope.state) },
                { 'location.address': containsRegex(scope.state) }
            ]
        };
    }
    if (scope.role === 'district') {
        if (!scope.district)
            return { _id: null };
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
    if (scope.role === 'division') {
        if (!scope.division)
            return { _id: null };
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
        const divOrClauses = [
            { division: containsRegex(scope.division) },
            { assignedDivision: containsRegex(scope.division) }
        ];
        if (Array.isArray(divisionPincodes) && divisionPincodes.length > 0) {
            divOrClauses.push({ pincode: { $in: divisionPincodes } }, { assignedPincode: { $in: divisionPincodes } }, { 'location.pincode': { $in: divisionPincodes } });
        }
        return {
            $and: [
                { $or: divOrClauses },
                ...districtConditions,
                ...stateConditions
            ]
        };
    }
    if (scope.role === 'pincode') {
        if (scope.pincode) {
            return {
                $or: [
                    { pincode: scope.pincode },
                    { assignedPincode: scope.pincode },
                    { 'location.pincode': scope.pincode },
                    { assignedAgent: scope.agentId },
                    { agentId: scope.agentId },
                    { onboardedBy: scope.agentId }
                ]
            };
        }
        return {
            $or: [
                { assignedAgent: scope.agentId },
                { agentId: scope.agentId },
                { onboardedBy: scope.agentId }
            ]
        };
    }
    return { _id: null };
}
//# sourceMappingURL=territoryScope.js.map