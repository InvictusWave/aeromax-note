'use client';

import { useEffect, useRef, useState } from 'react';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { CalendarDays, ChevronDown } from 'lucide-react';
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

export function DatePicker<T extends FieldValues>({ control, name }: { control: Control<T>; name: Path<T> }) {
  const { field } = useController({ control, name });
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const selected = parseDate(field.value);

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

  return <div ref={wrapper} className="relative">
    <button type="button" onClick={() => setOpen(value => !value)} className={`flex min-h-11 w-full items-center justify-between rounded-xl border bg-white px-3.5 text-left text-base transition sm:text-[15px] ${open ? 'border-leaf ring-4 ring-leaf/10' : 'border-line'}`} aria-expanded={open} aria-label="Pilih tanggal event">
      <span className="flex items-center gap-2"><CalendarDays size={17} className="text-leaf" />{selected ? selected.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : <span className="text-slate-400">Pilih tanggal event</span>}</span><ChevronDown size={17} className={`text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="absolute left-0 top-[calc(100%+8px)] z-30 max-w-[calc(100vw-2rem)] overflow-x-auto rounded-2xl border border-line bg-white p-2 shadow-soft sm:p-3"><DayPicker locale={indonesianLocale} mode="single" selected={selected} defaultMonth={selected} onSelect={date => { if (date) { field.onChange(isoDate(date)); field.onBlur(); setOpen(false); } }} /></div>}
  </div>;
}
