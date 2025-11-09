#!/usr/bin/env node

/**
 * Directly reset Redis scraping_status key via Upstash REST API
 */

const https = require('https');

// You'll need to get these from your .env.local
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://brief-donkey-32382.upstash.io';
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!UPSTASH_REDIS_REST_TOKEN) {
  console.error('Error: UPSTASH_REDIS_REST_TOKEN environment variable not set');
  console.error('Usage: UPSTASH_REDIS_REST_TOKEN=your_token node reset_redis_status.js');
  process.exit(1);
}

const resetStatus = {
  isRunning: false,
  currentSource: '',
  sourcesCompleted: 0,
  totalSources: 19,
  eventsScraped: 0,
  lastUpdate: new Date().toISOString(),
};

console.log('Resetting Redis scraping_status key...\n');
console.log('New status:', JSON.stringify(resetStatus, null, 2));

//Rest API command to set the key
const url = new URL('/set/scraping_status', UPSTASH_REDIS_REST_URL);

const options = {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
    'Content-Type': 'application/json',
  },
};

const req = https.request(url.toString(), options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('\n✅ Successfully reset Redis scraping_status key!');
      console.log('Response:', data);
    } else {
      console.error('\n❌ Failed to reset Redis key');
      console.error(`Status: ${res.statusCode}`);
      console.error('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  process.exit(1);
});

req.write(JSON.stringify(JSON.stringify(resetStatus)));
req.end();
