#!/usr/bin/env node

/**
 * Test script to verify the Refresh Events functionality
 *
 * This script:
 * 1. Checks the current scraping status
 * 2. Triggers a new scraping job (if not already running)
 * 3. Monitors progress in real-time
 * 4. Verifies all 19 sources are scraped
 */

const https = require('https');

const PRODUCTION_URL = 'https://ephemera-sigma.vercel.app';
const EXPECTED_SOURCES = 19;

// Helper to make HTTPS requests
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

// Check current status
async function checkStatus() {
  console.log('\n📊 Checking current status...');
  const status = await makeRequest(`${PRODUCTION_URL}/api/events/status`);

  console.log(`   Total sources: ${status.scraping.totalSources} (expected: ${EXPECTED_SOURCES})`);
  console.log(`   Scraping running: ${status.scraping.isRunning}`);
  console.log(`   Sources completed: ${status.scraping.sourcesCompleted}/${status.scraping.totalSources}`);
  console.log(`   Events scraped: ${status.scraping.eventsScraped}`);
  console.log(`   Total events in cache: ${status.totalEvents}`);

  return status;
}

// Trigger a new scraping job
async function triggerScraping() {
  console.log('\n🚀 Triggering new scraping job...');

  try {
    const response = await makeRequest(`${PRODUCTION_URL}/api/events/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('   ✅ Scraping job triggered successfully');
    return response;
  } catch (error) {
    console.error('   ❌ Failed to trigger scraping:', error.message);
    throw error;
  }
}

// Monitor scraping progress
async function monitorProgress() {
  console.log('\n📡 Monitoring scraping progress...\n');

  let previousCompleted = -1;
  let pollCount = 0;
  const maxPolls = 60; // Max 3 minutes (60 polls * 3 seconds)

  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const status = await makeRequest(`${PRODUCTION_URL}/api/events/status`);
        pollCount++;

        // Show progress if changed
        if (status.scraping.sourcesCompleted !== previousCompleted) {
          const progress = Math.round((status.scraping.sourcesCompleted / status.scraping.totalSources) * 100);
          console.log(`   [${new Date().toLocaleTimeString()}] Progress: ${status.scraping.sourcesCompleted}/${status.scraping.totalSources} (${progress}%) - ${status.scraping.eventsScraped} events`);

          if (status.scraping.currentSource) {
            console.log(`   └─ Currently scraping: ${status.scraping.currentSource}`);
          }

          previousCompleted = status.scraping.sourcesCompleted;
        }

        // Check if complete
        if (!status.scraping.isRunning) {
          clearInterval(interval);
          console.log('\n✅ Scraping completed!');
          console.log(`   Final stats: ${status.scraping.sourcesCompleted}/${status.scraping.totalSources} sources, ${status.scraping.eventsScraped} events scraped`);
          resolve(status);
        }

        // Timeout check
        if (pollCount >= maxPolls) {
          clearInterval(interval);
          reject(new Error('Timeout: Scraping did not complete within 3 minutes'));
        }
      } catch (error) {
        clearInterval(interval);
        reject(error);
      }
    }, 3000); // Poll every 3 seconds
  });
}

// Verify results
async function verifyResults(status) {
  console.log('\n🔍 Verifying results...');

  const checks = [];

  // Check 1: Verify total sources
  if (status.scraping.totalSources === EXPECTED_SOURCES) {
    console.log(`   ✅ Total sources: ${status.scraping.totalSources} (correct)`);
    checks.push(true);
  } else {
    console.log(`   ❌ Total sources: ${status.scraping.totalSources} (expected ${EXPECTED_SOURCES})`);
    checks.push(false);
  }

  // Check 2: Verify all sources completed
  if (status.scraping.sourcesCompleted === status.scraping.totalSources) {
    console.log(`   ✅ All sources completed: ${status.scraping.sourcesCompleted}/${status.scraping.totalSources}`);
    checks.push(true);
  } else {
    console.log(`   ❌ Not all sources completed: ${status.scraping.sourcesCompleted}/${status.scraping.totalSources}`);
    checks.push(false);
  }

  // Check 3: Verify events were scraped
  if (status.scraping.eventsScraped > 0) {
    console.log(`   ✅ Events scraped: ${status.scraping.eventsScraped}`);
    checks.push(true);
  } else {
    console.log(`   ❌ No events scraped`);
    checks.push(false);
  }

  // Check 4: Verify scraping is not running
  if (!status.scraping.isRunning) {
    console.log(`   ✅ Scraping status: complete`);
    checks.push(true);
  } else {
    console.log(`   ❌ Scraping status: still running`);
    checks.push(false);
  }

  return checks.every(check => check);
}

// Main test flow
async function runTest() {
  console.log('🧪 Testing Refresh Events Functionality');
  console.log('=' .repeat(50));

  try {
    // Step 1: Check initial status
    const initialStatus = await checkStatus();

    // Step 2: If scraping is already running with 19 sources, just monitor it
    if (initialStatus.scraping.isRunning && initialStatus.scraping.totalSources === EXPECTED_SOURCES) {
      console.log('\n✨ Scraping already running with 19 sources, monitoring...');
      const finalStatus = await monitorProgress();
      const success = await verifyResults(finalStatus);

      if (success) {
        console.log('\n🎉 TEST PASSED: All checks passed!');
        process.exit(0);
      } else {
        console.log('\n❌ TEST FAILED: Some checks failed');
        process.exit(1);
      }
    }

    // Step 3: If scraping is running with old code (7 sources), wait for it to finish
    if (initialStatus.scraping.isRunning && initialStatus.scraping.totalSources !== EXPECTED_SOURCES) {
      console.log(`\n⏳ Old scraping job running (${initialStatus.scraping.totalSources} sources). Waiting for it to complete...`);
      console.log('   (This is expected - the old job needs to finish before we can test the new code)');

      // Wait for old job to finish
      await new Promise((resolve) => {
        const interval = setInterval(async () => {
          const status = await checkStatus();
          if (!status.scraping.isRunning) {
            clearInterval(interval);
            console.log('\n✅ Old job completed. Now triggering new job...');
            resolve();
          }
        }, 5000);
      });
    }

    // Step 4: Trigger new scraping job
    await triggerScraping();

    // Give it a moment to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 5: Monitor progress
    const finalStatus = await monitorProgress();

    // Step 6: Verify results
    const success = await verifyResults(finalStatus);

    if (success) {
      console.log('\n🎉 TEST PASSED: All checks passed!');
      process.exit(0);
    } else {
      console.log('\n❌ TEST FAILED: Some checks failed');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 TEST ERROR:', error.message);
    process.exit(1);
  }
}

// Run the test
runTest();
