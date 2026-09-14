// Run: node --experimental-strip-types scripts/report-docx-check.mjs
// Uses the installed browser/testing packages; no server or database writes.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import JSZip from 'jszip';
import { buildReportHtml } from '../lib/report.ts';

const report = {
  generatedAt: '2026-09-14T12:00:00Z', startDate: '2026-09-01', endDate: '2026-09-30',
  dateRangeLabel: 'September 2026', author: 'Adam Ibnu',
  narrative: { judul: 'Laporan Kerja September 2026', ringkasan: ['Ringkasan laporan.'], aktivitas: ['Kegiatan pertama.', 'Kegiatan kedua.'], tugasHarian: ['Foto produk.'], analisisPotensi: ['Peluang baru.'], rekomendasi: ['Hubungi kontak.'], penutup: 'Demikian laporan ini disusun.' },
  events: [{ id: 1, name: 'Expo Aeromax', date: '2026-09-12', location: 'Jakarta', organizer: 'Aeromax', type: 'Pameran', nextActions: ['Follow up'], followUpDone: false,
    networking: [{ name: 'Budi', position: 'Manager', company: 'PT Angkasa', contact: '08123456789', potential: 'High', social: '@budi', chatSummary: '- Hubungi Budi. - Kirim proposal.' }],
    prospects: [{ companyName: 'PT Nusantara', industry: 'Logistik', personMet: 'Sari', potentialSummary: 'Butuh survei.' }],
  }],
  tasks: [{ id: 1, date: '2026-09-13', title: 'Foto produk', category: 'Fotografi', location: 'Studio', result: '- Siapkan alat. - Ambil foto.' }],
};
const bundle = await build({ entryPoints: ['lib/report.ts'], bundle: true, write: false, format: 'iife', globalName: 'ReportExport', platform: 'browser', logLevel: 'silent' });
console.log('DOCX browser bundle ready.');
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 30_000 });
try {
  const page = await browser.newPage();
  console.log('DOCX test browser ready.');
  await page.setContent('<html><body></body></html>');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  console.log('DOCX export starting.');
  const exportXml = async content => {
    const result = await page.evaluate(async input => {
      let url, filename;
      HTMLAnchorElement.prototype.click = function () { url = this.href; filename = this.download; };
      await ReportExport.exportReportDocx(input);
      const bytes = Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer()));
      return { bytes, filename, remainingFrames: document.querySelectorAll('iframe').length };
    }, content);
    assert.equal(result.filename, 'aeromax-laporan-2026-09-01-2026-09-30.docx');
    assert.equal(result.remainingFrames, 0, 'export must clean up its rendering iframe');
    const zip = await JSZip.loadAsync(Buffer.from(result.bytes));
    console.log('DOCX exported and unpacked.');
    return { document: await zip.file('word/document.xml').async('string'), numbering: await zip.file('word/numbering.xml').async('string') };
  };
  const original = await exportXml(report);
  const xml = original.document;
  for (const text of ['Adam Ibnu', 'September 2026', '14 September 2026', 'Expo Aeromax', 'Manager', '@budi', 'Siapkan alat.', 'Ambil foto.', 'Sari']) assert.ok(xml.includes(text), `missing ${text}`);
  assert.match(xml, /w:pgSz w:w="11906" w:h="16838"/, 'A4 paper');
  assert.match(xml, /w:pgMar w:top="1020" w:right="907" w:bottom="1020" w:left="907"/, 'same margins as preview');
  assert.match(xml, /w:sz w:val="38"/, '19pt title');
  assert.match(xml, /w:sz w:val="21"/, '10.5pt body');
  assert.match(xml, /w:color w:val="2F7D4A"/, 'green eyebrow');
  assert.match(xml, /w:color w:val="5C6B60"/, 'muted labels');
  assert.match(xml, /w:bottom w:val="single" w:color="17211B" w:sz="12"/, 'header rule');
  assert.match(xml, /w:tblHeader/, 'repeating table headers');
  assert.match(xml, /w:tblLayout w:type="fixed"/, 'preview column widths');
  const identityColumns = [...xml.match(/<w:tblGrid>(.*?)<\/w:tblGrid>/)[1].matchAll(/w:w="(\d+)"/g)].map(match => Number(match[1]));
  assert.equal(identityColumns[0], identityColumns[1], 'identity grid has equal first two columns');
  assert.equal(identityColumns[0] - identityColumns[2], 300, 'identity grid preserves its 20px gap');
  assert.match(xml, /w:numPr/, 'editable Word bullets');
  assert.ok(original.numbering.includes('•'));
  assert.ok(xml.indexOf('Expo Aeromax') < xml.indexOf('Pameran'), 'cell subtext remains after its title');
  assert.ok(!xml.includes('Siapkan alat.Ambil foto.'), 'cell lists must not collapse to textContent');
  assert.ok(!xml.includes('<w:drawing'), 'report text must not be flattened into images');

  const editedHtml = buildReportHtml(report)
    .replace('Ringkasan laporan.', 'Ringkasan <strong>dikoreksi</strong> <em>langsung</em> <span style="color:#1256ab;font-size:14pt;text-decoration:underline">manual</span>.<br>Baris baru.')
    .replaceAll('Expo Aeromax', 'Expo Revisi')
    .replace('</style>', '@media screen { body { padding:24px; } }</style>');
  const edited = await exportXml({ ...report, editedHtml });
  assert.ok(edited.document.includes('Expo Revisi') && !edited.document.includes('Expo Aeromax'), 'edited preview is the source of truth');
  assert.match(edited.document, /<w:r><w:rPr>[^]*?<w:b\/>(?:(?!<\/w:r>).)*dikoreksi<\/w:t>/, 'manual bold');
  assert.match(edited.document, /<w:r><w:rPr>[^]*?<w:i\/>(?:(?!<\/w:r>).)*langsung<\/w:t>/, 'manual italic');
  assert.match(edited.document, /w:color w:val="1256AB"/, 'manual color');
  assert.match(edited.document, /w:sz w:val="28"/, 'manual font size');
  assert.match(edited.document, /w:u w:val="single"/, 'manual underline');
  assert.match(edited.document, /<w:br\/>/, 'manual line break');
  console.log('DOCX check passed: preview content, styles, metadata, tables, bullets, manual edits, and cleanup.');
} finally { await browser.close(); }
