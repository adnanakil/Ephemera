import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

const CACHE_KEY = 'nyc_events';
const STATUS_KEY = 'scraping_status';

interface ScrapingStatus {
  isRunning: boolean;
  currentSource?: string;
  sourcesCompleted: number;
  totalSources: number;
  eventsScraped: number;
  lastUpdate: string;
  error?: string;
}

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

// Get current scraping and geocoding status
export async function GET(request: NextRequest) {
  try {
    const redis = getRedis();

    // Get scraping status
    const scrapingStatus = await redis.get<ScrapingStatus>(STATUS_KEY);

    // Get current events to calculate geocoding progress
    const cachedData = await redis.get<EventsResponse>(CACHE_KEY);

    let geocodingStatus = {
      total: 0,
      geocoded: 0,
      remaining: 0,
    };

    if (cachedData && cachedData.events) {
      const eventsWithCoords = cachedData.events.filter(e => e.lat && e.lng);
      geocodingStatus = {
        total: cachedData.events.length,
        geocoded: eventsWithCoords.length,
        remaining: cachedData.events.length - eventsWithCoords.length,
      };
    }

    return NextResponse.json({
      success: true,
      scraping: scrapingStatus || {
        isRunning: false,
        sourcesCompleted: 0,
        totalSources: 7,
        eventsScraped: 0,
        lastUpdate: new Date().toISOString(),
      },
      geocoding: geocodingStatus,
      lastFetched: cachedData?.lastFetched || null,
      totalEvents: cachedData?.count || 0,
    });
  } catch (error) {
    console.error('[Status] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get status',
      },
      { status: 500 }
    );
  }
}
