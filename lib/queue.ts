import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

// Use Upstash Redis connection
const connection = new IORedis(process.env.UPSTASH_REDIS_REST_URL || '', {
  maxRetriesPerRequest: null,
  tls: {
    rejectUnauthorized: false,
  },
});

// Create scraping queue
export const scrapingQueue = new Queue('scraping', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // keep completed jobs for 24 hours
      count: 100,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // keep failed jobs for 7 days
    },
  },
});

// Queue events for monitoring
export const queueEvents = new QueueEvents('scraping', { connection });

// Helper to add scraping job
export async function enqueueScraping() {
  const job = await scrapingQueue.add(
    'scrape-all-sources',
    {},
    {
      jobId: `scrape-${Date.now()}`, // Unique job ID
      priority: 1,
    }
  );

  console.log(`[Queue] Enqueued scraping job: ${job.id}`);
  return job;
}
