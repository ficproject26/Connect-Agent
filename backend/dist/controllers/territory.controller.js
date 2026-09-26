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
        const stCustomId = st.stateId || stIdStr;
        const stNameLower = st.name.trim().toLowerCase();
        let stDistricts = activeDistricts.filter(dt => {
            const dtStateIdStr = dt.stateId ? dt.stateId.toString() : '';
            return (dtStateIdStr === stIdStr ||
                dtStateIdStr === stCustomId ||
                (dt.state && dt.state.trim().toLowerCase() === stNameLower));
        });
        if (!forceAll && scope?.district && (scope.role === 'district' || scope.role === 'division' || scope.role === 'pincode')) {
            stDistricts = stDistricts.filter(d => d.name.trim().toLowerCase() === scope.district.trim().toLowerCase());
        }
        return {
            id: stIdStr,
            stateId: stCustomId,
            name: st.name.trim(),
            code: st.code || st.name.slice(0, 3).toUpperCase(),
            status: st.status || 'Active',
            districts: stDistricts.map(dt => {
                const dtIdStr = dt._id.toString();
                const dtCustomId = dt.districtId || dtIdStr;
                const dtNameLower = dt.name.trim().toLowerCase();
                let dtDivisions = activeDivisions.filter(dv => {
                    const dvDistIdStr = dv.districtId ? dv.districtId.toString() : '';
                    return (dvDistIdStr === dtIdStr ||
                        dvDistIdStr === dtCustomId ||
                        (dv.district && dv.district.trim().toLowerCase() === dtNameLower));
                });
                if (!forceAll && scope?.division && (scope.role === 'division' || scope.role === 'pincode')) {
                    dtDivisions = dtDivisions.filter(v => v.name.trim().toLowerCase() === scope.division.trim().toLowerCase());
                }
                return {
                    id: dtIdStr,
                    districtId: dtCustomId,
                    stateId: stCustomId,
                    name: dt.name.trim(),
                    code: dt.code || dt.name.slice(0, 3).toUpperCase(),
                    status: dt.status || 'Active',
                    divisions: dtDivisions.map(dv => {
                        const dvIdStr = dv._id.toString();
                        const dvCustomId = dv.divisionId || dvIdStr;
                        const dvNameLower = dv.name.trim().toLowerCase();
                        let dvPincodes = activePincodes.filter(pc => {
                            const pcDivIdStr = pc.divisionId ? pc.divisionId.toString() : '';
                            const pcDistIdStr = pc.districtId ? pc.districtId.toString() : '';
                            return (pcDivIdStr === dvIdStr ||
                                pcDivIdStr === dvCustomId ||
                                (pc.division && pc.division.trim().toLowerCase() === dvNameLower) ||
                                (pcDistIdStr === dtIdStr && !pc.divisionId) ||
                                (pc.district && pc.district.trim().toLowerCase() === dtNameLower && !pc.divisionId));
                        });
                        if (!forceAll && scope?.pincode && scope.role === 'pincode') {
                            dvPincodes = dvPincodes.filter(p => p.code.trim() === scope.pincode.trim());
                        }
                        const talukName = dv.talukInfo || dv.taluk || '';
                        return {
                            id: dvIdStr,
                            divisionId: dvCustomId,
                            districtId: dtCustomId,
                            stateId: stCustomId,
                            name: dv.name.trim(),
                            code: dv.code || dv.name.slice(0, 3).toUpperCase(),
                            taluk: talukName,
                            talukInfo: talukName,
                            status: dv.status || 'Active',
                            pincodes: dvPincodes.map(pc => ({
                                id: pc._id.toString(),
                                pincodeId: pc.pincodeId || pc._id.toString(),
                                divisionId: dvCustomId,
                                districtId: dtCustomId,
                                stateId: stCustomId,
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
        return res.status(200).json({ success: true, hierarchy, role: scope?.role || 'all', scope });
    }
    catch (error) {
        console.error('Get territory hierarchy error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while fetching territory hierarchy' });
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
        return res.status(200).json({ success: true, hierarchy });
    }
    catch (error) {
        console.error('Get all territory hierarchy error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while fetching all territory hierarchy' });
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
            return res.status(500).json({ success: false, message: 'Database connection unavailable' });
        const rawStates = await db.collection('states').find({
            $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }]
        }).sort({ name: 1 }).toArray();
        const states = rawStates.map(st => ({
            _id: st._id,
            id: st._id.toString(),
            stateId: st.stateId || st._id.toString(),
            name: st.name.trim(),
            code: st.code || st.name.slice(0, 3).toUpperCase(),
            status: st.status || 'Active'
        }));
        return res.status(200).json({ success: true, states });
    }
    catch (error) {
        console.error('Get states error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
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
            return res.status(500).json({ success: false, message: 'Database connection unavailable' });
        const { stateId, state } = req.query;
        const filter = {
            $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }]
        };
        if (stateId || state) {
            const stateQueries = [];
            if (stateId) {
                if (mongoose_1.default.Types.ObjectId.isValid(stateId)) {
                    stateQueries.push({ _id: new mongoose_1.default.Types.ObjectId(stateId) });
                }
                stateQueries.push({ stateId: stateId });
                stateQueries.push({ name: stateId });
            }
            if (state) {
                stateQueries.push({ name: { $regex: new RegExp(`^${state.trim()}$`, 'i') } });
                stateQueries.push({ stateId: state });
            }
            const stateDoc = await db.collection('states').findOne({ $or: stateQueries });
            if (stateDoc) {
                const stateMatches = [
                    { stateId: stateDoc._id },
                    { stateId: stateDoc._id.toString() },
                    { state: stateDoc.name }
                ];
                if (stateDoc.stateId) {
                    stateMatches.push({ stateId: stateDoc.stateId });
                }
                filter.$and = [{ $or: stateMatches }];
            }
            else if (stateId) {
                const idMatches = [{ stateId: stateId }];
                if (mongoose_1.default.Types.ObjectId.isValid(stateId)) {
                    idMatches.push({ stateId: new mongoose_1.default.Types.ObjectId(stateId) });
                }
                filter.$and = [{ $or: idMatches }];
            }
        }
        const rawDistricts = await db.collection('districts').find(filter).sort({ name: 1 }).toArray();
        const districts = rawDistricts.map(dt => ({
            _id: dt._id,
            id: dt._id.toString(),
            districtId: dt.districtId || dt._id.toString(),
            stateId: dt.stateId ? dt.stateId.toString() : '',
            name: dt.name.trim(),
            code: dt.code || dt.name.slice(0, 3).toUpperCase(),
            status: dt.status || 'Active'
        }));
        return res.status(200).json({ success: true, districts });
    }
    catch (error) {
        console.error('Get districts error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getDistricts = getDistricts;
/**
 * GET /api/territory/divisions
 * Query params: districtId, district, stateId, state
 */
const getDivisions = async (req, res) => {
    try {
        const db = mongoose_1.default.connection.db;
        if (!db)
            return res.status(500).json({ success: false, message: 'Database connection unavailable' });
        const { districtId, district, stateId, state } = req.query;
        const filter = {
            $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }]
        };
        if (districtId || district) {
            const districtQueries = [];
            if (districtId) {
                if (mongoose_1.default.Types.ObjectId.isValid(districtId)) {
                    districtQueries.push({ _id: new mongoose_1.default.Types.ObjectId(districtId) });
                }
                districtQueries.push({ districtId: districtId });
                districtQueries.push({ name: districtId });
            }
            if (district) {
                districtQueries.push({ name: { $regex: new RegExp(`^${district.trim()}$`, 'i') } });
                districtQueries.push({ districtId: district });
            }
            const distDoc = await db.collection('districts').findOne({ $or: districtQueries });
            if (distDoc) {
                const distMatches = [
                    { districtId: distDoc._id },
                    { districtId: distDoc._id.toString() },
                    { district: distDoc.name }
                ];
                if (distDoc.districtId) {
                    distMatches.push({ districtId: distDoc.districtId });
                }
                filter.$and = [{ $or: distMatches }];
            }
            else if (districtId) {
                const idMatches = [{ districtId: districtId }];
                if (mongoose_1.default.Types.ObjectId.isValid(districtId)) {
                    idMatches.push({ districtId: new mongoose_1.default.Types.ObjectId(districtId) });
                }
                filter.$and = [{ $or: idMatches }];
            }
        }
        else if (stateId || state) {
            // Find all districts of this state
            const stateQueries = [];
            if (stateId) {
                if (mongoose_1.default.Types.ObjectId.isValid(stateId))
                    stateQueries.push({ _id: new mongoose_1.default.Types.ObjectId(stateId) });
                stateQueries.push({ stateId: stateId });
            }
            if (state)
                stateQueries.push({ name: { $regex: new RegExp(`^${state.trim()}$`, 'i') } });
            const stateDoc = await db.collection('states').findOne({ $or: stateQueries });
            if (stateDoc) {
                const stateDists = await db.collection('districts').find({
                    $or: [
                        { stateId: stateDoc._id },
                        { stateId: stateDoc._id.toString() },
                        { stateId: stateDoc.stateId },
                        { state: stateDoc.name }
                    ]
                }).toArray();
                const distIds = stateDists.map(d => d._id);
                const distIdStrs = stateDists.map(d => d._id.toString());
                const distNames = stateDists.map(d => d.name);
                filter.$and = [{
                        $or: [
                            { districtId: { $in: distIds } },
                            { districtId: { $in: distIdStrs } },
                            { district: { $in: distNames } },
                            { stateId: stateDoc._id },
                            { stateId: stateDoc._id.toString() }
                        ]
                    }];
            }
        }
        const rawDivisions = await db.collection('divisions').find(filter).sort({ name: 1 }).toArray();
        const divisions = rawDivisions.map(dv => ({
            _id: dv._id,
            id: dv._id.toString(),
            divisionId: dv.divisionId || dv._id.toString(),
            districtId: dv.districtId ? dv.districtId.toString() : '',
            stateId: dv.stateId ? dv.stateId.toString() : '',
            name: dv.name.trim(),
            code: dv.code || dv.name.slice(0, 3).toUpperCase(),
            taluk: dv.talukInfo || dv.taluk || '',
            talukInfo: dv.talukInfo || dv.taluk || '',
            status: dv.status || 'Active'
        }));
        return res.status(200).json({ success: true, divisions });
    }
    catch (error) {
        console.error('Get divisions error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getDivisions = getDivisions;
/**
 * GET /api/territory/pincodes
 * Query params: divisionId, division, districtId, district, stateId, state
 */
const getPincodes = async (req, res) => {
    try {
        const db = mongoose_1.default.connection.db;
        if (!db)
            return res.status(500).json({ success: false, message: 'Database connection unavailable' });
        const { divisionId, division, districtId, district, stateId, state } = req.query;
        const filter = {
            $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }]
        };
        if (divisionId || division) {
            const divisionQueries = [];
            if (divisionId) {
                if (mongoose_1.default.Types.ObjectId.isValid(divisionId)) {
                    divisionQueries.push({ _id: new mongoose_1.default.Types.ObjectId(divisionId) });
                }
                divisionQueries.push({ divisionId: divisionId });
                divisionQueries.push({ name: divisionId });
            }
            if (division) {
                divisionQueries.push({ name: { $regex: new RegExp(`^${division.trim()}$`, 'i') } });
                divisionQueries.push({ divisionId: division });
            }
            const divDoc = await db.collection('divisions').findOne({ $or: divisionQueries });
            if (divDoc) {
                const divMatches = [
                    { divisionId: divDoc._id },
                    { divisionId: divDoc._id.toString() },
                    { division: divDoc.name }
                ];
                if (divDoc.divisionId) {
                    divMatches.push({ divisionId: divDoc.divisionId });
                }
                filter.$and = [{ $or: divMatches }];
            }
            else if (divisionId) {
                const idMatches = [{ divisionId: divisionId }];
                if (mongoose_1.default.Types.ObjectId.isValid(divisionId)) {
                    idMatches.push({ divisionId: new mongoose_1.default.Types.ObjectId(divisionId) });
                }
                filter.$and = [{ $or: idMatches }];
            }
        }
        else if (districtId || district) {
            const districtQueries = [];
            if (districtId) {
                if (mongoose_1.default.Types.ObjectId.isValid(districtId))
                    districtQueries.push({ _id: new mongoose_1.default.Types.ObjectId(districtId) });
                districtQueries.push({ districtId: districtId });
            }
            if (district)
                districtQueries.push({ name: { $regex: new RegExp(`^${district.trim()}$`, 'i') } });
            const distDoc = await db.collection('districts').findOne({ $or: districtQueries });
            if (distDoc) {
                filter.$and = [{
                        $or: [
                            { districtId: distDoc._id },
                            { districtId: distDoc._id.toString() },
                            { district: distDoc.name }
                        ]
                    }];
            }
        }
        const rawPincodes = await db.collection('pincodes').find(filter).sort({ code: 1 }).toArray();
        const pincodes = rawPincodes.map(pc => ({
            _id: pc._id,
            id: pc._id.toString(),
            pincodeId: pc.pincodeId || pc._id.toString(),
            divisionId: pc.divisionId ? pc.divisionId.toString() : '',
            districtId: pc.districtId ? pc.districtId.toString() : '',
            stateId: pc.stateId ? pc.stateId.toString() : '',
            code: String(pc.code).trim(),
            name: pc.name || pc.area || pc.postOffice || ('PIN ' + pc.code),
            postOffice: pc.postOffice || pc.name || '',
            taluk: pc.taluk || '',
            area: pc.area || pc.name || '',
            district: pc.district || '',
            division: pc.division || '',
            state: pc.state || '',
            status: pc.status || 'Active',
            activeAgentId: pc.activeAgentId
        }));
        return res.status(200).json({ success: true, pincodes });
    }
    catch (error) {
        console.error('Get pincodes error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
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