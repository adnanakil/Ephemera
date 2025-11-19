import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds

export async function POST(request: NextRequest) {
  try {
    const redis = getRedis();

    // Get the last scrape timestamp
    const lastScrapeKey = 'scraping:lastCompleted';
    const lastScrapeTime = await redis.get(lastScrapeKey);

    const now = Date.now();
    const timeSinceLastScrape = lastScrapeTime
      ? now - parseInt(lastScrapeTime as string)
      : TWO_DAYS_MS + 1; // If no last scrape, run it

    console.log(`[Scheduled] Time since last scrape: ${Math.round(timeSinceLastScrape / 1000 / 60 / 60)} hours`);

    // Only run if 2+ days have passed
    /*
    if (timeSinceLastScrape < TWO_DAYS_MS) {
      const hoursRemaining = Math.round((TWO_DAYS_MS - timeSinceLastScrape) / 1000 / 60 / 60);
      console.log(`[Scheduled] Skipping scrape - ${hoursRemaining} hours until next scheduled run`);

      return NextResponse.json({
        success: true,
        skipped: true,
        message: `Skipped - ${hoursRemaining} hours remaining`,
        hoursUntilNext: hoursRemaining
      });
    }
    */

    // Trigger the scrape by calling the fetch endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ephemera-nyc-0c9477e4fde1.herokuapp.com';
    const response = await fetch(`${baseUrl}/api/events/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`[Scheduled] Triggered scrape - status: ${response.status}`);

    return NextResponse.json({
      success: true,
      triggered: true,
      message: 'Scrape triggered successfully',
      status: response.status
    });

  } catch (error) {
    console.error('[Scheduled] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
