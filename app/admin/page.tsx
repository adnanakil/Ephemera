'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

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

interface StatusData {
  scraping: {
    isRunning: boolean;
    currentSource?: string;
    sourcesCompleted: number;
    totalSources: number;
    eventsScraped: number;
    lastUpdate: string;
  };
  geocoding: {
    total: number;
    geocoded: number;
    remaining: number;
  };
  lastFetched: string | null;
  totalEvents: number;
}

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [hydrateLoading, setHydrateLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<{ count: number; lastFetched: string } | null>(null);
  const [hydrateResult, setHydrateResult] = useState<{ hydratedCount: number; totalEvents: number; lastHydrated: string } | null>(null);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Poll status endpoint
  const fetchStatus = async () => {
    try {
      console.log('[Admin] Fetching status...');
      const response = await fetch('/api/events/status');
      const data = await response.json();

      console.log('[Admin] Status response:', data);
      if (data.success) {
        setStatus(data);
        console.log('[Admin] Status updated:', {
          isRunning: data.scraping.isRunning,
          sourcesCompleted: data.scraping.sourcesCompleted,
          totalSources: data.scraping.totalSources,
          eventsScraped: data.scraping.eventsScraped
        });
      }
    } catch (err) {
      console.error('[Admin] Status fetch error:', err);
    }
  };

  // Start polling
  const startPolling = () => {
    console.log('[Admin] Starting polling...');
    setIsPolling(true);
    fetchStatus(); // Initial fetch

    pollingInterval.current = setInterval(() => {
      fetchStatus();
    }, 3000); // Poll every 3 seconds
    console.log('[Admin] Polling started, interval ID:', pollingInterval.current);
  };

  // Stop polling
  const stopPolling = () => {
    setIsPolling(false);
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // Auto-stop polling when scraping completes
  useEffect(() => {
    console.log('[Admin] Auto-stop effect - status:', status?.scraping.isRunning, 'isPolling:', isPolling);
    if (status && !status.scraping.isRunning && isPolling) {
      console.log('[Admin] Stopping polling because scraping is complete');
      stopPolling();
    }
  }, [status, isPolling]);

  const fetchEvents = async () => {
    console.log('[Admin] fetchEvents called');
    setError('');
    setResult(null);

    try {
      console.log('[Admin] Calling /api/events/fetch...');
      const response = await fetch('/api/events/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('[Admin] Response status:', response.status);
      const data = await response.json();
      console.log('[Admin] Response data:', data);

      if (!response.ok) {
        console.error('[Admin] Events API Error:', data);
        throw new Error(data.error || 'Failed to fetch events');
      }

      // Synchronous response
      console.log('[Admin] Got response, stopping any existing polling');
      stopPolling(); // Stop any existing polling
      setResult({
        count: data.count || 0,
        lastFetched: new Date(data.lastFetched).toLocaleString(),
      });
    } catch (err) {
      console.error('[Admin] Events fetch error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const hydrateEvents = async () => {
    setHydrateLoading(true);
    setError('');
    setHydrateResult(null);

    try {
      const response = await fetch('/api/events/hydrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Hydrate API Error:', data);
        throw new Error(data.error || 'Failed to hydrate events');
      }

      setHydrateResult({
        hydratedCount: data.hydratedCount || 0,
        totalEvents: data.totalEvents || 0,
        lastHydrated: new Date(data.lastHydrated).toLocaleString(),
      });
    } catch (err) {
      console.error('Hydrate error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setHydrateLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#3D3426]">
      <div className="container mx-auto px-8 py-20">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="text-[#6B5D4F] hover:text-[#3D3426] mb-8 inline-block font-light"
          >
            ← Back to events
          </Link>

          <h1 className="text-[80px] leading-[0.95] font-light tracking-tight mb-6">
            Admin
          </h1>
          <p className="text-xl text-[#6B5D4F] mb-20 font-light max-w-2xl">
            Manually refresh events from all sources
          </p>

          <div className="bg-white rounded-3xl border border-[#E0D5C7] p-12">
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <button
                onClick={fetchEvents}
                disabled={isPolling || hydrateLoading}
                className="px-10 py-4 bg-[#3D3426] hover:bg-[#2A231A] text-[#F5F1E8] rounded-full font-light text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-1"
              >
                {isPolling ? 'Scraping...' : 'Refresh Events'}
              </button>
              <button
                onClick={hydrateEvents}
                disabled={loading || hydrateLoading}
                className="px-10 py-4 bg-[#6B5D4F] hover:bg-[#554A3F] text-[#F5F1E8] rounded-full font-light text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-1"
              >
                {hydrateLoading ? 'Hydrating...' : 'Hydrate Events'}
              </button>
            </div>

            <p className="text-sm text-[#8B7D6F] font-light mb-8">
              <strong>Refresh</strong> scrapes event listings (~30 sec). <strong>Hydrate</strong> enriches incomplete events with full details (~60 sec).
            </p>

            {error && (
              <div className="mt-8 p-6 bg-[#E8DED0] border border-[#C4B5A0] rounded-2xl">
                <h3 className="font-light text-[#3D3426] mb-2">Error</h3>
                <p className="text-[#6B5D4F] font-light">{error}</p>
              </div>
            )}

            {isPolling && status && (
              <div className="mt-8 p-6 bg-[#F0E8DB] border border-[#D4C4B0] rounded-2xl">
                <h3 className="font-light text-[#3D3426] mb-4 text-lg">Live Progress</h3>

                {/* Scraping Progress */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[#6B5D4F] font-light">Scraping Sources</span>
                    <span className="text-[#3D3426] font-medium">
                      {status.scraping.sourcesCompleted}/{status.scraping.totalSources}
                    </span>
                  </div>
                  <div className="w-full bg-[#E0D5C7] rounded-full h-2.5">
                    <div
                      className="bg-[#3D3426] h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${(status.scraping.sourcesCompleted / status.scraping.totalSources) * 100}%` }}
                    ></div>
                  </div>
                  {status.scraping.currentSource && (
                    <p className="mt-2 text-sm text-[#8B7D6F] font-light">
                      Currently scraping: {status.scraping.currentSource}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-[#8B7D6F] font-light">
                    {status.scraping.eventsScraped} events found so far
                  </p>
                </div>

                {/* Geocoding Progress */}
                {status.geocoding.total > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[#6B5D4F] font-light">Geocoding</span>
                      <span className="text-[#3D3426] font-medium">
                        {status.geocoding.geocoded}/{status.geocoding.total}
                      </span>
                    </div>
                    <div className="w-full bg-[#E0D5C7] rounded-full h-2.5">
                      <div
                        className="bg-[#6B5D4F] h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${(status.geocoding.geocoded / status.geocoding.total) * 100}%` }}
                      ></div>
                    </div>
                    <p className="mt-1 text-sm text-[#8B7D6F] font-light">
                      {status.geocoding.remaining} events remaining
                    </p>
                  </div>
                )}

                <p className="mt-4 text-xs text-[#8B7D6F] font-light">
                  Last updated: {new Date(status.scraping.lastUpdate).toLocaleTimeString()}
                </p>
              </div>
            )}

            {hydrateLoading && (
              <div className="mt-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B5D4F]"></div>
                <p className="mt-4 text-[#6B5D4F] font-light">
                  Enriching incomplete events with full details...
                </p>
              </div>
            )}

            {result && (
              <div className="mt-8 p-6 bg-[#E8F5E9] border border-[#A5D6A7] rounded-2xl">
                <h3 className="font-light text-[#3D3426] mb-2 text-lg">Refresh Complete!</h3>
                <p className="text-[#6B5D4F] font-light mb-1">
                  Fetched {result.count} events
                </p>
                <p className="text-[#8B7D6F] font-light text-sm">
                  Last updated: {result.lastFetched}
                </p>
              </div>
            )}

            {hydrateResult && (
              <div className="mt-8 p-6 bg-[#E8F5E9] border border-[#A5D6A7] rounded-2xl">
                <h3 className="font-light text-[#3D3426] mb-2 text-lg">Hydration Complete!</h3>
                <p className="text-[#6B5D4F] font-light mb-1">
                  Enriched {hydrateResult.hydratedCount} of {hydrateResult.totalEvents} events
                </p>
                <p className="text-[#8B7D6F] font-light text-sm">
                  Last hydrated: {hydrateResult.lastHydrated}
                </p>
              </div>
            )}
          </div>

          <div className="mt-12 text-[#8B7D6F] font-light text-sm">
            <p className="mb-2">Sources:</p>
            <ul className="space-y-1 ml-4">
              <li>• NYC.gov</li>
              <li>• Luma</li>
              <li>• EventLume</li>
              <li>• Secret NYC</li>
              <li>• NYC Gov Parks</li>
              <li>• NYC For Free</li>
              <li>• NY Event Radar</li>
              <li>• Beacon Theatre</li>
              <li>• The Bell House</li>
              <li>• Music Hall of Williamsburg</li>
              <li>• Elsewhere</li>
              <li>• Baby's All Right</li>
              <li>• Saint Vitus Bar</li>
              <li>• National Sawdust</li>
              <li>• Knitting Factory Brooklyn</li>
              <li>• Market Hotel</li>
              <li>• Terminal 5</li>
              <li>• Bowery Ballroom</li>
              <li>• Night Club 101</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
