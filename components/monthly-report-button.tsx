'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui';
import { DateRangePicker } from '@/components/base-ui/date-range-picker';

const today = () => new Date().toISOString().slice(0, 10);

const get30DaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};

/** Open the report workspace with the selected date range. */
export function MonthlyReportButton() {
  const router = useRouter();
  const [startDate, setStartDate] = useState(get30DaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [error, setError] = useState('');

  function handleClick() {
    if (!startDate || !endDate || startDate > endDate) {
      setError('Rentang tanggal tidak valid');
      return;
    }
    setError('');
    router.push(`/reports?startDate=${startDate}&endDate=${endDate}`);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onChange={(nextStart, nextEnd) => {
            setStartDate(nextStart);
            setEndDate(nextEnd);
          }}
          max={today()}
          className="w-[12rem] sm:w-[13.5rem]"
        />
        <Button
          type="button"
          onClick={handleClick}
          disabled={!startDate || !endDate}
          className="border border-line bg-white px-3.5 text-ink shadow-xs hover:bg-slate-50 active:scale-95"
        >
          <FileText size={16} /> Laporan
        </Button>
      </div>
      {error ? <p className="max-w-[18rem] text-right text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
