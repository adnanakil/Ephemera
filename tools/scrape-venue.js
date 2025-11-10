#!/usr/bin/env node
/**
 * Venue Scraper Tool
 * Uses Scrapfly API to fetch and analyze venue websites for event calendars
 *
 * Usage:
 *   node tools/scrape-venue.js <url> [search-term]
 *
 * Examples:
 *   node tools/scrape-venue.js https://www.slate.nyc
 *   node tools/scrape-venue.js https://www.thegrovebrooklyn.com events
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');
const { URL } = require('url');

const SCRAPFLY_API_KEY = process.env.SCRAPFLY_API_KEY;

if (!SCRAPFLY_API_KEY) {
  console.error('❌ Error: SCRAPFLY_API_KEY not found in environment variables');
  console.error('   Make sure .env.local contains SCRAPFLY_API_KEY');
  process.exit(1);
}

function scrapflyFetch(url) {
  return new Promise((resolve, reject) => {
    const apiUrl = `https://api.scrapfly.io/scrape?key=${SCRAPFLY_API_KEY}&url=${encodeURIComponent(url)}`;

    https.get(apiUrl, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.result && parsed.result.content) {
            resolve(parsed.result.content);
          } else {
            reject(new Error('Invalid response from Scrapfly'));
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

function extractLinks(html, baseUrl, searchTerm = 'event|calendar|show') {
  // Match both absolute and relative URLs in href attributes
  const regex = new RegExp(`href=["']([^"']*(?:${searchTerm})[^"']*)["']`, 'gi');
  const matches = html.match(regex) || [];

  const links = new Set();
  matches.forEach(match => {
    const hrefMatch = match.match(/href=["']([^"']+)["']/i);
    if (hrefMatch && hrefMatch[1]) {
      const path = hrefMatch[1];
      // Skip anchors and javascript links
      if (path.startsWith('#') || path.startsWith('javascript:')) return;

      try {
        const fullUrl = new URL(path, baseUrl).href;
        links.add(fullUrl);
      } catch (e) {
        // Skip invalid URLs
      }
    }
  });

  return Array.from(links);
}

function extractText(html, searchTerm = 'event|calendar|show') {
  const regex = new RegExp(`[^>]*(?:${searchTerm})[^<]*`, 'gi');
  const matches = html.match(regex) || [];

  return matches
    .map(m => m.trim())
    .filter(m => m.length > 0 && m.length < 200)
    .slice(0, 20);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node tools/scrape-venue.js <url> [search-term]');
    console.log('');
    console.log('Examples:');
    console.log('  node tools/scrape-venue.js https://www.slate.nyc');
    console.log('  node tools/scrape-venue.js https://www.thegrovebrooklyn.com events');
    process.exit(0);
  }

  const url = args[0];
  const searchTerm = args[1] || 'event|calendar|show';

  console.log(`\n🔍 Fetching: ${url}`);
  console.log(`🔎 Searching for: ${searchTerm}\n`);

  try {
    const html = await scrapflyFetch(url);

    console.log('✅ Page fetched successfully\n');

    // Extract relevant links
    const links = extractLinks(html, url, searchTerm);

    if (links.length > 0) {
      console.log(`📎 Found ${links.length} relevant links:`);
      links.forEach((link, i) => {
        console.log(`  ${i + 1}. ${link}`);
      });
      console.log('');
    } else {
      console.log('⚠️  No matching links found\n');
    }

    // Extract text snippets
    const snippets = extractText(html, searchTerm);

    if (snippets.length > 0) {
      console.log('📝 Text mentions (first 10):');
      snippets.slice(0, 10).forEach((snippet, i) => {
        console.log(`  ${i + 1}. ${snippet}`);
      });
    }

  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

main();
