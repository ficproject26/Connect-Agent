// Centralized Location Master Data for Agent Website Vendor Onboarding

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Telangana",
  "Tamil Nadu",
  "Karnataka",
  "Kerala",
  "Maharashtra",
  "Delhi",
  "Gujarat",
  "Uttar Pradesh",
  "West Bengal",
  "Rajasthan",
  "Madhya Pradesh",
  "Punjab",
  "Haryana",
  "Bihar",
  "Odisha",
  "Assam"
];

export const STATE_DISTRICTS: Record<string, string[]> = {
  "Andhra Pradesh": [
    "Visakhapatnam",
    "Vijayawada",
    "Guntur",
    "NTR District",
    "Tirupati",
    "Nellore",
    "Kakinada",
    "Kurnool",
    "Anantapur",
    "Kadapa",
    "Eluru",
    "Ongole"
  ],
  "Telangana": [
    "Hyderabad",
    "Rangareddy",
    "Medchal-Malkajgiri",
    "Warangal",
    "Nizamabad",
    "Karimnagar",
    "Khammam",
    "Mahabubnagar",
    "Nalgonda",
    "Sangareddy"
  ],
  "Tamil Nadu": [
    "Dharmapuri",
    "Krishnagiri",
    "Salem",
    "Chennai",
    "Coimbatore",
    "Tiruchirappalli",
    "Madurai",
    "Vellore",
    "Erode",
    "Tirunelveli",
    "Kanchipuram",
    "Thanjavur",
    "Cuddalore",
    "Dindigul",
    "Theni",
    "Tiruppur"
  ],
  "Karnataka": [
    "Bengaluru Urban",
    "Bengaluru Rural",
    "Mysuru",
    "Tumakuru",
    "Dakshina Kannada",
    "Hubballi-Dharwad",
    "Belagavi",
    "Mangaluru",
    "Ballari",
    "Shivamogga",
    "Udupi",
    "Kolar",
    "Mandya",
    "Hassan"
  ]
};

export const DISTRICT_DIVISIONS: Record<string, string[]> = {
  // Andhra Pradesh Districts
  "NTR District": ["Vijayawada Central Division", "Tiruvuru Division", "Nandigama Division"],
  "Vijayawada": ["Vijayawada Urban Division", "Gudivada Division", "Jaggaiahpeta Division"],
  "Visakhapatnam": ["Vizag City Division", "Anakapalle Division", "Bheemunipatnam Division"],
  "Guntur": ["Guntur Urban Division", "Tenali Division", "Narasaraopet Division"],
  "Tirupati": ["Tirupati Urban Division", "Srikalahasti Division", "Gudur Division"],
  "Nellore": ["Nellore Division", "Kavali Division", "Atmakur Division"],
  "Kakinada": ["Kakinada Division", "Peddapuram Division"],
  "Kurnool": ["Kurnool Urban Division", "Adoni Division", "Nandyal Division"],
  "Anantapur": ["Anantapur Urban Division", "Dharmavaram Division", "Hindupur Division"],
  "Kadapa": ["Kadapa Division", "Rajampet Division", "Proddatur Division"],
  "Eluru": ["Eluru Division", "Jangareddygudem Division"],
  "Ongole": ["Ongole Division", "Markapur Division"],

  // Telangana
  "Hyderabad": ["Hyderabad Central Division", "Secunderabad Division", "Charminar Division", "Cyberabad Division"],

  // Tamil Nadu
  "Dharmapuri": ["Harur Division", "Dharmapuri Division", "Palacode Division"],
  "Krishnagiri": ["Hosur Division", "Krishnagiri Division", "Denkanikottai Division", "Pochampalli Division"],
  "Salem": ["Salem Urban Division", "Salem West Division", "Attur Division"],
  "Chennai": ["Chennai Central Division", "Chennai North Division", "Chennai South Division"],
  "Coimbatore": ["Coimbatore North Division", "Coimbatore South Division", "Pollachi Division"],

  // Karnataka
  "Bengaluru Urban": ["Bengaluru South Division", "Bengaluru North Division", "Bengaluru East Division", "Bengaluru West Division", "Electronic City Division", "Whitefield Division"]
};

export interface LocationEntry {
  state: string;
  division: string;
  district: string;
  taluk: string;
  postOffice: string;
}

export const PINCODE_DIRECTORY: Record<string, LocationEntry> = {
  // Tamil Nadu - Dharmapuri District
  "636903": { state: "Tamil Nadu", division: "Harur Division", district: "Dharmapuri", taluk: "Harur", postOffice: "Harur Head Post Office" },
  "636906": { state: "Tamil Nadu", division: "Harur Division", district: "Dharmapuri", taluk: "Harur", postOffice: "Morappur Sub Post Office" },
  "636902": { state: "Tamil Nadu", division: "Harur Division", district: "Dharmapuri", taluk: "Harur", postOffice: "Kambainallur Post Office" },
  "636701": { state: "Tamil Nadu", division: "Dharmapuri Division", district: "Dharmapuri", taluk: "Dharmapuri", postOffice: "Dharmapuri Head Post Office" },
  "636702": { state: "Tamil Nadu", division: "Dharmapuri Division", district: "Dharmapuri", taluk: "Dharmapuri", postOffice: "Collectorate Post Office" },
  "636703": { state: "Tamil Nadu", division: "Dharmapuri Division", district: "Dharmapuri", taluk: "Dharmapuri", postOffice: "Adhiyamankottai Post Office" },
  "636808": { state: "Tamil Nadu", division: "Palacode Division", district: "Dharmapuri", taluk: "Palacode", postOffice: "Palacode Head Post Office" },
  "636809": { state: "Tamil Nadu", division: "Palacode Division", district: "Dharmapuri", taluk: "Palacode", postOffice: "Marandahalli Post Office" },

  // Tamil Nadu - Krishnagiri District
  "635109": { state: "Tamil Nadu", division: "Hosur Division", district: "Krishnagiri", taluk: "Hosur", postOffice: "Hosur Head Post Office" },
  "635110": { state: "Tamil Nadu", division: "Hosur Division", district: "Krishnagiri", taluk: "Hosur", postOffice: "Sipcot Industrial Post Office" },
  "635126": { state: "Tamil Nadu", division: "Hosur Division", district: "Krishnagiri", taluk: "Hosur", postOffice: "Mathigiri Post Office" },
  "635001": { state: "Tamil Nadu", division: "Krishnagiri Division", district: "Krishnagiri", taluk: "Krishnagiri", postOffice: "Krishnagiri Head Post Office" },
  "635002": { state: "Tamil Nadu", division: "Krishnagiri Division", district: "Krishnagiri", taluk: "Krishnagiri", postOffice: "Kattivasanpet Post Office" },
  "635107": { state: "Tamil Nadu", division: "Denkanikottai Division", district: "Krishnagiri", taluk: "Denkanikottai", postOffice: "Denkanikottai Post Office" },
  "635114": { state: "Tamil Nadu", division: "Denkanikottai Division", district: "Krishnagiri", taluk: "Denkanikottai", postOffice: "Thally Post Office" },
  "635206": { state: "Tamil Nadu", division: "Pochampalli Division", district: "Krishnagiri", taluk: "Pochampalli", postOffice: "Pochampalli Post Office" },

  // Tamil Nadu - Salem District
  "636001": { state: "Tamil Nadu", division: "Salem Urban Division", district: "Salem", taluk: "Salem", postOffice: "Salem Head Post Office" },
  "636002": { state: "Tamil Nadu", division: "Salem Urban Division", district: "Salem", taluk: "Salem", postOffice: "Shevapet Post Office" },
  "636007": { state: "Tamil Nadu", division: "Salem West Division", district: "Salem", taluk: "Salem West", postOffice: "Karuppur Post Office" },
  "636008": { state: "Tamil Nadu", division: "Salem West Division", district: "Salem", taluk: "Salem West", postOffice: "Suramangalam Post Office" },
  "636112": { state: "Tamil Nadu", division: "Attur Division", district: "Salem", taluk: "Attur", postOffice: "Attur Post Office" },
  "636113": { state: "Tamil Nadu", division: "Attur Division", district: "Salem", taluk: "Attur", postOffice: "Thalaivasal Post Office" },

  // Tamil Nadu - Chennai District
  "600001": { state: "Tamil Nadu", division: "Chennai Central Division", district: "Chennai", taluk: "Chennai Central", postOffice: "Chennai G.P.O." },
  "600002": { state: "Tamil Nadu", division: "Chennai Central Division", district: "Chennai", taluk: "Chennai Central", postOffice: "Anna Salai Post Office" },
  "600010": { state: "Tamil Nadu", division: "Chennai North Division", district: "Chennai", taluk: "Kilpauk", postOffice: "Kilpauk Post Office" },
  "600028": { state: "Tamil Nadu", division: "Chennai South Division", district: "Chennai", taluk: "Mylapore", postOffice: "R.A. Puram Post Office" },

  // Andhra Pradesh - NTR District
  "520001": { state: "Andhra Pradesh", division: "Vijayawada Central Division", district: "NTR District", taluk: "Vijayawada Urban", postOffice: "Vijayawada Head Post Office" },
  "520002": { state: "Andhra Pradesh", division: "Vijayawada Central Division", district: "NTR District", taluk: "Vijayawada Urban", postOffice: "Governorpet Post Office" },
  "520003": { state: "Andhra Pradesh", division: "Vijayawada Central Division", district: "NTR District", taluk: "Vijayawada Urban", postOffice: "Labbipet Post Office" },
  "520010": { state: "Andhra Pradesh", division: "Vijayawada Central Division", district: "NTR District", taluk: "Vijayawada Urban", postOffice: "Patamata Post Office" },
  "521235": { state: "Andhra Pradesh", division: "Tiruvuru Division", district: "NTR District", taluk: "Tiruvuru", postOffice: "Tiruvuru Post Office" },
  "521185": { state: "Andhra Pradesh", division: "Nandigama Division", district: "NTR District", taluk: "Nandigama", postOffice: "Nandigama Post Office" },

  // Andhra Pradesh - Visakhapatnam District
  "530001": { state: "Andhra Pradesh", division: "Vizag City Division", district: "Visakhapatnam", taluk: "Visakhapatnam Urban", postOffice: "Visakhapatnam Head Post Office" },
  "530016": { state: "Andhra Pradesh", division: "Vizag City Division", district: "Visakhapatnam", taluk: "Visakhapatnam Urban", postOffice: "Dwarakanagar Post Office" },
  "530017": { state: "Andhra Pradesh", division: "Vizag City Division", district: "Visakhapatnam", taluk: "Visakhapatnam Urban", postOffice: "MVP Colony Post Office" },
  "530026": { state: "Andhra Pradesh", division: "Vizag City Division", district: "Visakhapatnam", taluk: "Visakhapatnam Urban", postOffice: "Gajuwaka Post Office" },
  "531001": { state: "Andhra Pradesh", division: "Anakapalle Division", district: "Visakhapatnam", taluk: "Anakapalle", postOffice: "Anakapalle Head Post Office" },
  "531163": { state: "Andhra Pradesh", division: "Bheemunipatnam Division", district: "Visakhapatnam", taluk: "Bheemunipatnam", postOffice: "Bheemunipatnam Post Office" },

  // Andhra Pradesh - Guntur District
  "522001": { state: "Andhra Pradesh", division: "Guntur Urban Division", district: "Guntur", taluk: "Guntur Urban", postOffice: "Guntur Head Post Office" },
  "522002": { state: "Andhra Pradesh", division: "Guntur Urban Division", district: "Guntur", taluk: "Guntur Urban", postOffice: "Arundalpet Post Office" },
  "522201": { state: "Andhra Pradesh", division: "Tenali Division", district: "Guntur", taluk: "Tenali", postOffice: "Tenali Head Post Office" },
  "522601": { state: "Andhra Pradesh", division: "Narasaraopet Division", district: "Guntur", taluk: "Narasaraopet", postOffice: "Narasaraopet Post Office" },

  // Andhra Pradesh - Tirupati District
  "517501": { state: "Andhra Pradesh", division: "Tirupati Urban Division", district: "Tirupati", taluk: "Tirupati Urban", postOffice: "Tirupati Head Post Office" },
  "517507": { state: "Andhra Pradesh", division: "Tirupati Urban Division", district: "Tirupati", taluk: "Tirupati Urban", postOffice: "Tirumala Post Office" },
  "517644": { state: "Andhra Pradesh", division: "Srikalahasti Division", district: "Tirupati", taluk: "Srikalahasti", postOffice: "Srikalahasti Post Office" },
  "524101": { state: "Andhra Pradesh", division: "Gudur Division", district: "Tirupati", taluk: "Gudur", postOffice: "Gudur Post Office" },

  // Andhra Pradesh - Nellore District
  "524001": { state: "Andhra Pradesh", division: "Nellore Division", district: "Nellore", taluk: "Nellore", postOffice: "Nellore Head Post Office" },
  "524201": { state: "Andhra Pradesh", division: "Kavali Division", district: "Nellore", taluk: "Kavali", postOffice: "Kavali Post Office" },

  // Andhra Pradesh - Kurnool District
  "518001": { state: "Andhra Pradesh", division: "Kurnool Urban Division", district: "Kurnool", taluk: "Kurnool", postOffice: "Kurnool Head Post Office" },
  "518301": { state: "Andhra Pradesh", division: "Adoni Division", district: "Kurnool", taluk: "Adoni", postOffice: "Adoni Post Office" },
  "518501": { state: "Andhra Pradesh", division: "Nandyal Division", district: "Kurnool", taluk: "Nandyal", postOffice: "Nandyal Post Office" },

  // Andhra Pradesh - Anantapur District
  "515001": { state: "Andhra Pradesh", division: "Anantapur Urban Division", district: "Anantapur", taluk: "Anantapur", postOffice: "Anantapur Head Post Office" },
  "515671": { state: "Andhra Pradesh", division: "Dharmavaram Division", district: "Anantapur", taluk: "Dharmavaram", postOffice: "Dharmavaram Post Office" },
  "515201": { state: "Andhra Pradesh", division: "Hindupur Division", district: "Anantapur", taluk: "Hindupur", postOffice: "Hindupur Post Office" },

  // Karnataka - Bengaluru Urban
  "560001": { state: "Karnataka", division: "Bengaluru South Division", district: "Bengaluru Urban", taluk: "Bengaluru South", postOffice: "Bengaluru G.P.O." },
  "560002": { state: "Karnataka", division: "Bengaluru South Division", district: "Bengaluru Urban", taluk: "Bengaluru South", postOffice: "City Market Post Office" },
  "560003": { state: "Karnataka", division: "Bengaluru North Division", district: "Bengaluru Urban", taluk: "Bengaluru North", postOffice: "Malleshwaram Post Office" },
  "560008": { state: "Karnataka", division: "Bengaluru East Division", district: "Bengaluru Urban", taluk: "Bengaluru East", postOffice: "Halasuru Post Office" },
  "560010": { state: "Karnataka", division: "Bengaluru West Division", district: "Bengaluru Urban", taluk: "Bengaluru West", postOffice: "Rajajinagar Post Office" },
  "560072": { state: "Karnataka", division: "Bengaluru West Division", district: "Bengaluru Urban", taluk: "Bengaluru West", postOffice: "Nagarbhavi Post Office" },
  "560100": { state: "Karnataka", division: "Electronic City Division", district: "Bengaluru Urban", taluk: "Anekal", postOffice: "Electronic City Post Office" },
  "560066": { state: "Karnataka", division: "Whitefield Division", district: "Bengaluru Urban", taluk: "KR Puram", postOffice: "Whitefield Post Office" },

  // Telangana - Hyderabad
  "500001": { state: "Telangana", division: "Hyderabad Central Division", district: "Hyderabad", taluk: "Nampally", postOffice: "Hyderabad G.P.O." },
  "500002": { state: "Telangana", division: "Charminar Division", district: "Hyderabad", taluk: "Charminar", postOffice: "Charminar Post Office" },
  "500003": { state: "Telangana", division: "Secunderabad Division", district: "Hyderabad", taluk: "Secunderabad", postOffice: "Secunderabad Head Post Office" },
  "500081": { state: "Telangana", division: "Cyberabad Division", district: "Hyderabad", taluk: "Serilingampally", postOffice: "Madhapur Post Office" }
};

export const getDistrictsForState = (stateName: string): string[] => {
  if (!stateName) return STATE_DISTRICTS["Tamil Nadu"] || [];
  const key = Object.keys(STATE_DISTRICTS).find(
    s => s.toLowerCase() === stateName.toLowerCase()
  );
  return key ? STATE_DISTRICTS[key] : (STATE_DISTRICTS["Tamil Nadu"] || []);
};

export const getDivisionsForDistrict = (districtName: string, stateName?: string): string[] => {
  if (!districtName || districtName === 'all') {
    const currentState = stateName || "Tamil Nadu";
    const dists = getDistrictsForState(currentState);
    const allDivs: string[] = [];
    dists.forEach(d => {
      if (DISTRICT_DIVISIONS[d]) {
        allDivs.push(...DISTRICT_DIVISIONS[d]);
      }
    });
    return Array.from(new Set(allDivs));
  }

  // Exact district lookup
  const exactKey = Object.keys(DISTRICT_DIVISIONS).find(
    d => d.toLowerCase() === districtName.toLowerCase() ||
         d.toLowerCase().replace(' district', '') === districtName.toLowerCase().replace(' district', '')
  );

  if (exactKey && DISTRICT_DIVISIONS[exactKey]) {
    return DISTRICT_DIVISIONS[exactKey];
  }

  return [`${districtName} Division`, `${districtName} Central Division`];
};

export const getPincodesForDivision = (divisionName: string, agentTerritoryPincode?: string): string[] => {
  if (!divisionName) {
    return agentTerritoryPincode ? [agentTerritoryPincode] : ['636903'];
  }
  const divLower = divisionName.toLowerCase().trim();

  // Find all directory matches
  const matched = Object.keys(PINCODE_DIRECTORY).filter(pin => {
    const entry = PINCODE_DIRECTORY[pin];
    return entry.division.toLowerCase().trim() === divLower ||
           entry.division.toLowerCase().replace(' division', '').trim() === divLower.replace(' division', '').trim();
  });

  // If agent has an approved pincode matching this division or territory, ensure it is included
  if (agentTerritoryPincode && /^\d{6}$/.test(agentTerritoryPincode.trim())) {
    const cleanPin = agentTerritoryPincode.trim();
    if (!matched.includes(cleanPin)) {
      matched.unshift(cleanPin);
    }
  }

  if (matched.length > 0) return Array.from(new Set(matched));

  // Fallbacks by division keywords
  if (divLower.includes('harur')) return ['636903', '636906', '636902'];
  if (divLower.includes('dharmapuri')) return ['636701', '636702', '636703'];
  if (divLower.includes('palacode')) return ['636808', '636809'];
  if (divLower.includes('hosur')) return ['635109', '635110', '635126'];
  if (divLower.includes('krishnagiri')) return ['635001', '635002'];
  if (divLower.includes('denkanikottai')) return ['635107', '635114'];
  if (divLower.includes('pochampalli')) return ['635206'];
  if (divLower.includes('attur')) return ['636112', '636113'];
  if (divLower.includes('salem west')) return ['636007', '636008'];
  if (divLower.includes('salem')) return ['636001', '636002'];
  if (divLower.includes('chennai central')) return ['600001', '600002'];
  if (divLower.includes('chennai north')) return ['600010'];
  if (divLower.includes('chennai south')) return ['600028'];
  if (divLower.includes('vijayawada')) return ['520001', '520002', '520003', '520010'];
  if (divLower.includes('tiruvuru')) return ['521235'];
  if (divLower.includes('nandigama')) return ['521185'];
  if (divLower.includes('vizag') || divLower.includes('visakhapatnam')) return ['530001', '530016', '530017', '530026'];
  if (divLower.includes('anakapalle')) return ['531001'];
  if (divLower.includes('bheemuni')) return ['531163'];
  if (divLower.includes('guntur')) return ['522001', '522002'];
  if (divLower.includes('tenali')) return ['522201'];
  if (divLower.includes('tirupati')) return ['517501', '517507'];
  if (divLower.includes('nellore')) return ['524001'];
  if (divLower.includes('kurnool')) return ['518001'];
  if (divLower.includes('anantapur')) return ['515001'];

  return agentTerritoryPincode ? [agentTerritoryPincode] : ['636903'];
};

export const getLocationFromPincode = (pincodeStr: string, fallbackTerritory?: {
  state?: string;
  district?: string;
  division?: string;
  taluk?: string;
  postOffice?: string;
}): LocationEntry => {
  const pin = (pincodeStr || '').trim();

  // 1. Exact match in PINCODE_DIRECTORY
  if (PINCODE_DIRECTORY[pin]) {
    return { ...PINCODE_DIRECTORY[pin] };
  }

  // 2. If fallback territory provided and matches pincode
  if (fallbackTerritory && (fallbackTerritory.state || fallbackTerritory.district || fallbackTerritory.division)) {
    return {
      state: fallbackTerritory.state || 'Tamil Nadu',
      district: fallbackTerritory.district || 'Dharmapuri',
      division: fallbackTerritory.division || 'Harur Division',
      taluk: fallbackTerritory.taluk || fallbackTerritory.division?.replace(' Division', '') || 'Harur',
      postOffice: fallbackTerritory.postOffice || `Post Office PIN-${pin}`
    };
  }

  // 3. Fallback prefix resolution for 6 digits
  if (pin.length === 6 && /^\d+$/.test(pin)) {
    const prefix2 = pin.slice(0, 2);

    // Tamil Nadu: 60, 61, 62, 63, 64
    if (['60', '61', '62', '63', '64'].includes(prefix2)) {
      const prefix3 = pin.slice(0, 3);
      if (prefix3 === '636') {
        return {
          state: "Tamil Nadu",
          district: "Dharmapuri",
          division: "Harur Division",
          taluk: "Harur",
          postOffice: `Post Office PIN-${pin}`
        };
      }
      if (prefix3 === '635') {
        return {
          state: "Tamil Nadu",
          district: "Krishnagiri",
          division: "Hosur Division",
          taluk: "Hosur",
          postOffice: `Post Office PIN-${pin}`
        };
      }
      return {
        state: "Tamil Nadu",
        district: "Chennai",
        division: "Chennai Central Division",
        taluk: "Chennai",
        postOffice: `Post Office PIN-${pin}`
      };
    }

    // Andhra Pradesh: 51, 52, 53
    if (['51', '52', '53'].includes(prefix2)) {
      return {
        state: "Andhra Pradesh",
        district: prefix2 === '53' ? "Visakhapatnam" : prefix2 === '52' ? "NTR District" : "Tirupati",
        division: prefix2 === '53' ? "Vizag City Division" : prefix2 === '52' ? "Vijayawada Central Division" : "Tirupati Urban Division",
        taluk: prefix2 === '53' ? "Visakhapatnam Urban" : prefix2 === '52' ? "Vijayawada Urban" : "Tirupati Urban",
        postOffice: `Post Office PIN-${pin}`
      };
    }

    // Karnataka: 56, 57, 58, 59
    if (['56', '57', '58', '59'].includes(prefix2)) {
      return {
        state: "Karnataka",
        district: "Bengaluru Urban",
        division: "Bengaluru South Division",
        taluk: "Bengaluru South",
        postOffice: `Post Office PIN-${pin}`
      };
    }

    // Telangana: 50
    if (prefix2 === '50') {
      return {
        state: "Telangana",
        district: "Hyderabad",
        division: "Hyderabad Central Division",
        taluk: "Hyderabad",
        postOffice: `Post Office PIN-${pin}`
      };
    }
  }

  // Fallback default
  return {
    state: "Tamil Nadu",
    district: "Dharmapuri",
    division: "Harur Division",
    taluk: "Harur",
    postOffice: `Post Office PIN-${pin || '636903'}`
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
    // Check if pincode belongs to division
    const validPins = getPincodesForDivision(aDivision, aPincode);
    if (validPins.length > 0 && !validPins.includes(vPincode)) {
      return {
        valid: false,
        reason: `Pincode ${vPincode} does not belong to your assigned Division ${aDivision}.`
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
    // Division must belong to district
    const validDivs = getDivisionsForDistrict(aDistrict, aState);
    if (validDivs.length > 0 && !validDivs.some(d => norm(d) === norm(vDivision))) {
      return {
        valid: false,
        reason: `Division ${vDivision} does not belong to your assigned District ${aDistrict}.`
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
