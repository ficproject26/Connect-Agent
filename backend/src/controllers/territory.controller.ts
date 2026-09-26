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

/**
 * Builds the centralized territory hierarchy from MongoDB collections:
 * states -> districts -> divisions -> pincodes
 */
async function buildHierarchyTree(scope: any = null, forceAll = false) {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database connection unavailable');

  const [states, districts, divisions, pincodes] = await Promise.all([
    db.collection('states').find({}).toArray() as Promise<RawState[]>,
    db.collection('districts').find({}).toArray() as Promise<RawDistrict[]>,
    db.collection('divisions').find({}).toArray() as Promise<RawDivision[]>,
    db.collection('pincodes').find({}).toArray() as Promise<RawPincode[]>
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
    let stDistricts = activeDistricts.filter(dt =>
      (dt.stateId && dt.stateId.toString() === stIdStr) ||
      (dt.state && dt.state.trim().toLowerCase() === st.name.trim().toLowerCase())
    );

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
        let dtDivisions = activeDivisions.filter(dv =>
          (dv.districtId && dv.districtId.toString() === dtIdStr) ||
          (dv.district && dv.district.trim().toLowerCase() === dt.name.trim().toLowerCase())
        );

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
            let dvPincodes = activePincodes.filter(pc =>
              (pc.divisionId && pc.divisionId.toString() === dvIdStr) ||
              (pc.division && pc.division.trim().toLowerCase() === dv.name.trim().toLowerCase()) ||
              (pc.district && pc.district.trim().toLowerCase() === dt.name.trim().toLowerCase() && !pc.divisionId)
            );

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
export const getTerritoryHierarchy = async (req: Request, res: Response) => {
  try {
    const forceAll = req.query.all === 'true';
    const agentId = (req as any).agent?.agentId;
    let scope: any = null;
    if (agentId && !forceAll) {
      scope = await getAgentTerritoryScope(agentId);
    }

    const hierarchy = await buildHierarchyTree(scope, forceAll);
    return res.status(200).json({ hierarchy, role: scope?.role || 'all', scope });
  } catch (error) {
    console.error('Get territory hierarchy error:', error);
    return res.status(500).json({ message: 'Internal server error while fetching territory hierarchy' });
  }
};

/**
 * GET /api/territory/all-hierarchy
 * Returns full active territory hierarchy from Admin Pincode Management (for registration)
 */
export const getAllTerritoryHierarchy = async (_req: Request, res: Response) => {
  try {
    const hierarchy = await buildHierarchyTree(null, true);
    return res.status(200).json({ hierarchy });
  } catch (error) {
    console.error('Get all territory hierarchy error:', error);
    return res.status(500).json({ message: 'Internal server error while fetching all territory hierarchy' });
  }
};

/**
 * GET /api/territory/states
 * Returns all active states from central territory database
 */
export const getStates = async (_req: Request, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ message: 'Database connection unavailable' });

    const states = await db.collection('states').find({
      $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }]
    }).sort({ name: 1 }).toArray();

    return res.status(200).json({ states });
  } catch (error) {
    console.error('Get states error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/territory/districts
 * Query params: stateId, state
 */
export const getDistricts = async (req: Request, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ message: 'Database connection unavailable' });

    const { stateId, state } = req.query;
    const filter: any = {
      $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }]
    };

    if (stateId) {
      try {
        filter.$and = [{ $or: [{ stateId: new mongoose.Types.ObjectId(stateId as string) }, { stateId: stateId }] }];
      } catch {
        filter.stateId = stateId;
      }
    } else if (state) {
      filter.state = { $regex: new RegExp(`^${(state as string).trim()}$`, 'i') };
    }

    const districts = await db.collection('districts').find(filter).sort({ name: 1 }).toArray();
    return res.status(200).json({ districts });
  } catch (error) {
    console.error('Get districts error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/territory/divisions
 * Query params: districtId, district, state
 */
export const getDivisions = async (req: Request, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ message: 'Database connection unavailable' });

    const { districtId, district, state } = req.query;
    const filter: any = {
      $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }]
    };

    if (districtId) {
      try {
        filter.$and = [{ $or: [{ districtId: new mongoose.Types.ObjectId(districtId as string) }, { districtId: districtId }] }];
      } catch {
        filter.districtId = districtId;
      }
    } else if (district) {
      filter.district = { $regex: new RegExp(`^${(district as string).trim()}$`, 'i') };
    }

    if (state) {
      filter.state = { $regex: new RegExp(`^${(state as string).trim()}$`, 'i') };
    }

    const divisions = await db.collection('divisions').find(filter).sort({ name: 1 }).toArray();
    return res.status(200).json({ divisions });
  } catch (error) {
    console.error('Get divisions error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/territory/pincodes
 * Query params: divisionId, division, district, state
 */
export const getPincodes = async (req: Request, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ message: 'Database connection unavailable' });

    const { divisionId, division, district, state } = req.query;
    const filter: any = {
      $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }]
    };

    if (divisionId) {
      try {
        filter.$and = [{ $or: [{ divisionId: new mongoose.Types.ObjectId(divisionId as string) }, { divisionId: divisionId }] }];
      } catch {
        filter.divisionId = divisionId;
      }
    } else if (division) {
      filter.division = { $regex: new RegExp(`^${(division as string).trim()}$`, 'i') };
    }

    if (district) {
      filter.district = { $regex: new RegExp(`^${(district as string).trim()}$`, 'i') };
    }

    if (state) {
      filter.state = { $regex: new RegExp(`^${(state as string).trim()}$`, 'i') };
    }

    const pincodes = await db.collection('pincodes').find(filter).sort({ code: 1 }).toArray();
    return res.status(200).json({ pincodes });
  } catch (error) {
    console.error('Get pincodes error:', error);
    return res.status(500).json({ message: 'Internal server error' });
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
