// Background worker for Heroku - no timeout limits!
const { Worker } = require('bullmq');
const IORedis = require('ioredis');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('[Worker] Starting Ephemera background worker...');

// Use Upstash Redis connection
const connection = new IORedis(process.env.UPSTASH_REDIS_REST_URL || '', {
  maxRetriesPerRequest: null,
  tls: {
    rejectUnauthorized: false,
  },
});

// Import the scraping logic
// Note: This will be a simplified version that calls your API route internally
const worker = new Worker(
  'scraping',
  async (job) => {
    console.log(`[Worker] Processing job ${job.id}...`);

    try {
      // Call the scraping API route
      // Since we're on Heroku, we can use internal network call
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

      console.log(`[Worker] Calling scraping API at ${baseUrl}/api/events/fetch...`);

      const response = await fetch(`${baseUrl}/api/events/fetch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Worker': 'true', // Flag to identify internal worker calls
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Scraping API failed: ${error}`);
      }

      const result = await response.json();
      console.log(`[Worker] Scraping completed: ${result.eventsScraped} events extracted`);

      return result;
    } catch (error) {
      console.error('[Worker] Job failed:', error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 1, // Process one scraping job at a time
    limiter: {
      max: 1,
      duration: 60000, // Max 1 job per minute
    },
  }
);

worker.on('completed', (job, result) => {
  console.log(`[Worker] Job ${job.id} completed successfully`);
  console.log(`[Worker] Result: ${JSON.stringify(result)}`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err);
});

worker.on('error', (err) => {
  console.error('[Worker] Worker error:', err);
});

console.log('[Worker] Worker ready and listening for jobs...');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received, closing worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Worker] SIGINT received, closing worker...');
  await worker.close();
  process.exit(0);
});
