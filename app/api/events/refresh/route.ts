import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@upstash/qstash';

// This endpoint triggers a background refresh via QStash and returns immediately
export async function POST(request: NextRequest) {
  try {
    // Check if QStash is configured
    const qstashToken = process.env.QSTASH_TOKEN;

    if (!qstashToken) {
      console.error('[Refresh] QStash not configured. Missing QSTASH_TOKEN environment variable.');
      return NextResponse.json({
        success: false,
        error: 'Background job service not configured. Please set up QStash in Upstash console.',
        message: 'Go to https://console.upstash.com and enable QStash to get QSTASH_TOKEN',
      }, { status: 500 });
    }

    // Initialize QStash client
    const qstash = new Client({ token: qstashToken });

    // Get the base URL from the request
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host');
    const callbackUrl = `${protocol}://${host}/api/events/fetch`;

    console.log(`[Refresh] Publishing job to QStash: ${callbackUrl}`);

    // Publish message to QStash (will call our fetch endpoint in the background)
    await qstash.publishJSON({
      url: callbackUrl,
      body: {
        source: 'manual-refresh',
        timestamp: new Date().toISOString(),
      },
    });

    console.log('[Refresh] Job successfully queued in QStash');

    // Return immediately to the client
    return NextResponse.json({
      success: true,
      message: 'Refresh job queued successfully. Events will be updated in a few minutes.',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Refresh] Failed to queue job:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to queue refresh job',
    }, { status: 500 });
  }
}
