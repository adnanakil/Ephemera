import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getRedis } from '@/lib/redis';

const CACHE_KEY = 'nyc_events';
const BATCH_SIZE = 25;

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
  lastFetched: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Enrich] Starting enrichment job');

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return NextResponse.json(
        { success: false, error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    const redis = getRedis();

    const cachedData = await redis.get<EventsResponse>(CACHE_KEY);
    if (!cachedData || !cachedData.events) {
      console.log('[Enrich] No cached events found');
      return NextResponse.json({
        success: false,
        message: 'No events in cache',
        enrichedCount: 0,
      });
    }

    const unenrichedEvents = cachedData.events.filter(e => !e.enriched);
    console.log(`[Enrich] Found ${unenrichedEvents.length} unenriched events out of ${cachedData.events.length} total`);

    if (unenrichedEvents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All events already enriched',
        enrichedCount: 0,
        remaining: 0,
        totalEvents: cachedData.events.length,
      });
    }

    const batch = unenrichedEvents.slice(0, BATCH_SIZE);
    console.log(`[Enrich] Processing batch of ${batch.length} events`);

    // Build the prompt with event summaries
    const eventList = batch.map((e, i) =>
      `${i + 1}. Title: ${e.title}\n   Location: ${e.location}\n   Time: ${e.time}\n   Category: ${e.category || 'unknown'}\n   Current description: ${e.description}`
    ).join('\n\n');

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `You are enriching event descriptions for an NYC events app. For each event below, write a compelling 2-3 sentence description using your knowledge about the artist, band, comedian, theater company, exhibit, or event.

Guidelines:
- For bands/musicians: mention their genre, style, and notable albums or songs
- For comedians: mention their comedy style and what they're known for
- For art exhibits/museums: describe what's being shown and the artist's significance
- For theater/dance: describe the show and production company
- For generic events (food festivals, markets, etc.): describe what attendees can expect
- If you don't know the specific artist/event, write a good description based on the venue and event type
- Keep each description to 2-3 sentences, vivid and informative
- Do NOT include the event title in the description

Return a JSON array of objects with "index" (1-based, matching the numbering below) and "description" fields. Return ONLY the JSON array, no other text.

Events:

${eventList}`
        }
      ],
    });

    // Parse the response
    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    let enrichments: { index: number; description: string }[] = [];

    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        enrichments = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('[Enrich] Failed to parse Claude response:', parseError);
      console.error('[Enrich] Raw response:', responseText.substring(0, 500));
      return NextResponse.json(
        { success: false, error: 'Failed to parse enrichment response' },
        { status: 500 }
      );
    }

    console.log(`[Enrich] Got ${enrichments.length} enrichments from Claude`);

    // Build a map from batch index to enriched description
    const enrichmentMap = new Map<number, string>();
    for (const e of enrichments) {
      if (e.index >= 1 && e.index <= batch.length && e.description) {
        enrichmentMap.set(e.index - 1, e.description);
      }
    }

    // Update events in the full array
    let enrichedCount = 0;
    const updatedEvents = cachedData.events.map(event => {
      const batchIndex = batch.findIndex(
        b => b.title === event.title && b.location === event.location && b.time === event.time
      );
      if (batchIndex !== -1 && enrichmentMap.has(batchIndex)) {
        enrichedCount++;
        return {
          ...event,
          description: enrichmentMap.get(batchIndex)!,
          enriched: true,
        };
      }
      return event;
    });

    // Save back to Redis
    const updatedData = {
      ...cachedData,
      events: updatedEvents,
    };

    await redis.set(CACHE_KEY, updatedData);

    const remaining = unenrichedEvents.length - batch.length;
    console.log(`[Enrich] Batch complete: ${enrichedCount} enriched, ${remaining} remaining`);

    // If there are more events to enrich, trigger the next batch
    if (remaining > 0) {
      console.log('[Enrich] Triggering next batch...');
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://ephemera-nyc-0c9477e4fde1.herokuapp.com'}/api/events/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch(err => {
        console.error('[Enrich] Failed to trigger next batch:', err);
      });
    }

    return NextResponse.json({
      success: true,
      enrichedCount,
      remaining,
      totalEvents: updatedEvents.length,
    });

  } catch (error) {
    console.error('[Enrich] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Enrichment failed',
      },
      { status: 500 }
    );
  }
}
