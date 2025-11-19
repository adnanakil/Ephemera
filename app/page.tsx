'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const EventsMap = dynamic(() => import('@/components/EventsMap'), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full rounded-3xl bg-[#E8DED0] flex items-center justify-center">Loading map...</div>
});

interface Event {
  title: string;
  description: string;
  time: string;
  location: string;
  borough?: string;
  neighborhood?: string;
  lat?: number;
  lng?: number;
  link?: string;
  ticketLink?: string;
}

const BOROUGHS = ['All', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx', 'Staten Island'];

export default function Home() {
  // Events state
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<string>('');

  // Filter state
  const [selectedBorough, setSelectedBorough] = useState<string>('All');
  const [neighborhoodSearch, setNeighborhoodSearch] = useState<string>('');

  // View mode state
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Load cached events from Redis on mount
  useEffect(() => {
    const loadCachedEvents = async () => {
      try {
        const response = await fetch('/api/events');
        const data = await response.json();

        if (response.ok && data.events && data.events.length > 0) {
          setEvents(data.events);
          if (data.lastFetched) {
            setLastFetched(new Date(data.lastFetched).toLocaleString());
          }
          console.log('Loaded cached events:', data.events.length);
        }
      } catch (error) {
        console.error('Error loading cached events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCachedEvents();
  }, []);

  // Helper function to get the current date in New York
  const getNowInNewYork = () => {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  };

  // Helper function to parse date and time from time string
  const parseEventDateTime = (timeString: string): Date | null => {
    if (!timeString) return null;
  
    const months: Record<string, number> = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
      'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11,
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };
  
    const lowerTime = timeString.toLowerCase();
    let month: number | null = null;
    let day: number | null = null;
    let hour = 12; // Default to noon if no time is found
    let minute = 0;
  
    for (const [monthName, monthNum] of Object.entries(months)) {
      if (lowerTime.includes(monthName)) {
        month = monthNum;
        const afterMonth = timeString.substring(lowerTime.indexOf(monthName) + monthName.length);
        
        // Regex to find a single day or a date range (e.g., "7", "7-9", "7 - 9")
        const dayMatch = afterMonth.match(/(\d+)(?:\s*-\s*(\d+))?/);
        if (dayMatch) {
          // If a range is found (e.g., "7-9"), use the end date ("9"). Otherwise, use the single day ("7").
          const endDay = dayMatch[2] || dayMatch[1];
          day = parseInt(endDay);
        }
        break;
      }
    }
  
    const timeMatch = lowerTime.match(/(\d{1,2})(:(\d{2}))?\s*(am|pm)?/);
    if (timeMatch) {
      hour = parseInt(timeMatch[1]);
      minute = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
      const isPm = timeMatch[4] === 'pm';
  
      if (isPm && hour < 12) hour += 12;
      else if (!isPm && hour === 12) hour = 0;
    }
  
    if (month !== null && day !== null) {
      const now = getNowInNewYork();
      let year = now.getFullYear();
      
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
      let eventDate = new Date(dateString);

      if (eventDate < now && (now.getTime() - eventDate.getTime()) > 24 * 60 * 60 * 1000) {
        year += 1;
        const nextYearDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
        eventDate = new Date(nextYearDateString);
      }
  
      return eventDate;
    }
  
    return null;
  };

  // Filter events based on borough and neighborhood
  const filteredEvents = events
    .filter((event) => {
      // First, filter by borough and neighborhood
      const boroughMatch = selectedBorough === 'All' || event.borough === selectedBorough;
      const neighborhoodMatch =
        neighborhoodSearch === '' ||
        event.neighborhood?.toLowerCase().includes(neighborhoodSearch.toLowerCase()) ||
        event.location?.toLowerCase().includes(neighborhoodSearch.toLowerCase());

      if (!boroughMatch || !neighborhoodMatch) {
        return false;
      }

      // Then, filter by date
      const eventEndDate = parseEventDateTime(event.time);
      const nowInNY = getNowInNewYork();
      nowInNY.setHours(0, 0, 0, 0); // Set to the beginning of the day for comparison

      if (eventEndDate) {
        // If we have a date, it must be on or after today
        return eventEndDate >= nowInNY;
      } else {
        // If we can't parse a date, show the event only if its time string includes "ongoing"
        // This handles events that are long-running without specific end dates in the title
        return event.time?.toLowerCase().includes('ongoing') ?? false;
      }
    })
    .sort((a, b) => {
      const dateA = parseEventDateTime(a.time);
      const dateB = parseEventDateTime(b.time);

      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;

      return dateA.getTime() - dateB.getTime();
    });

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#3D3426]">
      <div className="container mx-auto px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-[80px] leading-[0.95] font-light tracking-tight mb-6">
            Ephemera
          </h1>
          <p className="text-xl text-[#6B5D4F] mb-20 font-light max-w-2xl">
            Discover what's happening in New York City
          </p>

          {/* Filters */}
          {events.length > 0 && (
            <div className="mb-12 p-8 bg-white rounded-3xl border border-[#E0D5C7]">
              <h2 className="text-2xl font-light mb-6 text-[#3D3426]">Filters</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Borough Filter */}
                <div>
                  <label className="block text-sm font-light text-[#6B5D4F] mb-3">
                    Borough
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {BOROUGHS.map((borough) => (
                      <button
                        key={borough}
                        onClick={() => setSelectedBorough(borough)}
                        className={`px-4 py-2 rounded-full text-sm font-light transition-all ${
                          selectedBorough === borough
                            ? 'bg-[#3D3426] text-[#F5F1E8]'
                            : 'bg-[#E8DED0] text-[#6B5D4F] hover:bg-[#D4C9B7]'
                        }`}
                      >
                        {borough}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Neighborhood Search */}
                <div>
                  <label className="block text-sm font-light text-[#6B5D4F] mb-3">
                    Search Neighborhood
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Williamsburg, SoHo..."
                    value={neighborhoodSearch}
                    onChange={(e) => setNeighborhoodSearch(e.target.value)}
                    className="w-full px-4 py-2 rounded-full bg-[#E8DED0] text-[#3D3426] placeholder-[#8B7D6F] font-light focus:outline-none focus:ring-2 focus:ring-[#3D3426]"
                  />
                </div>
              </div>

              {(selectedBorough !== 'All' || neighborhoodSearch !== '') && (
                <button
                  onClick={() => {
                    setSelectedBorough('All');
                    setNeighborhoodSearch('');
                  }}
                  className="mt-4 text-sm text-[#6B5D4F] hover:text-[#3D3426] font-light underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* View Toggle */}
          {events.length > 0 && (
            <div className="mb-8 flex gap-3">
              <button
                onClick={() => setViewMode('list')}
                className={`px-6 py-2 rounded-full text-sm font-light transition-all ${
                  viewMode === 'list'
                    ? 'bg-[#3D3426] text-[#F5F1E8]'
                    : 'bg-[#E8DED0] text-[#6B5D4F] hover:bg-[#D4C9B7]'
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-6 py-2 rounded-full text-sm font-light transition-all ${
                  viewMode === 'map'
                    ? 'bg-[#3D3426] text-[#F5F1E8]'
                    : 'bg-[#E8DED0] text-[#6B5D4F] hover:bg-[#D4C9B7]'
                }`}
              >
                Map View
              </button>
            </div>
          )}

          {/* NYC Events Section */}
          <div>
            {lastFetched && (
              <p className="text-sm text-[#8B7D6F] font-light mb-12">
                Last updated: {lastFetched}
              </p>
            )}

            {loading && (
              <div className="text-center py-20">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-[#3D3426]"></div>
                <p className="mt-6 text-[#6B5D4F] font-light text-lg">Loading events...</p>
              </div>
            )}

            {!loading && events.length === 0 && (
              <div className="text-center py-20">
                <p className="text-[#6B5D4F] font-light text-lg">No events available yet.</p>
                <p className="text-[#8B7D6F] font-light text-sm mt-2">
                  Events are refreshed daily at 9 AM UTC.
                </p>
              </div>
            )}

            {events.length > 0 && viewMode === 'map' && (
              <div>
                <p className="text-[#6B5D4F] mb-12 text-lg font-light">
                  {filteredEvents.length} {filteredEvents.length === events.length ? '' : `of ${events.length}`} events on map
                </p>
                <EventsMap events={filteredEvents} />
              </div>
            )}

            {events.length > 0 && viewMode === 'list' && (
              <div>
                <p className="text-[#6B5D4F] mb-12 text-lg font-light">
                  {filteredEvents.length} {filteredEvents.length === events.length ? '' : `of ${events.length}`} events
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredEvents.map((event, index) => {
                    // Parse time to extract date vs day/time
                    let displayDate = '';
                    let displayDayTime = '';

                    if (event.time) {
                      // Try to extract date pattern (e.g., "October 30", "Nov 1", "October 30-November 10")
                      const dateMatch = event.time.match(/(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:\s*-\s*(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*\d{1,2})?/i);

                      if (dateMatch) {
                        displayDate = dateMatch[0];
                        // Everything else is day/time
                        displayDayTime = event.time.replace(dateMatch[0], '').replace(/^[,\s]+/, '').trim();
                      } else {
                        // Fallback: use the whole time string
                        displayDate = event.time;
                      }
                    }

                    return (
                      <div
                        key={index}
                        className="bg-white rounded-3xl border border-[#E0D5C7] overflow-hidden hover:border-[#3D3426] transition-all group"
                      >
                        <div className="p-8">
                          {displayDate && (
                            <div className="mb-6">
                              <div className="text-3xl font-light text-[#3D3426] mb-2">
                                {displayDate}
                              </div>
                              {displayDayTime && (
                                <div className="text-sm font-light text-[#6B5D4F]">
                                  {displayDayTime}
                                </div>
                              )}
                            </div>
                          )}
                          <h3 className="text-2xl font-light mb-4 text-[#3D3426] leading-tight">
                            {event.title}
                          </h3>
                          <p className="text-[#6B5D4F] mb-6 text-sm leading-relaxed font-light">
                            {event.description}
                          </p>
                          <div className="space-y-3 text-sm">
                            {event.location && (
                              <div className="flex items-start gap-3">
                                <span className="text-[#8B7D6F] font-light">Location:</span>
                                <span className="text-[#3D3426] font-light flex-1">{event.location}</span>
                              </div>
                            )}
                            {(event.borough || event.neighborhood) && (
                              <div className="flex gap-2 flex-wrap">
                                {event.borough && (
                                  <span className="px-3 py-1 bg-[#E8DED0] text-[#6B5D4F] rounded-full text-xs font-light">
                                    {event.borough}
                                  </span>
                                )}
                                {event.neighborhood && (
                                  <span className="px-3 py-1 bg-[#E8F5E9] text-[#6B5D4F] rounded-full text-xs font-light">
                                    {event.neighborhood}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="flex gap-4 mt-6 pt-4 border-t border-[#E0D5C7]">
                              {event.link && (
                                <a
                                  href={event.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#3D3426] hover:text-[#6B5D4F] font-light text-sm transition-colors"
                                >
                                  Details →
                                </a>
                              )}
                              {event.ticketLink && (
                                <a
                                  href={event.ticketLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#3D3426] hover:text-[#6B5D4F] font-light text-sm transition-colors"
                                >
                                  Tickets →
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
