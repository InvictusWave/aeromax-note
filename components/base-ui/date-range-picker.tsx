'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarRange, ChevronDown } from 'lucide-react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { id as indonesianLocale } from 'date-fns/locale';
import 'react-day-picker/style.css';

function parseDate(value?: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatShort(date: Date) {
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Single-trigger date range picker in the watermelon-ui date-picker style
 * (rounded trigger + popover calendar), themed with the Aeromax tokens.
 * `startDate`/`endDate`/`max` use the `YYYY-MM-DD` format.
 */
export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  max,
  className = '',
}: {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
  max?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const from = parseDate(startDate);
  const to = parseDate(endDate);
  const maxDate = parseDate(max);
  const range: DateRange | undefined = from ? { from, to } : undefined;

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeWithEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeWithEscape);
    };
  }, [open]);

  const label = from && to ? `${formatShort(from)} – ${formatShort(to)}` : 'Pilih rentang tanggal';

  return (
    <div ref={wrapper} className={`relative ${className}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(value => !value)}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(value => !value);
          }
        }}
        className={`flex h-11 min-w-0 cursor-pointer items-center justify-between gap-2 rounded-xl border bg-white px-3.5 text-sm transition ${
          open ? 'border-leaf ring-4 ring-leaf/10' : 'border-line'
        }`}
        aria-expanded={open}
        aria-label="Pilih rentang tanggal laporan"
      >
        <span className="flex min-w-0 items-center gap-2 truncate font-medium text-ink">
          <CalendarRange size={16} className="shrink-0 text-leaf" />
          <span className="truncate">{label}</span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-30 max-w-[calc(100vw-2rem)] overflow-x-auto rounded-2xl border border-line bg-white p-2 shadow-soft sm:p-3"
          // react-day-picker's own stylesheet also declares these on :root, and can load after
          // globals.css in the bundle — setting them inline guarantees the brand color wins.
          style={{ '--rdp-accent-color': '#2f7d4a', '--rdp-accent-background-color': '#dff2b2' } as React.CSSProperties}
        >
          <DayPicker
            locale={indonesianLocale}
            mode="range"
            selected={range}
            defaultMonth={to ?? from}
            disabled={maxDate ? { after: maxDate } : undefined}
            onSelect={selected => {
              if (!selected?.from) return;
              onChange(isoDate(selected.from), isoDate(selected.to ?? selected.from));
              if (selected.to) setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
