'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { MonthPicker } from '@/components/base-ui/month-picker';
import { exportMonthlyReport } from '@/lib/report';

const currentMonth = () => new Date().toISOString().slice(0, 7);

/** Month picker + button that generates the AI-written monthly work report as a printable PDF. */
export function MonthlyReportButton() {
  const [month, setMonth] = useState(currentMonth);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    setBusy(true);
    setError('');
    try {
      await exportMonthlyReport(month);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Laporan tidak dapat dibuat.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-end gap-2">
        <MonthPicker
          value={month}
          onChange={setMonth}
          max={currentMonth()}
          label="Bulan laporan"
          className="w-[11rem]"
        />
        <Button
          type="button"
          onClick={handleClick}
          disabled={busy || !month}
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
