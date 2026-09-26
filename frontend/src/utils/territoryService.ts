/**
 * Centralized Admin Territory Service for Agent Application
 * Single Source of Truth: Admin Territory Database (Admin Pincode Management)
 * State -> District -> Division -> Taluk -> PIN Code
 */

import api from './api';

export interface TerritoryPincode {
  id: string;
  pincodeId?: string;
  code: string;
  name?: string;
  postOffice?: string;
  taluk?: string;
  area?: string;
  divisionId?: string;
  districtId?: string;
  stateId?: string;
  status: string;
  activeAgentId?: any;
}

export interface TerritoryDivision {
  id: string;
  name: string;
  code?: string;
  taluk?: string;
  talukInfo?: string;
  districtId?: string;
  stateId?: string;
  status: string;
  pincodes: TerritoryPincode[];
}

export interface TerritoryDistrict {
  id: string;
  name: string;
  code?: string;
  stateId?: string;
  status: string;
  divisions: TerritoryDivision[];
}

export interface TerritoryState {
  id: string;
  name: string;
  code?: string;
  status: string;
  districts: TerritoryDistrict[];
}

export interface TerritoryItem {
  id: string;
  name: string;
  code?: string;
  status?: string;
  stateId?: string;
  districtId?: string;
  divisionId?: string;
  taluk?: string;
}

let cachedHierarchy: TerritoryState[] | null = null;
let isFetchingPromise: Promise<TerritoryState[]> | null = null;

// Parser helper for any raw hierarchy response format
function parseHierarchyTree(raw: any[]): TerritoryState[] {
  return (raw || [])
    .filter((st: any) => st && (st.name || st.stateName) && (!st.status || st.status.toLowerCase() === 'active'))
    .map((st: any) => {
      const stId = String(st.id || st._id || st.stateId || '').trim();
      const stName = String(st.name || st.stateName || '').trim();
      return {
        id: stId,
        name: stName,
        code: String(st.code || stName.slice(0, 3) || '').toUpperCase(),
        status: st.status || 'Active',
        districts: (st.districts || [])
          .filter((dt: any) => dt && (dt.name || dt.districtName) && (!dt.status || dt.status.toLowerCase() === 'active'))
          .map((dt: any) => {
            const dtId = String(dt.id || dt._id || dt.districtId || '').trim();
            const dtName = String(dt.name || dt.districtName || '').trim();
            return {
              id: dtId,
              name: dtName,
              code: String(dt.code || dtName.slice(0, 3) || '').toUpperCase(),
              stateId: stId,
              status: dt.status || 'Active',
              divisions: (dt.divisions || [])
                .filter((dv: any) => dv && (dv.name || dv.divisionName) && (!dv.status || dv.status.toLowerCase() === 'active'))
                .map((dv: any) => {
                  const dvId = String(dv.id || dv._id || dv.divisionId || '').trim();
                  const dvName = String(dv.name || dv.divisionName || '').trim();
                  const talukName = dv.taluk || dv.talukInfo || '';
                  return {
                    id: dvId,
                    name: dvName,
                    code: String(dv.code || dvName.slice(0, 3) || '').toUpperCase(),
                    taluk: talukName,
                    talukInfo: talukName,
                    districtId: dtId,
                    stateId: stId,
                    status: dv.status || 'Active',
                    pincodes: (dv.pincodes || [])
                      .filter((p: any) => {
                        const code = typeof p === 'string' ? p : (p.code || p.pincode);
                        const status = typeof p === 'string' ? 'Active' : (p.status || 'Active');
                        return code && status.toLowerCase() === 'active';
                      })
                      .map((p: any) => ({
                        id: String(p.id || p._id || p.pincodeId || (typeof p === 'string' ? p : p.code)).trim(),
                        code: String(typeof p === 'string' ? p : (p.code || p.pincode)).trim(),
                        name: p.name || p.postOffice || ('PIN ' + (typeof p === 'string' ? p : p.code)),
                        postOffice: p.postOffice || p.name || '',
                        taluk: p.taluk || talukName,
                        area: p.area || p.name || '',
                        divisionId: dvId,
                        districtId: dtId,
                        stateId: stId,
                        status: 'Active',
                        activeAgentId: p.activeAgentId
                      }))
                  };
                })
            };
          })
      };
    });
}

/**
 * Single source of truth fetcher: loads real Admin Territory hierarchy.
 * Priority:
 * 1. Agent backend /territory/all-hierarchy
 * 2. Agent backend /territory/hierarchy?all=true
 * 3. Central Admin Territory API (https://api.ficapp.in/admin-api/territory/hierarchy)
 * 4. Central Admin States API (https://api.ficapp.in/admin-api/territory/states)
 */
export async function fetchTerritoryHierarchy(forceRefresh = false): Promise<TerritoryState[]> {
  if (forceRefresh) {
    cachedHierarchy = null;
  }
  if (cachedHierarchy && !forceRefresh) {
    return cachedHierarchy;
  }
  if (isFetchingPromise && !forceRefresh) {
    return isFetchingPromise;
  }

  isFetchingPromise = (async () => {
    // 1. Try Agent Backend /territory/all-hierarchy
    try {
      const res = await api.get('/territory/all-hierarchy');
      const raw = res.data?.hierarchy || (Array.isArray(res.data) ? res.data : null);
      if (raw && Array.isArray(raw)) {
        const cleaned = parseHierarchyTree(raw);
        if (cleaned.length > 0) {
          cachedHierarchy = cleaned;
          return cleaned;
        }
      }
    } catch {
      // Continue to next source
    }

    // 2. Try Agent Backend /territory/hierarchy?all=true
    try {
      const res = await api.get('/territory/hierarchy?all=true');
      const raw = res.data?.hierarchy || (Array.isArray(res.data) ? res.data : null);
      if (raw && Array.isArray(raw)) {
        const cleaned = parseHierarchyTree(raw);
        if (cleaned.length > 0) {
          cachedHierarchy = cleaned;
          return cleaned;
        }
      }
    } catch {
      // Continue to next source
    }

    // 3. Direct fetch to Central Admin Territory Backend (Single Source of Truth)
    try {
      const adminRes = await fetch('https://api.ficapp.in/admin-api/territory/hierarchy', {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      if (adminRes.ok) {
        const json = await adminRes.json();
        const raw = json.hierarchy || json.states || (Array.isArray(json) ? json : null);
        if (raw && Array.isArray(raw)) {
          const cleaned = parseHierarchyTree(raw);
          if (cleaned.length > 0) {
            cachedHierarchy = cleaned;
            return cleaned;
          }
        }
      }
    } catch {
      // Continue to next source
    }

    // 4. Try Admin states endpoint as fallback to ensure at least states are available
    try {
      const adminStatesRes = await fetch('https://api.ficapp.in/admin-api/territory/states', {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      if (adminStatesRes.ok) {
        const statesData = await adminStatesRes.json();
        const rawList = Array.isArray(statesData) ? statesData : (statesData.states || []);
        if (Array.isArray(rawList) && rawList.length > 0) {
          const cleanedStates: TerritoryState[] = rawList
            .filter((s: any) => s && s.name && (!s.status || s.status.toLowerCase() === 'active'))
            .map((s: any) => ({
              id: String(s.id || s._id || s.stateId || '').trim(),
              name: String(s.name).trim(),
              code: String(s.code || s.name.slice(0, 3)).toUpperCase(),
              status: s.status || 'Active',
              districts: []
            }));
          if (cleanedStates.length > 0) {
            cachedHierarchy = cleanedStates;
            return cleanedStates;
          }
        }
      }
    } catch {
      // Continue to failure
    }

    if (cachedHierarchy && cachedHierarchy.length > 0) {
      return cachedHierarchy;
    }

    // Requirement 9: Do NOT silently return fake mock data. Throw so the UI displays Retry!
    throw new Error('Unable to load territories from central database. Please check your connection and try again.');
  })();

  try {
    const result = await isFetchingPromise;
    return result;
  } finally {
    isFetchingPromise = null;
  }
}

// Initial eager pre-fetch so synchronous access works quickly
fetchTerritoryHierarchy().catch(() => {});

export function getCachedHierarchy(): TerritoryState[] {
  return cachedHierarchy || [];
}

/**
 * Returns full state objects with id and name from Admin Territory Database.
 */
export async function getActiveStateList(forceRefresh = false): Promise<TerritoryItem[]> {
  const hierarchy = await fetchTerritoryHierarchy(forceRefresh);
  return hierarchy.map(s => ({
    id: s.id,
    name: s.name,
    code: s.code,
    status: s.status
  })).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Returns state names from Admin Territory Database.
 */
export async function getActiveStates(forceRefresh = false): Promise<string[]> {
  const list = await getActiveStateList(forceRefresh);
  return list.map(s => s.name);
}

export function getActiveStatesSync(): string[] {
  const hierarchy = cachedHierarchy || [];
  return hierarchy.map(s => s.name).sort();
}

/**
 * Returns full district objects with id and name for a given state.
 */
export async function getActiveDistrictList(stateNameOrId: string, forceRefresh = false): Promise<TerritoryItem[]> {
  if (!stateNameOrId) return [];
  const hierarchy = await fetchTerritoryHierarchy(forceRefresh);
  const target = stateNameOrId.trim().toLowerCase();
  const st = hierarchy.find(s =>
    s.name.trim().toLowerCase() === target ||
    s.id.toLowerCase() === target ||
    (s.code && s.code.toLowerCase() === target)
  );
  if (!st) return [];
  return st.districts.map(d => ({
    id: d.id,
    name: d.name,
    code: d.code,
    stateId: st.id,
    status: d.status
  })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getActiveDistricts(stateNameOrId: string, forceRefresh = false): Promise<string[]> {
  const list = await getActiveDistrictList(stateNameOrId, forceRefresh);
  return list.map(d => d.name);
}

export function getActiveDistrictsSync(stateNameOrId?: string): string[] {
  const hierarchy = cachedHierarchy || [];
  if (!stateNameOrId) {
    const all: string[] = [];
    hierarchy.forEach(st => st.districts.forEach(d => all.push(d.name)));
    return Array.from(new Set(all)).sort();
  }
  const target = stateNameOrId.trim().toLowerCase();
  const st = hierarchy.find(s => s.name.trim().toLowerCase() === target || s.id.toLowerCase() === target);
  if (!st) return [];
  return st.districts.map(d => d.name).sort();
}

/**
 * Returns full division objects with id, name, and taluk for a given district and state.
 */
export async function getActiveDivisionList(
  stateNameOrId?: string,
  districtNameOrId?: string,
  forceRefresh = false
): Promise<TerritoryItem[]> {
  const hierarchy = await fetchTerritoryHierarchy(forceRefresh);
  const allDivs: TerritoryItem[] = [];

  const stTarget = stateNameOrId?.trim().toLowerCase();
  const dtTarget = districtNameOrId?.trim().toLowerCase();

  for (const st of hierarchy) {
    if (stTarget && st.name.trim().toLowerCase() !== stTarget && st.id.toLowerCase() !== stTarget) {
      continue;
    }
    for (const dt of st.districts) {
      if (dtTarget && dt.name.trim().toLowerCase() !== dtTarget && dt.id.toLowerCase() !== dtTarget) {
        continue;
      }
      for (const dv of dt.divisions) {
        allDivs.push({
          id: dv.id,
          name: dv.name,
          code: dv.code,
          districtId: dt.id,
          stateId: st.id,
          taluk: dv.taluk,
          status: dv.status
        });
      }
    }
  }

  const map = new Map<string, TerritoryItem>();
  allDivs.forEach(dv => {
    if (!map.has(dv.name)) map.set(dv.name, dv);
  });
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getActiveDivisions(
  stateNameOrId?: string,
  districtNameOrId?: string,
  forceRefresh = false
): Promise<string[]> {
  const list = await getActiveDivisionList(stateNameOrId, districtNameOrId, forceRefresh);
  return list.map(d => d.name);
}

export function getActiveDivisionsSync(stateNameOrId?: string, districtNameOrId?: string): string[] {
  const hierarchy = cachedHierarchy || [];
  return getActiveDivisionsInternal(hierarchy, stateNameOrId, districtNameOrId);
}

function getActiveDivisionsInternal(hierarchy: TerritoryState[], stateName?: string, districtName?: string): string[] {
  const allDivs: string[] = [];

  for (const st of hierarchy) {
    if (stateName && st.name.trim().toLowerCase() !== stateName.trim().toLowerCase() && st.id.toLowerCase() !== stateName.trim().toLowerCase()) {
      continue;
    }
    for (const dt of st.districts) {
      if (districtName && dt.name.trim().toLowerCase() !== districtName.trim().toLowerCase() && dt.id.toLowerCase() !== districtName.trim().toLowerCase()) {
        continue;
      }
      for (const dv of dt.divisions) {
        allDivs.push(dv.name);
      }
    }
  }

  return Array.from(new Set(allDivs)).sort();
}

/**
 * Returns pincodes belonging to division/district/state from Admin Territory Database.
 */
export async function getActivePincodes(
  stateNameOrId?: string,
  districtNameOrId?: string,
  divisionNameOrId?: string,
  forceRefresh = false
): Promise<TerritoryPincode[]> {
  const hierarchy = await fetchTerritoryHierarchy(forceRefresh);
  return getActivePincodesInternal(hierarchy, stateNameOrId, districtNameOrId, divisionNameOrId);
}

export function getActivePincodesSync(
  stateNameOrId?: string,
  districtNameOrId?: string,
  divisionNameOrId?: string
): TerritoryPincode[] {
  const hierarchy = cachedHierarchy || [];
  return getActivePincodesInternal(hierarchy, stateNameOrId, districtNameOrId, divisionNameOrId);
}

function getActivePincodesInternal(
  hierarchy: TerritoryState[],
  stateNameOrId?: string,
  districtNameOrId?: string,
  divisionNameOrId?: string
): TerritoryPincode[] {
  const allPins: TerritoryPincode[] = [];
  const stTarget = stateNameOrId?.trim().toLowerCase();
  const dtTarget = districtNameOrId?.trim().toLowerCase();
  const dvTarget = divisionNameOrId?.trim().toLowerCase();

  for (const st of hierarchy) {
    if (stTarget && st.name.trim().toLowerCase() !== stTarget && st.id.toLowerCase() !== stTarget) {
      continue;
    }
    for (const dt of st.districts) {
      if (dtTarget && dt.name.trim().toLowerCase() !== dtTarget && dt.id.toLowerCase() !== dtTarget) {
        continue;
      }
      for (const dv of dt.divisions) {
        if (dvTarget && dv.name.trim().toLowerCase() !== dvTarget && dv.id.toLowerCase() !== dvTarget) {
          continue;
        }
        allPins.push(...dv.pincodes);
      }
    }
  }

  // Deduplicate by code
  const map = new Map<string, TerritoryPincode>();
  allPins.forEach(p => {
    if (!map.has(p.code)) map.set(p.code, p);
  });

  return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
}

export async function lookupPincode(pincode: string): Promise<any | null> {
  const cleanPin = (pincode || '').replace(/\D/g, '').slice(0, 6);
  if (cleanPin.length !== 6) return null;

  try {
    const res = await api.get(`/territory/lookup/${cleanPin}`);
    if (res.data) return res.data;
  } catch {
    // Check hierarchy cache
    return lookupPincodeSync(cleanPin);
  }
  return null;
}

export function lookupPincodeSync(pincode: string): any | null {
  const cleanPin = (pincode || '').replace(/\D/g, '').slice(0, 6);
  if (cleanPin.length !== 6) return null;

  const hierarchy = cachedHierarchy || [];
  for (const st of hierarchy) {
    for (const dt of st.districts) {
      for (const dv of dt.divisions) {
        const pin = dv.pincodes.find(p => p.code === cleanPin);
        if (pin) {
          return {
            pincode: pin.code,
            pincodeId: pin.id || pin.pincodeId,
            name: pin.name,
            postOffice: pin.postOffice || pin.name,
            taluk: pin.taluk || dv.taluk,
            division: dv.name,
            divisionId: dv.id,
            district: dt.name,
            districtId: dt.id,
            state: st.name,
            stateId: st.id
          };
        }
      }
    }
  }
  return null;
}
