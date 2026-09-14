'use client';

import { useEffect, useRef, useState } from 'react';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { CalendarDays, ChevronDown, X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
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

export function DatePicker<T extends FieldValues>({
  control,
  name,
  placeholder = 'Pilih tanggal event',
  minDate,
  clearable = false,
}: {
  control: Control<T>;
  name: Path<T>;
  /** Shown when empty, and used as the trigger's accessible label. */
  placeholder?: string;
  /** ISO date (yyyy-mm-dd) string; days before this are disabled in the calendar. */
  minDate?: string;
  /** Shows an "x" to clear the value once a date is picked — for optional fields. */
  clearable?: boolean;
}) {
  const { field } = useController({ control, name });
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const selected = parseDate(field.value);
  const min = parseDate(minDate);

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

  return (
    <div ref={wrapper} className="relative">
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
        className={`flex min-h-11 w-full cursor-pointer items-center justify-between rounded-xl border bg-white px-3.5 text-left text-base transition sm:text-[15px] ${
          open ? 'border-leaf ring-4 ring-leaf/10' : 'border-line'
        }`}
        aria-expanded={open}
        aria-label={placeholder}
      >
        <span className="flex items-center gap-2 truncate">
          <CalendarDays size={17} className="shrink-0 text-leaf" />
          {selected ? (
            selected.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
          ) : (
            <span className="truncate text-slate-400">{placeholder}</span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-0.5">
          {clearable && selected ? (
            <button
              type="button"
              aria-label="Hapus tanggal"
              onClick={event => {
                event.stopPropagation();
                field.onChange('');
                field.onBlur();
              }}
              className="grid h-7 w-7 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          ) : null}
          <ChevronDown size={17} className={`text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
        </span>
      </div>
      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-30 max-w-[calc(100vw-2rem)] overflow-x-auto rounded-2xl border border-line bg-white p-2 shadow-soft sm:p-3">
          <DayPicker
            locale={indonesianLocale}
            mode="single"
            selected={selected}
            defaultMonth={selected ?? min}
            disabled={min ? { before: min } : undefined}
            onSelect={date => {
              if (date) {
                field.onChange(isoDate(date));
                field.onBlur();
                setOpen(false);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
