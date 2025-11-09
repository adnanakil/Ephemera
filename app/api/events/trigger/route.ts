import { NextRequest, NextResponse } from 'next/server';
import { enqueueScraping } from '@/lib/queue';

// This endpoint triggers a background scraping job (no timeout!)
export async function POST(request: NextRequest) {
  try {
    console.log('[Trigger] Enqueuing background scraping job...');

    const job = await enqueueScraping();

    console.log(`[Trigger] Job enqueued successfully: ${job.id}`);

    return NextResponse.json({
      success: true,
      message: 'Scraping job queued successfully',
      jobId: job.id,
    });
  } catch (error) {
    console.error('[Trigger] Failed to enqueue job:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue scraping job',
      },
      { status: 500 }
    );
  }
}
