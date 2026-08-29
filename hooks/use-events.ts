'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EventNote } from '@/lib/event-types';

const CACHE_DURATION = 60_000;
let cachedEvents: EventNote[] | null = null;
let cachedAt = 0;
let activeRequest: Promise<EventNote[]> | null = null;

export function invalidateEventsCache() {
  cachedEvents = null;
  cachedAt = 0;
}

async function requestEvents(force = false) {
  if (!force && cachedEvents && Date.now() - cachedAt < CACHE_DURATION) return cachedEvents;
  if (activeRequest) return activeRequest;

  activeRequest = fetch('/api/events', { credentials: 'include', cache: 'no-store' })
    .then(async response => {
      if (!response.ok) throw new Error('Gagal memuat catatan');
      const data = await response.json() as EventNote[];
      cachedEvents = data;
      cachedAt = Date.now();
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
    if (!cachedEvents) setLoading(true);

    try {
      setEvents(await requestEvents(force));
    } catch {
      setError('Database belum terhubung atau gagal memuat data.');
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

    const update = (items: EventNote[]) => items.map(event => event.id === id ? { ...event, followUpDone } : event);
    if (cachedEvents) cachedEvents = update(cachedEvents);
    cachedAt = Date.now();
    setEvents(current => update(current));
  }, []);

  return { events, loading, error, reload: () => load(true), updateFollowUp };
}
