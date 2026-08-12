// Centralized Location Master Data for Andhra Pradesh and other States

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
    "Krishnagiri",
    "Dharmapuri",
    "Chennai",
    "Coimbatore",
    "Salem",
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
  "Krishnagiri": ["Hosur Division", "Krishnagiri Division", "Denkanikottai Division", "Pochampalli Division"],
  "Dharmapuri": ["Dharmapuri Division", "Harur Division", "Palacode Division"],
  "Salem": ["Salem Urban Division", "Salem West Division", "Attur Division"],
  "Chennai": ["Chennai Central Division", "Chennai North Division", "Chennai South Division"],
  "Coimbatore": ["Coimbatore North Division", "Coimbatore South Division", "Pollachi Division"],

  // Karnataka
  "Bengaluru Urban": ["Bengaluru South Division", "Bengaluru North Division", "Bengaluru East Division", "Bengaluru West Division", "Electronic City Division", "Whitefield Division"]
};

export const PINCODE_DIRECTORY: Record<string, { state: string; division: string; district: string; postOffice: string }> = {
  // Andhra Pradesh Pincodes
  "520001": { state: "Andhra Pradesh", division: "Vijayawada Central Division", district: "NTR District", postOffice: "Vijayawada Head Office" },
  "520002": { state: "Andhra Pradesh", division: "Vijayawada Central Division", district: "NTR District", postOffice: "Governorpet Post Office" },
  "520003": { state: "Andhra Pradesh", division: "Vijayawada Central Division", district: "NTR District", postOffice: "Labbipet Post Office" },
  "530001": { state: "Andhra Pradesh", division: "Vizag City Division", district: "Visakhapatnam", postOffice: "Visakhapatnam Head Office" },
  "530016": { state: "Andhra Pradesh", division: "Vizag City Division", district: "Visakhapatnam", postOffice: "Dwarakanagar Post Office" },
  "522001": { state: "Andhra Pradesh", division: "Guntur Urban Division", district: "Guntur", postOffice: "Guntur Head Office" },
  "517501": { state: "Andhra Pradesh", division: "Tirupati Urban Division", district: "Tirupati", postOffice: "Tirupati Head Office" },
  "524001": { state: "Andhra Pradesh", division: "Nellore Division", district: "Nellore", postOffice: "Nellore Head Office" },
  "515001": { state: "Andhra Pradesh", division: "Anantapur Urban Division", district: "Anantapur", postOffice: "Anantapur Head Office" },
  "518001": { state: "Andhra Pradesh", division: "Kurnool Urban Division", district: "Kurnool", postOffice: "Kurnool Head Office" },

  // Tamil Nadu Pincodes
  "635109": { state: "Tamil Nadu", division: "Hosur Division", district: "Krishnagiri", postOffice: "Hosur Head Office" },
  "636112": { state: "Tamil Nadu", division: "Attur Division", district: "Salem", postOffice: "Attur Post Office" },

  // Karnataka Pincodes
  "560001": { state: "Karnataka", division: "Bengaluru Division", district: "Bengaluru Urban", postOffice: "Bengaluru G.P.O." }
};

export const getDistrictsForState = (stateName: string): string[] => {
  if (!stateName) return STATE_DISTRICTS["Andhra Pradesh"];
  const key = Object.keys(STATE_DISTRICTS).find(
    s => s.toLowerCase() === stateName.toLowerCase()
  );
  return key ? STATE_DISTRICTS[key] : STATE_DISTRICTS["Andhra Pradesh"];
};

export const getDivisionsForDistrict = (districtName: string, stateName?: string): string[] => {
  if (!districtName || districtName === 'all') {
    const currentState = stateName || "Andhra Pradesh";
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
    d => d.toLowerCase() === districtName.toLowerCase() || d.toLowerCase().replace(' district', '') === districtName.toLowerCase().replace(' district', '')
  );

  if (exactKey && DISTRICT_DIVISIONS[exactKey]) {
    return DISTRICT_DIVISIONS[exactKey];
  }

  return [`${districtName} Central Division`, `${districtName} North Division`, `${districtName} South Division`];
};

export const getLocationFromPincode = (pincodeStr: string) => {
  const pin = pincodeStr.trim();
  if (PINCODE_DIRECTORY[pin]) {
    return PINCODE_DIRECTORY[pin];
  }

  if (pin.length === 6 && /^\d+$/.test(pin)) {
    const prefix2 = pin.slice(0, 2);
    const prefix1 = pin.charAt(0);

    // Andhra Pradesh: 51, 52, 53
    if (prefix2 === '51' || prefix2 === '52' || prefix2 === '53') {
      return {
        state: "Andhra Pradesh",
        district: prefix2 === '53' ? "Visakhapatnam" : prefix2 === '52' ? "NTR District" : "Tirupati",
        division: prefix2 === '53' ? "Vizag City Division" : prefix2 === '52' ? "Vijayawada Central Division" : "Tirupati Urban Division",
        postOffice: `Post Office PIN-${pin}`
      };
    }

    // Telangana: 50
    if (prefix2 === '50') {
      return {
        state: "Telangana",
        district: "Hyderabad",
        division: "Hyderabad Central Division",
        postOffice: `Post Office PIN-${pin}`
      };
    }

    // Karnataka: 56, 57, 58, 59
    if (['56', '57', '58', '59'].includes(prefix2)) {
      return {
        state: "Karnataka",
        district: "Bengaluru Urban",
        division: "Bengaluru South Division",
        postOffice: `Post Office PIN-${pin}`
      };
    }

    // Tamil Nadu: 60, 61, 62, 63, 64
    if (['60', '61', '62', '63', '64'].includes(prefix2)) {
      return {
        state: "Tamil Nadu",
        district: "Krishnagiri",
        division: "Hosur Division",
        postOffice: `Post Office PIN-${pin}`
      };
    }
  }

  // Default fallback for AP State dashboard
  return {
    state: "Andhra Pradesh",
    district: "NTR District",
    division: "Vijayawada Central Division",
    postOffice: `Post Office PIN-${pin || '520001'}`
  };
};

export const getPincodesForDivision = (divisionName: string): string[] => {
  if (!divisionName) return ['530001', '530016', '530017', '530018', '530026'];
  const divLower = divisionName.toLowerCase();
  
  const matched = Object.keys(PINCODE_DIRECTORY).filter(
    pin => PINCODE_DIRECTORY[pin].division.toLowerCase() === divLower
  );
  if (matched.length > 0) return matched;

  if (divLower.includes('vizag')) return ['530001', '530016', '530017', '530018', '530026'];
  if (divLower.includes('anakapalle')) return ['531001', '531002', '531019'];
  if (divLower.includes('bheemuni')) return ['531163', '531164'];
  if (divLower.includes('vijayawada')) return ['520001', '520002', '520003'];
  if (divLower.includes('guntur')) return ['522001', '522002', '522003'];
  if (divLower.includes('tenali')) return ['522201', '522202', '522203'];
  if (divLower.includes('hosur')) return ['635109', '635110', '635126'];
  if (divLower.includes('denkanikottai')) return ['635107', '635114'];
  if (divLower.includes('attur')) return ['636112', '636113'];
  if (divLower.includes('bengaluru') || divLower.includes('bangalore')) return ['560001', '560002'];

  return ['530001', '530016', '530017', '530018', '530026'];
};

