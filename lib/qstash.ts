import { Client } from '@upstash/qstash';

// Create QStash client for job queuing
export function getQStash() {
  return new Client({
    token: process.env.QSTASH_TOKEN!,
  });
}

// Queue a geocoding job
export async function queueGeocodeJob(baseUrl: string) {
  const qstash = getQStash();

  const url = `${baseUrl}/api/events/geocode`;

  await qstash.publishJSON({
    url,
    body: {},
  });

  console.log(`[QStash] Queued geocoding job to ${url}`);
}

// Queue multiple geocoding jobs based on remaining count
export async function queueMultipleGeocodeJobs(baseUrl: string, estimatedJobCount: number) {
  const qstash = getQStash();
  const url = `${baseUrl}/api/events/geocode`;

  // Queue jobs with delays to spread them out
  // Each job processes 10 events at ~1 req/sec = ~10 seconds per job
  // Add 15 second delay between jobs to be safe
  for (let i = 0; i < estimatedJobCount; i++) {
    await qstash.publishJSON({
      url,
      body: {},
      delay: i * 15, // Delay in seconds
    });
  }

  console.log(`[QStash] Queued ${estimatedJobCount} geocoding jobs with 15s delays`);
}

// Queue a scraping job
export async function queueScrapingJob(baseUrl: string) {
  const qstash = getQStash();

  const url = `${baseUrl}/api/events/fetch/trigger`;

  await qstash.publishJSON({
    url,
    body: {},
  });

  console.log(`[QStash] Queued scraping job to ${url}`);
}
