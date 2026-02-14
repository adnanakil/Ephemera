#!/usr/bin/env node
/**
 * Venue Discovery Tool
 * Uses Google Places Nearby Search to find NYC event venues not yet tracked.
 *
 * Usage:
 *   node tools/discover-venues.js                  # Full run with Scrapfly verification
 *   node tools/discover-venues.js --skip-verify    # Google Places only (saves Scrapfly credits)
 *
 * Requires GOOGLE_PLACES_API_KEY in .env.local
 * Optionally uses SCRAPFLY_API_KEY for event page verification
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const SCRAPFLY_API_KEY = process.env.SCRAPFLY_API_KEY;

if (!GOOGLE_PLACES_API_KEY) {
  console.error('❌ Error: GOOGLE_PLACES_API_KEY not found in environment variables');
  console.error('   Add GOOGLE_PLACES_API_KEY=<your-key> to .env.local');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Search areas: 14 centers covering NYC boroughs
// ---------------------------------------------------------------------------
const SEARCH_AREAS = [
  // Manhattan
  { name: 'Lower Manhattan',       lat: 40.7128, lng: -74.0060, radius: 2500 },
  { name: 'Midtown Manhattan',     lat: 40.7549, lng: -73.9840, radius: 2500 },
  { name: 'Upper Manhattan',       lat: 40.7831, lng: -73.9712, radius: 2500 },
  { name: 'Harlem',                lat: 40.8116, lng: -73.9465, radius: 2000 },
  // Brooklyn
  { name: 'North Brooklyn',        lat: 40.7081, lng: -73.9571, radius: 2500 },
  { name: 'Downtown Brooklyn',     lat: 40.6892, lng: -73.9857, radius: 2500 },
  { name: 'Central Brooklyn',      lat: 40.6694, lng: -73.9562, radius: 2500 },
  { name: 'East Brooklyn',         lat: 40.6946, lng: -73.9218, radius: 2500 },
  // Queens
  { name: 'Western Queens',        lat: 40.7425, lng: -73.9230, radius: 3000 },
  { name: 'Central Queens',        lat: 40.7282, lng: -73.8698, radius: 3000 },
  { name: 'Forest Hills',          lat: 40.7185, lng: -73.8443, radius: 2500 },
  { name: 'Flushing',              lat: 40.7580, lng: -73.8306, radius: 2500 },
  // Bronx
  { name: 'South Bronx',           lat: 40.8176, lng: -73.9209, radius: 3000 },
  // Wide sweep
  { name: 'NYC Wide',              lat: 40.7420, lng: -73.9890, radius: 5000 },
];

// ---------------------------------------------------------------------------
// Place type groups (queried separately to maximize 20-result cap per request)
// ---------------------------------------------------------------------------
const TYPE_GROUPS = [
  {
    name: 'Performing Arts',
    types: ['performing_arts_theater', 'concert_hall', 'live_music_venue', 'amphitheatre'],
  },
  {
    name: 'Nightlife & Comedy',
    types: ['night_club', 'comedy_club'],
  },
  {
    name: 'Museums & Galleries',
    types: ['museum', 'art_gallery'],
  },
  {
    name: 'Event Venues & Bars',
    types: ['event_venue', 'bar'],
  },
];

// ---------------------------------------------------------------------------
// Parse existing EVENT_URLS from fetch/route.ts
// ---------------------------------------------------------------------------
function loadExistingUrls() {
  const routePath = path.join(__dirname, '..', 'app', 'api', 'events', 'fetch', 'route.ts');
  const source = fs.readFileSync(routePath, 'utf-8');

  const urls = [];
  // Match both active and commented-out URLs
  const regex = /['"]((https?:\/\/[^'"]+))['"]/g;
  // Only grab URLs inside the EVENT_URLS array
  const arrayMatch = source.match(/const EVENT_URLS\s*=\s*\[([\s\S]*?)\];/);
  if (!arrayMatch) {
    console.error('⚠️  Could not find EVENT_URLS array in route.ts');
    return new Set();
  }

  const arrayContent = arrayMatch[1];
  let m;
  const urlRegex = /['"]((https?:\/\/[^'"]+))['"]/g;
  while ((m = urlRegex.exec(arrayContent)) !== null) {
    urls.push(m[1]);
  }

  return urls;
}

function normalizeDomain(urlStr) {
  try {
    const u = new URL(urlStr);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return urlStr.toLowerCase();
  }
}

// ---------------------------------------------------------------------------
// Google Places Nearby Search (New)
// ---------------------------------------------------------------------------
async function searchNearby(area, typeGroup) {
  const body = JSON.stringify({
    includedTypes: typeGroup.types,
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: area.lat, longitude: area.lng },
        radius: area.radius,
      },
    },
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'places.googleapis.com',
      path: '/v1/places:searchNearby',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.websiteUri,places.formattedAddress,places.types,places.primaryType,places.googleMapsUri',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(`Google API error: ${parsed.error.message}`));
            return;
          }
          resolve(parsed.places || []);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Scrapfly verification (reuses scrape-venue.js pattern)
// ---------------------------------------------------------------------------
function scrapflyFetch(url) {
  return new Promise((resolve, reject) => {
    const apiUrl = `https://api.scrapfly.io/scrape?key=${SCRAPFLY_API_KEY}&url=${encodeURIComponent(url)}`;

    https.get(apiUrl, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.result && parsed.result.content) {
            resolve(parsed.result.content);
          } else {
            reject(new Error('Invalid Scrapfly response'));
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function hasEventPages(html, baseUrl) {
  const searchTerm = 'event|calendar|show|ticket|schedule|performance|concert|lineup';
  const regex = new RegExp(`href=["']([^"']*(?:${searchTerm})[^"']*)["']`, 'gi');
  const matches = html.match(regex) || [];

  const links = new Set();
  matches.forEach(match => {
    const hrefMatch = match.match(/href=["']([^"']+)["']/i);
    if (hrefMatch && hrefMatch[1]) {
      const p = hrefMatch[1];
      if (p.startsWith('#') || p.startsWith('javascript:')) return;
      try {
        links.add(new URL(p, baseUrl).href);
      } catch {}
    }
  });

  return Array.from(links);
}

// ---------------------------------------------------------------------------
// Rate-limited delay
// ---------------------------------------------------------------------------
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const skipVerify = args.includes('--skip-verify');

  console.log('\n🔍 Ephemera Venue Discovery Tool');
  console.log('================================\n');

  if (skipVerify) {
    console.log('⚡ Running in fast mode (--skip-verify): skipping Scrapfly event page checks\n');
  } else if (!SCRAPFLY_API_KEY) {
    console.log('⚠️  No SCRAPFLY_API_KEY found — running without event page verification\n');
  }

  // 1. Load existing venues
  const existingUrls = loadExistingUrls();
  const existingDomains = new Set(existingUrls.map(normalizeDomain));
  console.log(`📋 Loaded ${existingUrls.length} existing EVENT_URLS (${existingDomains.size} unique domains)\n`);

  // 2. Query Google Places
  const allPlaces = new Map(); // keyed by Place ID
  let apiCallCount = 0;
  const totalCalls = SEARCH_AREAS.length * TYPE_GROUPS.length;

  for (const area of SEARCH_AREAS) {
    for (const typeGroup of TYPE_GROUPS) {
      apiCallCount++;
      const label = `[${apiCallCount}/${totalCalls}] ${area.name} × ${typeGroup.name}`;
      process.stdout.write(`  🌐 ${label}...`);

      try {
        const places = await searchNearby(area, typeGroup);
        let newCount = 0;
        for (const place of places) {
          if (!allPlaces.has(place.id)) {
            allPlaces.set(place.id, place);
            newCount++;
          }
        }
        console.log(` ${places.length} results (${newCount} new)`);
      } catch (err) {
        console.log(` ❌ ${err.message}`);
      }

      // Small delay to be polite to the API
      await sleep(100);
    }
  }

  console.log(`\n📊 Google Places: ${allPlaces.size} unique venues from ${apiCallCount} API calls\n`);

  // 3. Classify venues
  const existing = [];
  const newWithWebsite = [];
  const noWebsite = [];

  for (const [id, place] of allPlaces) {
    const name = place.displayName?.text || 'Unknown';
    const website = place.websiteUri || null;
    const address = place.formattedAddress || '';
    const mapsUrl = place.googleMapsUri || '';
    const primaryType = place.primaryType || '';

    if (!website) {
      noWebsite.push({ id, name, address, mapsUrl, primaryType });
      continue;
    }

    const domain = normalizeDomain(website);
    if (existingDomains.has(domain)) {
      existing.push({ id, name, website, address, domain, primaryType });
    } else {
      newWithWebsite.push({ id, name, website, address, domain, mapsUrl, primaryType });
    }
  }

  console.log(`  ✅ Already tracked: ${existing.length}`);
  console.log(`  🆕 New with website: ${newWithWebsite.length}`);
  console.log(`  🚫 No website: ${noWebsite.length}\n`);

  // 4. Optionally verify event pages via Scrapfly
  const verified = [];
  const unverified = [];

  if (!skipVerify && SCRAPFLY_API_KEY && newWithWebsite.length > 0) {
    console.log(`🔎 Verifying ${newWithWebsite.length} new venues for event pages...\n`);

    for (let i = 0; i < newWithWebsite.length; i++) {
      const venue = newWithWebsite[i];
      process.stdout.write(`  [${i + 1}/${newWithWebsite.length}] ${venue.name}...`);

      try {
        const html = await scrapflyFetch(venue.website);
        const eventLinks = hasEventPages(html, venue.website);

        if (eventLinks.length > 0) {
          venue.eventLinks = eventLinks;
          verified.push(venue);
          console.log(` ✅ ${eventLinks.length} event link(s)`);
        } else {
          unverified.push(venue);
          console.log(' ⚠️  no event links found');
        }
      } catch (err) {
        venue.error = err.message;
        unverified.push(venue);
        console.log(` ❌ ${err.message.substring(0, 50)}`);
      }

      // Rate limit: ~1 request/sec for Scrapfly
      await sleep(1200);
    }

    console.log(`\n  ✅ Verified with events: ${verified.length}`);
    console.log(`  ⚠️  No events found: ${unverified.length}\n`);
  } else {
    // Without verification, all new-with-website venues go to unverified
    unverified.push(...newWithWebsite);
  }

  // 5. Output report
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const reportPath = path.join(outputDir, `discovery-${timestamp}.json`);

  const report = {
    timestamp: new Date().toISOString(),
    stats: {
      totalFound: allPlaces.size,
      alreadyTracked: existing.length,
      newWithWebsite: newWithWebsite.length,
      verifiedWithEvents: verified.length,
      noWebsite: noWebsite.length,
      apiCalls: apiCallCount,
    },
    verified,
    unverified: skipVerify ? newWithWebsite : unverified,
    existing: existing.map(v => ({ name: v.name, domain: v.domain })),
    noWebsite,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Full report saved to: ${reportPath}\n`);

  // 6. Console summary with copy-paste URLs
  const candidateVenues = verified.length > 0 ? verified : newWithWebsite;

  if (candidateVenues.length > 0) {
    console.log('═══════════════════════════════════════════════════');
    console.log('  🆕 NEW VENUE CANDIDATES');
    console.log('═══════════════════════════════════════════════════\n');

    for (const venue of candidateVenues) {
      const bestUrl = (venue.eventLinks && venue.eventLinks[0]) || venue.website;
      console.log(`  ${venue.name}`);
      console.log(`    📍 ${venue.address}`);
      console.log(`    🌐 ${venue.website}`);
      if (venue.eventLinks && venue.eventLinks.length > 0) {
        console.log(`    📅 Event page: ${venue.eventLinks[0]}`);
      }
      console.log(`    🏷️  ${venue.primaryType}`);
      console.log('');
    }

    console.log('───────────────────────────────────────────────────');
    console.log('  📋 COPY-PASTE for EVENT_URLS:');
    console.log('───────────────────────────────────────────────────\n');

    for (const venue of candidateVenues) {
      const bestUrl = (venue.eventLinks && venue.eventLinks[0]) || venue.website;
      console.log(`  '${bestUrl}', // ${venue.name}`);
    }

    console.log('');
  } else {
    console.log('🎉 No new venues discovered — your coverage is excellent!\n');
  }

  // Summary
  console.log('═══════════════════════════════════════════════════');
  console.log('  📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Total venues found:      ${allPlaces.size}`);
  console.log(`  Already tracked:         ${existing.length}`);
  console.log(`  New with website:        ${newWithWebsite.length}`);
  if (!skipVerify && SCRAPFLY_API_KEY) {
    console.log(`  Verified with events:    ${verified.length}`);
  }
  console.log(`  No website:              ${noWebsite.length}`);
  console.log(`  Google API calls used:   ${apiCallCount}`);
  console.log('═══════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error(`\n❌ Fatal error: ${err.message}`);
  process.exit(1);
});
