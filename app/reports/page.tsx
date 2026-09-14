'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, Loader2, Save, Sparkles, Undo2 } from 'lucide-react';
import { Brand } from '@/components/brand';
import { Protected } from '@/components/protected';
import { Button, Card, Textarea } from '@/components/ui';
import { DateRangePicker } from '@/components/base-ui/date-range-picker';
import { useAuth } from '@/hooks/use-auth';
import { buildReportHtml, exportReportDocx, exportReportPdf, generateDateRangeReport, sanitizeReportHtml } from '@/lib/report';
import type { MonthlyReport, SavedReport, SavedReportSummary } from '@/lib/report-types';
import { saveReportSchema } from '@/lib/report-schema';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 7)}-01`;
async function requestJson(url: string, options?: RequestInit) {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store', ...options });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) throw new Error(result?.error || 'Permintaan gagal. Silakan coba lagi.');
  return result;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [saved, setSaved] = useState<SavedReportSummary | null>(null);
  const [items, setItems] = useState<SavedReportSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [busy, setBusy] = useState('');
  const [prompt, setPrompt] = useState('');
  const [dirty, setDirty] = useState(false);
  const [previous, setPrevious] = useState<MonthlyReport | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  const draftKey = user ? `aeromax_report_draft_${user.id}` : '';

  useEffect(() => {
    if (!draftKey) return;
    try {
      const stored = sessionStorage.getItem(draftKey);
      if (stored) {
        const draft = JSON.parse(stored);
        const parsed = saveReportSchema.safeParse({ content: draft.report, id: draft.saved?.id, updatedAt: draft.saved?.updatedAt });
        if (parsed.success) {
          setReport(parsed.data.content); setSaved(draft.saved || null); setDirty(true);
          setPrompt(typeof draft.prompt === 'string' ? draft.prompt.slice(0, 4_000) : '');
          setMessage('Draft yang belum disimpan telah dipulihkan.');
        }
      }
    } catch { setError('Draft browser tidak dapat dipulihkan.'); }
    setDraftReady(true);
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey || !draftReady) return;
    try {
      if (dirty && report) sessionStorage.setItem(draftKey, JSON.stringify({ report, saved, prompt }));
      else sessionStorage.removeItem(draftKey);
    } catch { setError('Draft tidak dapat dicadangkan di browser. Simpan laporan sebelum meninggalkan halaman.'); }
  }, [draftKey, draftReady, dirty, report, saved, prompt]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const start = query.get('startDate'), end = query.get('endDate');
    if (start && end && /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end)) {
      setStartDate(start); setEndDate(end);
    }
  }, []);

  async function loadList() {
    setListLoading(true); setListError('');
    try { setItems(await requestJson('/api/reports')); }
    catch (caught) { setListError(caught instanceof Error ? caught.message : 'Gagal memuat laporan'); }
    finally { setListLoading(false); }
  }

  useEffect(() => { if (user) void loadList(); }, [user]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const preview = useMemo(() => report ? buildReportHtml(report).replace('</style>', '@media screen { body { padding: 24px; } }</style>') : '', [report]);

  async function run(action: string, work: () => Promise<void>) {
    setBusy(action); setError(''); setMessage('');
    try { await work(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Permintaan gagal'); }
    finally { setBusy(''); }
  }

  function canReplaceDraft() {
    return !dirty || window.confirm('Ada perubahan yang belum disimpan. Ganti preview ini dan buang perubahan?');
  }

  function generate() {
    if (!canReplaceDraft()) return;
    void run('generate', async () => {
      const draft = await generateDateRangeReport(startDate, endDate);
      setReport(draft); setSaved(null); setDirty(true); setPrevious(null); setPrompt('');
      setMessage('Preview siap. Periksa laporan, revisi bila perlu, lalu simpan.');
    });
  }

  function open(id: number) {
    if (!canReplaceDraft()) return;
    void run('open', async () => {
      const item: SavedReport = await requestJson(`/api/reports?id=${id}`);
      setReport(item.content); setSaved({ id: item.id, title: item.title, startDate: item.startDate, endDate: item.endDate, updatedAt: item.updatedAt });
      setDirty(false); setPrevious(null); setPrompt('');
      setStartDate(item.startDate); setEndDate(item.endDate);
    });
  }

  function revise() {
    if (!report || !prompt.trim()) return;
    void run('revise', async () => {
      const revised: MonthlyReport = await requestJson('/api/report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revise', report, prompt }),
      });
      setPrevious(report); setReport(revised); setDirty(true); setPrompt('');
      setMessage('Revisi diterapkan pada preview. Periksa hasilnya sebelum menyimpan.');
    });
  }

  function save() {
    if (!report) return;
    void run('save', async () => {
      const item: SavedReport = await requestJson('/api/reports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: report, id: saved?.id, updatedAt: saved?.updatedAt }),
      });
      const summary = { id: item.id, title: item.title, startDate: item.startDate, endDate: item.endDate, updatedAt: item.updatedAt };
      setReport(item.content); setSaved(summary); setDirty(false); setPrevious(null);
      setItems(current => [summary, ...current.filter(row => row.id !== item.id)]);
      setMessage('Laporan tersimpan. Anda bisa merevisi lagi atau mengekspor PDF.');
    });
  }

  function attachEditablePreview(event: React.SyntheticEvent<HTMLIFrameElement>) {
    const document = event.currentTarget.contentDocument;
    if (!document) return;
    document.body.contentEditable = 'true';
    document.body.spellcheck = true;
    const commit = () => {
      const html = sanitizeReportHtml(document.documentElement.outerHTML);
      setReport(current => current ? { ...current, editedHtml: html, narrative: { ...current.narrative, judul: document.querySelector('[data-report-title]')?.textContent?.trim() || current.narrative.judul } } : current);
      setDirty(true);
      setPrevious(null);
    };
    document.body.addEventListener('blur', commit, true);
  }

  return (
    <Protected>
      <Brand />
      <main className="mx-auto max-w-6xl px-3 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6">
        <header className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-leaf">Aeromax Production</p>
          <h1 className="mt-1 text-3xl font-bold">Laporan Kerja</h1>
          <p className="mt-2 text-sm text-slate-500">Buat preview, revisi sesuai kebutuhan, lalu simpan. Laporan tersimpan tetap bisa direvisi dan diekspor ke PDF.</p>
        </header>
        <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
          <DateRangePicker startDate={startDate} endDate={endDate} max={today()} onChange={(start, end) => { setStartDate(start); setEndDate(end); }} />
          <Button onClick={generate} disabled={!!busy || !startDate || !endDate || startDate > endDate} className="bg-ink text-white">
            {busy === 'generate' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            {busy === 'generate' ? 'Menyusun laporan…' : 'Buat preview'}
          </Button>
          {startDate > endDate ? <p className="text-sm text-red-600">Rentang tanggal tidak valid.</p> : null}
        </Card>
        {error ? <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {message ? <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-leaf">{message}</p> : null}

        {report ? (
          <div className="mb-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4">
                <h2 className="font-bold">Preview laporan</h2>
                <span className="text-xs text-slate-500">{dirty ? 'Belum disimpan' : 'Tersimpan'}</span>
              </div>
              <p className="border-b border-line bg-mist px-4 py-2 text-xs text-slate-500">Klik elemen apa pun di preview untuk mengedit langsung, seperti di Word.</p>
              <iframe title="Preview laporan kerja" onLoad={attachEditablePreview} srcDoc={preview} className="h-[75vh] min-h-[480px] w-full border-0 bg-white" />
            </Card>
            <Card className="p-4 lg:sticky lg:top-4">
              <h2 className="mb-2 font-bold">Revisi laporan</h2>
              <p className="mb-3 text-sm text-slate-500">Sebutkan bagian dan koreksinya. Bagian lain dipertahankan. Revisi hanya mengubah laporan ini.</p>
              <label htmlFor="revision-prompt" className="mb-1.5 block text-sm font-medium">Instruksi revisi</label>
              <Textarea id="revision-prompt" value={prompt} onChange={event => setPrompt(event.target.value)} disabled={!!busy} maxLength={4_000} rows={5} placeholder="Contoh: Ganti hasil kegiatan pada event Expo menjadi ‘Melakukan perkenalan dengan pihak EO’. Ringkas penutup menjadi satu kalimat." />
              <Button onClick={revise} disabled={!!busy || !prompt.trim()} className="mt-3 w-full bg-leaf text-white">
                {busy === 'revise' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {busy === 'revise' ? 'Merevisi…' : 'Terapkan revisi'}
              </Button>
              {previous ? <Button disabled={!!busy} onClick={() => { setReport(previous); setPrevious(null); setDirty(true); setMessage('Revisi terakhir dibatalkan.'); }} className="mt-2 w-full border border-line"><Undo2 size={16} /> Batalkan revisi terakhir</Button> : null}
              <div className="mt-4 space-y-2 border-t border-line pt-4">
                <Button onClick={save} disabled={!!busy || !dirty} className="w-full bg-ink text-white">
                  {busy === 'save' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {busy === 'save' ? 'Menyimpan…' : saved ? 'Simpan perubahan' : 'Simpan laporan'}
                </Button>
                <Button onClick={() => exportReportPdf(report)} disabled={!!busy || dirty || !saved} className="w-full border border-line"><FileText size={16} /> Ekspor PDF</Button>
                <Button onClick={() => void run('docx', async () => { await exportReportDocx(report); })} disabled={!!busy || dirty || !saved} className="w-full border border-line">{busy === 'docx' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} {busy === 'docx' ? 'Menyiapkan DOCX…' : 'Unduh DOCX'}</Button>
                {dirty ? <p className="text-xs text-slate-500">Simpan hasil yang cocok sebelum mengekspor PDF.</p> : null}
              </div>
            </Card>
          </div>
        ) : <Card className="mb-6 p-8 text-center text-sm text-slate-500">Pilih periode dan buat preview, atau buka laporan tersimpan di bawah.</Card>}

        <section aria-labelledby="saved-reports-title">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="saved-reports-title" className="text-xl font-bold">Laporan tersimpan</h2>
            <Button onClick={() => void loadList()} disabled={listLoading || !!busy} className="border border-line bg-white">Muat ulang</Button>
          </div>
          {listError ? <p role="alert" className="mb-3 text-sm text-red-600">{listError}</p> : null}
          {listLoading ? <p className="py-4 text-sm text-slate-500">Memuat laporan…</p> : !items.length && !listError ? <Card className="p-6 text-sm text-slate-500">Belum ada laporan tersimpan.</Card> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map(item => (
              <Card key={item.id} className={`p-4 ${saved?.id === item.id ? 'border-leaf' : ''}`}>
                <h3 className="font-bold">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{item.startDate} s/d {item.endDate}</p>
                <p className="mt-1 text-xs text-slate-500">Diperbarui {new Date(item.updatedAt).toLocaleString('id-ID')}</p>
                <Button onClick={() => open(item.id)} disabled={!!busy} className="mt-3 border border-line"><FileText size={16} /> Buka laporan</Button>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </Protected>
  );
}
