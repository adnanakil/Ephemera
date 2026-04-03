'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const EventsMap = dynamic(() => import('@/components/EventsMap'), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full rounded-xl bg-[#141416] border border-[#252528] flex items-center justify-center text-[#5C5A54]">Loading map...</div>
});

interface Event {
  title: string;
  description: string;
  time: string;
  date?: string;
  location: string;
  borough?: string;
  neighborhood?: string;
  category?: string;
  lat?: number;
  lng?: number;
  link?: string;
  ticketLink?: string;
}

const BOROUGHS = ['All', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx', 'Staten Island'];
// Display label → stored category value from scraper
const EVENT_TYPE_MAP: Record<string, string> = {
  'All': 'All',
  'Culture': 'Cultural & Arts',
  'Fitness': 'Fitness & Wellness',
  'Sports': 'Sports & Recreation',
  'Markets': 'Markets & Shopping',
  'Community': 'Community & Volunteering',
  'Food': 'Food & Dining',
  'Seasonal': 'Holiday & Seasonal',
  'Networking': 'Professional & Networking',
  'Education': 'Educational & Literary',
};
const EVENT_TYPES = Object.keys(EVENT_TYPE_MAP);

const MOCK_EVENTS: Event[] = [
  { title: 'Fontaines D.C.', description: 'Irish post-punk band touring their latest album "Romance". Full band performance with support from Wife Swap USA.', time: '8:00 PM', date: '2026-04-03', location: 'Brooklyn Steel, 319 Frost St', borough: 'Brooklyn', neighborhood: 'Williamsburg', category: 'Cultural & Arts', lat: 40.7164, lng: -73.9327, link: 'https://www.bowerypresents.com/venues/brooklyn-steel', ticketLink: 'https://www.ticketmaster.com' },
  { title: 'Nubya Garcia Quartet', description: 'London-born tenor saxophonist and composer performing jazz, broken beat, and Afro-Caribbean rhythms.', time: '7:30 PM', date: '2026-04-03', location: 'Blue Note Jazz Club, 131 W 3rd St', borough: 'Manhattan', neighborhood: 'Greenwich Village', category: 'Cultural & Arts', lat: 40.7308, lng: -73.9999, link: 'https://www.bluenotejazz.com' },
  { title: 'Sam Morril: Live Taping', description: 'NYC-based stand-up comedian filming his next special. As seen on Netflix, Comedy Central, and Late Night.', time: '9:30 PM', date: '2026-04-03', location: 'The Stand, 116 E 16th St', borough: 'Manhattan', neighborhood: 'Union Square', category: 'Cultural & Arts', lat: 40.7359, lng: -73.9883, link: 'https://www.thestandnyc.com' },
  { title: 'Rema — HEIS World Tour', description: 'Nigerian Afrobeats superstar brings his electrifying live show to NYC. Expect hits like "Calm Down" and tracks from the new album.', time: '8:00 PM', date: '2026-04-04', location: 'Madison Square Garden', borough: 'Manhattan', neighborhood: 'Midtown', category: 'Cultural & Arts', lat: 40.7505, lng: -73.9934, link: 'https://www.msg.com/calendar', ticketLink: 'https://www.ticketmaster.com' },
  { title: 'Unsane + Chat Pile', description: 'Noise rock legends Unsane co-headline with Oklahoma sludge outfit Chat Pile. Ear protection recommended.', time: '7:00 PM', date: '2026-04-04', location: 'Saint Vitus, 1120 Manhattan Ave', borough: 'Brooklyn', neighborhood: 'Greenpoint', category: 'Cultural & Arts', lat: 40.7332, lng: -73.9541, link: 'https://www.saintvitusbar.com/events' },
  { title: 'Meryl Streep in Conversation', description: 'An evening with the legendary actress discussing her career, craft, and new memoir. Moderated by Annette Insdorf.', time: '7:00 PM', date: '2026-04-04', location: '92nd Street Y, 1395 Lexington Ave', borough: 'Manhattan', neighborhood: 'Upper East Side', category: 'Educational & Literary', lat: 40.7847, lng: -73.9533, link: 'https://www.92ny.org' },
  { title: 'Boiler Room NYC', description: 'Underground electronic music showcase featuring DJ sets from Eris Drew, Gabber Eleganza, and local selectors. All night.', time: '10:00 PM', date: '2026-04-04', location: 'Nowadays, 56-06 Cooper Ave', borough: 'Queens', neighborhood: 'Ridgewood', category: 'Cultural & Arts', lat: 40.7043, lng: -73.9084, link: 'https://nowadays.nyc/' },
  { title: 'Hilma af Klint & Piet Mondrian', description: 'Final weeks of the blockbuster exhibition exploring the parallel paths of two pioneers of abstract art.', time: '10:00 AM - 5:30 PM', date: '2026-04-05', location: 'Guggenheim Museum, 1071 5th Ave', borough: 'Manhattan', neighborhood: 'Upper East Side', category: 'Cultural & Arts', lat: 40.7830, lng: -73.9590, link: 'https://www.guggenheim.org' },
  { title: 'Japanese Breakfast', description: 'Michelle Zauner performs songs from "Jubilee" and her memoir "Crying in H Mart". Indie pop at its most joyful.', time: '8:00 PM', date: '2026-04-05', location: 'Webster Hall, 125 E 11th St', borough: 'Manhattan', neighborhood: 'East Village', category: 'Cultural & Arts', lat: 40.7315, lng: -73.9893, link: 'https://www.websterhall.com', ticketLink: 'https://www.ticketmaster.com' },
  { title: 'Brooklyn Flea + Smorgasburg', description: 'Weekend outdoor market with 100+ food vendors and vintage shopping along the East River waterfront.', time: '10:00 AM - 5:00 PM', date: '2026-04-05', location: 'Williamsburg Waterfront, Kent Ave', borough: 'Brooklyn', neighborhood: 'Williamsburg', category: 'Markets & Shopping', lat: 40.7215, lng: -73.9614, link: 'https://www.smorgasburg.com' },
  { title: 'Sleep No More', description: 'The legendary immersive theater experience set inside the McKittrick Hotel. Macbeth reimagined as a noir film. Wear comfortable shoes.', time: '7:00 PM', date: '2026-04-05', location: 'The McKittrick Hotel, 530 W 27th St', borough: 'Manhattan', neighborhood: 'Chelsea', category: 'Cultural & Arts', lat: 40.7516, lng: -74.0032, link: 'https://mckittrickhotel.com', ticketLink: 'https://mckittrickhotel.com/sleep-no-more/' },
  { title: 'Thee Sacred Souls', description: 'San Diego soul trio bringing their silky, old-school R&B sound. Think Smokey Robinson meets Chicano lowrider culture.', time: '8:00 PM', date: '2026-04-06', location: 'Bowery Ballroom, 6 Delancey St', borough: 'Manhattan', neighborhood: 'Lower East Side', category: 'Cultural & Arts', lat: 40.7204, lng: -73.9939, link: 'https://www.boweryballroom.com' },
  { title: 'Open Studios: Bushwick', description: 'Hundreds of artist studios open their doors to the public across Bushwick. Self-guided tour with maps available at info hubs.', time: '12:00 PM - 6:00 PM', date: '2026-04-06', location: 'Various locations, Bushwick', borough: 'Brooklyn', neighborhood: 'Bushwick', category: 'Cultural & Arts', lat: 40.6944, lng: -73.9213 },
  { title: 'Queens Night Market', description: 'Open-air night market celebrating the incredible cultural diversity of Queens. 50+ food vendors, live performances, and art.', time: '5:00 PM - 12:00 AM', date: '2026-04-06', location: 'Flushing Meadows Corona Park', borough: 'Queens', neighborhood: 'Flushing', category: 'Food & Dining', lat: 40.7400, lng: -73.8406, link: 'https://queensnightmarket.com' },
  { title: 'André 3000 — New Blue Sun Live', description: 'The Outkast legend performs his ambient flute album live with a full ensemble. A once-in-a-lifetime experience.', time: '8:00 PM', date: '2026-04-07', location: 'Carnegie Hall, 881 7th Ave', borough: 'Manhattan', neighborhood: 'Midtown', category: 'Cultural & Arts', lat: 40.7651, lng: -73.9799, link: 'https://www.carnegiehall.org', ticketLink: 'https://www.carnegiehall.org/Events' },
  { title: 'Moth StorySLAM: Secrets', description: 'True stories told live without notes on the theme "Secrets". Put your name in the hat for a chance to tell a 5-minute story.', time: '7:00 PM', date: '2026-04-07', location: 'Housing Works Bookstore, 126 Crosby St', borough: 'Manhattan', neighborhood: 'SoHo', category: 'Community & Volunteering', lat: 40.7234, lng: -73.9984 },
  { title: 'Geese + Model/Actriz', description: 'Double bill of NYC\'s most exciting young post-punk bands. Chaotic, loud, and extremely fun.', time: '8:00 PM', date: '2026-04-08', location: 'Elsewhere, 599 Johnson Ave', borough: 'Brooklyn', neighborhood: 'Bushwick', category: 'Cultural & Arts', lat: 40.7069, lng: -73.9270, link: 'https://www.elsewherebrooklyn.com' },
  { title: 'Alvin Ailey: Revelations', description: 'The iconic modern dance company performs their signature masterwork set to African-American spirituals.', time: '7:30 PM', date: '2026-04-08', location: 'New York City Center, 131 W 55th St', borough: 'Manhattan', neighborhood: 'Midtown', category: 'Cultural & Arts', lat: 40.7641, lng: -73.9819, link: 'https://www.alvinailey.org' },
];

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<string>('');
  const [selectedBorough, setSelectedBorough] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [neighborhoodSearch, setNeighborhoodSearch] = useState<string>('');
  // Map view hidden for now but code kept for future use
  // const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

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
        } else if (process.env.NODE_ENV === 'development') {
          setEvents(MOCK_EVENTS);
          setLastFetched('Mock data (dev)');
        }
      } catch (error) {
        console.error('Error loading cached events:', error);
        if (process.env.NODE_ENV === 'development') {
          setEvents(MOCK_EVENTS);
          setLastFetched('Mock data (dev)');
        }
      } finally {
        setLoading(false);
      }
    };

    loadCachedEvents();
  }, []);

  const formatDateForDisplay = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[month - 1]} ${day}`;
  };

  const getTodayISO = () => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const filteredEvents = events
    .filter((event) => {
      const boroughMatch = selectedBorough === 'All' || event.borough === selectedBorough;
      const typeMatch = selectedType === 'All' || event.category === EVENT_TYPE_MAP[selectedType];
      const neighborhoodMatch =
        neighborhoodSearch === '' ||
        event.neighborhood?.toLowerCase().includes(neighborhoodSearch.toLowerCase()) ||
        event.location?.toLowerCase().includes(neighborhoodSearch.toLowerCase());

      if (!boroughMatch || !typeMatch || !neighborhoodMatch) {
        return false;
      }

      if (event.date) {
        return event.date >= getTodayISO();
      }
      return !event.time;
    })
    .sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#EDECE8]">
      {/* Subtle top gradient */}
      <div className="fixed top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-[#1a1210] to-transparent pointer-events-none z-0" />

      <div className="relative z-10">
        {/* Nav */}
        <nav className="container mx-auto px-8 pt-8 flex justify-between items-center max-w-6xl">
          <div className="text-sm text-[#5C5A54] font-sans">NYC</div>
          <a href="/venues" className="text-sm text-[#5C5A54] hover:text-[#E8503A] transition-colors font-sans">
            Venues
          </a>
        </nav>

        <div className="container mx-auto px-8 pt-16 pb-24">
          <div className="max-w-6xl mx-auto">
            {/* Hero */}
            <header className="mb-20">
              <h1 className="text-[88px] md:text-[120px] leading-[0.9] font-display font-800 tracking-[-0.04em] mb-4">
                eventsh
              </h1>
              <div className="w-16 h-1 bg-[#E8503A] rounded-full mb-6" />
              <p className="text-xl text-[#8C8A82] font-sans font-light max-w-lg">
                What's happening in New York City
              </p>
            </header>

            {/* Filters */}
            {events.length > 0 && (
              <div className="mb-10 p-6 md:p-8 bg-[#141416] rounded-xl border border-[#252528] space-y-6">
                {/* Row 1: Borough + Neighborhood */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#5C5A54] mb-3 font-sans">
                      Borough
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {BOROUGHS.map((borough) => (
                        <button
                          key={borough}
                          onClick={() => setSelectedBorough(borough)}
                          className={`px-4 py-2 rounded-lg text-sm font-sans transition-all ${
                            selectedBorough === borough
                              ? 'bg-[#E8503A] text-white'
                              : 'bg-[#1C1C1F] text-[#8C8A82] hover:bg-[#252528] hover:text-[#EDECE8]'
                          }`}
                        >
                          {borough}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#5C5A54] mb-3 font-sans">
                      Neighborhood
                    </label>
                    <input
                      type="text"
                      placeholder="Williamsburg, SoHo, Bushwick..."
                      value={neighborhoodSearch}
                      onChange={(e) => setNeighborhoodSearch(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-[#1C1C1F] text-[#EDECE8] placeholder-[#5C5A54] font-sans text-sm border border-[#252528] focus:outline-none focus:border-[#E8503A] transition-colors"
                    />
                  </div>
                </div>

                {/* Row 2: Event Type */}
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#5C5A54] mb-3 font-sans">
                    Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`px-4 py-2 rounded-lg text-sm font-sans transition-all ${
                          selectedType === type
                            ? 'bg-[#E8503A] text-white'
                            : 'bg-[#1C1C1F] text-[#8C8A82] hover:bg-[#252528] hover:text-[#EDECE8]'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {(selectedBorough !== 'All' || selectedType !== 'All' || neighborhoodSearch !== '') && (
                  <button
                    onClick={() => {
                      setSelectedBorough('All');
                      setSelectedType('All');
                      setNeighborhoodSearch('');
                    }}
                    className="text-sm text-[#5C5A54] hover:text-[#E8503A] font-sans transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {/* Count */}
            {events.length > 0 && (
              <div className="mb-8">
                <p className="text-sm text-[#5C5A54] font-sans">
                  {filteredEvents.length}{filteredEvents.length !== events.length ? ` / ${events.length}` : ''} events
                </p>
              </div>
            )}

            {/* Last Updated */}
            {lastFetched && (
              <p className="text-xs text-[#5C5A54] font-sans mb-8">
                Updated {lastFetched}
              </p>
            )}

            {/* Loading */}
            {loading && (
              <div className="text-center py-32">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-[#252528] border-t-[#E8503A]"></div>
                <p className="mt-6 text-[#5C5A54] font-sans text-sm">Loading events...</p>
              </div>
            )}

            {/* Empty */}
            {!loading && events.length === 0 && (
              <div className="text-center py-32">
                <p className="text-[#8C8A82] font-sans text-lg">No events yet.</p>
                <p className="text-[#5C5A54] font-sans text-sm mt-2">
                  Events refresh daily at 9 AM UTC.
                </p>
              </div>
            )}

            {/* Map View — hidden for now, keeping code for future use */}
            {/* {events.length > 0 && viewMode === 'map' && (
              <EventsMap events={filteredEvents} />
            )} */}

            {/* List View */}
            {events.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEvents.map((event, index) => {
                  let displayDate = '';
                  let displayDayTime = '';

                  if (event.date) {
                    displayDate = formatDateForDisplay(event.date);
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
                      className="animate-fade-up card-glow bg-[#141416] rounded-xl border border-[#252528] overflow-hidden group"
                      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                    >
                      <div className="p-6">
                        {/* Date bar */}
                        {displayDate && (
                          <div className="flex items-baseline gap-3 mb-4">
                            <span className="text-[#E8503A] font-display font-700 text-lg tracking-tight">
                              {displayDate}
                            </span>
                            {displayDayTime && (
                              <span className="text-xs text-[#5C5A54] font-sans">
                                {displayDayTime}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Title */}
                        <h3 className="font-display font-600 text-lg mb-3 text-[#EDECE8] leading-snug">
                          {event.title}
                        </h3>

                        {/* Description */}
                        <p className="text-[#8C8A82] text-sm leading-relaxed font-sans mb-4 line-clamp-3">
                          {event.description}
                        </p>

                        {/* Location */}
                        {event.location && (
                          <p className="text-xs text-[#5C5A54] font-sans mb-3 truncate">
                            {event.location}
                          </p>
                        )}

                        {/* Tags */}
                        {(event.borough || event.neighborhood) && (
                          <div className="flex gap-2 flex-wrap mb-4">
                            {event.borough && (
                              <span className="px-2.5 py-0.5 bg-[#1C1C1F] text-[#8C8A82] rounded text-xs font-sans border border-[#252528]">
                                {event.borough}
                              </span>
                            )}
                            {event.neighborhood && (
                              <span className="px-2.5 py-0.5 bg-[#1C1C1F] text-[#8C8A82] rounded text-xs font-sans border border-[#252528]">
                                {event.neighborhood}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Links */}
                        <div className="flex gap-4 pt-4 border-t border-[#252528]">
                          {event.link && (
                            <a
                              href={event.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#8C8A82] hover:text-[#E8503A] font-sans transition-colors"
                            >
                              Details &rarr;
                            </a>
                          )}
                          {event.ticketLink && (
                            <a
                              href={event.ticketLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#8C8A82] hover:text-[#E8503A] font-sans transition-colors"
                            >
                              Tickets &rarr;
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
