import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

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
  lastFetched: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const redis = getRedis();

    // Retrieve cached events from Redis
    const cachedData = await redis.get<EventsResponse>(CACHE_KEY);

    if (!cachedData) {
      return NextResponse.json({
        success: true,
        events: [],
        count: 0,
        lastFetched: null,
      });
    }

    // Parse event date helper function
    const parseEventDate = (timeStr: string) => {
      const match = timeStr.match(/^(\w+)\s+(\d+),\s+(.+)$/);
      if (!match) return null;

      const [_, month, day, timeRange] = match;
      const year = new Date().getFullYear();

      // Extract the start time (e.g., "12 p.m." from "12 p.m. to 3 p.m.")
      const startTimeMatch = timeRange.match(/^(\d+):?(\d+)?\s*(a\.m\.|p\.m\.|am|pm)/i);
      let hour = 0;
      let minute = 0;

      if (startTimeMatch) {
        hour = parseInt(startTimeMatch[1]);
        minute = startTimeMatch[2] ? parseInt(startTimeMatch[2]) : 0;
        const isPM = startTimeMatch[3].toLowerCase().includes('p');

        if (isPM && hour !== 12) hour += 12;
        if (!isPM && hour === 12) hour = 0;
      }

      // Create date string like "November 9 2025"
      const dateStr = `${month} ${day} ${year} ${hour}:${minute}`;
      return new Date(dateStr);
    };

    // Get current time in ET (UTC-5 or UTC-4 depending on DST)
    const nowET = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));

    // Filter out past events and sort chronologically
    const filteredAndSortedEvents = [...cachedData.events]
      .filter((event) => {
        try {
          // Filter out events with relative dates like "Today", "Tomorrow", etc.
          const lowerTime = event.time.toLowerCase();
          if (lowerTime.includes('today') || lowerTime.includes('tomorrow') || lowerTime.includes('yesterday')) {
            return false; // Remove stale events with relative dates
          }

          const eventDate = parseEventDate(event.time);
          if (!eventDate) return true; // Keep events with unparseable dates
          return eventDate >= nowET; // Only keep future events
        } catch {
          return true; // Keep events that fail to parse
        }
      })
      .sort((a, b) => {
        try {
          const dateA = parseEventDate(a.time);
          const dateB = parseEventDate(b.time);

          if (!dateA || !dateB) return 0;
          return dateA.getTime() - dateB.getTime();
        } catch {
          return 0;
        }
      });

    return NextResponse.json({
      ...cachedData,
      events: filteredAndSortedEvents,
      count: filteredAndSortedEvents.length,
    });
  } catch (error) {
    console.error('Error retrieving cached events:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to retrieve cached events',
      },
      { status: 500 }
    );
  }
}
