import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getAgentTerritoryScope } from '../utils/territoryScope';

interface RawState {
  _id: any;
  stateId?: string;
  name: string;
  code?: string;
  status?: string;
}

interface RawDistrict {
  _id: any;
  districtId?: string;
  stateId?: any;
  state?: string;
  name: string;
  code?: string;
  status?: string;
}

interface RawDivision {
  _id: any;
  divisionId?: string;
  districtId?: any;
  district?: string;
  stateId?: any;
  state?: string;
  name: string;
  code?: string;
  talukInfo?: string;
  taluk?: string;
  status?: string;
}

interface RawPincode {
  _id: any;
  pincodeId?: string;
  divisionId?: any;
  division?: string;
  districtId?: any;
  district?: string;
  stateId?: any;
  state?: string;
  code: string;
  name?: string;
  postOffice?: string;
  taluk?: string;
  area?: string;
  status?: string;
  activeAgentId?: any;
}

const isActive = (item: any) => !item.status || item.status.toLowerCase() === 'active';

let cachedFullHierarchy: any = null;
let cachedFullHierarchyTime = 0;
const HIERARCHY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

export function clearTerritoryCache() {
  cachedFullHierarchy = null;
  cachedFullHierarchyTime = 0;
}

export async function warmupTerritoryCache() {
  try {
    await buildHierarchyTree(null, true);
    console.log('✅ Centralized territory hierarchy cache pre-warmed successfully.');
  } catch (err: any) {
    console.warn('⚠️ Territory hierarchy cache warmup deferred:', err.message);
  }
}

function filterHierarchyTree(tree: any[], scope: any = null, forceAll = false): any[] {
  if (forceAll || !scope || !scope.role) return tree;
  let filtered = tree;
  if (scope.state) {
    const scState = scope.state.trim().toLowerCase();
    const stMatch = filtered.filter(s => {
      const sName = s.name.trim().toLowerCase();
      return sName === scState || sName.includes(scState) || scState.includes(sName);
    });
    if (stMatch.length > 0) filtered = stMatch;
  }
  if (scope.district && (scope.role === 'district' || scope.role === 'division' || scope.role === 'pincode')) {
    const scDist = scope.district.trim().toLowerCase();
    filtered = filtered.map(st => ({
      ...st,
      districts: st.districts.filter((d: any) => {
        const dName = d.name.trim().toLowerCase();
        return dName === scDist || dName.includes(scDist) || scDist.includes(dName);
      })
    }));
  }
  if (scope.division && (scope.role === 'division' || scope.role === 'pincode')) {
    const scDiv = scope.division.trim().toLowerCase();
    filtered = filtered.map(st => ({
      ...st,
      districts: st.districts.map((dt: any) => ({
        ...dt,
        divisions: dt.divisions.filter((v: any) => {
          const vName = v.name.trim().toLowerCase();
          return vName === scDiv || vName.includes(scDiv) || scDiv.includes(vName);
        })
      }))
    }));
  }
  if (scope.pincode && scope.role === 'pincode') {
    const scPin = scope.pincode.trim();
    filtered = filtered.map(st => ({
      ...st,
      districts: st.districts.map((dt: any) => ({
        ...dt,
        divisions: dt.divisions.map((v: any) => ({
          ...v,
          pincodes: v.pincodes.filter((p: any) => p.code === scPin)
        }))
      }))
    }));
  }
  return filtered;
}

/**
 * Builds the centralized territory hierarchy from MongoDB collections:
 * states -> districts -> divisions -> pincodes
 * High-speed O(N) indexing with in-memory 5-minute caching.
 */
async function buildHierarchyTree(scope: any = null, forceAll = false) {
  const now = Date.now();
  if (cachedFullHierarchy && (now - cachedFullHierarchyTime < HIERARCHY_CACHE_TTL)) {
    return filterHierarchyTree(cachedFullHierarchy, scope, forceAll);
  }

  const defaultDb = mongoose.connection.db;
  if (!defaultDb) throw new Error('Database connection unavailable');
  const db = ((mongoose.connection as any).useDb ? (mongoose.connection as any).useDb('connect_db') : null) || defaultDb;

  const [states, districts, divisions, pincodes] = await Promise.all([
    db.collection('states').find({}, { projection: { name: 1, code: 1, status: 1, stateId: 1 } }).toArray() as Promise<RawState[]>,
    db.collection('districts').find({}, { projection: { name: 1, code: 1, status: 1, stateId: 1, state: 1, districtId: 1 } }).toArray() as Promise<RawDistrict[]>,
    db.collection('divisions').find({}, { projection: { name: 1, code: 1, status: 1, districtId: 1, district: 1, talukInfo: 1, taluk: 1, divisionId: 1 } }).toArray() as Promise<RawDivision[]>,
    db.collection('pincodes').find({}, { projection: { code: 1, name: 1, postOffice: 1, taluk: 1, area: 1, status: 1, divisionId: 1, division: 1, districtId: 1, district: 1, stateId: 1, state: 1, activeAgentId: 1, pincodeId: 1 } }).toArray() as Promise<RawPincode[]>
  ]);

  const activeStates = states.filter(isActive);
  const activeDistricts = districts.filter(isActive);
  const activeDivisions = divisions.filter(isActive);
  const activePincodes = pincodes.filter(isActive);

  // If local activeStates is empty, fallback to Central Admin API server-to-server (bypasses browser CORS)
  if (activeStates.length === 0) {
    try {
      const resp = await fetch('https://api.ficapp.in/admin-api/territory/hierarchy', { signal: AbortSignal.timeout(6000) });
      if (resp.ok) {
        const json: any = await resp.json();
        const tree = json.hierarchy || json.states || (Array.isArray(json) ? json : null);
        if (Array.isArray(tree) && tree.length > 0) {
          cachedFullHierarchy = tree;
          cachedFullHierarchyTime = now;
          return filterHierarchyTree(tree, scope, forceAll);
        }
      }
    } catch (e: any) {
      console.warn('Backend server-to-server territory fetch fallback note:', e.message);
    }
  }

  // Pre-index pincodes into Map by division and district for fast O(1) lookups
  const pinsByDivKey = new Map<string, RawPincode[]>();
  const pinsByDistKey = new Map<string, RawPincode[]>();

  for (const pc of activePincodes) {
    const pcDivId = pc.divisionId ? String(pc.divisionId) : '';
    const pcDivName = pc.division ? pc.division.trim().toLowerCase() : '';
    const pcDistId = pc.districtId ? String(pc.districtId) : '';
    const pcDistName = pc.district ? pc.district.trim().toLowerCase() : '';

    if (pcDivId) {
      if (!pinsByDivKey.has(pcDivId)) pinsByDivKey.set(pcDivId, []);
      pinsByDivKey.get(pcDivId)!.push(pc);
    }
    if (pcDivName) {
      if (!pinsByDivKey.has(pcDivName)) pinsByDivKey.set(pcDivName, []);
      pinsByDivKey.get(pcDivName)!.push(pc);
    }
    if (pcDistId && !pcDivId) {
      if (!pinsByDistKey.has(pcDistId)) pinsByDistKey.set(pcDistId, []);
      pinsByDistKey.get(pcDistId)!.push(pc);
    }
    if (pcDistName && !pcDivName) {
      if (!pinsByDistKey.has(pcDistName)) pinsByDistKey.set(pcDistName, []);
      pinsByDistKey.get(pcDistName)!.push(pc);
    }
  }

  // Pre-index divisions by district
  const divsByDistKey = new Map<string, RawDivision[]>();
  for (const dv of activeDivisions) {
    const dvDistId = dv.districtId ? String(dv.districtId) : '';
    const dvDistName = dv.district ? dv.district.trim().toLowerCase() : '';
    if (dvDistId) {
      if (!divsByDistKey.has(dvDistId)) divsByDistKey.set(dvDistId, []);
      divsByDistKey.get(dvDistId)!.push(dv);
    }
    if (dvDistName) {
      if (!divsByDistKey.has(dvDistName)) divsByDistKey.set(dvDistName, []);
      divsByDistKey.get(dvDistName)!.push(dv);
    }
  }

  // Pre-index districts by state
  const distsByStateKey = new Map<string, RawDistrict[]>();
  for (const dt of activeDistricts) {
    const dtStateId = dt.stateId ? String(dt.stateId) : '';
    const dtStateName = dt.state ? dt.state.trim().toLowerCase() : '';
    if (dtStateId) {
      if (!distsByStateKey.has(dtStateId)) distsByStateKey.set(dtStateId, []);
      distsByStateKey.get(dtStateId)!.push(dt);
    }
    if (dtStateName) {
      if (!distsByStateKey.has(dtStateName)) distsByStateKey.set(dtStateName, []);
      distsByStateKey.get(dtStateName)!.push(dt);
    }
  }

  const fullTree = activeStates.map(st => {
    const stIdStr = String(st._id);
    const stCustomId = st.stateId || stIdStr;
    const stNameLower = st.name.trim().toLowerCase();

    const distList = distsByStateKey.get(stIdStr) || distsByStateKey.get(stCustomId) || distsByStateKey.get(stNameLower) || [];
    const seenDist = new Set<string>();
    const stDistricts: RawDistrict[] = [];
    for (const d of distList) {
      const dId = String(d._id);
      if (!seenDist.has(dId)) {
        seenDist.add(dId);
        stDistricts.push(d);
      }
    }

    return {
      id: stIdStr,
      stateId: stCustomId,
      name: st.name.trim(),
      code: st.code || st.name.slice(0, 3).toUpperCase(),
      status: st.status || 'Active',
      districts: stDistricts.map(dt => {
        const dtIdStr = String(dt._id);
        const dtCustomId = dt.districtId || dtIdStr;
        const dtNameLower = dt.name.trim().toLowerCase();

        const divList = divsByDistKey.get(dtIdStr) || divsByDistKey.get(dtCustomId) || divsByDistKey.get(dtNameLower) || [];
        const seenDiv = new Set<string>();
        const dtDivisions: RawDivision[] = [];
        for (const dv of divList) {
          const dvId = String(dv._id);
          if (!seenDiv.has(dvId)) {
            seenDiv.add(dvId);
            dtDivisions.push(dv);
          }
        }

        return {
          id: dtIdStr,
          districtId: dtCustomId,
          stateId: stCustomId,
          name: dt.name.trim(),
          code: dt.code || dt.name.slice(0, 3).toUpperCase(),
          status: dt.status || 'Active',
          divisions: dtDivisions.map(dv => {
            const dvIdStr = String(dv._id);
            const dvCustomId = dv.divisionId || dvIdStr;
            const dvNameLower = dv.name.trim().toLowerCase();

            const pinList = pinsByDivKey.get(dvIdStr) || pinsByDivKey.get(dvCustomId) || pinsByDivKey.get(dvNameLower) || [];
            const fallbackPins = pinsByDistKey.get(dtIdStr) || pinsByDistKey.get(dtNameLower) || [];
            const seenPin = new Set<string>();
            const dvPincodes: RawPincode[] = [];
            for (const pc of [...pinList, ...fallbackPins]) {
              const pcId = String(pc._id);
              if (!seenPin.has(pcId)) {
                seenPin.add(pcId);
                dvPincodes.push(pc);
              }
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
                id: String(pc._id),
                pincodeId: pc.pincodeId || String(pc._id),
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

  cachedFullHierarchy = fullTree;
  cachedFullHierarchyTime = now;
  return filterHierarchyTree(fullTree, scope, forceAll);
}

/**
 * GET /api/territory/hierarchy
 * Returns centralized territory database hierarchy from Admin Pincode Management:
 * State -> District -> Division -> Taluk & Pincode
 * Role-aware: Filters down to authorized territory if caller is authenticated agent.
 * If query param ?all=true is present, returns full un-scoped hierarchy.
 */
export const getTerritoryHierarchy = async (req: Request, res: Response) => {
  try {
    const forceAll = req.query.all === 'true';
    const agentId = (req as any).agent?.agentId;
    let scope: any = null;
    if (agentId && !forceAll) {
      scope = await getAgentTerritoryScope(agentId);
    }

    const hierarchy = await buildHierarchyTree(scope, forceAll);
    return res.status(200).json({ success: true, hierarchy, role: scope?.role || 'all', scope });
  } catch (error) {
    console.error('Get territory hierarchy error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error while fetching territory hierarchy' });
  }
};

/**
 * GET /api/territory/all-hierarchy
 * Returns full active territory hierarchy from Admin Pincode Management (for registration)
 */
export const getAllTerritoryHierarchy = async (_req: Request, res: Response) => {
  try {
    const hierarchy = await buildHierarchyTree(null, true);
    return res.status(200).json({ success: true, hierarchy });
  } catch (error) {
    console.error('Get all territory hierarchy error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error while fetching all territory hierarchy' });
  }
};

/**
 * GET /api/territory/states
 * Returns all active states from central territory database
 */
export const getStates = async (_req: Request, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ success: false, message: 'Database connection unavailable' });

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
  } catch (error) {
    console.error('Get states error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/territory/districts
 * Query params: stateId, state
 */
export const getDistricts = async (req: Request, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ success: false, message: 'Database connection unavailable' });

    const { stateId, state } = req.query;
    const filter: any = {
      $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }]
    };

    if (stateId || state) {
      const stateQueries: any[] = [];
      if (stateId) {
        if (mongoose.Types.ObjectId.isValid(stateId as string)) {
          stateQueries.push({ _id: new mongoose.Types.ObjectId(stateId as string) });
        }
        stateQueries.push({ stateId: stateId as string });
        stateQueries.push({ name: stateId as string });
      }
      if (state) {
        const trimmedState = (state as string).trim();
        stateQueries.push({ name: { $regex: new RegExp(`^${trimmedState}$`, 'i') } });
        stateQueries.push({ name: { $regex: new RegExp(trimmedState, 'i') } });
        stateQueries.push({ stateId: state as string });
      }

      const stateDoc = await db.collection('states').findOne({ $or: stateQueries });
      if (stateDoc) {
        const stateMatches: any[] = [
          { stateId: stateDoc._id },
          { stateId: stateDoc._id.toString() },
          { state: stateDoc.name }
        ];
        if (stateDoc.stateId) {
          stateMatches.push({ stateId: stateDoc.stateId });
        }
        filter.$and = [{ $or: stateMatches }];
      } else if (stateId) {
        const idMatches: any[] = [{ stateId: stateId }];
        if (mongoose.Types.ObjectId.isValid(stateId as string)) {
          idMatches.push({ stateId: new mongoose.Types.ObjectId(stateId as string) });
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
  } catch (error) {
    console.error('Get districts error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/territory/divisions
 * Query params: districtId, district, stateId, state
 */
export const getDivisions = async (req: Request, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ success: false, message: 'Database connection unavailable' });

    const { districtId, district, stateId, state } = req.query;
    const filter: any = {
      $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }]
    };

    if (districtId || district) {
      const districtQueries: any[] = [];
      if (districtId) {
        if (mongoose.Types.ObjectId.isValid(districtId as string)) {
          districtQueries.push({ _id: new mongoose.Types.ObjectId(districtId as string) });
        }
        districtQueries.push({ districtId: districtId as string });
        districtQueries.push({ name: districtId as string });
      }
      if (district) {
        districtQueries.push({ name: { $regex: new RegExp(`^${(district as string).trim()}$`, 'i') } });
        districtQueries.push({ districtId: district as string });
      }

      const distDoc = await db.collection('districts').findOne({ $or: districtQueries });
      if (distDoc) {
        const distMatches: any[] = [
          { districtId: distDoc._id },
          { districtId: distDoc._id.toString() },
          { district: distDoc.name }
        ];
        if (distDoc.districtId) {
          distMatches.push({ districtId: distDoc.districtId });
        }
        filter.$and = [{ $or: distMatches }];
      } else if (districtId) {
        const idMatches: any[] = [{ districtId: districtId }];
        if (mongoose.Types.ObjectId.isValid(districtId as string)) {
          idMatches.push({ districtId: new mongoose.Types.ObjectId(districtId as string) });
        }
        filter.$and = [{ $or: idMatches }];
      }
    } else if (stateId || state) {
      // Find all districts of this state
      const stateQueries: any[] = [];
      if (stateId) {
        if (mongoose.Types.ObjectId.isValid(stateId as string)) stateQueries.push({ _id: new mongoose.Types.ObjectId(stateId as string) });
        stateQueries.push({ stateId: stateId as string });
      }
      if (state) stateQueries.push({ name: { $regex: new RegExp(`^${(state as string).trim()}$`, 'i') } });

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
  } catch (error) {
    console.error('Get divisions error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/territory/pincodes
 * Query params: divisionId, division, districtId, district, stateId, state
 */
export const getPincodes = async (req: Request, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ success: false, message: 'Database connection unavailable' });

    const { divisionId, division, districtId, district, stateId, state } = req.query;
    const filter: any = {
      $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }]
    };

    if (divisionId || division) {
      const divisionQueries: any[] = [];
      if (divisionId) {
        if (mongoose.Types.ObjectId.isValid(divisionId as string)) {
          divisionQueries.push({ _id: new mongoose.Types.ObjectId(divisionId as string) });
        }
        divisionQueries.push({ divisionId: divisionId as string });
        divisionQueries.push({ name: divisionId as string });
      }
      if (division) {
        divisionQueries.push({ name: { $regex: new RegExp(`^${(division as string).trim()}$`, 'i') } });
        divisionQueries.push({ divisionId: division as string });
      }

      const divDoc = await db.collection('divisions').findOne({ $or: divisionQueries });
      if (divDoc) {
        const divMatches: any[] = [
          { divisionId: divDoc._id },
          { divisionId: divDoc._id.toString() },
          { division: divDoc.name }
        ];
        if (divDoc.divisionId) {
          divMatches.push({ divisionId: divDoc.divisionId });
        }
        filter.$and = [{ $or: divMatches }];
      } else if (divisionId) {
        const idMatches: any[] = [{ divisionId: divisionId }];
        if (mongoose.Types.ObjectId.isValid(divisionId as string)) {
          idMatches.push({ divisionId: new mongoose.Types.ObjectId(divisionId as string) });
        }
        filter.$and = [{ $or: idMatches }];
      }
    } else if (districtId || district) {
      const districtQueries: any[] = [];
      if (districtId) {
        if (mongoose.Types.ObjectId.isValid(districtId as string)) districtQueries.push({ _id: new mongoose.Types.ObjectId(districtId as string) });
        districtQueries.push({ districtId: districtId as string });
      }
      if (district) districtQueries.push({ name: { $regex: new RegExp(`^${(district as string).trim()}$`, 'i') } });

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
  } catch (error) {
    console.error('Get pincodes error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/territory/lookup/:pincode
 * Lookup a 6-digit PIN code in central territory database
 */
export const lookupPincode = async (req: Request, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ message: 'Database connection unavailable' });

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
      } catch {
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
  } catch (error) {
    console.error('Lookup pincode error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
