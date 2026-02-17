import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { queueMultipleGeocodeJobs } from '@/lib/qstash';

const CACHE_KEY = 'nyc_events';

interface Event {
  title: string;
  description: string;
  time: string;
  date?: string;
  location: string;
  category?: string;
  borough?: string;
  neighborhood?: string;
  lat?: number;
  lng?: number;
  link?: string;
  ticketLink?: string;
}

interface EventsResponse {
  success: boolean;
  count: number;
  events: Event[];
  lastFetched: string;
}

// Trigger geocoding jobs for all events that need coordinates
export async function POST(request: NextRequest) {
  try {
    console.log('[GeocodeQueue] Triggering geocoding jobs');

    const redis = getRedis();

    // Get current events from cache
    const cachedData = await redis.get<EventsResponse>(CACHE_KEY);
    if (!cachedData || !cachedData.events) {
      console.log('[GeocodeQueue] No cached events found');
      return NextResponse.json({
        success: false,
        message: 'No events in cache',
      });
    }

    // Count events without coordinates
    const eventsNeedingGeocode = cachedData.events.filter(
      event => !event.lat || !event.lng
    );

    console.log(`[GeocodeQueue] Found ${eventsNeedingGeocode.length} events needing geocoding`);

    if (eventsNeedingGeocode.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All events already have coordinates',
        eventsNeedingGeocode: 0,
        jobsQueued: 0
      });
    }

    // Calculate how many jobs we need (10 events per job)
    const BATCH_SIZE = 10;
    const jobCount = Math.ceil(eventsNeedingGeocode.length / BATCH_SIZE);

    // Get the base URL from the request
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : request.url.replace(/\/api\/.*$/, '');

    // Queue multiple geocoding jobs
    await queueMultipleGeocodeJobs(baseUrl, jobCount);

    console.log(`[GeocodeQueue] Successfully queued ${jobCount} geocoding jobs`);

    return NextResponse.json({
      success: true,
      message: `Queued ${jobCount} geocoding jobs`,
      eventsNeedingGeocode: eventsNeedingGeocode.length,
      jobsQueued: jobCount,
      estimatedTime: `${jobCount * 15} seconds`,
    });

  } catch (error) {
    console.error('[GeocodeQueue] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue geocoding jobs',
      },
      { status: 500 }
    );
  }
}
