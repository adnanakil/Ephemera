// NYC Borough centers
const BOROUGH_CENTERS = {
  'Manhattan': { lat: 40.7831, lng: -73.9712 },
  'Brooklyn': { lat: 40.6782, lng: -73.9442 },
  'Queens': { lat: 40.7282, lng: -73.7949 },
  'The Bronx': { lat: 40.8448, lng: -73.8648 },
  'Staten Island': { lat: 40.5795, lng: -74.1502 },
};

// Key neighborhood coordinates
const NEIGHBORHOOD_COORDS: Record<string, { lat: number; lng: number }> = {
  // Manhattan
  'harlem': { lat: 40.8116, lng: -73.9465 },
  'east harlem': { lat: 40.7957, lng: -73.9389 },
  'central park': { lat: 40.7829, lng: -73.9654 },
  'times square': { lat: 40.7580, lng: -73.9855 },
  'soho': { lat: 40.7233, lng: -74.0030 },
  'chelsea': { lat: 40.7465, lng: -74.0014 },
  'greenwich village': { lat: 40.7336, lng: -74.0027 },
  'west village': { lat: 40.7358, lng: -74.0036 },
  'east village': { lat: 40.7264, lng: -73.9815 },
  'upper west side': { lat: 40.7870, lng: -73.9754 },
  'upper east side': { lat: 40.7736, lng: -73.9566 },
  'financial district': { lat: 40.7074, lng: -74.0113 },
  'tribeca': { lat: 40.7163, lng: -74.0086 },
  'lower east side': { lat: 40.7154, lng: -73.9874 },
  'chinatown': { lat: 40.7158, lng: -73.9970 },
  'little italy': { lat: 40.7193, lng: -73.9973 },
  'nolita': { lat: 40.7233, lng: -73.9950 },
  'union square': { lat: 40.7359, lng: -73.9911 },
  'gramercy': { lat: 40.7373, lng: -73.9858 },
  'murray hill': { lat: 40.7478, lng: -73.9754 },
  'kips bay': { lat: 40.7427, lng: -73.9760 },
  'flatiron': { lat: 40.7411, lng: -73.9897 },
  'nomad': { lat: 40.7448, lng: -73.9876 },
  'hells kitchen': { lat: 40.7637, lng: -73.9918 },
  'midtown': { lat: 40.7549, lng: -73.9840 },
  'washington heights': { lat: 40.8505, lng: -73.9363 },
  'inwood': { lat: 40.8677, lng: -73.9212 },
  'morningside heights': { lat: 40.8108, lng: -73.9606 },
  'battery park': { lat: 40.7033, lng: -74.0170 },

  // Brooklyn
  'williamsburg': { lat: 40.7081, lng: -73.9571 },
  'greenpoint': { lat: 40.7304, lng: -73.9519 },
  'bushwick': { lat: 40.6942, lng: -73.9222 },
  'dumbo': { lat: 40.7033, lng: -73.9888 },
  'brooklyn heights': { lat: 40.6955, lng: -73.9940 },
  'park slope': { lat: 40.6710, lng: -73.9778 },
  'prospect heights': { lat: 40.6779, lng: -73.9690 },
  'crown heights': { lat: 40.6689, lng: -73.9420 },
  'bedford stuyvesant': { lat: 40.6867, lng: -73.9532 },
  'bed stuy': { lat: 40.6867, lng: -73.9532 },
  'fort greene': { lat: 40.6915, lng: -73.9739 },
  'clinton hill': { lat: 40.6883, lng: -73.9662 },
  'boerum hill': { lat: 40.6863, lng: -73.9851 },
  'cobble hill': { lat: 40.6862, lng: -73.9961 },
  'carroll gardens': { lat: 40.6787, lng: -73.9991 },
  'gowanus': { lat: 40.6732, lng: -73.9965 },
  'red hook': { lat: 40.6747, lng: -74.0112 },
  'sunset park': { lat: 40.6462, lng: -74.0151 },
  'bay ridge': { lat: 40.6260, lng: -74.0301 },
  'bensonhurst': { lat: 40.6017, lng: -73.9942 },
  'coney island': { lat: 40.5755, lng: -73.9707 },
  'brighton beach': { lat: 40.5776, lng: -73.9596 },
  'sheepshead bay': { lat: 40.5872, lng: -73.9393 },
  'flatbush': { lat: 40.6527, lng: -73.9595 },
  'east flatbush': { lat: 40.6522, lng: -73.9333 },
  'canarsie': { lat: 40.6404, lng: -73.9002 },
  'brownsville': { lat: 40.6628, lng: -73.9104 },
  'east new york': { lat: 40.6665, lng: -73.8827 },
  'brooklyn bridge park': { lat: 40.7018, lng: -73.9967 },

  // Queens
  'astoria': { lat: 40.7644, lng: -73.9235 },
  'long island city': { lat: 40.7447, lng: -73.9485 },
  'lic': { lat: 40.7447, lng: -73.9485 },
  'flushing': { lat: 40.7676, lng: -73.8333 },
  'jackson heights': { lat: 40.7557, lng: -73.8831 },
  'corona': { lat: 40.7467, lng: -73.8617 },
  'elmhurst': { lat: 40.7361, lng: -73.8775 },
  'forest hills': { lat: 40.7189, lng: -73.8448 },
  'rego park': { lat: 40.7265, lng: -73.8619 },
  'kew gardens': { lat: 40.7146, lng: -73.8308 },
  'jamaica': { lat: 40.6942, lng: -73.8064 },
  'bayside': { lat: 40.7685, lng: -73.7693 },
  'whitestone': { lat: 40.7943, lng: -73.8170 },
  'woodside': { lat: 40.7456, lng: -73.9052 },
  'sunnyside': { lat: 40.7433, lng: -73.9196 },
  'ridgewood': { lat: 40.7006, lng: -73.9052 },
  'middle village': { lat: 40.7173, lng: -73.8803 },
  'maspeth': { lat: 40.7243, lng: -73.9123 },
  'glendale': { lat: 40.7017, lng: -73.8828 },
  'rockaway': { lat: 40.5926, lng: -73.8070 },
  'far rockaway': { lat: 40.6052, lng: -73.7553 },

  // Bronx
  'south bronx': { lat: 40.8242, lng: -73.9126 },
  'hunts point': { lat: 40.8129, lng: -73.8831 },
  'mott haven': { lat: 40.8125, lng: -73.9195 },
  'morrisania': { lat: 40.8315, lng: -73.9054 },
  'fordham': { lat: 40.8619, lng: -73.8977 },
  'belmont': { lat: 40.8549, lng: -73.8896 },
  'riverdale': { lat: 40.8958, lng: -73.9126 },
  'kingsbridge': { lat: 40.8812, lng: -73.9051 },
  'pelham bay': { lat: 40.8518, lng: -73.8287 },
  'city island': { lat: 40.8470, lng: -73.7867 },
  'throgs neck': { lat: 40.8185, lng: -73.8234 },
  'co-op city': { lat: 40.8741, lng: -73.8290 },
  'yankee stadium': { lat: 40.8296, lng: -73.9262 },

  // Staten Island
  'st. george': { lat: 40.6437, lng: -74.0737 },
  'saint george': { lat: 40.6437, lng: -74.0737 },
  'stapleton': { lat: 40.6269, lng: -74.0779 },
  'tompkinsville': { lat: 40.6357, lng: -74.0771 },
  'new brighton': { lat: 40.6406, lng: -74.0910 },
  'port richmond': { lat: 40.6340, lng: -74.1352 },
  'great kills': { lat: 40.5541, lng: -74.1501 },
  'tottenville': { lat: 40.5051, lng: -74.2515 },
};

// Simplified location mappings
const LOCATION_MAPPINGS: Record<string, { borough: string; neighborhood: string }> = {
  // Manhattan neighborhoods
  'harlem': { borough: 'Manhattan', neighborhood: 'Harlem' },
  'east harlem': { borough: 'Manhattan', neighborhood: 'East Harlem' },
  'upper west side': { borough: 'Manhattan', neighborhood: 'Upper West Side' },
  'upper east side': { borough: 'Manhattan', neighborhood: 'Upper East Side' },
  'midtown': { borough: 'Manhattan', neighborhood: 'Midtown' },
  'chelsea': { borough: 'Manhattan', neighborhood: 'Chelsea' },
  'greenwich village': { borough: 'Manhattan', neighborhood: 'Greenwich Village' },
  'west village': { borough: 'Manhattan', neighborhood: 'West Village' },
  'east village': { borough: 'Manhattan', neighborhood: 'East Village' },
  'soho': { borough: 'Manhattan', neighborhood: 'SoHo' },
  'tribeca': { borough: 'Manhattan', neighborhood: 'Tribeca' },
  'financial district': { borough: 'Manhattan', neighborhood: 'Financial District' },
  'lower east side': { borough: 'Manhattan', neighborhood: 'Lower East Side' },
  'chinatown': { borough: 'Manhattan', neighborhood: 'Chinatown' },
  'little italy': { borough: 'Manhattan', neighborhood: 'Little Italy' },
  'nolita': { borough: 'Manhattan', neighborhood: 'Nolita' },
  'union square': { borough: 'Manhattan', neighborhood: 'Union Square' },
  'gramercy': { borough: 'Manhattan', neighborhood: 'Gramercy' },
  'murray hill': { borough: 'Manhattan', neighborhood: 'Murray Hill' },
  'kips bay': { borough: 'Manhattan', neighborhood: 'Kips Bay' },
  'flatiron': { borough: 'Manhattan', neighborhood: 'Flatiron' },
  'nomad': { borough: 'Manhattan', neighborhood: 'NoMad' },
  'hells kitchen': { borough: 'Manhattan', neighborhood: 'Hell\'s Kitchen' },
  'times square': { borough: 'Manhattan', neighborhood: 'Times Square' },
  'washington heights': { borough: 'Manhattan', neighborhood: 'Washington Heights' },
  'inwood': { borough: 'Manhattan', neighborhood: 'Inwood' },
  'morningside heights': { borough: 'Manhattan', neighborhood: 'Morningside Heights' },
  'central park': { borough: 'Manhattan', neighborhood: 'Central Park' },
  'battery park': { borough: 'Manhattan', neighborhood: 'Battery Park' },

  // Brooklyn neighborhoods
  'williamsburg': { borough: 'Brooklyn', neighborhood: 'Williamsburg' },
  'greenpoint': { borough: 'Brooklyn', neighborhood: 'Greenpoint' },
  'bushwick': { borough: 'Brooklyn', neighborhood: 'Bushwick' },
  'dumbo': { borough: 'Brooklyn', neighborhood: 'DUMBO' },
  'brooklyn heights': { borough: 'Brooklyn', neighborhood: 'Brooklyn Heights' },
  'park slope': { borough: 'Brooklyn', neighborhood: 'Park Slope' },
  'prospect heights': { borough: 'Brooklyn', neighborhood: 'Prospect Heights' },
  'crown heights': { borough: 'Brooklyn', neighborhood: 'Crown Heights' },
  'bedford stuyvesant': { borough: 'Brooklyn', neighborhood: 'Bedford-Stuyvesant' },
  'bed stuy': { borough: 'Brooklyn', neighborhood: 'Bedford-Stuyvesant' },
  'fort greene': { borough: 'Brooklyn', neighborhood: 'Fort Greene' },
  'clinton hill': { borough: 'Brooklyn', neighborhood: 'Clinton Hill' },
  'boerum hill': { borough: 'Brooklyn', neighborhood: 'Boerum Hill' },
  'cobble hill': { borough: 'Brooklyn', neighborhood: 'Cobble Hill' },
  'carroll gardens': { borough: 'Brooklyn', neighborhood: 'Carroll Gardens' },
  'gowanus': { borough: 'Brooklyn', neighborhood: 'Gowanus' },
  'red hook': { borough: 'Brooklyn', neighborhood: 'Red Hook' },
  'sunset park': { borough: 'Brooklyn', neighborhood: 'Sunset Park' },
  'bay ridge': { borough: 'Brooklyn', neighborhood: 'Bay Ridge' },
  'bensonhurst': { borough: 'Brooklyn', neighborhood: 'Bensonhurst' },
  'coney island': { borough: 'Brooklyn', neighborhood: 'Coney Island' },
  'brighton beach': { borough: 'Brooklyn', neighborhood: 'Brighton Beach' },
  'sheepshead bay': { borough: 'Brooklyn', neighborhood: 'Sheepshead Bay' },
  'flatbush': { borough: 'Brooklyn', neighborhood: 'Flatbush' },
  'east flatbush': { borough: 'Brooklyn', neighborhood: 'East Flatbush' },
  'canarsie': { borough: 'Brooklyn', neighborhood: 'Canarsie' },
  'brownsville': { borough: 'Brooklyn', neighborhood: 'Brownsville' },
  'east new york': { borough: 'Brooklyn', neighborhood: 'East New York' },
  'brooklyn bridge park': { borough: 'Brooklyn', neighborhood: 'Brooklyn Bridge Park' },

  // Queens neighborhoods
  'astoria': { borough: 'Queens', neighborhood: 'Astoria' },
  'long island city': { borough: 'Queens', neighborhood: 'Long Island City' },
  'lic': { borough: 'Queens', neighborhood: 'Long Island City' },
  'flushing': { borough: 'Queens', neighborhood: 'Flushing' },
  'jackson heights': { borough: 'Queens', neighborhood: 'Jackson Heights' },
  'corona': { borough: 'Queens', neighborhood: 'Corona' },
  'elmhurst': { borough: 'Queens', neighborhood: 'Elmhurst' },
  'forest hills': { borough: 'Queens', neighborhood: 'Forest Hills' },
  'rego park': { borough: 'Queens', neighborhood: 'Rego Park' },
  'kew gardens': { borough: 'Queens', neighborhood: 'Kew Gardens' },
  'jamaica': { borough: 'Queens', neighborhood: 'Jamaica' },
  'bayside': { borough: 'Queens', neighborhood: 'Bayside' },
  'whitestone': { borough: 'Queens', neighborhood: 'Whitestone' },
  'woodside': { borough: 'Queens', neighborhood: 'Woodside' },
  'sunnyside': { borough: 'Queens', neighborhood: 'Sunnyside' },
  'ridgewood': { borough: 'Queens', neighborhood: 'Ridgewood' },
  'middle village': { borough: 'Queens', neighborhood: 'Middle Village' },
  'maspeth': { borough: 'Queens', neighborhood: 'Maspeth' },
  'glendale': { borough: 'Queens', neighborhood: 'Glendale' },
  'rockaway': { borough: 'Queens', neighborhood: 'Rockaway' },
  'far rockaway': { borough: 'Queens', neighborhood: 'Far Rockaway' },

  // Bronx neighborhoods
  'south bronx': { borough: 'The Bronx', neighborhood: 'South Bronx' },
  'hunts point': { borough: 'The Bronx', neighborhood: 'Hunts Point' },
  'mott haven': { borough: 'The Bronx', neighborhood: 'Mott Haven' },
  'morrisania': { borough: 'The Bronx', neighborhood: 'Morrisania' },
  'fordham': { borough: 'The Bronx', neighborhood: 'Fordham' },
  'belmont': { borough: 'The Bronx', neighborhood: 'Belmont' },
  'riverdale': { borough: 'The Bronx', neighborhood: 'Riverdale' },
  'kingsbridge': { borough: 'The Bronx', neighborhood: 'Kingsbridge' },
  'pelham bay': { borough: 'The Bronx', neighborhood: 'Pelham Bay' },
  'city island': { borough: 'The Bronx', neighborhood: 'City Island' },
  'throgs neck': { borough: 'The Bronx', neighborhood: 'Throgs Neck' },
  'co-op city': { borough: 'The Bronx', neighborhood: 'Co-op City' },
  'yankee stadium': { borough: 'The Bronx', neighborhood: 'Yankee Stadium' },

  // Staten Island neighborhoods
  'st. george': { borough: 'Staten Island', neighborhood: 'St. George' },
  'saint george': { borough: 'Staten Island', neighborhood: 'St. George' },
  'stapleton': { borough: 'Staten Island', neighborhood: 'Stapleton' },
  'tompkinsville': { borough: 'Staten Island', neighborhood: 'Tompkinsville' },
  'new brighton': { borough: 'Staten Island', neighborhood: 'New Brighton' },
  'port richmond': { borough: 'Staten Island', neighborhood: 'Port Richmond' },
  'great kills': { borough: 'Staten Island', neighborhood: 'Great Kills' },
  'tottenville': { borough: 'Staten Island', neighborhood: 'Tottenville' },
};

const BOROUGH_KEYWORDS = {
  'manhattan': 'Manhattan',
  'brooklyn': 'Brooklyn',
  'queens': 'Queens',
  'bronx': 'The Bronx',
  'the bronx': 'The Bronx',
  'staten island': 'Staten Island',
};

// Simple rate limiter for Nominatim (max 1 request per second)
let lastGeocodingTime = 0;
async function rateLimitedDelay() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastGeocodingTime;
  if (timeSinceLastRequest < 1000) {
    await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastRequest));
  }
  lastGeocodingTime = Date.now();
}

// Geocode using Nominatim (OpenStreetMap) - free, no API key needed
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  let timeoutId: NodeJS.Timeout | undefined;

  try {
    // Rate limit: wait to respect Nominatim's 1 req/sec limit
    await rateLimitedDelay();

    // Add "New York City" to improve accuracy
    const searchQuery = address.includes('New York') ? address : `${address}, New York City, NY`;

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`;

    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Ephemera-NYC-Events-App', // Required by Nominatim
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[Geocoding] Failed to geocode "${address}": ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const result = data[0];
      console.log(`[Geocoding] ✓ "${address}" → ${result.lat}, ${result.lon}`);
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
      };
    }

    console.log(`[Geocoding] ✗ No results for "${address}"`);
    return null;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    // Silently fail on timeout/network errors - just use static coordinates
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout') || error.message.includes('fetch failed'))) {
      console.log(`[Geocoding] ✗ Timeout/network error for "${address}" - using static coords`);
    } else {
      console.error(`[Geocoding] Error geocoding "${address}":`, error);
    }
    return null;
  }
}

// Static fallback lookup (same as before)
function parseLocationStatic(location: string): {
  borough?: string;
  neighborhood?: string;
  lat?: number;
  lng?: number;
} {
  if (!location) return {};

  const locationLower = location.toLowerCase();

  // First, try to match specific neighborhoods
  for (const [key, value] of Object.entries(LOCATION_MAPPINGS)) {
    if (locationLower.includes(key)) {
      // Get coordinates if available
      const coords = NEIGHBORHOOD_COORDS[key];
      if (coords) {
        return { ...value, ...coords };
      }

      // Fall back to borough center if no neighborhood coords
      const boroughCoords = BOROUGH_CENTERS[value.borough as keyof typeof BOROUGH_CENTERS];
      return { ...value, ...boroughCoords };
    }
  }

  // If no neighborhood match, try to match just the borough
  for (const [keyword, borough] of Object.entries(BOROUGH_KEYWORDS)) {
    if (locationLower.includes(keyword)) {
      const coords = BOROUGH_CENTERS[borough as keyof typeof BOROUGH_CENTERS];
      return { borough, ...coords };
    }
  }

  return {};
}

// Main export - tries static lookup first, then geocoding as fallback
export async function parseLocation(location: string, enableGeocoding = false): Promise<{
  borough?: string;
  neighborhood?: string;
  lat?: number;
  lng?: number;
}> {
  if (!location) return {};

  // Try static lookup first
  const staticResult = parseLocationStatic(location);

  // If we have coordinates from static lookup, use those
  if (staticResult.lat && staticResult.lng) {
    return staticResult;
  }

  // If geocoding is enabled and we don't have coordinates, try geocoding
  if (enableGeocoding) {
    const geocoded = await geocodeAddress(location);
    if (geocoded) {
      return { ...staticResult, lat: geocoded.lat, lng: geocoded.lng };
    }
  }

  return staticResult;
}
