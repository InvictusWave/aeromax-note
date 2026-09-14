// Self-check for lib/export.ts row building: node --experimental-strip-types scripts/export-check.mjs
import assert from 'node:assert';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import writeXlsxFile from 'write-excel-file/node';
import { buildSheets } from '../lib/export.ts';
import { buildReportHtml } from '../lib/report.ts';

const events = [
  {
    id: 7, name: 'Airshow 2026', date: '2026-03-01', location: 'Jakarta',
    organizer: 'Aeromax', type: 'Pameran', nextActions: ['Follow up'],
    generalNotes: 'ramai', followUpDone: false, createdAt: '2026-03-02',
    networking: [{ id: 1, eventId: 7, name: 'Budi', company: 'PT Angkasa', position: 'Manager', contact: '08123456789', social: '@budi', chatSummary: 'tertarik drone', potential: 'High', followUp: true }],
    prospects: [{ id: 1, eventId: 7, companyName: 'PT Nusantara', industry: 'Logistik', personMet: 'Sari', potentialSummary: 'butuh survei', notes: '-' }],
  },
];

const sheets = buildSheets(events);
assert.deepEqual(sheets.map(s => s.sheet), ['Catatan Event', 'Kontak', 'Prospek']);

const [rekap, kontak, prospek] = sheets.map(s => s.data);

// contacts must land as their own rows, not just a count
assert.equal(kontak.length, 2);
assert.deepEqual(kontak[1].map(c => c.value), [
  7, 'Airshow 2026', '2026-03-01', 'Jakarta', 'Budi', 'PT Angkasa', 'Manager',
  '08123456789', '@budi', 'Tinggi', 'Ya', 'tertarik drone',
]);
assert.deepEqual(prospek[1].map(c => c.value), [
  7, 'Airshow 2026', '2026-03-01', 'Jakarta', 'PT Nusantara', 'Logistik', 'Sari', 'butuh survei', '-',
]);
assert.ok(String(rekap[1][10].value).includes('08123456789'), 'rekap keeps the contact summary');

// header, row and column-width counts must line up on every sheet
for (const sheet of sheets) {
  assert.equal(sheet.data[0].length, sheet.data[1].length, `${sheet.sheet}: header width`);
  assert.equal(sheet.columns.length, sheet.data[1].length, `${sheet.sheet}: column widths`);
}

await writeXlsxFile(sheets).toFile(join(tmpdir(), 'aeromax-export-check.xlsx'));

// PDF report: narrative + contact details in the document, and user text escaped
const html = buildReportHtml({
  month: '2026-03',
  monthLabel: 'Maret 2026',
  author: 'Adam <Ibnu>',
  narrative: {
    judul: 'Laporan Kerja Maret 2026',
    ringkasan: ['Menangani 1 event dengan 1 kontak baru.'],
    aktivitas: ['Airshow 2026 pada 1 Maret 2026 di Jakarta.'],
    tugasHarian: ['Tiga sesi foto produk di kantor Lalung pada 3, 10, dan 17 Maret 2026.'],
    analisisPotensi: ['Prospek logistik mendominasi.'],
    rekomendasi: ['Hubungi Budi Santoso untuk proposal.'],
    penutup: 'Demikian laporan ini disusun.',
  },
  events: [{ ...events[0], name: 'Airshow <2026> & "Expo"' }],
  tasks: [{ id: 1, userId: 1, date: '2026-03-03', title: 'Bantu foto produk klien di kantor',
            category: 'Foto produk', location: 'Kantor Lalung', result: '40 foto siap edit', createdAt: '2026-03-03' }],
});

for (const needle of ['Budi', 'PT Angkasa', '08123456789', 'tertarik drone', 'PT Nusantara', 'Sari',
                      'Laporan Kerja Maret 2026', 'Prospek logistik mendominasi', 'Demikian laporan ini disusun',
                      'Bantu foto produk klien di kantor', 'Kantor Lalung', '40 foto siap edit', 'Tugas harian di luar event']) {
  assert.ok(html.includes(needle), `report is missing ${needle}`);
}
assert.ok(html.includes('Airshow &lt;2026&gt; &amp; &quot;Expo&quot;'), 'report escapes user text');
assert.ok(html.includes('Adam &lt;Ibnu&gt;'), 'report escapes the author name');
assert.ok(!html.includes('Airshow <2026>'), 'report must not emit raw user markup');
const tasksOnly = buildReportHtml({
  month: '2026-04', monthLabel: 'April 2026', author: 'Adam',
  narrative: { judul: 'Laporan Kerja April 2026', ringkasan: ['Fokus pekerjaan studio.'], aktivitas: [],
               tugasHarian: ['Enam sesi editing di studio.'], analisisPotensi: ['Belum ada prospek baru.'],
               rekomendasi: ['Lanjutkan editing.'], penutup: 'Demikian.' },
  events: [],
  tasks: [{ id: 2, userId: 1, date: '2026-04-02', title: 'Editing video klip OM Adella',
            category: 'Editing & post-production', location: 'Studio', result: 'Draft 1 selesai', createdAt: '2026-04-02' }],
});
assert.ok(tasksOnly.includes('Tidak ada event pada periode ini'), 'event-less month falls back gracefully');
assert.ok(tasksOnly.includes('Editing video klip OM Adella'), 'event-less month still lists daily tasks');
assert.ok(!tasksOnly.includes('undefined'), 'report must not leak undefined');

console.log('OK');
