import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';

// QStash trigger handler — delegates to the main fetch endpoint
// so there's a single source of truth for EVENT_URLS
async function handler(request: NextRequest) {
  console.log('[ScrapeTrigger] Received QStash trigger, forwarding to main fetch endpoint');

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ephemera-nyc-0c9477e4fde1.herokuapp.com';
    const response = await fetch(`${baseUrl}/api/events/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log(`[ScrapeTrigger] Fetch endpoint responded with status: ${response.status}`);

    return NextResponse.json({
      success: true,
      triggered: true,
      fetchStatus: response.status,
      ...data,
    });
  } catch (error) {
    console.error('[ScrapeTrigger] Error triggering fetch:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trigger fetch',
      },
      { status: 500 }
    );
  }
}

// Wrap with QStash signature verification
export const POST = verifySignatureAppRouter(handler);
