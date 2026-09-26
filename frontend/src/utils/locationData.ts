/**
 * Centralized Location Master Data Provider for Agent Website
 * Single Source of Truth: Centralized Admin Pincode Management Database
 * Dynamic resolution without hardcoded fallback lists.
 */

import {
  fetchTerritoryHierarchy,
  getActiveStatesSync,
  getActiveDistrictsSync,
  getActiveDivisionsSync,
  getActivePincodesSync,
  lookupPincodeSync
} from './territoryService';

// Ensure hierarchy is loaded
fetchTerritoryHierarchy().catch(() => {});

/**
 * Get active districts for a state from Admin Pincode Management DB.
 * Returns empty array if state not found or has no active districts.
 */
export const getDistrictsForState = (stateName: string): string[] => {
  if (!stateName) return [];
  return getActiveDistrictsSync(stateName);
};

/**
 * Get active divisions for a district from Admin Pincode Management DB.
 * Returns empty array if district not found or has no active divisions.
 */
export const getDivisionsForDistrict = (districtName: string, stateName?: string): string[] => {
  if (!districtName || districtName === 'all') {
    return getActiveDivisionsSync(stateName);
  }
  return getActiveDivisionsSync(stateName, districtName);
};

/**
 * Get active pincodes for a division from Admin Pincode Management DB.
 * Returns empty array if division has no active pincodes.
 */
export const getPincodesForDivision = (divisionName: string, agentTerritoryPincode?: string): string[] => {
  if (!divisionName) {
    return agentTerritoryPincode ? [agentTerritoryPincode] : [];
  }

  const pins = getActivePincodesSync(undefined, undefined, divisionName);
  const codes = pins.map(p => p.code);

  if (codes.length > 0) {
    return codes;
  }

  // If agent has an assigned pincode, return that
  if (agentTerritoryPincode) {
    return [agentTerritoryPincode];
  }

  return [];
};

/**
 * Dynamically resolves location details from a 6-digit PIN code using Admin Pincode DB.
 */
export const getLocationFromPincode = (pincode: string, fallbackTerritory?: {
  state?: string;
  district?: string;
  division?: string;
  taluk?: string;
  postOffice?: string;
}): {
  state: string;
  district: string;
  division: string;
  taluk: string;
  postOffice: string;
} => {
  const pin = (pincode || '').replace(/\D/g, '').slice(0, 6);

  // 1. Lookup in Admin Pincode Management database hierarchy
  const dbMatch = lookupPincodeSync(pin);
  if (dbMatch) {
    return {
      state: dbMatch.state || fallbackTerritory?.state || '',
      district: dbMatch.district || fallbackTerritory?.district || '',
      division: dbMatch.division || fallbackTerritory?.division || '',
      taluk: dbMatch.taluk || fallbackTerritory?.taluk || '',
      postOffice: dbMatch.postOffice || fallbackTerritory?.postOffice || dbMatch.name || ''
    };
  }

  // 2. Return fallback territory if provided by caller
  if (fallbackTerritory && (fallbackTerritory.state || fallbackTerritory.district || fallbackTerritory.division)) {
    return {
      state: fallbackTerritory.state || '',
      district: fallbackTerritory.district || '',
      division: fallbackTerritory.division || '',
      taluk: fallbackTerritory.taluk || '',
      postOffice: fallbackTerritory.postOffice || ''
    };
  }

  return {
    state: '',
    district: '',
    division: '',
    taluk: '',
    postOffice: ''
  };
};

/**
 * Validate that vendor territory is strictly within the agent's jurisdiction.
 */
export const validateTerritoryBelongsToAgent = (
  agentRole: string,
  agentTerritory: { state?: string; district?: string; division?: string; pincode?: string } | undefined,
  vendorTerritory: { state?: string; district?: string; division?: string; pincode?: string }
): { valid: boolean; reason?: string } => {
  const norm = (s?: string) => (s || '').trim().toLowerCase().replace(' district', '').replace(' division', '');

  const aRole = (agentRole || 'pincode').toLowerCase();
  const aState = agentTerritory?.state || '';
  const aDistrict = agentTerritory?.district || '';
  const aDivision = agentTerritory?.division || '';
  const aPincode = (agentTerritory?.pincode || '').trim();

  const vState = vendorTerritory.state || '';
  const vDistrict = vendorTerritory.district || '';
  const vDivision = vendorTerritory.division || '';
  const vPincode = (vendorTerritory.pincode || '').trim();

  if (aRole === 'pincode') {
    if (aPincode && vPincode !== aPincode) {
      return {
        valid: false,
        reason: `Pincode Agent is restricted to onboard vendors only in approved Pincode ${aPincode}. Selected Pincode: ${vPincode}`
      };
    }
    return { valid: true };
  }

  if (aRole === 'division') {
    if (aDivision && norm(vDivision) !== norm(aDivision)) {
      return {
        valid: false,
        reason: `Division Agent is restricted to onboard vendors only within assigned Division ${aDivision}. Selected Division: ${vDivision}`
      };
    }
    return { valid: true };
  }

  if (aRole === 'district') {
    if (aDistrict && norm(vDistrict) !== norm(aDistrict)) {
      return {
        valid: false,
        reason: `District Agent is restricted to onboard vendors only within assigned District ${aDistrict}. Selected District: ${vDistrict}`
      };
    }
    return { valid: true };
  }

  if (aRole === 'state') {
    if (aState && norm(vState) !== norm(aState)) {
      return {
        valid: false,
        reason: `State Agent is restricted to onboard vendors only within assigned State ${aState}. Selected State: ${vState}`
      };
    }
    return { valid: true };
  }

  return { valid: true };
};
