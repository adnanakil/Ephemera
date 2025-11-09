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
    errors?: string[];
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
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

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
    setStartTime(new Date());
    fetchStatus(); // Initial fetch

    pollingInterval.current = setInterval(() => {
      fetchStatus();
    }, 3000); // Poll every 3 seconds

    // Start elapsed time counter
    timerInterval.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000); // Update every second

    console.log('[Admin] Polling started, interval ID:', pollingInterval.current);
  };

  // Stop polling
  const stopPolling = () => {
    setIsPolling(false);
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  };

  // Fetch status on mount and start polling if scraping is in progress
  useEffect(() => {
    const initStatus = async () => {
      await fetchStatus();
      // Check if we should start polling
      const initialStatus = await fetch('/api/events/status').then(r => r.json());
      if (initialStatus.success && initialStatus.scraping.isRunning) {
        console.log('[Admin] Scraping in progress on mount, starting polling');
        startPolling();
      }
    };
    initStatus();

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
      setLoading(false);
      // Show completion message
      if (status.totalEvents > 0) {
        setResult({
          count: status.totalEvents,
          lastFetched: status.lastFetched ? new Date(status.lastFetched).toLocaleString() : new Date().toLocaleString(),
        });
      }
    }
  }, [status, isPolling]);

  // Format elapsed time
  const formatElapsedTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchEvents = async () => {
    console.log('[Admin] fetchEvents called');
    setError('');
    setResult(null);
    setLoading(true);
    setElapsedTime(0);

    try {
      console.log('[Admin] Triggering background scraping job...');

      // Trigger background job via queue (runs in worker with no timeout!)
      const response = await fetch('/api/events/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('[Admin] Job trigger response:', data);

      if (!response.ok) {
        console.error('[Admin] Failed to trigger job:', data);
        throw new Error(data.error || 'Failed to start scraping');
      }

      // Start polling to monitor progress
      console.log('[Admin] Background job started, polling for progress...');
      startPolling();

    } catch (err) {
      console.error('[Admin] Events fetch error:', err);
      stopPolling();
      setLoading(false);
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
                disabled={loading || isPolling || hydrateLoading}
                className="px-10 py-4 bg-[#3D3426] hover:bg-[#2A231A] text-[#F5F1E8] rounded-full font-light text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-1"
              >
                {loading || isPolling ? 'Scraping...' : 'Refresh Events'}
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
              <strong>Refresh</strong> scrapes 19 event sources (~2-3 min, may timeout on free tier). <strong>Hydrate</strong> enriches incomplete events (~60 sec).
            </p>

            {status && status.scraping.sourcesCompleted > 0 && !status.scraping.isRunning && status.scraping.sourcesCompleted < status.scraping.totalSources && (
              <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Incomplete scrape:</strong> Only {status.scraping.sourcesCompleted}/{status.scraping.totalSources} sources completed.
                  Vercel free tier limits functions to 60 seconds. Consider refreshing again or upgrading to Vercel Pro for full scraping.
                </p>
              </div>
            )}

            {status && !isPolling && !loading && (
              <div className="mt-8 p-6 bg-[#F0E8DB] border border-[#D4C4B0] rounded-2xl">
                <h3 className="font-light text-[#3D3426] mb-4 text-lg">Current Status</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-[#6B5D4F]">
                    <strong>Scraping:</strong> {status.scraping.isRunning ? '🟢 Running' : '⚪ Idle'}
                  </p>
                  <p className="text-[#6B5D4F]">
                    <strong>Sources:</strong> {status.scraping.sourcesCompleted}/{status.scraping.totalSources}
                  </p>
                  <p className="text-[#6B5D4F]">
                    <strong>Events scraped:</strong> {status.scraping.eventsScraped}
                  </p>
                  <p className="text-[#6B5D4F]">
                    <strong>Total events in cache:</strong> {status.totalEvents}
                  </p>
                  {status.scraping.currentSource && (
                    <p className="text-[#6B5D4F]">
                      <strong>Current source:</strong> {status.scraping.currentSource}
                    </p>
                  )}
                  <p className="text-xs text-[#8B7D6F] mt-2">
                    Last update: {new Date(status.scraping.lastUpdate).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-8 p-6 bg-[#E8DED0] border border-[#C4B5A0] rounded-2xl">
                <h3 className="font-light text-[#3D3426] mb-2">Error</h3>
                <p className="text-[#6B5D4F] font-light">{error}</p>
              </div>
            )}

            {(loading || isPolling) && status && (
              <div className="mt-8 p-6 bg-[#F0E8DB] border border-[#D4C4B0] rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-light text-[#3D3426] text-lg">Live Progress</h3>
                  <div className="text-[#6B5D4F] font-light text-sm">
                    ⏱️ {formatElapsedTime(elapsedTime)}
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="mb-4 p-3 bg-white rounded-lg border border-[#E0D5C7]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-[#3D3426] font-medium">
                      {status.scraping.currentSource
                        ? `Scraping: ${status.scraping.currentSource}`
                        : status.scraping.sourcesCompleted < status.scraping.totalSources
                          ? 'Initializing...'
                          : 'Processing events...'}
                    </span>
                  </div>
                </div>

                {/* Scraping Progress */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[#6B5D4F] font-light">Scraping Sources</span>
                    <span className="text-[#3D3426] font-medium">
                      {status.scraping.sourcesCompleted}/{status.scraping.totalSources}
                      <span className="text-xs text-[#8B7D6F] ml-2">
                        ({Math.round((status.scraping.sourcesCompleted / status.scraping.totalSources) * 100)}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-[#E0D5C7] rounded-full h-2.5">
                    <div
                      className="bg-[#3D3426] h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${(status.scraping.sourcesCompleted / status.scraping.totalSources) * 100}%` }}
                    ></div>
                  </div>
                  <p className="mt-2 text-sm text-[#8B7D6F] font-light">
                    ✓ {status.scraping.eventsScraped} events extracted
                  </p>
                  {status.scraping.sourcesCompleted > 0 && (
                    <p className="mt-1 text-xs text-[#8B7D6F] font-light">
                      Average: ~{Math.round(status.scraping.eventsScraped / status.scraping.sourcesCompleted)} events per source
                    </p>
                  )}
                </div>

                {/* Geocoding Progress */}
                {status.geocoding.total > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[#6B5D4F] font-light">Geocoding Events</span>
                      <span className="text-[#3D3426] font-medium">
                        {status.geocoding.geocoded}/{status.geocoding.total}
                        <span className="text-xs text-[#8B7D6F] ml-2">
                          ({Math.round((status.geocoding.geocoded / status.geocoding.total) * 100)}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-[#E0D5C7] rounded-full h-2.5">
                      <div
                        className="bg-[#6B5D4F] h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${(status.geocoding.geocoded / status.geocoding.total) * 100}%` }}
                      ></div>
                    </div>
                    <p className="mt-2 text-sm text-[#8B7D6F] font-light">
                      📍 {status.geocoding.remaining} locations remaining
                    </p>
                  </div>
                )}

                {/* Errors Section */}
                {status.scraping.errors && status.scraping.errors.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="text-sm font-medium text-red-800 mb-2">⚠️ Recent Errors:</h4>
                    <ul className="text-xs text-red-700 space-y-1">
                      {status.scraping.errors.map((error, idx) => (
                        <li key={idx} className="font-mono">• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Last Update Time */}
                <div className="mt-4 pt-4 border-t border-[#D4C4B0]">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#8B7D6F] font-light">
                      Last API update: {new Date(status.scraping.lastUpdate).toLocaleTimeString()}
                    </span>
                    <span className="text-[#8B7D6F] font-light">
                      {(() => {
                        const secondsSinceUpdate = Math.floor((Date.now() - new Date(status.scraping.lastUpdate).getTime()) / 1000);
                        return secondsSinceUpdate > 30
                          ? `⚠️ ${secondsSinceUpdate}s since last update`
                          : `✓ Active (${secondsSinceUpdate}s ago)`;
                      })()}
                    </span>
                  </div>
                </div>
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
