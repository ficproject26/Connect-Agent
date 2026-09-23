"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgentTerritoryScope = getAgentTerritoryScope;
exports.buildTerritoryFilter = buildTerritoryFilter;
exports.buildVendorScopeFilter = buildVendorScopeFilter;
const mongoose_1 = __importDefault(require("mongoose"));
const Agent_1 = __importDefault(require("../models/Agent"));
/**
 * Fetch territory scope of the authenticated agent.
 * Checks both Agent model and fallback users collection.
 */
async function getAgentTerritoryScope(agentId) {
    if (!agentId)
        return null;
    try {
        let agent = await Agent_1.default.findById(agentId);
        if (!agent) {
            const db = mongoose_1.default.connection.db;
            if (db) {
                agent = await db.collection('users').findOne({ _id: agentId });
            }
        }
        if (!agent)
            return null;
        const rawRole = (agent.role || agent.level || 'pincode').toLowerCase();
        const normalizedRole = rawRole === 'agent' ? (agent.level || 'pincode').toLowerCase() : rawRole;
        return {
            role: normalizedRole,
            state: (agent.territory?.state || agent.state || agent.assignedState || '').trim(),
            district: (agent.territory?.district || agent.district || agent.assignedDistrict || '').trim(),
            division: (agent.territory?.division || agent.division || agent.assignedDivision || '').trim(),
            pincode: (agent.territory?.pincode || agent.pincode || agent.assignedPincode || '').trim(),
            agentId: agent._id.toString()
        };
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
            role: { $in: ['district', 'division', 'pincode'] },
            $or: [
                { 'territory.state': exactRegex(scope.state) },
                { state: exactRegex(scope.state) }
            ]
        };
    }
    if (scope.role === 'district') {
        if (!scope.district)
            return { _id: null };
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
        if (!scope.division)
            return { _id: null };
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
        if (!scope.pincode)
            return { _id: null };
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
function buildVendorScopeFilter(scope) {
    if (!scope)
        return { _id: null };
    if (scope.role === 'state') {
        if (!scope.state)
            return { _id: null };
        return {
            $or: [
                { state: exactRegex(scope.state) },
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
        if (!scope.division)
            return { _id: null };
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
//# sourceMappingURL=territoryScope.js.map