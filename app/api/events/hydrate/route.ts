import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getRedis } from '@/lib/redis';
import { parseLocation } from '@/lib/location-parser';

interface Event {
  title: string;
  description: string;
  time: string;
  date?: string;
  location: string;
  borough?: string;
  neighborhood?: string;
  lat?: number;
  lng?: number;
  link?: string;
  ticketLink?: string;
}

const CACHE_KEY = 'nyc_events';
const MAX_EVENTS_TO_HYDRATE = 20; // Limit to prevent timeout

// Helper function to check if an event is past/old (same as in fetch route)
function isEventPast(event: Event): boolean {
  if (!event.time) return false; // Keep events with no time

  const timeString = event.time.toLowerCase();

  // Always keep "ongoing" events
  if (timeString.includes('ongoing') || timeString.includes('permanent')) {
    return false;
  }

  // Try to parse the date from the time string
  const months: Record<string, number> = {
    'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
    'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11,
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
  };

  let month: number | null = null;
  let day: number | null = null;

  // Find month
  for (const [monthName, monthNum] of Object.entries(months)) {
    if (timeString.includes(monthName)) {
      month = monthNum;
      // Try to find day number after month
      const afterMonth = timeString.substring(timeString.indexOf(monthName) + monthName.length);
      const dayMatch = afterMonth.match(/\d+/);
      if (dayMatch) {
        day = parseInt(dayMatch[0]);
      }
      break;
    }
  }

  if (month === null || day === null) {
    return false; // Can't parse date, keep the event
  }

  // Get current time in Eastern Time (America/New_York)
  const nowUTC = new Date();
  const nowET = new Date(nowUTC.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const currentYear = nowET.getFullYear();

  // Construct the event date in Eastern Time
  const eventDate = new Date(currentYear, month, day);

  // If event date is in the past (before yesterday in ET), consider it old
  const yesterdayET = new Date(nowET);
  yesterdayET.setDate(yesterdayET.getDate() - 1);
  yesterdayET.setHours(0, 0, 0, 0); // Start of yesterday

  return eventDate < yesterdayET;
}

export async function POST(request: NextRequest) {
  console.log('[HYDRATE] Starting event hydration');

  try {
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (!firecrawlApiKey || !anthropicApiKey) {
      return NextResponse.json(
        { error: 'API keys not configured' },
        { status: 500 }
      );
    }

    // Get current events from Redis
    const redis = getRedis();
    const cachedData = await redis.get(CACHE_KEY);

    if (!cachedData) {
      return NextResponse.json(
        { error: 'No events found. Please refresh events first.' },
        { status: 404 }
      );
    }

    const parsedCache = JSON.parse(cachedData as string);
    const events: Event[] = parsedCache.events || [];

    console.log(`[HYDRATE] Found ${events.length} cached events`);

    // Find events that need hydration
    const eventsNeedingHydration = events.filter(event =>
      event.link && (
        !event.description || event.description.length < 50 ||
        !event.location || event.location === 'New York, New York' ||
        event.location.split(',').length === 1
      )
    ).slice(0, MAX_EVENTS_TO_HYDRATE);

    console.log(`[HYDRATE] Hydrating ${eventsNeedingHydration.length} events`);

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });
    let hydratedCount = 0;

    // Hydrate each event
    for (const event of eventsNeedingHydration) {
      try {
        console.log(`[HYDRATE] Fetching detail page for: ${event.title}`);

        // Scrape the detail page
        const detailResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${firecrawlApiKey}`,
          },
          body: JSON.stringify({
            url: event.link,
            formats: ['markdown'],
          }),
        });

        if (!detailResponse.ok) {
          console.error(`[HYDRATE] Failed to scrape ${event.link}`);
          continue;
        }

        const detailData = await detailResponse.json();
        const detailContent = detailData.data?.markdown || '';

        if (!detailContent) {
          console.error(`[HYDRATE] No content from ${event.link}`);
          continue;
        }

        // Use Claude to extract better data
        const detailExtraction = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 2048,
          messages: [
            {
              role: 'user',
              content: `Extract event details from this page. Return a JSON object with:
- description: A 2-3 sentence description of the event
- location: The full address or venue with neighborhood (be specific)
- date: The event date in YYYY-MM-DD format (e.g. "2026-02-15"). For multi-day events, use the START date.
- time: COMPLETE date and time (MUST include the full date like "Thursday, October 30" or "November 1, 2024", plus time like "7:00 PM - 11:00 PM". Never return just "7:30 PM" without the date!)

Current data: ${JSON.stringify(event)}

Page content:
${detailContent.substring(0, 8000)}

IMPORTANT: Extract the FULL date and time. Look carefully for the date - it might be in headings, metadata, or the event details section. If you find the date and time separately, combine them into one complete string.

Return ONLY a JSON object like: {"description":"...","location":"...","date":"YYYY-MM-DD","time":"..."}`,
            },
          ],
        });

        let detailText = '';
        for (const block of detailExtraction.content) {
          if (block.type === 'text') {
            detailText += block.text;
          }
        }

        // Parse the extracted details
        try {
          const detailMatch = detailText.match(/\{[\s\S]*\}/);
          if (detailMatch) {
            const detailedData = JSON.parse(detailMatch[0]);

            // Update the event in the events array
            const eventIndex = events.findIndex(e => e.title === event.title && e.link === event.link);
            if (eventIndex !== -1) {
              // Smart merge for time - only use extracted time if it has more info
              let mergedTime = events[eventIndex].time;
              if (detailedData.time) {
                // If extracted time has date info (month name, day number, or year), use it
                // Otherwise, keep the original which might have the date
                const hasDateInfo = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}(st|nd|rd|th)?|\d{4})/i.test(detailedData.time);
                if (hasDateInfo || detailedData.time.length > mergedTime.length) {
                  mergedTime = detailedData.time;
                }
              }

              // Prefer detail page date if it's valid YYYY-MM-DD
              let mergedDate = events[eventIndex].date;
              if (detailedData.date && /^\d{4}-\d{2}-\d{2}$/.test(detailedData.date)) {
                mergedDate = detailedData.date;
              }

              events[eventIndex] = {
                ...events[eventIndex],
                description: (detailedData.description && detailedData.description.length > 50)
                  ? detailedData.description
                  : events[eventIndex].description,
                location: (detailedData.location && detailedData.location !== 'New York, New York')
                  ? detailedData.location
                  : events[eventIndex].location,
                time: mergedTime,
                date: mergedDate,
              };

              // Re-parse location for updated coordinates (with geocoding)
              const { borough, neighborhood, lat, lng } = await parseLocation(events[eventIndex].location || '');
              events[eventIndex].borough = borough;
              events[eventIndex].neighborhood = neighborhood;
              events[eventIndex].lat = lat;
              events[eventIndex].lng = lng;

              hydratedCount++;
              console.log(`[HYDRATE] Enriched event: ${event.title}`);
            }
          }
        } catch (jsonError) {
          console.error(`[HYDRATE] Failed to parse detail JSON for ${event.title}:`, jsonError);
        }
      } catch (detailError) {
        console.error(`[HYDRATE] Error fetching detail for ${event.title}:`, detailError);
      }
    }

    // Filter out past events before saving
    const activeEvents = events.filter(event => !isEventPast(event));
    const removedCount = events.length - activeEvents.length;
    if (removedCount > 0) {
      console.log(`[HYDRATE] Removed ${removedCount} past events`);
    }

    // Save updated events back to Redis
    const updatedData = {
      ...parsedCache,
      events: activeEvents,
      lastHydrated: new Date().toISOString(),
    };

    await redis.set(CACHE_KEY, JSON.stringify(updatedData));
    console.log(`[HYDRATE] Saved ${hydratedCount} hydrated events to cache (${activeEvents.length} total active events)`);

    return NextResponse.json({
      success: true,
      hydratedCount,
      totalEvents: activeEvents.length,
      removedOldEvents: removedCount,
      lastHydrated: updatedData.lastHydrated,
    });
  } catch (error) {
    console.error('[HYDRATE] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to hydrate events',
      },
      { status: 500 }
    );
  }
}
