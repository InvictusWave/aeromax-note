import type { EventNote } from './event-types.ts';
import type { MonthlyReport } from './report-types.ts';
import type { DailyTask } from './task-types.ts';
import { actionLabel, potentialLabel } from './labels.ts';

const INK = '#17211b';
const LEAF = '#2f7d4a';
const LINE = '#dce6dc';
const MUTED = '#5c6b60';

const escape = (value: string | number | null | undefined) =>
  String(value ?? '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]!);

const dash = (value: string | null | undefined) => (value?.trim() ? escape(value) : '&ndash;');

const paragraphs = (lines: string[] | undefined) =>
  (lines ?? []).filter(line => line?.trim()).map(line => `<p>${escape(line)}</p>`).join('');

const bullets = (lines: string[] | undefined) => {
  const items = (lines ?? []).filter(line => line?.trim());
  if (!items.length) return '';
  return `<ul>${items.map(line => `<li>${escape(line)}</li>`).join('')}</ul>`;
};

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return escape(value);
  return parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function eventsTable(events: EventNote[]) {
  const rows = events
    .map(event => {
      const status = event.followUpDone
        ? 'Selesai'
        : event.networking.some(contact => contact.followUp)
          ? 'Berjalan'
          : 'Tidak perlu';
      return `<tr>
        <td>${formatDate(event.date)}</td>
        <td><strong>${dash(event.name)}</strong>${
          event.type ? `<span class="sub">${escape(event.type)}</span>` : ''
        }</td>
        <td>${dash(event.location)}<span class="sub">${dash(event.organizer)}</span></td>
        <td class="num">${event.networking.length}</td>
        <td class="num">${event.prospects.length}</td>
        <td>${event.nextActions.length ? escape(event.nextActions.map(actionLabel).join(', ')) : '&ndash;'}<span class="sub">${status}</span></td>
      </tr>`;
    })
    .join('');

  return `<table>
      <thead><tr><th>Tanggal</th><th>Event</th><th>Lokasi &amp; penyelenggara</th><th class="num">Kontak</th><th class="num">Prospek</th><th>Tindak lanjut</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function contactsTable(events: EventNote[]) {
  const contacts = events.flatMap(event => event.networking.map(contact => ({ contact, event })));
  if (!contacts.length) return '<p class="empty">Tidak ada kontak yang tercatat pada periode ini.</p>';

  const priority = { high: 0, medium: 1, low: 2 } as Record<string, number>;
  contacts.sort(
    (a, b) =>
      (priority[a.contact.potential?.toLowerCase()] ?? 3) - (priority[b.contact.potential?.toLowerCase()] ?? 3) ||
      a.contact.name.localeCompare(b.contact.name)
  );

  const rows = contacts
    .map(
      ({ contact, event }) => `<tr>
        <td><strong>${dash(contact.name)}</strong>${
          contact.position ? `<span class="sub">${escape(contact.position)}</span>` : ''
        }</td>
        <td>${dash(contact.company)}</td>
        <td class="nowrap">${dash(contact.contact)}${
          contact.social ? `<span class="sub">${escape(contact.social)}</span>` : ''
        }</td>
        <td>${contact.potential ? `<span class="tag">${escape(potentialLabel(contact.potential))}</span>` : '&ndash;'}</td>
        <td>${contact.followUp ? 'Perlu dihubungi' : 'Terhubung'}</td>
        <td>${dash(event.name)}<span class="sub">${dash(contact.chatSummary)}</span></td>
      </tr>`
    )
    .join('');

  return `<table>
      <thead><tr><th>Nama &amp; jabatan</th><th>Perusahaan / orkes</th><th>Telp / WA / email</th><th>Potensi</th><th>Status</th><th>Asal event &amp; catatan</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function tasksTable(tasks: DailyTask[]) {
  const rows = tasks
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(
      task => `<tr>
        <td class="nowrap">${formatDate(task.date)}</td>
        <td><strong>${dash(task.title)}</strong></td>
        <td>${dash(task.category)}</td>
        <td>${dash(task.location)}</td>
        <td>${dash(task.result)}</td>
      </tr>`
    )
    .join('');

  return `<table>
      <thead><tr><th>Tanggal</th><th>Uraian tugas</th><th>Jenis pekerjaan</th><th>Lokasi</th><th>Hasil / catatan</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function prospectsTable(events: EventNote[]) {
  const prospects = events.flatMap(event => event.prospects.map(prospect => ({ prospect, event })));
  if (!prospects.length) return '';

  const rows = prospects
    .map(
      ({ prospect, event }) => `<tr>
        <td><strong>${dash(prospect.companyName)}</strong></td>
        <td>${dash(prospect.industry)}</td>
        <td>${dash(prospect.personMet)}</td>
        <td>${dash(prospect.potentialSummary)}</td>
        <td>${dash(event.name)}</td>
      </tr>`
    )
    .join('');

  return `<h2>Lampiran D &mdash; Prospek perusahaan</h2>
    <table>
      <thead><tr><th>Perusahaan</th><th>Industri</th><th>PIC ditemui</th><th>Ringkasan potensi</th><th>Asal event</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

export function buildReportHtml(report: MonthlyReport) {
  const { narrative, events } = report;
  const tasks = report.tasks ?? [];
  const printedAt = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><title>${escape(narrative.judul)} &mdash; ${escape(
    report.author
  )}</title><style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 10.5pt/1.65 "Iowan Old Style", Georgia, "Times New Roman", serif; color: ${INK}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h1 { margin: 0; font-size: 19pt; line-height: 1.25; letter-spacing: -.01em; }
  h2 { break-after: avoid; margin: 26px 0 8px; font-size: 9pt; font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; text-transform: uppercase; letter-spacing: .16em; color: ${MUTED}; border-bottom: 1px solid ${LINE}; padding-bottom: 5px; }
  p { margin: 0 0 9px; text-align: justify; }
  ul { margin: 0 0 9px; padding-left: 17px; }
  li { margin-bottom: 5px; break-inside: avoid; }
  .doc-head { border-bottom: 2px solid ${INK}; padding-bottom: 14px; }
  .eyebrow { margin: 0 0 6px; font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: .2em; color: ${LEAF}; }
  .ident { break-inside: avoid; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 20px; margin: 14px 0 0; font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .ident dt { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .1em; color: ${MUTED}; }
  .ident dd { margin: 2px 0 0; font-size: 10pt; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 8.5pt; line-height: 1.45; }
  thead { display: table-header-group; }
  th { text-align: left; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .08em; color: ${MUTED}; border-bottom: 1px solid ${INK}; padding: 6px 8px 6px 0; font-weight: 700; }
  td { border-bottom: 1px solid ${LINE}; padding: 7px 8px 7px 0; vertical-align: top; }
  tr { break-inside: avoid; }
  .num { text-align: right; padding-right: 14px; }
  .nowrap { white-space: nowrap; }
  .sub { display: block; font-size: 7.5pt; color: ${MUTED}; font-weight: 400; }
  .tag { display: inline-block; border: 1px solid ${LINE}; border-radius: 999px; padding: 1px 7px; font-size: 7.5pt; font-weight: 600; white-space: nowrap; }
  .empty { font-size: 9pt; color: ${MUTED}; font-style: italic; }
  .sign { break-inside: avoid; margin-top: 34px; width: 62mm; }
  .sign p { margin: 0; font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 9pt; text-align: left; }
  .sign .rule { margin-top: 22mm; border-top: 1px solid ${INK}; padding-top: 5px; font-weight: 600; }
  .foot { margin-top: 22px; border-top: 1px solid ${LINE}; padding-top: 9px; font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 7.5pt; color: ${MUTED}; }
</style></head><body>
  <header class="doc-head">
    <p class="eyebrow">Aeromax Studio &middot; Laporan Internal</p>
    <h1>${escape(narrative.judul)}</h1>
    <dl class="ident">
      <div><dt>Disusun oleh</dt><dd>${escape(report.author)}</dd></div>
      <div><dt>Periode</dt><dd>${escape(report.monthLabel)}</dd></div>
      <div><dt>Tanggal laporan</dt><dd>${escape(printedAt)}</dd></div>
    </dl>
  </header>

  <h2>I. Ringkasan pelaksanaan</h2>
  ${paragraphs(narrative.ringkasan)}

  <h2>II. Uraian kegiatan event</h2>
  ${bullets(narrative.aktivitas) || '<p class="empty">Tidak ada kegiatan event pada periode ini.</p>'}

  ${
    tasks.length || narrative.tugasHarian?.length
      ? `<h2>III. Tugas harian di luar event</h2>${bullets(narrative.tugasHarian)}`
      : ''
  }

  <h2>${tasks.length || narrative.tugasHarian?.length ? 'IV' : 'III'}. Analisis potensi dan peluang</h2>
  ${paragraphs(narrative.analisisPotensi)}

  <h2>${tasks.length || narrative.tugasHarian?.length ? 'V' : 'IV'}. Rekomendasi tindak lanjut</h2>
  ${bullets(narrative.rekomendasi)}

  <h2>${tasks.length || narrative.tugasHarian?.length ? 'VI' : 'V'}. Penutup</h2>
  ${paragraphs([narrative.penutup])}

  <div class="sign">
    <p>${escape(report.monthLabel)}</p>
    <p>Hormat kami,</p>
    <p class="rule">${escape(report.author)}</p>
  </div>

  <h2>Lampiran A &mdash; Rekap event</h2>
  ${events.length ? eventsTable(events) : '<p class="empty">Tidak ada event pada periode ini.</p>'}

  <h2>Lampiran B &mdash; Rekap tugas harian</h2>
  ${tasks.length ? tasksTable(tasks) : '<p class="empty">Tidak ada tugas harian tercatat pada periode ini.</p>'}

  <h2>Lampiran C &mdash; Daftar kontak yang dapat dihubungi</h2>
  ${contactsTable(events)}

  ${prospectsTable(events)}

  <p class="foot">Dokumen internal Aeromax Studio. Data kontak bersifat rahasia dan hanya digunakan untuk keperluan tindak lanjut perusahaan.</p>
</body></html>`;
}

function printHtml(html: string) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  frame.srcdoc = html;
  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
    // Give the print dialog time to grab the document before tearing the frame down.
    setTimeout(() => frame.remove(), 60_000);
  };
  document.body.appendChild(frame);
}

/** Asks the server for an AI-written monthly report, then opens the browser print/save-as-PDF dialog. */
export async function exportMonthlyReport(month: string) {
  const response = await fetch('/api/report', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month }),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || 'Laporan tidak dapat dibuat.');

  printHtml(buildReportHtml(result as MonthlyReport));
}
