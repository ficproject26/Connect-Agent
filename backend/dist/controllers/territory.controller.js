"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookupPincode = exports.getPincodes = exports.getDivisions = exports.getDistricts = exports.getStates = exports.getAllTerritoryHierarchy = exports.getTerritoryHierarchy = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const territoryScope_1 = require("../utils/territoryScope");
const isActive = (item) => !item.status || item.status.toLowerCase() === 'active';
/**
 * Builds the centralized territory hierarchy from MongoDB collections:
 * states -> districts -> divisions -> pincodes
 */
async function buildHierarchyTree(scope = null, forceAll = false) {
    const db = mongoose_1.default.connection.db;
    if (!db)
        throw new Error('Database connection unavailable');
    const [states, districts, divisions, pincodes] = await Promise.all([
        db.collection('states').find({}).toArray(),
        db.collection('districts').find({}).toArray(),
        db.collection('divisions').find({}).toArray(),
        db.collection('pincodes').find({}).toArray()
    ]);
    const activeStates = states.filter(isActive);
    const activeDistricts = districts.filter(isActive);
    const activeDivisions = divisions.filter(isActive);
    const activePincodes = pincodes.filter(isActive);
    let filteredStates = activeStates;
    if (!forceAll && scope?.role && scope.state) {
        filteredStates = filteredStates.filter(s => s.name.trim().toLowerCase() === scope.state.trim().toLowerCase());
    }
    const hierarchy = filteredStates.map(st => {
        const stIdStr = st._id.toString();
        let stDistricts = activeDistricts.filter(dt => (dt.stateId && dt.stateId.toString() === stIdStr) ||
            (dt.state && dt.state.trim().toLowerCase() === st.name.trim().toLowerCase()));
        if (!forceAll && scope?.district && (scope.role === 'district' || scope.role === 'division' || scope.role === 'pincode')) {
            stDistricts = stDistricts.filter(d => d.name.trim().toLowerCase() === scope.district.trim().toLowerCase());
        }
        return {
            id: stIdStr,
            stateId: st.stateId || stIdStr,
            name: st.name.trim(),
            code: st.code || st.name.slice(0, 3).toUpperCase(),
            status: st.status || 'Active',
            districts: stDistricts.map(dt => {
                const dtIdStr = dt._id.toString();
                let dtDivisions = activeDivisions.filter(dv => (dv.districtId && dv.districtId.toString() === dtIdStr) ||
                    (dv.district && dv.district.trim().toLowerCase() === dt.name.trim().toLowerCase()));
                if (!forceAll && scope?.division && (scope.role === 'division' || scope.role === 'pincode')) {
                    dtDivisions = dtDivisions.filter(v => v.name.trim().toLowerCase() === scope.division.trim().toLowerCase());
                }
                return {
                    id: dtIdStr,
                    districtId: dt.districtId || dtIdStr,
                    name: dt.name.trim(),
                    code: dt.code || dt.name.slice(0, 3).toUpperCase(),
                    status: dt.status || 'Active',
                    divisions: dtDivisions.map(dv => {
                        const dvIdStr = dv._id.toString();
                        let dvPincodes = activePincodes.filter(pc => (pc.divisionId && pc.divisionId.toString() === dvIdStr) ||
                            (pc.division && pc.division.trim().toLowerCase() === dv.name.trim().toLowerCase()) ||
                            (pc.district && pc.district.trim().toLowerCase() === dt.name.trim().toLowerCase() && !pc.divisionId));
                        if (!forceAll && scope?.pincode && scope.role === 'pincode') {
                            dvPincodes = dvPincodes.filter(p => p.code.trim() === scope.pincode.trim());
                        }
                        const talukName = dv.talukInfo || dv.taluk || '';
                        return {
                            id: dvIdStr,
                            divisionId: dv.divisionId || dvIdStr,
                            name: dv.name.trim(),
                            code: dv.code || dv.name.slice(0, 3).toUpperCase(),
                            taluk: talukName,
                            talukInfo: talukName,
                            status: dv.status || 'Active',
                            pincodes: dvPincodes.map(pc => ({
                                id: pc._id.toString(),
                                pincodeId: pc.pincodeId || pc._id.toString(),
                                code: String(pc.code).trim(),
                                name: pc.name || pc.area || pc.postOffice || ('PIN ' + pc.code),
                                postOffice: pc.postOffice || pc.name || '',
                                taluk: pc.taluk || talukName,
                                area: pc.area || pc.name || '',
                                status: pc.status || 'Active',
                                activeAgentId: pc.activeAgentId
                            }))
                        };
                    })
                };
            })
        };
    });
    return hierarchy;
}
/**
 * GET /api/territory/hierarchy
 * Returns centralized territory database hierarchy from Admin Pincode Management:
 * State -> District -> Division -> Taluk & Pincode
 * Role-aware: Filters down to authorized territory if caller is authenticated agent.
 * If query param ?all=true is present, returns full un-scoped hierarchy.
 */
const getTerritoryHierarchy = async (req, res) => {
    try {
        const forceAll = req.query.all === 'true';
        const agentId = req.agent?.agentId;
        let scope = null;
        if (agentId && !forceAll) {
            scope = await (0, territoryScope_1.getAgentTerritoryScope)(agentId);
        }
        const hierarchy = await buildHierarchyTree(scope, forceAll);
        return res.status(200).json({ hierarchy, role: scope?.role || 'all', scope });
    }
    catch (error) {
        console.error('Get territory hierarchy error:', error);
        return res.status(500).json({ message: 'Internal server error while fetching territory hierarchy' });
    }
};
exports.getTerritoryHierarchy = getTerritoryHierarchy;
/**
 * GET /api/territory/all-hierarchy
 * Returns full active territory hierarchy from Admin Pincode Management (for registration)
 */
const getAllTerritoryHierarchy = async (_req, res) => {
    try {
        const hierarchy = await buildHierarchyTree(null, true);
        return res.status(200).json({ hierarchy });
    }
    catch (error) {
        console.error('Get all territory hierarchy error:', error);
        return res.status(500).json({ message: 'Internal server error while fetching all territory hierarchy' });
    }
};
exports.getAllTerritoryHierarchy = getAllTerritoryHierarchy;
/**
 * GET /api/territory/states
 * Returns all active states from central territory database
 */
const getStates = async (_req, res) => {
    try {
        const db = mongoose_1.default.connection.db;
        if (!db)
            return res.status(500).json({ message: 'Database connection unavailable' });
        const states = await db.collection('states').find({
            $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }]
        }).sort({ name: 1 }).toArray();
        return res.status(200).json({ states });
    }
    catch (error) {
        console.error('Get states error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getStates = getStates;
/**
 * GET /api/territory/districts
 * Query params: stateId, state
 */
const getDistricts = async (req, res) => {
    try {
        const db = mongoose_1.default.connection.db;
        if (!db)
            return res.status(500).json({ message: 'Database connection unavailable' });
        const { stateId, state } = req.query;
        const filter = {
            $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }]
        };
        if (stateId) {
            try {
                filter.$and = [{ $or: [{ stateId: new mongoose_1.default.Types.ObjectId(stateId) }, { stateId: stateId }] }];
            }
            catch {
                filter.stateId = stateId;
            }
        }
        else if (state) {
            filter.state = { $regex: new RegExp(`^${state.trim()}$`, 'i') };
        }
        const districts = await db.collection('districts').find(filter).sort({ name: 1 }).toArray();
        return res.status(200).json({ districts });
    }
    catch (error) {
        console.error('Get districts error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getDistricts = getDistricts;
/**
 * GET /api/territory/divisions
 * Query params: districtId, district, state
 */
const getDivisions = async (req, res) => {
    try {
        const db = mongoose_1.default.connection.db;
        if (!db)
            return res.status(500).json({ message: 'Database connection unavailable' });
        const { districtId, district, state } = req.query;
        const filter = {
            $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }]
        };
        if (districtId) {
            try {
                filter.$and = [{ $or: [{ districtId: new mongoose_1.default.Types.ObjectId(districtId) }, { districtId: districtId }] }];
            }
            catch {
                filter.districtId = districtId;
            }
        }
        else if (district) {
            filter.district = { $regex: new RegExp(`^${district.trim()}$`, 'i') };
        }
        if (state) {
            filter.state = { $regex: new RegExp(`^${state.trim()}$`, 'i') };
        }
        const divisions = await db.collection('divisions').find(filter).sort({ name: 1 }).toArray();
        return res.status(200).json({ divisions });
    }
    catch (error) {
        console.error('Get divisions error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getDivisions = getDivisions;
/**
 * GET /api/territory/pincodes
 * Query params: divisionId, division, district, state
 */
const getPincodes = async (req, res) => {
    try {
        const db = mongoose_1.default.connection.db;
        if (!db)
            return res.status(500).json({ message: 'Database connection unavailable' });
        const { divisionId, division, district, state } = req.query;
        const filter = {
            $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }]
        };
        if (divisionId) {
            try {
                filter.$and = [{ $or: [{ divisionId: new mongoose_1.default.Types.ObjectId(divisionId) }, { divisionId: divisionId }] }];
            }
            catch {
                filter.divisionId = divisionId;
            }
        }
        else if (division) {
            filter.division = { $regex: new RegExp(`^${division.trim()}$`, 'i') };
        }
        if (district) {
            filter.district = { $regex: new RegExp(`^${district.trim()}$`, 'i') };
        }
        if (state) {
            filter.state = { $regex: new RegExp(`^${state.trim()}$`, 'i') };
        }
        const pincodes = await db.collection('pincodes').find(filter).sort({ code: 1 }).toArray();
        return res.status(200).json({ pincodes });
    }
    catch (error) {
        console.error('Get pincodes error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getPincodes = getPincodes;
/**
 * GET /api/territory/lookup/:pincode
 * Lookup a 6-digit PIN code in central territory database
 */
const lookupPincode = async (req, res) => {
    try {
        const db = mongoose_1.default.connection.db;
        if (!db)
            return res.status(500).json({ message: 'Database connection unavailable' });
        const { pincode } = req.params;
        const cleanPin = (pincode || '').replace(/\D/g, '').slice(0, 6);
        const pinDoc = await db.collection('pincodes').findOne({
            code: cleanPin,
            $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }]
        });
        if (!pinDoc) {
            return res.status(404).json({ message: `Pincode ${cleanPin} not found in central territory database` });
        }
        // Also fetch division taluk if available
        let taluk = pinDoc.taluk || '';
        if (!taluk && pinDoc.divisionId) {
            try {
                const divDoc = await db.collection('divisions').findOne({
                    $or: [
                        { _id: pinDoc.divisionId },
                        { divisionId: pinDoc.divisionId }
                    ]
                });
                if (divDoc) {
                    taluk = divDoc.talukInfo || divDoc.taluk || '';
                }
            }
            catch {
                // Continue
            }
        }
        return res.status(200).json({
            pincode: pinDoc.code,
            pincodeId: pinDoc.pincodeId || pinDoc._id,
            name: pinDoc.name || pinDoc.area || pinDoc.postOffice || ('PIN ' + pinDoc.code),
            postOffice: pinDoc.postOffice || pinDoc.name || '',
            taluk: taluk,
            area: pinDoc.area || pinDoc.name || '',
            division: pinDoc.division || '',
            divisionId: pinDoc.divisionId || '',
            district: pinDoc.district || '',
            districtId: pinDoc.districtId || '',
            state: pinDoc.state || '',
            stateId: pinDoc.stateId || ''
        });
    }
    catch (error) {
        console.error('Lookup pincode error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.lookupPincode = lookupPincode;
//# sourceMappingURL=territory.controller.js.map