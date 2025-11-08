import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
  console.log('[API] Scrape endpoint called');
  try {
    const { url } = await request.json();
    console.log('[API] Scraping URL:', url);

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    if (!firecrawlApiKey) {
      return NextResponse.json(
        { error: 'FIRECRAWL_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Use Firecrawl REST API directly (works in serverless)
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firecrawlApiKey}`,
      },
      body: JSON.stringify({
        url: url,
        formats: ['markdown', 'html'],
      }),
    });

    if (!firecrawlResponse.ok) {
      const errorData = await firecrawlResponse.json().catch(() => ({}));
      throw new Error(`Firecrawl API error: ${errorData.error || firecrawlResponse.statusText}`);
    }

    const firecrawlData = await firecrawlResponse.json();
    const scrapedContent = firecrawlData.data?.markdown || firecrawlData.data?.html || '';

    if (!scrapedContent) {
      return NextResponse.json(
        { error: 'No content could be extracted from the URL' },
        { status: 400 }
      );
    }

    // Initialize Anthropic client and ask Claude to format/summarize the content
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Here is the content scraped from ${url}:\n\n${scrapedContent}\n\nPlease analyze and present this content in a clean, readable format. Extract the main information and present it clearly.`,
        },
      ],
    });

    let formattedContent = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        formattedContent += block.text;
      }
    }

    return NextResponse.json({
      content: formattedContent || scrapedContent,
    });
  } catch (error) {
    console.error('Error scraping URL:', error);

    // Provide more detailed error information
    let errorMessage = 'Failed to scrape URL';
    let errorDetails = '';

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
    }

    console.error('Error details:', {
      message: errorMessage,
      details: errorDetails,
      name: error instanceof Error ? error.name : 'Unknown',
    });

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
