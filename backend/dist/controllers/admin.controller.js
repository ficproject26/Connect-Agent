"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeeklyLeaderboard = exports.getHierarchyTree = exports.rejectRegistration = exports.approveRegistration = exports.getRegistrationById = exports.getRegistrations = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Agent_1 = __importDefault(require("../models/Agent"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const Vendor_1 = __importDefault(require("../models/Vendor"));
const territoryScope_1 = require("../utils/territoryScope");
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
        let registrations = await Agent_1.default.find(filter).select('-password').sort({ createdAt: -1 }).lean();
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
                const userDocs = await db.collection('users').find(userFilter).toArray();
                // Merge users docs if not already present in registrations list
                const existingEmails = new Set(registrations.map(r => r.email.toLowerCase()));
                for (const uDoc of userDocs) {
                    if (uDoc.email && !existingEmails.has(uDoc.email.toLowerCase())) {
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
        const scope = await (0, territoryScope_1.getAgentTerritoryScope)(requesterId);
        const scopeFilter = (0, territoryScope_1.buildTerritoryFilter)(scope);
        const vendorScopeFilter = (0, territoryScope_1.buildVendorScopeFilter)(scope);
        const statusFilter = req.query.status;
        const filter = { ...scopeFilter };
        if (statusFilter && statusFilter !== 'all') {
            filter.kycStatus = statusFilter;
        }
        const agents = await Agent_1.default.find(filter).select('-password').sort({ createdAt: -1 }).lean();
        const allVendors = await Vendor_1.default.find(vendorScopeFilter).select('_id assignedAgent pincode division district createdAt').lean();
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
            const agentDistrictLower = (agent.territory?.district || agent.district || '').toLowerCase();
            const agentDivisionLower = (agent.territory?.division || agent.division || '').toLowerCase();
            const agentPincode = agent.territory?.pincode || agent.pincode;
            // Filter real vendors belonging to this agent or territory
            const assignedVendors = allVendors.filter((v) => {
                if (v.assignedAgent && String(v.assignedAgent) === agentIdStr)
                    return true;
                if (agent.role === 'pincode' && agentPincode && v.pincode === agentPincode)
                    return true;
                if (agent.role === 'division' && agentDivisionLower && v.division && v.division.toLowerCase().includes(agentDivisionLower))
                    return true;
                if (agent.role === 'district' && agentDistrictLower && v.district && v.district.toLowerCase().includes(agentDistrictLower))
                    return true;
                return false;
            });
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
        let tree = [];
        if (stateAgents.length > 0) {
            tree = stateAgents.map(state => {
                const stateTerritory = state.territory?.state || state.state;
                const enrichedState = enrichAgentData(state);
                const stateDistricts = enrichedDistricts.filter(d => {
                    const dState = d.territory?.state || d.state;
                    return Boolean(dState && stateTerritory && dState.toLowerCase() === stateTerritory.toLowerCase());
                });
                return {
                    ...enrichedState,
                    districts: stateDistricts,
                    teamSize: stateDistricts.reduce((acc, d) => acc + 1 + d.teamSize, 0),
                    teamEarnings: stateDistricts.reduce((acc, d) => acc + d.teamEarnings, 0) + enrichedState.earnings,
                    teamPendingKyc: stateDistricts.reduce((acc, d) => acc + d.teamPendingKyc, 0) + (enrichedState.kycStatus === 'pending' ? 1 : 0)
                };
            });
        }
        else {
            tree = enrichedDistricts;
        }
        return res.status(200).json({
            tree,
            states: tree,
            districts: enrichedDistricts,
            divisions: enrichedDivisions,
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
        });
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
        const agents = await Agent_1.default.find(filter).select('-password').lean();
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
                trend: perf >= 85 ? 'up' : perf >= 70 ? 'stable' : 'down'
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
//# sourceMappingURL=admin.controller.js.map