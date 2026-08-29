'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EventNote } from '@/lib/event-types';

const CACHE_DURATION = 120_000;
let cachedEvents: EventNote[] | null = null;
let cachedAt = 0;
let activeRequest: Promise<EventNote[]> | null = null;

// Initialize cache from session storage if in browser
if (typeof window !== 'undefined' && !cachedEvents) {
  try {
    const stored = sessionStorage.getItem('aeromax_events_cache');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed.data)) {
        cachedEvents = parsed.data;
        cachedAt = parsed.cachedAt || 0;
      }
    }
  } catch {
    // Ignore storage errors
  }
}

export function invalidateEventsCache() {
  cachedEvents = null;
  cachedAt = 0;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem('aeromax_events_cache');
    } catch {
      // Ignore
    }
  }
}

async function requestEvents(force = false) {
  if (!force && cachedEvents && Date.now() - cachedAt < CACHE_DURATION) return cachedEvents;
  if (activeRequest) return activeRequest;

  activeRequest = fetch('/api/events', { credentials: 'include', cache: 'no-store' })
    .then(async response => {
      if (!response.ok) throw new Error('Gagal memuat catatan');
      const data = (await response.json()) as EventNote[];
      cachedEvents = data;
      cachedAt = Date.now();
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(
            'aeromax_events_cache',
            JSON.stringify({ data, cachedAt: Date.now() })
          );
        } catch {
          // Ignore
        }
      }
      return data;
    })
    .finally(() => {
      activeRequest = null;
    });

  return activeRequest;
}

export function useEvents() {
  const [events, setEvents] = useState<EventNote[]>(cachedEvents ?? []);
  const [loading, setLoading] = useState(!cachedEvents);
  const [error, setError] = useState('');

  const load = useCallback(async (force = false) => {
    setError('');
    // Only show loading indicator if we don't have any cached events
    if (!cachedEvents) setLoading(true);

    try {
      const freshData = await requestEvents(force);
      setEvents(freshData);
    } catch {
      if (!cachedEvents) {
        setError('Database belum terhubung atau gagal memuat data.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateFollowUp = useCallback(async (id: number, followUpDone: boolean) => {
    const response = await fetch('/api/events', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, followUpDone }),
    });
    if (!response.ok) throw new Error('Gagal memperbarui status');

    const update = (items: EventNote[]) =>
      items.map(event => (event.id === id ? { ...event, followUpDone } : event));

    if (cachedEvents) cachedEvents = update(cachedEvents);
    cachedAt = Date.now();
    setEvents(current => update(current));

    if (typeof window !== 'undefined' && cachedEvents) {
      try {
        sessionStorage.setItem(
          'aeromax_events_cache',
          JSON.stringify({ data: cachedEvents, cachedAt })
        );
      } catch {
        // Ignore
      }
    }
  }, []);

  return { events, loading, error, reload: () => load(true), updateFollowUp };
}

