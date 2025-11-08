import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { parseLocation } from '@/lib/location-parser';

const CACHE_KEY = 'nyc_events';

interface Event {
  title: string;
  description: string;
  time: string;
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

// Geocode a batch of events
export async function POST(request: NextRequest) {
  try {
    console.log('[Geocode] Starting geocoding job');

    const redis = getRedis();

    // Get current events from cache
    const cachedData = await redis.get<EventsResponse>(CACHE_KEY);
    if (!cachedData || !cachedData.events) {
      console.log('[Geocode] No cached events found');
      return NextResponse.json({
        success: false,
        message: 'No events in cache',
        geocoded: 0
      });
    }

    // Find events without coordinates
    const eventsNeedingGeocode = cachedData.events.filter(
      event => !event.lat || !event.lng
    );

    console.log(`[Geocode] Found ${eventsNeedingGeocode.length} events needing geocoding`);

    if (eventsNeedingGeocode.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All events already have coordinates',
        geocoded: 0,
        remaining: 0
      });
    }

    // Process up to 10 events in this batch (with 1 req/sec rate limit = ~10 seconds)
    const BATCH_SIZE = 10;
    const batch = eventsNeedingGeocode.slice(0, BATCH_SIZE);

    console.log(`[Geocode] Processing batch of ${batch.length} events`);

    let geocodedCount = 0;

    // Geocode each event in the batch
    const geocodedBatch = await Promise.all(
      batch.map(async (event) => {
        const { borough, neighborhood, lat, lng } = await parseLocation(
          event.location || '',
          true // Enable geocoding
        );

        if (lat && lng) {
          geocodedCount++;
          console.log(`[Geocode] ✓ "${event.title}" → ${lat}, ${lng}`);
        } else {
          console.log(`[Geocode] ✗ "${event.title}" - no coordinates found`);
        }

        return {
          ...event,
          borough: borough || event.borough,
          neighborhood: neighborhood || event.neighborhood,
          lat: lat || event.lat,
          lng: lng || event.lng,
        };
      })
    );

    // Update events in the full array
    const updatedEvents = cachedData.events.map(event => {
      const geocoded = geocodedBatch.find(
        g => g.title.toLowerCase() === event.title.toLowerCase() &&
             (g.link === event.link || g.location === event.location)
      );
      return geocoded || event;
    });

    // Save back to Redis
    const updatedData = {
      ...cachedData,
      events: updatedEvents,
      lastFetched: new Date().toISOString(),
    };

    await redis.set(CACHE_KEY, updatedData);

    const remaining = eventsNeedingGeocode.length - batch.length;
    console.log(`[Geocode] Batch complete: ${geocodedCount}/${batch.length} geocoded, ${remaining} remaining`);

    return NextResponse.json({
      success: true,
      geocoded: geocodedCount,
      processed: batch.length,
      remaining: remaining,
      totalEvents: updatedEvents.length,
    });

  } catch (error) {
    console.error('[Geocode] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Geocoding failed',
      },
      { status: 500 }
    );
  }
}
