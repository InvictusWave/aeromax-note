'use client';

import { useEffect, useId, useState } from 'react';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/base-ui/popover';

const MONTHS = Array.from({ length: 12 }, (_, index) =>
  new Date(2000, index, 1).toLocaleDateString('id-ID', { month: 'short' })
);

const monthLabel = (value: string) => {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
};

const toValue = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}`;

/**
 * Month picker in the watermelon-ui date-picker style (rounded trigger + popover panel),
 * themed with the Aeromax tokens. `value` and `max` use the `YYYY-MM` format.
 */
export function MonthPicker({
  value,
  onChange,
  max,
  label,
  placeholder = 'Pilih bulan',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  max?: string;
  label?: string;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number(value?.slice(0, 4)) || new Date().getFullYear());

  // Re-centre on the selected year whenever the panel is reopened.
  useEffect(() => {
    if (open) setYear(Number(value?.slice(0, 4)) || new Date().getFullYear());
  }, [open, value]);

  const now = new Date();
  const maxValue = max ?? toValue(now.getFullYear(), now.getMonth());

  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <label htmlFor={id} className="block px-1 text-xs font-semibold text-slate-500">
          {label}
        </label>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          aria-label={label ?? placeholder}
          className="flex h-11 w-full items-center justify-between gap-2 rounded-2xl border border-line bg-white px-3.5 text-sm shadow-xs outline-none transition-colors hover:bg-slate-50 focus-visible:border-leaf focus-visible:ring-[3px] focus-visible:ring-leaf/15"
        >
          <span className={value ? 'font-semibold text-ink' : 'text-slate-400'}>
            {value ? monthLabel(value) : placeholder}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 text-slate-400" />
        </PopoverTrigger>

        <PopoverContent align="end" className="w-[17rem] p-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Tahun sebelumnya"
              onClick={() => setYear(current => current - 1)}
              className="grid h-8 w-8 place-items-center rounded-full text-slate-500 transition hover:bg-mist hover:text-ink"
            >
              <ChevronLeftIcon className="size-4" />
            </button>
            <span className="text-sm font-bold tabular-nums">{year}</span>
            <button
              type="button"
              aria-label="Tahun berikutnya"
              disabled={year >= Number(maxValue.slice(0, 4))}
              onClick={() => setYear(current => current + 1)}
              className="grid h-8 w-8 place-items-center rounded-full text-slate-500 transition hover:bg-mist hover:text-ink disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronRightIcon className="size-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {MONTHS.map((name, index) => {
              const option = toValue(year, index);
              const selected = option === value;
              const isCurrent = option === toValue(now.getFullYear(), now.getMonth());
              return (
                <button
                  key={name}
                  type="button"
                  disabled={option > maxValue}
                  aria-pressed={selected}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className={cn(
                    'h-10 rounded-full text-sm font-semibold capitalize transition',
                    'disabled:pointer-events-none disabled:opacity-30',
                    selected
                      ? 'bg-ink text-white'
                      : isCurrent
                        ? 'bg-mist text-ink hover:bg-lime/50'
                        : 'text-slate-600 hover:bg-mist hover:text-ink'
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
