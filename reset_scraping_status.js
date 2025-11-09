#!/usr/bin/env node

/**
 * Reset scraping status in Redis
 * Use this when a scraping job gets stuck
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

async function resetStatus() {
  console.log('⚠️  Resetting stuck scraping status...\n');

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

  console.log(`   Minutes since last update: ${minutesSinceUpdate}`);

  if (minutesSinceUpdate < 5 && status.scraping.isRunning) {
    console.log('\n⚠️  Job updated recently - might still be running. Are you sure you want to reset?');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log('\n🔄 This would require an admin endpoint to reset Redis status.');
  console.log('   Alternative: Trigger a new scraping job. The /api/events/fetch endpoint');
  console.log('   should check if a job is stalled and reset it if necessary.\n');

  console.log('📝 Recommendation: Add staleness check to /api/events/fetch/route.ts');
  console.log('   If lastUpdate > 10 minutes ago, consider the job stalled and reset it.');
}

resetStatus().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
