/**
 * Centralized Admin Territory Service for Agent Application
 * Single Source of Truth: Admin Territory Database (Admin Pincode Management)
 * State -> District -> Division -> Taluk -> PIN Code
 */

import api from './api';

export interface TerritoryPincode {
  id: string;
  code: string;
  name?: string;
  postOffice?: string;
  taluk?: string;
  area?: string;
  status: string;
  activeAgentId?: any;
}

export interface TerritoryDivision {
  id: string;
  name: string;
  code?: string;
  taluk?: string;
  talukInfo?: string;
  status: string;
  pincodes: TerritoryPincode[];
}

export interface TerritoryDistrict {
  id: string;
  name: string;
  code?: string;
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

let cachedHierarchy: TerritoryState[] | null = null;
let isFetchingPromise: Promise<TerritoryState[]> | null = null;

export async function fetchTerritoryHierarchy(forceRefresh = false): Promise<TerritoryState[]> {
  if (cachedHierarchy && !forceRefresh) {
    return cachedHierarchy;
  }
  if (isFetchingPromise && !forceRefresh) {
    return isFetchingPromise;
  }

  isFetchingPromise = (async () => {
    try {
      const res = await api.get('/territory/hierarchy');
      if (res.data?.hierarchy && Array.isArray(res.data.hierarchy)) {
        const cleaned: TerritoryState[] = res.data.hierarchy
          .filter((st: any) => st && st.name && (!st.status || st.status.toLowerCase() === 'active'))
          .map((st: any) => ({
            id: st.id || st._id || st.stateId,
            name: st.name.trim(),
            code: st.code || st.name.slice(0, 3).toUpperCase(),
            status: st.status || 'Active',
            districts: (st.districts || [])
              .filter((dt: any) => dt && dt.name && (!dt.status || dt.status.toLowerCase() === 'active'))
              .map((dt: any) => ({
                id: dt.id || dt._id || dt.districtId,
                name: dt.name.trim(),
                code: dt.code || dt.name.slice(0, 3).toUpperCase(),
                status: dt.status || 'Active',
                divisions: (dt.divisions || [])
                  .filter((dv: any) => dv && dv.name && (!dv.status || dv.status.toLowerCase() === 'active'))
                  .map((dv: any) => ({
                    id: dv.id || dv._id || dv.divisionId,
                    name: dv.name.trim(),
                    code: dv.code || dv.name.slice(0, 3).toUpperCase(),
                    taluk: dv.taluk || dv.talukInfo || '',
                    talukInfo: dv.talukInfo || dv.taluk || '',
                    status: dv.status || 'Active',
                    pincodes: (dv.pincodes || [])
                      .filter((p: any) => {
                        const code = typeof p === 'string' ? p : (p.code || p.pincode);
                        const status = typeof p === 'string' ? 'Active' : (p.status || 'Active');
                        return code && status.toLowerCase() === 'active';
                      })
                      .map((p: any) => ({
                        id: p.id || p._id || p.pincodeId || (typeof p === 'string' ? p : p.code),
                        code: String(typeof p === 'string' ? p : (p.code || p.pincode)).trim(),
                        name: p.name || p.postOffice || ('PIN ' + (typeof p === 'string' ? p : p.code)),
                        postOffice: p.postOffice || p.name || '',
                        taluk: p.taluk || dv.taluk || dv.talukInfo || '',
                        area: p.area || p.name || '',
                        status: 'Active',
                        activeAgentId: p.activeAgentId
                      }))
                  }))
              }))
          }));

        if (cleaned.length > 0) {
          cachedHierarchy = cleaned;
          return cleaned;
        }
      }
    } catch {
      // Continue to direct fallback fetch
    }

    // Direct fallback
    try {
      const res = await fetch('/api/territory/hierarchy', { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const json = await res.json();
        const rawHierarchy = json.hierarchy || (Array.isArray(json) ? json : null);
        if (rawHierarchy && Array.isArray(rawHierarchy)) {
          const cleaned: TerritoryState[] = rawHierarchy
            .filter((st: any) => st && st.name && (!st.status || st.status.toLowerCase() === 'active'))
            .map((st: any) => ({
              id: st.id || st._id,
              name: st.name.trim(),
              code: st.code || st.name.slice(0, 3).toUpperCase(),
              status: st.status || 'Active',
              districts: (st.districts || [])
                .filter((dt: any) => dt && dt.name && (!dt.status || dt.status.toLowerCase() === 'active'))
                .map((dt: any) => ({
                  id: dt.id || dt._id,
                  name: dt.name.trim(),
                  code: dt.code || dt.name.slice(0, 3).toUpperCase(),
                  status: dt.status || 'Active',
                  divisions: (dt.divisions || [])
                    .filter((dv: any) => dv && dv.name && (!dv.status || dv.status.toLowerCase() === 'active'))
                    .map((dv: any) => ({
                      id: dv.id || dv._id,
                      name: dv.name.trim(),
                      code: dv.code || dv.name.slice(0, 3).toUpperCase(),
                      taluk: dv.taluk || dv.talukInfo || '',
                      talukInfo: dv.talukInfo || dv.taluk || '',
                      status: dv.status || 'Active',
                      pincodes: (dv.pincodes || [])
                        .filter((p: any) => {
                          const code = typeof p === 'string' ? p : (p.code || p.pincode);
                          const status = typeof p === 'string' ? 'Active' : (p.status || 'Active');
                          return code && status.toLowerCase() === 'active';
                        })
                        .map((p: any) => ({
                          id: p.id || p._id || (typeof p === 'string' ? p : p.code),
                          code: String(typeof p === 'string' ? p : (p.code || p.pincode)).trim(),
                          name: p.name || p.postOffice || ('PIN ' + (typeof p === 'string' ? p : p.code)),
                          postOffice: p.postOffice || p.name || '',
                          taluk: p.taluk || dv.taluk || dv.talukInfo || '',
                          area: p.area || p.name || '',
                          status: 'Active',
                          activeAgentId: p.activeAgentId
                        }))
                    }))
                }))
            }));

          if (cleaned.length > 0) {
            cachedHierarchy = cleaned;
            return cleaned;
          }
        }
      }
    } catch {
      // Continue
    }

    return cachedHierarchy || [];
  })();

  const result = await isFetchingPromise;
  isFetchingPromise = null;
  return result;
}

// Initial eager pre-fetch so synchronous access works quickly
fetchTerritoryHierarchy().catch(() => {});

export function getCachedHierarchy(): TerritoryState[] {
  return cachedHierarchy || [];
}

export async function getActiveStates(): Promise<string[]> {
  const hierarchy = await fetchTerritoryHierarchy();
  return hierarchy.map(s => s.name).sort();
}

export function getActiveStatesSync(): string[] {
  const hierarchy = cachedHierarchy || [];
  return hierarchy.map(s => s.name).sort();
}

export async function getActiveDistricts(stateName: string): Promise<string[]> {
  if (!stateName) return [];
  const hierarchy = await fetchTerritoryHierarchy();
  const st = hierarchy.find(s => s.name.trim().toLowerCase() === stateName.trim().toLowerCase());
  if (!st) return [];
  return st.districts.map(d => d.name).sort();
}

export function getActiveDistrictsSync(stateName?: string): string[] {
  const hierarchy = cachedHierarchy || [];
  if (!stateName) {
    // Return all districts across all states in hierarchy
    const all: string[] = [];
    hierarchy.forEach(st => st.districts.forEach(d => all.push(d.name)));
    return Array.from(new Set(all)).sort();
  }
  const st = hierarchy.find(s => s.name.trim().toLowerCase() === stateName.trim().toLowerCase());
  if (!st) return [];
  return st.districts.map(d => d.name).sort();
}

export async function getActiveDivisions(stateName?: string, districtName?: string): Promise<string[]> {
  const hierarchy = await fetchTerritoryHierarchy();
  return getActiveDivisionsInternal(hierarchy, stateName, districtName);
}

export function getActiveDivisionsSync(stateName?: string, districtName?: string): string[] {
  const hierarchy = cachedHierarchy || [];
  return getActiveDivisionsInternal(hierarchy, stateName, districtName);
}

function getActiveDivisionsInternal(hierarchy: TerritoryState[], stateName?: string, districtName?: string): string[] {
  const allDivs: string[] = [];

  for (const st of hierarchy) {
    if (stateName && st.name.trim().toLowerCase() !== stateName.trim().toLowerCase()) {
      continue;
    }
    for (const dt of st.districts) {
      if (districtName && dt.name.trim().toLowerCase() !== districtName.trim().toLowerCase()) {
        continue;
      }
      for (const dv of dt.divisions) {
        allDivs.push(dv.name);
      }
    }
  }

  return Array.from(new Set(allDivs)).sort();
}

export async function getActivePincodes(stateName?: string, districtName?: string, divisionName?: string): Promise<TerritoryPincode[]> {
  const hierarchy = await fetchTerritoryHierarchy();
  return getActivePincodesInternal(hierarchy, stateName, districtName, divisionName);
}

export function getActivePincodesSync(stateName?: string, districtName?: string, divisionName?: string): TerritoryPincode[] {
  const hierarchy = cachedHierarchy || [];
  return getActivePincodesInternal(hierarchy, stateName, districtName, divisionName);
}

function getActivePincodesInternal(hierarchy: TerritoryState[], stateName?: string, districtName?: string, divisionName?: string): TerritoryPincode[] {
  const allPins: TerritoryPincode[] = [];

  for (const st of hierarchy) {
    if (stateName && st.name.trim().toLowerCase() !== stateName.trim().toLowerCase()) {
      continue;
    }
    for (const dt of st.districts) {
      if (districtName && dt.name.trim().toLowerCase() !== districtName.trim().toLowerCase()) {
        continue;
      }
      for (const dv of dt.divisions) {
        if (divisionName && dv.name.trim().toLowerCase() !== divisionName.trim().toLowerCase()) {
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
            name: pin.name,
            postOffice: pin.postOffice || pin.name,
            taluk: pin.taluk || dv.taluk,
            division: dv.name,
            district: dt.name,
            state: st.name
          };
        }
      }
    }
  }
  return null;
}
