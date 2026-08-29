'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Inbox,
  Layers,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { Brand } from '@/components/brand';
import { Button, Card, FluidTabs, Input, Pagination } from '@/components/ui';
import { NativeSelect } from '@/components/base-ui/native-select';
import { Protected } from '@/components/protected';
import { EventDetail } from '@/components/event-detail';
import { FollowUpBadge } from '@/components/follow-up-badge';
import { followUpState, type EventNote } from '@/lib/event-types';
import { useEvents } from '@/hooks/use-events';
import { exportEventsToCsv } from '@/lib/export';

const PAGE_SIZE = 6;

function formatEventDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function NotesPage() {
  const { events, loading, error, reload, updateFollowUp, deleteEvent } = useEvents();
  const [selected, setSelected] = useState<EventNote | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [potential, setPotential] = useState('all');
  const [page, setPage] = useState(1);

  const types = useMemo(
    () => Array.from(new Set(events.map(event => event.type).filter(Boolean))).sort(),
    [events],
  );

  const statusTabs = useMemo(
    () => [
      { id: 'all', label: 'Semua', icon: <Layers size={15} /> },
      { id: 'pending', label: 'Belum Follow-Up', icon: <Clock size={15} /> },
      { id: 'done', label: 'Selesai', icon: <CheckCircle2 size={15} /> },
      { id: 'none', label: 'Tidak Perlu', icon: <Inbox size={15} /> },
    ],
    []
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return events.filter(event => {
      const searchable = [
        event.name,
        event.location,
        event.organizer,
        event.type,
        ...event.networking.flatMap(person => [person.name, person.company]),
        ...event.prospects.map(prospect => prospect.companyName),
      ].join(' ').toLowerCase();

      const matchesPotential =
        potential === 'all' ||
        event.networking.some(
          person => person.potential && person.potential.toLowerCase() === potential.toLowerCase()
        );

      return (!needle || searchable.includes(needle))
        && (status === 'all' || followUpState(event) === status)
        && (type === 'all' || event.type === type)
        && matchesPotential;
    });
  }, [events, potential, query, status, type]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilter = Boolean(query || status !== 'all' || type !== 'all' || potential !== 'all');

  useEffect(() => setPage(1), [potential, query, status, type]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  function resetFilters() {
    setQuery('');
    setStatus('all');
    setType('all');
    setPotential('all');
  }

  function handleExport() {
    exportEventsToCsv(filtered.length ? filtered : events);
  }

  return (
    <Protected>
      <Brand />
      <main className="mx-auto max-w-6xl px-3 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-12 animate-page-enter">
        <header className="mb-5 px-1 sm:mb-6 sm:px-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[.18em] text-leaf sm:text-xs">Ruang kerja event</p>
              <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-tight sm:text-4xl">Catatan</h1>
              <p className="mt-2 max-w-xl text-sm leading-5 text-slate-500">Cari, tindak lanjuti, dan kelola hasil pertemuan tim Aeromax.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleExport}
                disabled={!events.length}
                className="border border-line bg-white px-3.5 text-ink shadow-xs hover:bg-slate-50 active:scale-95"
              >
                <Download size={16} /> <span className="hidden min-[400px]:inline">Ekspor</span> CSV
              </Button>
              <Link href="/form" className="hidden sm:block">
                <Button className="bg-ink text-white shadow-xs hover:bg-slate-900 active:scale-95">
                  <Plus size={17} /> Tambah Catatan
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Fluid Status Filter Tabs */}
        <div className="mb-3 flex overflow-x-auto pb-1 no-scrollbar">
          <FluidTabs
            tabs={statusTabs}
            value={status}
            onChange={setStatus}
            className="w-full sm:w-auto"
          />
        </div>

        <Card className="mb-4 rounded-[20px] p-3 shadow-none sm:p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" size={18} />
            <Input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Cari event, lokasi, atau kontak..."
              className="h-12 rounded-2xl bg-mist pl-11 shadow-none"
              inputMode="search"
              enterKeyHint="search"
            />
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
            <SlidersHorizontal size={15} className="text-leaf" /> Filter lanjutan
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 min-[500px]:grid-cols-2">
            <label>
              <span className="sr-only">Tipe event</span>
              <NativeSelect value={type} onChange={event => setType(event.target.value)} aria-label="Tipe event">
                <option value="all">Semua tipe event</option>
                {types.map(item => <option key={item} value={item}>{item}</option>)}
              </NativeSelect>
            </label>
            <label>
              <span className="sr-only">Potensi kontak</span>
              <NativeSelect value={potential} onChange={event => setPotential(event.target.value)} aria-label="Potensi kontak">
                <option value="all">Semua potensi kontak</option>
                <option value="high">Potensi tinggi</option>
                <option value="medium">Potensi sedang</option>
                <option value="low">Potensi rendah</option>
              </NativeSelect>
            </label>
          </div>
        </Card>

        <div className="mb-3 flex min-h-11 items-center justify-between gap-3 px-1 sm:px-0">
          <p className="text-sm font-semibold">{filtered.length} catatan ditemukan</p>
          {hasFilter && (
            <button onClick={resetFilters} className="min-h-11 shrink-0 text-xs font-semibold text-leaf hover:underline">
              Atur ulang filter
            </button>
          )}
        </div>

        {error && (
          <Card className="mb-4 flex items-center justify-between gap-3 border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-none">
            <span>{error}</span>
            <Button type="button" onClick={reload} className="shrink-0 border border-red-200 bg-white px-3 text-red-700">
              <RefreshCw size={15} /> Coba lagi
            </Button>
          </Card>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(item => <div key={item} className="h-40 rounded-[20px] skeleton-shimmer" />)}
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <Card className="p-10 text-center shadow-none">
            <p className="font-semibold">Tidak ada catatan yang cocok.</p>
            <p className="mt-1 text-sm text-slate-500">Coba ubah kata pencarian atau filter.</p>
          </Card>
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          {visible.map(event => (
            <button
              key={event.id}
              onClick={() => setSelected(event)}
              className="block min-h-11 w-full text-left"
              aria-label={`Lihat detail ${event.name}`}
            >
              <Card className="h-full rounded-[20px] p-4 shadow-none transition active:scale-[.99] sm:p-5 sm:hover:border-leaf">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="mb-2 inline-flex max-w-full rounded-full bg-mist px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-leaf">
                      <span className="truncate">{event.type || 'Catatan event'}</span>
                    </p>
                    <h2 className="line-clamp-2 text-[17px] font-bold leading-6">{event.name}</h2>
                  </div>
                  <FollowUpBadge state={followUpState(event)} />
                </div>

                <div className="mt-4 grid gap-2.5 text-[13px] text-slate-500">
                  <span className="flex items-center gap-2"><CalendarDays className="shrink-0 text-leaf" size={16} />{formatEventDate(event.date)}</span>
                  <span className="flex min-w-0 items-center gap-2"><MapPin className="shrink-0 text-leaf" size={16} /><span className="truncate">{event.location}</span></span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      <Users size={14} className="text-leaf" />{event.networking.length} kontak
                    </span>
                    <span className="rounded-full bg-mist px-2.5 py-1 text-[11px] font-semibold text-slate-600">{event.prospects.length} prospek</span>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-slate-400" />
                </div>
              </Card>
            </button>
          ))}
        </div>

        {/* Watermelon UI Pagination Component */}
        {pageCount > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination
              totalPages={pageCount}
              value={page}
              onChange={setPage}
            />
          </div>
        )}
      </main>


      {selected && (
        <EventDetail
          event={events.find(event => event.id === selected.id) ?? selected}
          close={() => setSelected(null)}
          updateFollowUp={updateFollowUp}
          deleteEvent={deleteEvent}
        />
      )}
    </Protected>
  );
}

