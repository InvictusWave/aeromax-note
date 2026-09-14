'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { DateRangePicker } from '@/components/base-ui/date-range-picker';
import { exportDateRangeReport } from '@/lib/report';

const today = () => new Date().toISOString().slice(0, 10);

const get30DaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};

/** Date range picker + button that generates the AI-written work report as a printable PDF. */
export function MonthlyReportButton() {
  const [startDate, setStartDate] = useState(get30DaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    if (!startDate || !endDate || startDate > endDate) {
      setError('Rentang tanggal tidak valid');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await exportDateRangeReport(startDate, endDate);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Laporan tidak dapat dibuat.');
    } finally {
      setBusy(false);
    }
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
          disabled={busy || !startDate || !endDate}
          className="border border-line bg-white px-3.5 text-ink shadow-xs hover:bg-slate-50 active:scale-95"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
          <span className="hidden min-[400px]:inline">{busy ? 'Menyusun' : 'Laporan'}</span> PDF
        </Button>
      </div>
      {error ? <p className="max-w-[18rem] text-right text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
