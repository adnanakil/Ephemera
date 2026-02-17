import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

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
  enriched?: boolean;
}

interface EventsResponse {
  success: boolean;
  count: number;
  events: Event[];
  lastFetched: string | null;
}

// Fallback: infer date from time string for events that don't have a date field yet
function inferDateFromTime(timeString: string): string | undefined {
  if (!timeString) return undefined;

  const months: Record<string, number> = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
    'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
  };

  const lowerTime = timeString.toLowerCase();
  let month: number | null = null;
  let day: number | null = null;

  for (const [monthName, monthNum] of Object.entries(months)) {
    if (lowerTime.includes(monthName)) {
      month = monthNum;
      const afterMonth = lowerTime.substring(lowerTime.indexOf(monthName) + monthName.length);
      const dayMatch = afterMonth.match(/\d+/);
      if (dayMatch) {
        day = parseInt(dayMatch[0]);
      }
      break;
    }
  }

  if (month === null || day === null) return undefined;

  const nowET = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  let year = nowET.getFullYear();
  const candidateDate = new Date(year, month - 1, day);
  const todayET = new Date(nowET);
  todayET.setHours(0, 0, 0, 0);

  if (candidateDate < todayET) {
    const diffDays = (todayET.getTime() - candidateDate.getTime()) / (24 * 60 * 60 * 1000);
    if (diffDays > 30) {
      year += 1;
    }
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

    // Get today's date in YYYY-MM-DD format (Eastern Time)
    const nowET = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const todayISO = `${nowET.getFullYear()}-${String(nowET.getMonth() + 1).padStart(2, '0')}-${String(nowET.getDate()).padStart(2, '0')}`;

    // Backfill date field for events that don't have one yet
    const eventsWithDate = cachedData.events.map(event => {
      if (event.date) return event;
      const inferred = event.time ? inferDateFromTime(event.time) : undefined;
      return inferred ? { ...event, date: inferred } : event;
    });

    const filteredAndSortedEvents = eventsWithDate
      .filter((event) => {
        if (event.date) {
          return event.date >= todayISO;
        }
        // Events with no date at all: exclude
        return false;
      })
      .sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
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
