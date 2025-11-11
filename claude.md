# Claude Development Guide - Ephemera NYC

This document contains information for Claude Code to help with development on this project.

## Project Overview

Ephemera is an NYC events aggregation app that scrapes venues across Manhattan, Brooklyn, and Queens. It uses:
- **Next.js** (frontend & API routes)
- **Heroku** (production deployment)
- **Upstash Redis** (event caching)
- **BullMQ** (background job processing)
- **Firecrawl/Scrapfly** (web scraping)
- **Claude Haiku 4.5** (event extraction from HTML)
- **Swift iOS app** (native mobile client)

## Custom Tools

### Venue Scraper Tool

**Location:** `tools/scrape-venue.js`

A Node.js script that uses Scrapfly API to analyze venue websites and find event calendar pages.

**Purpose:**
- Quickly discover event/calendar URLs on venue websites
- Extract relevant links and text mentions
- Test if venues are scrapable before adding them to the main scraper

**Setup:**
```bash
# API key is stored in .env.local
SCRAPFLY_API_KEY=scp-live-0f7f4cd9f9f9462782dfaadcd93cfa40
```

**Usage:**
```bash
# Basic usage with default search terms (event|calendar|show)
node tools/scrape-venue.js <url>

# Custom search term
node tools/scrape-venue.js <url> <search-term>
```

**Examples:**
```bash
# Find event calendars on Music Hall of Williamsburg
node tools/scrape-venue.js https://www.musichallofwilliamsburg.com

# Search for "tickets" mentions
node tools/scrape-venue.js https://venue.com "tickets|shows"

# Search for performance-related pages
node tools/scrape-venue.js https://theater.org "performance|schedule"
```

**Output:**
- ✅ Fetches the page via Scrapfly (bypasses most bot protection)
- 📎 Lists all matching URLs found on the page (event/calendar links)
- 📝 Shows text snippets containing the search terms
- ❌ Reports errors if page is unreachable

**How it works:**
1. Fetches URL content using Scrapfly API
2. Searches HTML for `href` attributes matching the search pattern
3. Converts relative URLs to absolute URLs
4. Filters out anchors and javascript: links
5. Extracts text snippets for context

**Common patterns found:**
- `/events`
- `/calendar`
- `/shows`
- `/calendar/`
- `/upcoming-events`
- `/ticket-and-events`

**When to use:**
- Before adding a new venue to the scraper
- To verify a venue has a public event calendar
- To find the correct URL path for event listings
- To test if a site is accessible (not blocking scrapers)

## Development Workflow

### Adding New Venues

1. **Find the venue** - Research NYC venues in categories:
   - Music venues (rock, jazz, indie)
   - Theaters & performing arts centers
   - Comedy clubs
   - Art museums & cultural spaces
   - Dance clubs & nightlife

2. **Test with scraper tool:**
   ```bash
   node tools/scrape-venue.js https://newvenue.com
   ```

3. **Add to event sources** in `app/api/events/fetch/route.ts`:
   ```typescript
   const EVENT_URLS = [
     // ... existing venues
     'https://newvenue.com/events',
   ];
   ```

4. **Deploy to Heroku:**
   ```bash
   git add app/api/events/fetch/route.ts
   git commit -m "Add [venue name] to event sources"
   git push heroku main
   ```

5. **Test the scrape** (optional - scraping is expensive):
   ```bash
   curl -X POST https://ephemera-nyc-0c9477e4fde1.herokuapp.com/api/events/fetch
   ```

### Current Event Sources

**Total: 111 venues across NYC**

Categories:
- Brooklyn music venues (35+) - including Bushwick/Williamsburg indie & DIY spaces
- Manhattan clubs & theaters (50+) - including electronic/dance venues
- Queens venues (6) - including Forest Hills Stadium, UBS Arena
- Jazz clubs (5)
- Art museums & cultural institutions (12) - MoMA, Met, Guggenheim, Whitney, Brooklyn Museum, Frick, Morgan Library, New Museum, Studio Museum in Harlem, AMNH, NY Historical Society, Museum of the City of NY
- Comedy clubs (5)
- Performance halls (Lincoln Center, Carnegie Hall, Apollo Theater, Radio City, MSG)

## Key Files

- `app/api/events/fetch/route.ts` - Main scraping endpoint with event source URLs
- `tools/scrape-venue.js` - Venue discovery tool
- `.env.local` - Local environment variables (Scrapfly API key)

## Important Notes

- **Scraping is expensive** - Only trigger full scrapes when necessary
- **Test venues first** - Use the scraper tool before adding to production
- **Some sites block scrapers** - Scrapfly helps but not all sites are accessible
- **Event deduplication** - Uses title + location as unique key
- **Geocoding rate limit** - Nominatim API: 1 request/second
