/**
 * Centralized Admin Territory Service for Agent Application
 * Single Source of Truth: Admin Territory Database
 * State -> District -> Division -> PIN Code
 */

export interface TerritoryPincode {
  id: string;
  code: string;
  name?: string;
  postOffice?: string;
  status: string;
  activeAgentId?: any;
}

export interface TerritoryDivision {
  id: string;
  name: string;
  code?: string;
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

const API_ENDPOINTS = [
  '/api/territory/hierarchy',
  '/territory/hierarchy',
  'http://127.0.0.1:8004/api/territory/hierarchy',
  'http://localhost:8004/api/territory/hierarchy',
  'https://api.ficapp.in/api/territory/hierarchy'
];

export async function fetchTerritoryHierarchy(forceRefresh = false): Promise<TerritoryState[]> {
  if (cachedHierarchy && !forceRefresh) {
    return cachedHierarchy;
  }

  for (const url of API_ENDPOINTS) {
    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const json = await res.json();
        const rawHierarchy = json.hierarchy || (Array.isArray(json) ? json : null);
        if (rawHierarchy && Array.isArray(rawHierarchy)) {
          // Normalize only active items
          const cleaned: TerritoryState[] = rawHierarchy
            .filter((st: any) => st && st.name && (!st.status || st.status.toLowerCase() === 'active'))
            .map((st: any) => ({
              id: st.id || st._id,
              name: st.name.trim(),
              code: st.code || st.name.slice(0, 2).toUpperCase(),
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
                          postOffice: p.postOffice,
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
      // Continue to next fallback
    }
  }

  return cachedHierarchy || [];
}

export async function getActiveStates(): Promise<string[]> {
  const hierarchy = await fetchTerritoryHierarchy();
  return hierarchy.map(s => s.name).sort();
}

export async function getActiveDistricts(stateName: string): Promise<string[]> {
  if (!stateName) return [];
  const hierarchy = await fetchTerritoryHierarchy();
  const st = hierarchy.find(s => s.name.toLowerCase() === stateName.trim().toLowerCase());
  if (!st) return [];
  return st.districts.map(d => d.name).sort();
}

export async function getActiveDivisions(stateName: string, districtName: string): Promise<string[]> {
  if (!stateName || !districtName) return [];
  const hierarchy = await fetchTerritoryHierarchy();
  const st = hierarchy.find(s => s.name.toLowerCase() === stateName.trim().toLowerCase());
  if (!st) return [];
  const dt = st.districts.find(d => d.name.toLowerCase() === districtName.trim().toLowerCase());
  if (!dt) return [];
  return dt.divisions.map(v => v.name).sort();
}

export async function getActivePincodes(stateName: string, districtName: string, divisionName: string): Promise<TerritoryPincode[]> {
  if (!stateName || !districtName || !divisionName) return [];
  const hierarchy = await fetchTerritoryHierarchy();
  const st = hierarchy.find(s => s.name.toLowerCase() === stateName.trim().toLowerCase());
  if (!st) return [];
  const dt = st.districts.find(d => d.name.toLowerCase() === districtName.trim().toLowerCase());
  if (!dt) return [];
  const dv = dt.divisions.find(v => v.name.toLowerCase() === divisionName.trim().toLowerCase());
  if (!dv) return [];
  return dv.pincodes;
}
