import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import Anthropic from '@anthropic-ai/sdk';
import { getRedis } from '@/lib/redis';
import { parseLocation } from '@/lib/location-parser';

const CACHE_KEY = 'nyc_events';
const STATUS_KEY = 'scraping_status';

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

const EVENT_URLS = [
  'https://www.nyc.gov/main/events/',
  'https://lu.ma/nyc',
  'https://eventlume.com/things-to-do/new-york',
  'https://secretnyc.co/what-to-do-this-weekend-nyc/',
  'https://www.nycgovparks.org/events/',
  'https://www.nycforfree.co/events',
  'https://ny-event-radar.com',
  'https://www.msg.com/beacon-theatre/calendar?venue=beacon-theatre&venues=KovZpZAEAd6A',
  'https://www.thebellhouseny.com/shows',
  'https://www.musichallofwilliamsburg.com/calendar/',
  'https://www.elsewhere.club/events',
  'https://wl.eventim.us/BabysAllRightBrooklyn',
  'https://www.saintvitusbar.com/events',
  'https://www.nationalsawdust.org/performances',
  'https://bk.knittingfactory.com/calendar/',
  'https://www.markethotel.org/calendar#/events',
  'https://www.bowerypresents.com/shows/terminal-5',
  'https://mercuryeastpresents.com/boweryballroom/',
  'https://www.ticketweb.com/venue/night-club-101-new-york-ny/686683',
];

// QStash trigger handler for background scraping
async function handler(request: NextRequest) {
  console.log('[ScrapeTrigger] Starting scraping job via QStash');

  try {
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    const scrapflyApiKey = process.env.SCRAPFLY_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (!firecrawlApiKey || !anthropicApiKey || !scrapflyApiKey) {
      return NextResponse.json(
        { error: 'API keys not configured' },
        { status: 500 }
      );
    }

    const redis = getRedis();

    // Set initial status
    await redis.set(STATUS_KEY, {
      isRunning: true,
      currentSource: '',
      sourcesCompleted: 0,
      totalSources: EVENT_URLS.length,
      eventsScraped: 0,
      lastUpdate: new Date().toISOString(),
    });
    console.log('[ScrapeTrigger] Set initial scraping status: isRunning=true');

    // Get existing events from Redis at the start
    let existingEvents: Event[] = [];
    try {
      const cachedData = await redis.get<EventsResponse>(CACHE_KEY);
      if (cachedData) {
        existingEvents = cachedData.events || [];
        console.log(`[ScrapeTrigger] Found ${existingEvents.length} existing events in cache`);
      }
    } catch (redisError) {
      console.error('[ScrapeTrigger] Error reading from Redis:', redisError);
    }

    // Helper function to merge and deduplicate events
    const mergeEvents = (existing: Event[], newEvents: Event[]): Event[] => {
      const eventMap = new Map<string, Event>();

      // Add existing events first
      existing.forEach(event => {
        const key = `${event.title.toLowerCase()}|${event.link || event.location}`;
        eventMap.set(key, event);
      });

      // Add new events (will overwrite if duplicate, keeping fresher data)
      newEvents.forEach(event => {
        const key = `${event.title.toLowerCase()}|${event.link || event.location}`;
        eventMap.set(key, event);
      });

      return Array.from(eventMap.values());
    };

    let totalNewEvents = 0;

    // Scrape each URL and save incrementally
    for (let i = 0; i < EVENT_URLS.length; i++) {
      const url = EVENT_URLS[i];
      console.log(`[ScrapeTrigger] Scraping ${url}`);

      // Update status for current source
      try {
        await redis.set(STATUS_KEY, {
          isRunning: true,
          currentSource: url,
          sourcesCompleted: i,
          totalSources: EVENT_URLS.length,
          eventsScraped: totalNewEvents,
          lastUpdate: new Date().toISOString(),
        });
      } catch (statusError) {
        console.error('[ScrapeTrigger] Error updating status:', statusError);
      }

      try {
        let scrapedContent = '';
        let scraper = '';

        // Try Firecrawl first
        try {
          const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${firecrawlApiKey}`,
            },
            body: JSON.stringify({
              url: url,
              formats: ['markdown', 'html'],
              waitFor: 3000,
              timeout: 30000,
            }),
          });

          if (firecrawlResponse.ok) {
            const firecrawlData = await firecrawlResponse.json();
            scrapedContent = firecrawlData.data?.markdown || firecrawlData.data?.html || '';
            if (scrapedContent) {
              scraper = 'Firecrawl';
              console.log(`[ScrapeTrigger] Firecrawl success for ${url}`);
            }
          } else {
            console.log(`[ScrapeTrigger] Firecrawl failed for ${url}, status: ${firecrawlResponse.status}`);
          }
        } catch (firecrawlError) {
          console.log(`[ScrapeTrigger] Firecrawl error for ${url}:`, firecrawlError);
        }

        // If Firecrawl failed or returned no content, try Scrapfly
        if (!scrapedContent) {
          console.log(`[ScrapeTrigger] Trying Scrapfly for ${url}`);
          try {
            const scrapflyUrl = new URL('https://api.scrapfly.io/scrape');
            scrapflyUrl.searchParams.append('key', scrapflyApiKey);
            scrapflyUrl.searchParams.append('url', url);
            scrapflyUrl.searchParams.append('render_js', 'true');
            scrapflyUrl.searchParams.append('format', 'markdown');
            scrapflyUrl.searchParams.append('asp', 'true');

            const scrapflyResponse = await fetch(scrapflyUrl.toString());

            if (scrapflyResponse.ok) {
              const scrapflyData = await scrapflyResponse.json();
              scrapedContent = scrapflyData.result?.content || '';
              if (scrapedContent) {
                scraper = 'Scrapfly';
                console.log(`[ScrapeTrigger] Scrapfly success for ${url}`);
              }
            } else {
              console.log(`[ScrapeTrigger] Scrapfly failed for ${url}, status: ${scrapflyResponse.status}`);
            }
          } catch (scrapflyError) {
            console.log(`[ScrapeTrigger] Scrapfly error for ${url}:`, scrapflyError);
          }
        }

        // If both scrapers failed, skip this URL
        if (!scrapedContent) {
          console.error(`[ScrapeTrigger] Both Firecrawl and Scrapfly failed for ${url}`);
          continue;
        }

        console.log(`[ScrapeTrigger] Content length from ${url} (via ${scraper}): ${scrapedContent.length} characters`);

        // Use Claude to extract structured event data
        const anthropic = new Anthropic({
          apiKey: anthropicApiKey,
        });

        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 8192,
          messages: [
            {
              role: 'user',
              content: `You are an event extraction system. Extract EVERY SINGLE event from this NYC events page.

For each event, provide:
- title: The event name
- description: Brief description (2-3 sentences max)
- time: FULL date and time (MUST include the day/date like "October 30" or "Nov 1st", plus the time like "7:00 PM". Never just the time alone!)
- location: Where it takes place (be specific, include neighborhood or venue name)
- category: Choose ONE category that best fits the event from these options: "Cultural & Arts", "Fitness & Wellness", "Sports & Recreation", "Markets & Shopping", "Community & Volunteering", "Food & Dining", "Holiday & Seasonal", "Professional & Networking", "Educational & Literary"
- link: URL to event page (if available)
- ticketLink: URL to buy tickets (if available)

CRITICAL REQUIREMENTS:
1. Extract EVERY SINGLE event on the page - DO NOT stop after a few events
2. If there are 50 events on the page, extract all 50
3. If there are 100 events on the page, extract all 100
4. For the time field, always extract the COMPLETE date and time
5. Look for date indicators in headings, sections, or near the event
6. If you can only find the time (like "7:30 PM") but the date is in a section heading, combine them!
7. For the category field, analyze the event content and assign the most appropriate category

Return ONLY a valid JSON array of events, nothing else. NO explanatory text, NO comments.
Format:
[{"title":"...","description":"...","time":"...","location":"...","category":"...","link":"...","ticketLink":"..."}]

Content to parse:
${scrapedContent.substring(0, 200000)}`,
            },
          ],
        });

        let eventsText = '';
        for (const block of response.content) {
          if (block.type === 'text') {
            eventsText += block.text;
          }
        }

        console.log(`[ScrapeTrigger] Claude response length for ${url}: ${eventsText.length} characters`);

        // Parse the JSON response from Claude
        try {
          // Extract JSON array from the response
          const jsonMatch = eventsText.match(/\[[\s\S]*\]/);
          if (!jsonMatch) {
            console.error(`[ScrapeTrigger] No JSON array found in response for ${url}`);
            continue;
          }

          let events;
          try {
            events = JSON.parse(jsonMatch[0]);
          } catch (jsonParseError) {
            console.error(`[ScrapeTrigger] Failed to parse JSON for ${url}:`, jsonParseError);
            continue;
          }

          if (!Array.isArray(events) || events.length === 0) {
            console.log(`[ScrapeTrigger] No events found in ${url}`);
            continue;
          }

          // Parse location to add borough, neighborhood, and coordinates
          console.log(`[ScrapeTrigger] Processing locations for ${events.length} events from ${url}...`);
          const eventsWithLocation = await Promise.all(
            events.map(async (event: Event) => {
              const { borough, neighborhood, lat, lng } = await parseLocation(event.location || '', false);
              return {
                ...event,
                borough,
                neighborhood,
                lat,
                lng,
              };
            })
          );

          console.log(`[ScrapeTrigger] Extracted ${eventsWithLocation.length} events from ${url}`);
          totalNewEvents += eventsWithLocation.length;

          // Update status with new events count
          try {
            await redis.set(STATUS_KEY, {
              isRunning: true,
              currentSource: url,
              sourcesCompleted: i + 1,
              totalSources: EVENT_URLS.length,
              eventsScraped: totalNewEvents,
              lastUpdate: new Date().toISOString(),
            });
          } catch (statusError) {
            console.error('[ScrapeTrigger] Error updating status after extraction:', statusError);
          }

          // INCREMENTAL SAVE: Merge with existing and save to cache immediately
          existingEvents = mergeEvents(existingEvents, eventsWithLocation);

          const responseData = {
            success: true,
            count: existingEvents.length,
            events: existingEvents,
            lastFetched: new Date().toISOString(),
          };

          try {
            await redis.set(CACHE_KEY, responseData);
            console.log(`[ScrapeTrigger] Incremental save: ${existingEvents.length} total events cached (${eventsWithLocation.length} new from ${url})`);
          } catch (redisError) {
            console.error('[ScrapeTrigger] Error saving to Redis:', redisError);
          }

        } catch (parseError) {
          console.error('[ScrapeTrigger] Failed to parse events JSON:', parseError);
        }
      } catch (urlError) {
        console.error(`[ScrapeTrigger] Error processing ${url}:`, urlError);
      }
    }

    console.log(`[ScrapeTrigger] Total new events extracted: ${totalNewEvents}`);

    // Mark as complete
    await redis.set(STATUS_KEY, {
      isRunning: false,
      currentSource: '',
      sourcesCompleted: EVENT_URLS.length,
      totalSources: EVENT_URLS.length,
      eventsScraped: totalNewEvents,
      lastUpdate: new Date().toISOString(),
    });
    console.log('[ScrapeTrigger] Scraping complete, set isRunning=false');

    return NextResponse.json({
      success: true,
      message: 'Scraping completed successfully',
      eventsScraped: totalNewEvents,
      totalEvents: existingEvents.length,
    });

  } catch (error) {
    console.error('[ScrapeTrigger] Handler error:', error);

    // Mark as failed
    try {
      const redis = getRedis();
      await redis.set(STATUS_KEY, {
        isRunning: false,
        currentSource: '',
        sourcesCompleted: 0,
        totalSources: EVENT_URLS.length,
        eventsScraped: 0,
        lastUpdate: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (redisError) {
      console.error('[ScrapeTrigger] Error setting failed status:', redisError);
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start scraping',
      },
      { status: 500 }
    );
  }
}

// Wrap with QStash signature verification
export const POST = verifySignatureAppRouter(handler);
