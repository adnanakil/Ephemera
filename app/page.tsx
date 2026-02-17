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
  date?: string;
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

  // Helper to format a YYYY-MM-DD date string to display like "February 15"
  const formatDateForDisplay = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[month - 1]} ${day}`;
  };

  // Get today's ISO date string in Eastern Time
  const getTodayISO = () => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  // Filter events based on borough, neighborhood, and date
  const filteredEvents = events
    .filter((event) => {
      const boroughMatch = selectedBorough === 'All' || event.borough === selectedBorough;
      const neighborhoodMatch =
        neighborhoodSearch === '' ||
        event.neighborhood?.toLowerCase().includes(neighborhoodSearch.toLowerCase()) ||
        event.location?.toLowerCase().includes(neighborhoodSearch.toLowerCase());

      if (!boroughMatch || !neighborhoodMatch) {
        return false;
      }

      // Filter by date field
      if (event.date) {
        return event.date >= getTodayISO();
      }
      // Events without a date: keep only if no time info at all
      return !event.time;
    })
    .sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
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
                    // Use structured date field for display, fall back to time string
                    let displayDate = '';
                    let displayDayTime = '';

                    if (event.date) {
                      displayDate = formatDateForDisplay(event.date);
                      // Extract time portion from the time string (e.g., "7:00 PM")
                      if (event.time) {
                        const timeMatch = event.time.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)(?:\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))?/);
                        displayDayTime = timeMatch ? timeMatch[0] : '';
                      }
                    } else if (event.time) {
                      displayDate = event.time;
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
