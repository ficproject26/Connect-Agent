"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategories = exports.getWeeklyLeaderboard = exports.getHierarchyTree = exports.rejectRegistration = exports.approveRegistration = exports.getRegistrationById = exports.getRegistrations = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Agent_1 = __importDefault(require("../models/Agent"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const Vendor_1 = __importDefault(require("../models/Vendor"));
const territoryScope_1 = require("../utils/territoryScope");
const cache_service_1 = require("../services/cache.service");
// GET /api/admin/registrations
const getRegistrations = async (req, res) => {
    try {
        const requesterId = req.agent?.agentId;
        const scope = await (0, territoryScope_1.getAgentTerritoryScope)(requesterId);
        const scopeFilter = (0, territoryScope_1.buildTerritoryFilter)(scope);
        const statusQuery = (req.query.status || '').toLowerCase();
        const filter = { ...scopeFilter };
        if (statusQuery && statusQuery !== 'all') {
            if (statusQuery === 'pending' || statusQuery === 'pending_approval') {
                filter.$or = [
                    { kycStatus: 'pending' },
                    { status: 'pending' },
                    { status: 'pending_approval' }
                ];
            }
            else {
                filter.kycStatus = statusQuery;
            }
        }
        let registrations = await Agent_1.default.find(filter)
            .select('_id name email phone role registrationId territory kycStatus status remarks rejectionReason createdAt updatedAt')
            .sort({ createdAt: -1 })
            .lean();
        // Also query 'users' collection in MongoDB for any agent registrations synced directly to users collection
        try {
            const db = mongoose_1.default.connection.db;
            if (db) {
                const userFilter = { role: { $in: ['agent', 'state', 'district', 'division', 'pincode'] } };
                if (statusQuery && statusQuery !== 'all') {
                    if (statusQuery === 'pending' || statusQuery === 'pending_approval') {
                        userFilter.$or = [
                            { status: 'pending' },
                            { kycStatus: 'pending' },
                            { status: 'pending_approval' }
                        ];
                    }
                    else {
                        userFilter.status = statusQuery;
                    }
                }
                const userDocs = await db.collection('users').find(userFilter).limit(50).maxTimeMS(4000).toArray();
                // Merge users docs if not already present in registrations list
                const existingEmails = new Set(registrations.map(r => r.email.toLowerCase()));
                for (const uDoc of userDocs) {
                    if (uDoc.email && !existingEmails.has(uDoc.email.toLowerCase())) {
                        const uRole = (uDoc.level || uDoc.role || 'pincode').toLowerCase();
                        const uState = (uDoc.territory?.state || uDoc.state || uDoc.assignedState || '').trim().toLowerCase();
                        const uDist = (uDoc.territory?.district || uDoc.district || uDoc.assignedDistrict || '').trim().toLowerCase();
                        const uDiv = (uDoc.territory?.division || uDoc.division || uDoc.assignedDivision || '').trim().toLowerCase();
                        const uPin = (uDoc.territory?.pincode || uDoc.pincode || uDoc.assignedPincode || '').trim();
                        if (scope?.role === 'state') {
                            if (scope.state && !uState.includes(scope.state.toLowerCase()))
                                continue;
                        }
                        else if (scope?.role === 'district') {
                            if (uRole === 'state')
                                continue;
                            if (scope.state && !uState.includes(scope.state.toLowerCase()))
                                continue;
                            if (scope.district && !uDist.includes(scope.district.toLowerCase()))
                                continue;
                        }
                        else if (scope?.role === 'division') {
                            if (uRole === 'state' || uRole === 'district')
                                continue;
                            if (scope.division && !uDiv.includes(scope.division.toLowerCase()))
                                continue;
                        }
                        else if (scope?.role === 'pincode') {
                            if (uRole !== 'pincode')
                                continue;
                            if (scope.pincode && uPin !== scope.pincode)
                                continue;
                        }
                        registrations.push({
                            _id: uDoc._id,
                            registrationId: uDoc.registrationId || `REG-${Date.now()}`,
                            name: uDoc.name || 'Agent Applicant',
                            email: uDoc.email,
                            phone: uDoc.phone || uDoc.mobile || '+91 98765 43210',
                            role: (uDoc.level || uDoc.role || 'pincode').toLowerCase(),
                            territory: uDoc.territory || {
                                state: uDoc.state || uDoc.assignedState || '',
                                district: uDoc.district || uDoc.assignedDistrict || '',
                                division: uDoc.division || uDoc.assignedDivision || '',
                                pincode: uDoc.pincode || uDoc.assignedPincode || ''
                            },
                            kycStatus: uDoc.kycStatus || uDoc.status || 'pending',
                            status: uDoc.status || 'pending',
                            createdAt: uDoc.createdAt || new Date(),
                            updatedAt: uDoc.updatedAt || new Date()
                        });
                        existingEmails.add(uDoc.email.toLowerCase());
                    }
                }
            }
        }
        catch (e) {
            console.error('Error fetching pending users from users collection:', e);
        }
        return res.status(200).json({ registrations });
    }
    catch (error) {
        console.error('Get registrations error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getRegistrations = getRegistrations;
// GET /api/admin/registrations/:id
const getRegistrationById = async (req, res) => {
    try {
        const { id } = req.params;
        let agent = await Agent_1.default.findById(id).select('-password');
        if (!agent) {
            // Check users collection
            try {
                const db = mongoose_1.default.connection.db;
                if (db) {
                    const userDoc = await db.collection('users').findOne({ _id: id });
                    if (userDoc) {
                        return res.status(200).json({ registration: userDoc });
                    }
                }
            }
            catch (e) { }
            return res.status(404).json({ message: 'Registration not found' });
        }
        return res.status(200).json({ registration: agent });
    }
    catch (error) {
        console.error('Get registration detail error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getRegistrationById = getRegistrationById;
// PATCH /api/admin/registrations/:id/approve
const approveRegistration = async (req, res) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;
        let agent = await Agent_1.default.findById(id);
        let agentEmail = agent?.email;
        if (agent) {
            const oldStatus = agent.kycStatus;
            agent.kycStatus = 'approved';
            agent.remarks = remarks || 'Approved by Admin';
            agent.updatedAt = new Date();
            await agent.save();
            const adminId = req.agent?.agentId || agent._id;
            await AuditLog_1.default.create({
                entityId: agent._id,
                entityType: 'Agent',
                action: 'approval_change',
                fieldName: 'kycStatus',
                oldValue: oldStatus,
                newValue: 'approved',
                changedBy: adminId
            });
        }
        // Sync approval to users collection in MongoDB
        try {
            const db = mongoose_1.default.connection.db;
            if (db) {
                const userQuery = agentEmail ? { email: agentEmail.toLowerCase() } : { _id: id };
                await db.collection('users').updateOne(userQuery, {
                    $set: {
                        status: 'approved',
                        kycStatus: 'approved',
                        isActive: true,
                        updatedAt: new Date()
                    }
                });
            }
        }
        catch (e) {
            console.error('Error syncing approval to users collection:', e);
        }
        // Invalidate hierarchy, dashboard, and territory caches
        await Promise.all([
            cache_service_1.cacheService.delByPrefix('hierarchy:'),
            cache_service_1.cacheService.delByPrefix('dashboard:'),
            (0, territoryScope_1.invalidateAgentTerritoryScope)(id)
        ]);
        return res.status(200).json({
            message: 'Agent registration application approved successfully.',
            registration: agent || { _id: id, status: 'approved', kycStatus: 'approved' }
        });
    }
    catch (error) {
        console.error('Approve registration error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.approveRegistration = approveRegistration;
// PATCH /api/admin/registrations/:id/reject
const rejectRegistration = async (req, res) => {
    try {
        const { id } = req.params;
        const { remarks, rejectionReason } = req.body;
        if (!rejectionReason) {
            return res.status(400).json({ message: 'Rejection reason is required' });
        }
        let agent = await Agent_1.default.findById(id);
        let agentEmail = agent?.email;
        if (agent) {
            const oldStatus = agent.kycStatus;
            agent.kycStatus = 'rejected';
            agent.rejectionReason = rejectionReason;
            agent.remarks = remarks || 'Rejected by Admin';
            agent.updatedAt = new Date();
            await agent.save();
            const adminId = req.agent?.agentId || agent._id;
            await AuditLog_1.default.create({
                entityId: agent._id,
                entityType: 'Agent',
                action: 'approval_change',
                fieldName: 'kycStatus',
                oldValue: oldStatus,
                newValue: 'rejected',
                changedBy: adminId
            });
        }
        // Sync rejection to users collection in MongoDB
        try {
            const db = mongoose_1.default.connection.db;
            if (db) {
                const userQuery = agentEmail ? { email: agentEmail.toLowerCase() } : { _id: id };
                await db.collection('users').updateOne(userQuery, {
                    $set: {
                        status: 'rejected',
                        kycStatus: 'rejected',
                        rejectionReason: rejectionReason,
                        isActive: false,
                        updatedAt: new Date()
                    }
                });
            }
        }
        catch (e) {
            console.error('Error syncing rejection to users collection:', e);
        }
        // Invalidate hierarchy, dashboard, and territory caches
        await Promise.all([
            cache_service_1.cacheService.delByPrefix('hierarchy:'),
            cache_service_1.cacheService.delByPrefix('dashboard:'),
            (0, territoryScope_1.invalidateAgentTerritoryScope)(id)
        ]);
        return res.status(200).json({
            message: 'Agent registration application rejected successfully.',
            registration: agent || { _id: id, status: 'rejected', kycStatus: 'rejected' }
        });
    }
    catch (error) {
        console.error('Reject registration error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.rejectRegistration = rejectRegistration;
// GET /api/admin/hierarchy
const getHierarchyTree = async (req, res) => {
    try {
        const requesterId = req.agent?.agentId;
        const statusFilter = req.query.status || 'all';
        const cacheKey = `hierarchy:${requesterId}:${statusFilter}`;
        // Return cached hierarchy if available
        const cachedTree = await cache_service_1.cacheService.get(cacheKey);
        if (cachedTree) {
            return res.status(200).json(cachedTree);
        }
        const scope = await (0, territoryScope_1.getAgentTerritoryScope)(requesterId);
        const scopeFilter = (0, territoryScope_1.buildTerritoryFilter)(scope);
        const vendorScopeFilter = (0, territoryScope_1.buildVendorScopeFilter)(scope);
        const filter = { ...scopeFilter };
        if (statusFilter && statusFilter !== 'all') {
            filter.kycStatus = statusFilter;
        }
        // Safely execute independent queries in parallel with field projections
        const [agents, allVendors] = await Promise.all([
            Agent_1.default.find(filter)
                .select('_id name email phone registrationId role kycStatus registrationFeePaid performanceScore territory createdAt')
                .sort({ createdAt: -1 })
                .lean(),
            Vendor_1.default.find(vendorScopeFilter)
                .select('_id assignedAgent pincode division district createdAt')
                .lean()
        ]);
        // Pre-index vendors by agent, pincode, division, district into O(1) Map lookups
        const vendorsByAgent = new Map();
        const vendorsByPincode = new Map();
        const vendorsByDivision = new Map();
        const vendorsByDistrict = new Map();
        for (const v of allVendors) {
            if (v.assignedAgent) {
                const idStr = String(v.assignedAgent);
                const list = vendorsByAgent.get(idStr) || [];
                list.push(v);
                vendorsByAgent.set(idStr, list);
            }
            if (v.pincode) {
                const pin = String(v.pincode).trim();
                const list = vendorsByPincode.get(pin) || [];
                list.push(v);
                vendorsByPincode.set(pin, list);
            }
            if (v.division) {
                const div = String(v.division).trim().toLowerCase();
                const list = vendorsByDivision.get(div) || [];
                list.push(v);
                vendorsByDivision.set(div, list);
            }
            if (v.district) {
                const dist = String(v.district).trim().toLowerCase();
                const list = vendorsByDistrict.get(dist) || [];
                list.push(v);
                vendorsByDistrict.set(dist, list);
            }
        }
        const todayStr = new Date().toISOString().slice(0, 10);
        const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        // Group agents into multi-tier hierarchy
        const stateAgents = agents.filter(a => a.role === 'state');
        const districtAgents = agents.filter(a => a.role === 'district');
        const divisionAgents = agents.filter(a => a.role === 'division');
        const pincodeAgents = agents.filter(a => a.role === 'pincode');
        // Helper function to build detailed metrics for an agent based on REAL vendor data
        const enrichAgentData = (agent) => {
            const perf = agent.performanceScore || 0;
            const feePaid = agent.registrationFeePaid ?? false;
            const kyc = agent.kycStatus || 'pending';
            const agentIdStr = String(agent._id);
            const agentDistrictLower = (agent.territory?.district || agent.district || '').trim().toLowerCase();
            const agentDivisionLower = (agent.territory?.division || agent.division || '').trim().toLowerCase();
            const agentPincode = (agent.territory?.pincode || agent.pincode || '').trim();
            // Look up vendors for this agent using pre-indexed lookup maps
            let candidateVendors = [];
            if (vendorsByAgent.has(agentIdStr)) {
                candidateVendors = candidateVendors.concat(vendorsByAgent.get(agentIdStr) || []);
            }
            if (agent.role === 'pincode' && agentPincode && vendorsByPincode.has(agentPincode)) {
                candidateVendors = candidateVendors.concat(vendorsByPincode.get(agentPincode) || []);
            }
            else if (agent.role === 'division' && agentDivisionLower && vendorsByDivision.has(agentDivisionLower)) {
                candidateVendors = candidateVendors.concat(vendorsByDivision.get(agentDivisionLower) || []);
            }
            else if (agent.role === 'district' && agentDistrictLower && vendorsByDistrict.has(agentDistrictLower)) {
                candidateVendors = candidateVendors.concat(vendorsByDistrict.get(agentDistrictLower) || []);
            }
            // Fast deduplication
            const assignedVendors = [];
            const seenIds = new Set();
            for (const v of candidateVendors) {
                const vId = String(v._id);
                if (!seenIds.has(vId)) {
                    seenIds.add(vId);
                    assignedVendors.push(v);
                }
            }
            const tieupsToday = assignedVendors.filter((v) => {
                const dStr = v.createdAt ? new Date(v.createdAt).toISOString().slice(0, 10) : '';
                return dStr === todayStr;
            }).length;
            const tieupsYesterday = assignedVendors.filter((v) => {
                const dStr = v.createdAt ? new Date(v.createdAt).toISOString().slice(0, 10) : '';
                return dStr === yesterdayStr;
            }).length;
            const totalTieups = assignedVendors.length;
            const earnings = (totalTieups * 1250) + (feePaid ? 5000 : 0);
            const plusPoints = [];
            const minusPoints = [];
            if (kyc === 'approved')
                plusPoints.push('KYC Verified');
            else
                minusPoints.push(`KYC ${kyc.toUpperCase()}`);
            if (feePaid)
                plusPoints.push('Registration Fee Paid');
            else
                minusPoints.push('Registration Fee Unpaid');
            if (totalTieups > 0)
                plusPoints.push(`Onboarded ${totalTieups} Merchant Vendors`);
            return {
                _id: agent._id,
                name: agent.name,
                email: agent.email,
                phone: agent.phone,
                registrationId: agent.registrationId || `AG-${String(agent._id).substring(0, 6)}`,
                role: agent.role,
                kycStatus: agent.kycStatus,
                registrationFeePaid: agent.registrationFeePaid,
                performanceScore: perf,
                earnings,
                tieupsToday,
                tieupsYesterday,
                totalTieups,
                territory: agent.territory || {},
                plusPoints,
                minusPoints,
                createdAt: agent.createdAt,
            };
        };
        const enrichedDistricts = districtAgents.map(dist => {
            const distTerritory = dist.territory?.district || dist.district;
            const distState = dist.territory?.state || dist.state;
            const enrichedDist = enrichAgentData(dist);
            // Find child division agents strictly under this district
            const matchingDivisions = divisionAgents
                .filter(div => {
                const divDist = div.territory?.district || div.district;
                const divState = div.territory?.state || div.state;
                if (distState && divState && distState.toLowerCase() !== divState.toLowerCase())
                    return false;
                return Boolean(divDist && distTerritory && divDist.toLowerCase() === distTerritory.toLowerCase());
            })
                .map(div => {
                const divTerritory = div.territory?.division || div.division;
                const divDist = div.territory?.district || div.district;
                const enrichedDiv = enrichAgentData(div);
                // Find child pincode agents strictly under this division
                const seenPincodes = new Set();
                const matchingPincodes = pincodeAgents
                    .filter(pin => {
                    const pinDiv = pin.territory?.division || pin.division;
                    const pinDist = pin.territory?.district || pin.district;
                    const pinCode = pin.territory?.pincode || pin.pincode;
                    if (pinCode && seenPincodes.has(pinCode)) {
                        return false;
                    }
                    if (divDist && pinDist && divDist.toLowerCase() !== pinDist.toLowerCase())
                        return false;
                    const isMatch = Boolean(pinDiv && divTerritory && pinDiv.toLowerCase() === divTerritory.toLowerCase());
                    if (isMatch && pinCode) {
                        seenPincodes.add(pinCode);
                    }
                    return isMatch;
                })
                    .map(pin => enrichAgentData(pin));
                // Team metrics for division
                const divTeamEarnings = matchingPincodes.reduce((acc, p) => acc + p.earnings, 0) + enrichedDiv.earnings;
                const divPendingKyc = matchingPincodes.filter(p => p.kycStatus === 'pending').length + (enrichedDiv.kycStatus === 'pending' ? 1 : 0);
                const divApprovedKyc = matchingPincodes.filter(p => p.kycStatus === 'approved').length + (enrichedDiv.kycStatus === 'approved' ? 1 : 0);
                return {
                    ...enrichedDiv,
                    pincodes: matchingPincodes,
                    teamSize: matchingPincodes.length,
                    teamEarnings: divTeamEarnings,
                    teamPendingKyc: divPendingKyc,
                    teamApprovedKyc: divApprovedKyc
                };
            });
            // Team metrics for district
            const totalPincodes = matchingDivisions.reduce((acc, d) => acc + d.teamSize, 0);
            const districtTeamEarnings = matchingDivisions.reduce((acc, d) => acc + d.teamEarnings, 0) + enrichedDist.earnings;
            const districtPendingKyc = matchingDivisions.reduce((acc, d) => acc + d.teamPendingKyc, 0) + (enrichedDist.kycStatus === 'pending' ? 1 : 0);
            const districtApprovedKyc = matchingDivisions.reduce((acc, d) => acc + d.teamApprovedKyc, 0) + (enrichedDist.kycStatus === 'approved' ? 1 : 0);
            return {
                ...enrichedDist,
                divisions: matchingDivisions,
                teamSize: matchingDivisions.length + totalPincodes,
                teamEarnings: districtTeamEarnings,
                teamPendingKyc: districtPendingKyc,
                teamApprovedKyc: districtApprovedKyc
            };
        });
        // Build division list for division-level scoping
        const enrichedDivisions = divisionAgents.map(div => {
            const divTerritory = div.territory?.division || div.division;
            const divDist = div.territory?.district || div.district;
            const enrichedDiv = enrichAgentData(div);
            const matchingPincodes = pincodeAgents
                .filter(pin => {
                const pinDiv = pin.territory?.division || pin.division;
                const pinDist = pin.territory?.district || pin.district;
                if (divDist && pinDist && divDist.toLowerCase() !== pinDist.toLowerCase())
                    return false;
                return Boolean(pinDiv && divTerritory && pinDiv.toLowerCase() === divTerritory.toLowerCase());
            })
                .map(pin => enrichAgentData(pin));
            return {
                ...enrichedDiv,
                pincodes: matchingPincodes,
                teamSize: matchingPincodes.length,
                teamEarnings: matchingPincodes.reduce((acc, p) => acc + p.earnings, 0) + enrichedDiv.earnings
            };
        });
        const enrichedPincodes = pincodeAgents.map(pin => enrichAgentData(pin));
        // Nest districts strictly under their matching state
        let finalDistricts = enrichedDistricts;
        let finalDivisions = enrichedDivisions;
        if (scope?.role === 'district' && districtAgents.length === 0) {
            const requesterAgent = await Agent_1.default.findById(requesterId).lean();
            if (requesterAgent) {
                const enrichedReq = enrichAgentData(requesterAgent);
                enrichedReq.divisions = enrichedDivisions;
                enrichedReq.teamSize = enrichedDivisions.reduce((acc, d) => acc + 1 + (d.teamSize || 0), 0);
                enrichedReq.teamEarnings = enrichedDivisions.reduce((acc, d) => acc + (d.teamEarnings || 0), 0) + enrichedReq.earnings;
                enrichedReq.teamPendingKyc = enrichedDivisions.reduce((acc, d) => acc + (d.teamPendingKyc || 0), 0) + (enrichedReq.kycStatus === 'pending' ? 1 : 0);
                enrichedReq.teamApprovedKyc = enrichedDivisions.reduce((acc, d) => acc + (d.teamApprovedKyc || 0), 0) + (enrichedReq.kycStatus === 'approved' ? 1 : 0);
                finalDistricts = [enrichedReq];
            }
        }
        else if (scope?.role === 'division' && divisionAgents.length === 0) {
            const requesterAgent = await Agent_1.default.findById(requesterId).lean();
            if (requesterAgent) {
                const enrichedReq = enrichAgentData(requesterAgent);
                enrichedReq.pincodes = enrichedPincodes;
                enrichedReq.teamSize = enrichedPincodes.length;
                enrichedReq.teamEarnings = enrichedPincodes.reduce((acc, p) => acc + p.earnings, 0) + enrichedReq.earnings;
                finalDivisions = [enrichedReq];
            }
        }
        let tree = [];
        if (stateAgents.length > 0) {
            tree = stateAgents.map(state => {
                const stateTerritory = state.territory?.state || state.state;
                const enrichedState = enrichAgentData(state);
                const stateDistricts = finalDistricts.filter(d => {
                    const dState = d.territory?.state || d.state;
                    return Boolean(dState && stateTerritory && dState.toLowerCase() === stateTerritory.toLowerCase());
                });
                return {
                    ...enrichedState,
                    districts: stateDistricts,
                    teamSize: stateDistricts.reduce((acc, d) => acc + 1 + (d.teamSize || 0), 0),
                    teamEarnings: stateDistricts.reduce((acc, d) => acc + (d.teamEarnings || 0), 0) + enrichedState.earnings,
                    teamPendingKyc: stateDistricts.reduce((acc, d) => acc + (d.teamPendingKyc || 0), 0) + (enrichedState.kycStatus === 'pending' ? 1 : 0)
                };
            });
        }
        else if (finalDistricts.length > 0) {
            tree = finalDistricts;
        }
        else {
            tree = finalDivisions;
        }
        const responseData = {
            tree,
            states: tree,
            districts: finalDistricts,
            divisions: finalDivisions,
            pincodes: enrichedPincodes,
            totalAgents: agents.length,
            metrics: {
                totalState: stateAgents.length,
                totalDistrict: districtAgents.length,
                totalDivision: divisionAgents.length,
                totalPincode: pincodeAgents.length,
                pendingKycCount: agents.filter(a => a.kycStatus === 'pending').length,
                approvedKycCount: agents.filter(a => a.kycStatus === 'approved').length,
                totalEarnings: (tree.length > 0 ? tree : enrichedDistricts).reduce((acc, d) => acc + (d.teamEarnings || d.earnings), 0)
            }
        };
        // Cache computed hierarchy for 60 seconds
        await cache_service_1.cacheService.set(cacheKey, responseData, 60);
        return res.status(200).json(responseData);
    }
    catch (error) {
        console.error('Get hierarchy tree error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getHierarchyTree = getHierarchyTree;
// GET /api/admin/leaderboard
const getWeeklyLeaderboard = async (req, res) => {
    try {
        const requesterId = req.agent?.agentId;
        const scope = await (0, territoryScope_1.getAgentTerritoryScope)(requesterId);
        const scopeFilter = (0, territoryScope_1.buildTerritoryFilter)(scope);
        const roleFilter = req.query.role;
        const timeframe = req.query.timeframe || 'this_week';
        const sortBy = req.query.sortBy || 'performanceScore';
        const filter = { ...scopeFilter };
        if (roleFilter && roleFilter !== 'all') {
            filter.role = roleFilter;
        }
        const agents = await Agent_1.default.find(filter)
            .select('_id name email phone registrationId role kycStatus registrationFeePaid performanceScore territory createdAt')
            .lean();
        // Enrich and compute leaderboard metrics
        let leaderboard = agents.map(agent => {
            const perf = agent.performanceScore || 85;
            const feePaid = agent.registrationFeePaid ?? true;
            const weeklyEarnings = Math.floor((perf * 380) + (feePaid ? 2500 : 0));
            const targetsCompleted = Math.floor(perf / 10);
            const targetsTotal = targetsCompleted + 2;
            return {
                _id: agent._id,
                name: agent.name,
                email: agent.email,
                phone: agent.phone,
                registrationId: agent.registrationId || `AG-${String(agent._id).substring(0, 6)}`,
                role: agent.role,
                kycStatus: agent.kycStatus,
                registrationFeePaid: feePaid,
                performanceScore: perf,
                weeklyEarnings,
                targetsCompleted,
                targetsTotal,
                territory: agent.territory || {},
                trend: perf >= 85 ? 'up' : perf >= 70 ? 'stable' : 'down',
                createdAt: agent.createdAt
            };
        });
        // Sort leaderboard based on sortBy
        leaderboard.sort((a, b) => {
            if (sortBy === 'weeklyEarnings')
                return b.weeklyEarnings - a.weeklyEarnings;
            if (sortBy === 'targetsCompleted')
                return b.targetsCompleted - a.targetsCompleted;
            return b.performanceScore - a.performanceScore;
        });
        // Attach rank
        leaderboard = leaderboard.map((item, index) => ({
            ...item,
            rank: index + 1
        }));
        return res.status(200).json({
            leaderboard,
            timeframe,
            totalAgents: leaderboard.length,
            topPerformers: leaderboard.slice(0, 3)
        });
    }
    catch (error) {
        console.error('Get weekly leaderboard error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getWeeklyLeaderboard = getWeeklyLeaderboard;
// GET /api/admin/categories or /api/categories
const getCategories = async (req, res) => {
    try {
        const cacheKey = 'categories:all';
        const cachedCategories = await cache_service_1.cacheService.get(cacheKey);
        if (cachedCategories) {
            return res.status(200).json({
                success: true,
                categories: cachedCategories
            });
        }
        const db = mongoose_1.default.connection.db;
        let categories = [];
        if (db) {
            categories = await db.collection('categories').find().sort({ sortOrder: 1, name: 1 }).toArray();
        }
        // If no categories exist in database, return canonical main categories from Admin Category Management
        if (!categories || categories.length === 0) {
            const canonicalMains = ['Services', 'Products', 'Daily Needs', 'Food', 'Stay', 'Travel', 'Jobs'];
            categories = canonicalMains.map((name, index) => ({
                _id: String(index + 1),
                name,
                level: 'main',
                isMainCategory: true,
                isActive: true,
                sortOrder: index + 1
            }));
        }
        // Cache categories for 5 minutes (300s)
        await cache_service_1.cacheService.set(cacheKey, categories, 300);
        return res.status(200).json({
            success: true,
            categories
        });
    }
    catch (error) {
        console.error('Get categories error:', error);
        const canonicalMains = ['Services', 'Products', 'Daily Needs', 'Food', 'Stay', 'Travel', 'Jobs'];
        const fallback = canonicalMains.map((name, index) => ({
            _id: String(index + 1),
            name,
            level: 'main',
            isMainCategory: true,
            isActive: true,
            sortOrder: index + 1
        }));
        return res.status(200).json({ success: true, categories: fallback });
    }
};
exports.getCategories = getCategories;
//# sourceMappingURL=admin.controller.js.map