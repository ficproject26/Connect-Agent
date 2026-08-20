"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgentTerritoryScope = getAgentTerritoryScope;
exports.buildTerritoryFilter = buildTerritoryFilter;
exports.buildVendorScopeFilter = buildVendorScopeFilter;
const Agent_1 = __importDefault(require("../models/Agent"));
async function getAgentTerritoryScope(agentId) {
    if (!agentId)
        return null;
    try {
        const agent = await Agent_1.default.findById(agentId);
        if (!agent)
            return null;
        return {
            role: agent.role,
            state: agent.territory?.state || '',
            district: agent.territory?.district || '',
            division: agent.territory?.division || '',
            pincode: agent.territory?.pincode || '',
            agentId: agent._id.toString()
        };
    }
    catch (error) {
        console.error('Error fetching agent territory scope:', error);
        return null;
    }
}
function buildTerritoryFilter(scope) {
    if (!scope)
        return {};
    const filter = {};
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (scope.role === 'state') {
        if (scope.state) {
            filter['territory.state'] = new RegExp(escapeRegex(scope.state), 'i');
        }
    }
    else if (scope.role === 'district') {
        filter.role = { $ne: 'state' };
        if (scope.district) {
            filter['territory.district'] = new RegExp(escapeRegex(scope.district), 'i');
        }
    }
    else if (scope.role === 'division') {
        filter.role = { $nin: ['state', 'district'] };
        if (scope.division) {
            filter['territory.division'] = new RegExp(escapeRegex(scope.division), 'i');
        }
    }
    else if (scope.role === 'pincode') {
        filter.role = 'pincode';
        if (scope.pincode) {
            filter['territory.pincode'] = scope.pincode;
        }
    }
    return filter;
}
function buildVendorScopeFilter(scope) {
    if (!scope)
        return {};
    const filter = {};
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (scope.role === 'state') {
        if (scope.state) {
            filter.$or = [
                { state: new RegExp(escapeRegex(scope.state), 'i') },
                { 'location.address': new RegExp(escapeRegex(scope.state), 'i') }
            ];
        }
    }
    else if (scope.role === 'district') {
        if (scope.district) {
            filter.$or = [
                { district: new RegExp(escapeRegex(scope.district), 'i') },
                { 'location.address': new RegExp(escapeRegex(scope.district), 'i') }
            ];
        }
    }
    else if (scope.role === 'division') {
        if (scope.division) {
            filter.$or = [
                { division: new RegExp(escapeRegex(scope.division), 'i') },
                { 'location.address': new RegExp(escapeRegex(scope.division), 'i') }
            ];
        }
    }
    else if (scope.role === 'pincode') {
        if (scope.pincode) {
            filter.$or = [
                { pincode: scope.pincode },
                { assignedAgent: scope.agentId }
            ];
        }
        else {
            filter.assignedAgent = scope.agentId;
        }
    }
    return filter;
}
//# sourceMappingURL=territoryScope.js.map