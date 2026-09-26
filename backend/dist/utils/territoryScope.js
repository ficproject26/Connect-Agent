"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateAgentTerritoryScope = invalidateAgentTerritoryScope;
exports.getAgentTerritoryScope = getAgentTerritoryScope;
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
async function getAgentTerritoryScope(agentId) {
    if (!agentId)
        return null;
    const cacheKey = `scope:${agentId}`;
    try {
        const cachedScope = await cache_service_1.cacheService.get(cacheKey);
        if (cachedScope) {
            return cachedScope;
        }
        let agent = await Agent_1.default.findById(agentId)
            .select('role level assignedTerritory territory state district division pincode assignedState assignedDistrict assignedDivision assignedPincode')
            .lean();
        if (!agent) {
            const db = mongoose_1.default.connection.db;
            if (db) {
                agent = await db.collection('users').findOne({ _id: agentId }, {
                    projection: {
                        role: 1,
                        level: 1,
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
 * Build territory filter for Agent model and agent directory queries.
 * Strictly enforces State -> District -> Division -> Pincode visibility hierarchy.
 * Returns { _id: null } when required territory information is missing.
 */
function buildTerritoryFilter(scope) {
    // Empty or missing scope must NEVER fall back to showing all agents
    if (!scope)
        return { _id: null };
    if (scope.role === 'state') {
        if (!scope.state)
            return { _id: null };
        return {
            role: { $in: ['state', 'district', 'division', 'pincode'] },
            $or: [
                { 'assignedTerritory.state': exactRegex(scope.state) },
                { 'territory.state': exactRegex(scope.state) },
                { state: exactRegex(scope.state) },
                { assignedState: exactRegex(scope.state) }
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
        return {
            role: { $in: ['district', 'division', 'pincode'] },
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
        return {
            role: { $in: ['division', 'pincode'] },
            $and: [
                {
                    $or: [
                        { 'assignedTerritory.division': containsRegex(scope.division) },
                        { 'territory.division': containsRegex(scope.division) },
                        { division: containsRegex(scope.division) },
                        { assignedDivision: containsRegex(scope.division) }
                    ]
                },
                ...districtConditions,
                ...stateConditions
            ]
        };
    }
    if (scope.role === 'pincode') {
        if (!scope.pincode)
            return { _id: null };
        return {
            role: 'pincode',
            $or: [
                { _id: scope.agentId },
                { 'assignedTerritory.pincode': scope.pincode },
                { 'territory.pincode': scope.pincode },
                { pincode: scope.pincode },
                { assignedPincode: scope.pincode }
            ]
        };
    }
    return { _id: null };
}
/**
 * Build territory filter for Vendor queries.
 * Strictly enforces State -> District -> Division -> Pincode vendor isolation.
 */
function buildVendorScopeFilter(scope) {
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
                    { assignedDistrict: exactRegex(scope.district) },
                    { 'location.address': containsRegex(scope.district) }
                ]
            }
        ] : [];
        return {
            $and: [
                {
                    $or: [
                        { division: containsRegex(scope.division) },
                        { assignedDivision: containsRegex(scope.division) },
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
                    { assignedPincode: scope.pincode },
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