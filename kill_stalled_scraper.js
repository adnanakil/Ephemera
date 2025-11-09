#!/usr/bin/env node

/**
 * Kill a stalled scraping job by resetting the Redis status
 */

const https = require('https');

const PRODUCTION_URL = 'https://ephemera-sigma.vercel.app';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function killStalledJob() {
  console.log('🔍 Checking current scraping status...\n');

  // Check current status
  const status = await makeRequest(`${PRODUCTION_URL}/api/events/status`);

  console.log('Current status:');
  console.log(`   Running: ${status.scraping.isRunning}`);
  console.log(`   Sources: ${status.scraping.sourcesCompleted}/${status.scraping.totalSources}`);
  console.log(`   Current source: ${status.scraping.currentSource}`);
  console.log(`   Last update: ${status.scraping.lastUpdate}`);

  const lastUpdate = new Date(status.scraping.lastUpdate);
  const now = new Date();
  const minutesSinceUpdate = Math.floor((now - lastUpdate) / 1000 / 60);

  console.log(`   Minutes since last update: ${minutesSinceUpdate}\n`);

  if (!status.scraping.isRunning) {
    console.log('✅ No scraping job is currently running. Nothing to kill.');
    return;
  }

  if (minutesSinceUpdate < 5) {
    console.log('⚠️  Job updated recently - it might still be running.');
    console.log('   Are you sure you want to kill it? (Ctrl+C to cancel)\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log('💀 Killing stalled scraping job...\n');
  console.log('   The best way to do this is to trigger a new scrape.');
  console.log('   The /api/events/fetch endpoint will reset the status when it starts.\n');

  // The cleanest way is to just trigger a new scrape
  // The POST handler will reset the status when it starts
  console.log('🚀 Triggering new scraping job (this will reset the stalled one)...\n');

  try {
    const response = await makeRequest(`${PRODUCTION_URL}/api/events/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ New scraping job triggered!');
    console.log('   The old job has been reset and a fresh scrape with 19 sources is now running.\n');

    // Wait a moment and check status
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newStatus = await makeRequest(`${PRODUCTION_URL}/api/events/status`);
    console.log('📊 New status:');
    console.log(`   Running: ${newStatus.scraping.isRunning}`);
    console.log(`   Sources: ${newStatus.scraping.sourcesCompleted}/${newStatus.scraping.totalSources}`);
    console.log(`   Current source: ${newStatus.scraping.currentSource || 'Starting...'}`);

  } catch (error) {
    console.error('❌ Failed to trigger new scraping:', error.message);
    throw error;
  }
}

killStalledJob().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
