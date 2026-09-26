"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookupPincode = exports.getDistricts = exports.getStates = exports.getTerritoryHierarchy = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const territoryScope_1 = require("../utils/territoryScope");
/**
 * GET /api/territory/hierarchy
 * Returns centralized territory database hierarchy from Admin Pincode Management:
 * State -> District -> Division -> Taluk & Pincode
 * Role-aware: Filters down to authorized territory if caller is authenticated agent
 */
const getTerritoryHierarchy = async (req, res) => {
    try {
        const db = mongoose_1.default.connection.db;
        if (!db) {
            return res.status(500).json({ message: 'Database connection unavailable' });
        }
        // Check optional authenticated agent scope
        const agentId = req.agent?.agentId;
        let scope = null;
        if (agentId) {
            scope = await (0, territoryScope_1.getAgentTerritoryScope)(agentId);
        }
        const [states, districts, divisions, pincodes] = await Promise.all([
            db.collection('states').find({}).toArray(),
            db.collection('districts').find({}).toArray(),
            db.collection('divisions').find({}).toArray(),
            db.collection('pincodes').find({}).toArray()
        ]);
        // Filter active items (or accept all if status field not set)
        const isActive = (item) => !item.status || item.status.toLowerCase() === 'active';
        const activeStates = states.filter(isActive);
        const activeDistricts = districts.filter(isActive);
        const activeDivisions = divisions.filter(isActive);
        const activePincodes = pincodes.filter(isActive);
        let filteredStates = activeStates;
        if (scope?.role === 'state' && scope.state) {
            filteredStates = filteredStates.filter(s => s.name.toLowerCase() === scope.state.toLowerCase());
        }
        const hierarchy = filteredStates.map(st => {
            const stIdStr = st._id.toString();
            let stDistricts = activeDistricts.filter(dt => (dt.stateId && dt.stateId.toString() === stIdStr) ||
                (dt.state && dt.state.toLowerCase() === st.name.toLowerCase()));
            if (scope?.role === 'district' && scope.district) {
                stDistricts = stDistricts.filter(d => d.name.toLowerCase() === scope.district.toLowerCase());
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
                        (dv.district && dv.district.toLowerCase() === dt.name.toLowerCase()));
                    if (scope?.role === 'division' && scope.division) {
                        dtDivisions = dtDivisions.filter(v => v.name.toLowerCase() === scope.division.toLowerCase());
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
                                (pc.division && pc.division.toLowerCase() === dv.name.toLowerCase()) ||
                                (pc.district && pc.district.toLowerCase() === dt.name.toLowerCase() && !pc.divisionId));
                            if (scope?.role === 'pincode' && scope.pincode) {
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
                                    status: pc.status || 'Active'
                                }))
                            };
                        })
                    };
                })
            };
        });
        return res.status(200).json({ hierarchy });
    }
    catch (error) {
        console.error('Get territory hierarchy error:', error);
        return res.status(500).json({ message: 'Internal server error while fetching territory hierarchy' });
    }
};
exports.getTerritoryHierarchy = getTerritoryHierarchy;
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
        return res.status(200).json({
            pincode: pinDoc.code,
            pincodeId: pinDoc.pincodeId || pinDoc._id,
            name: pinDoc.name || pinDoc.area || pinDoc.postOffice,
            postOffice: pinDoc.postOffice || '',
            taluk: pinDoc.taluk || '',
            area: pinDoc.area || '',
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