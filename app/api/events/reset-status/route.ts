import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

const STATUS_KEY = 'scraping_status';

export async function POST() {
  try {
    const redis = getRedis();

    const resetStatus = {
      isRunning: false,
      currentSource: '',
      sourcesCompleted: 0,
      totalSources: 19,
      eventsScraped: 0,
      lastUpdate: new Date().toISOString(),
    };

    console.log('[Reset] Resetting scraping status to:', resetStatus);

    await redis.set(STATUS_KEY, JSON.stringify(resetStatus));

    return NextResponse.json({
      success: true,
      message: 'Scraping status has been reset',
      status: resetStatus,
    });
  } catch (error) {
    console.error('[Reset] Error resetting scraping status:', error);
    return NextResponse.json(
      {
        error: 'Failed to reset scraping status',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
