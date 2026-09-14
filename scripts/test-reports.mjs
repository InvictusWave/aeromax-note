// Integration check against a running app. Only temporary test records are created and removed.
// BASE_URL=http://127.0.0.1:3011 node --env-file=.env.local --experimental-strip-types scripts/test-reports.mjs
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { createClient } from '@libsql/client/http';
import { reportSchema, saveReportSchema } from '../lib/report-schema.ts';
import { buildReportHtml } from '../lib/report.ts';

const base = process.env.BASE_URL || 'http://127.0.0.1:3011';
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const marker = `report-check-${randomBytes(12).toString('hex')}`;
const accounts = [], reportIds = [];
const now = new Date().toISOString();
const content = {
  startDate: '2026-09-01', endDate: '2026-09-14', dateRangeLabel: '1 s/d 14 September 2026', author: 'Nama palsu',
  narrative: { judul: marker, ringkasan: ['Hasil kegiatan: draft lama.'], aktivitas: [], tugasHarian: [],
    analisisPotensi: ['Belum ada prospek.'], rekomendasi: ['Periksa hasil kegiatan.'], penutup: 'Demikian laporan ini.' },
  events: [{ id: 700_001, name: 'Event uji laporan', date: '2026-09-14', endDate: '', location: 'Kantor',
    organizer: 'EO uji', type: 'Pameran', nextActions: [], generalNotes: 'Catatan awal', followUpDone: false, createdAt: now,
    networking: [{ id: 700_002, eventId: 700_001, name: 'Kontak uji', company: 'EO uji', position: 'PIC',
      contact: '', social: '', chatSummary: 'Perkenalan', potential: 'low', followUp: false }],
    prospects: [{ id: 700_003, eventId: 700_001, companyName: 'Perusahaan uji', industry: 'Event',
      personMet: 'Kontak uji', potentialSummary: 'Diskusi awal', notes: '' }],
  }], tasks: [],
};
assert.equal(reportSchema.safeParse({ ...content, endDate: '2026-08-01' }).success, false);
assert.equal(saveReportSchema.safeParse({ id: 1, content }).success, false);
assert.equal(reportSchema.safeParse({ ...content, narrative: { ...content.narrative, ringkasan: 'invalid' } }).success, false);

async function api(path, cookie, body) {
  const response = await fetch(`${base}${path}`, {
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    method: body ? 'POST' : 'GET', ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
}

try {
  assert.equal((await api('/api/reports')).status, 401);
  assert.equal((await api('/api/reports', null, { content })).status, 401);
  for (let i = 0; i < 2; i++) {
    const username = `${marker}-${i}`;
    const { rows } = await client.execute({
      sql: 'INSERT INTO users (name, username, pin_hash, active, created_at) VALUES (?, ?, ?, 1, ?) RETURNING id',
      args: [username, username, 'disabled-test-pin', now],
    });
    const account = { id: Number(rows[0].id), username, token: randomBytes(32).toString('base64url') };
    accounts.push(account);
    account.sessionId = createHash('sha256').update(account.token).digest('hex');
    await client.execute({ sql: 'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
      args: [account.sessionId, account.id, new Date(Date.now() + 600_000).toISOString(), now] });
    account.cookie = `aeromax_session=${account.token}`;
  }
  const [owner, other] = accounts;
  content.tasks = [{ id: 700_004, userId: owner.id, date: '2026-09-14', endDate: '', title: 'Tugas uji',
    category: 'Administrasi', location: 'Kantor', result: 'Selesai', createdAt: now }];
  const foreignTasks = { ...content, tasks: [{ ...content.tasks[0], userId: other.id }] };
  assert.equal((await api('/api/reports', owner.cookie, { content: foreignTasks })).status, 403);
  assert.equal((await api('/api/report', owner.cookie, { action: 'revise', report: foreignTasks, prompt: 'Ringkas laporan' })).status, 403);
  const created = await api('/api/reports', owner.cookie, { content });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  reportIds.push(created.body.id);
  const saved = created.body;
  assert.equal(saved.content.author, owner.username, 'server must enforce author');
  const list = await api('/api/reports', owner.cookie);
  assert.ok(list.body.some(row => row.id === saved.id));
  assert.ok(list.body.every(row => !('content' in row)), 'list must not load full snapshots');
  assert.ok(!(await api('/api/reports', other.cookie)).body.some(row => row.id === saved.id));
  assert.equal((await api(`/api/reports?id=${saved.id}`, other.cookie)).status, 404);
  assert.equal((await api('/api/reports', other.cookie, { content: { ...content, tasks: [] }, id: saved.id, updatedAt: saved.updatedAt })).status, 409);
  assert.equal((await api('/api/reports', owner.cookie, { content: { ...content, narrative: {} } })).status, 400);
  assert.equal((await api('/api/report', owner.cookie, { action: 'revise', report: content, prompt: '' })).status, 400);

  let revised = { ...saved.content, narrative: { ...content.narrative, ringkasan: ['Hasil kegiatan: selesai diperiksa.'] } };
  if (process.env.CHECK_REPORT_AI === '1' || process.argv.includes('--ai')) {
    const result = await api('/api/report', owner.cookie, {
      action: 'revise', report: saved.content,
      prompt: 'Pada ringkasan, ganti teks "draft lama" menjadi "selesai diperiksa". Pertahankan semua bagian lain persis sama.',
    });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    revised = result.body;
    assert.ok(revised.narrative.ringkasan.join(' ').includes('selesai diperiksa'));
    assert.ok(!revised.narrative.ringkasan.join(' ').includes('draft lama'));
    assert.equal(revised.narrative.penutup, content.narrative.penutup);
    assert.deepEqual(revised.events, content.events);
    assert.deepEqual(revised.tasks, content.tasks);
  }
  // Applying a revision must not persist it until Save is pressed.
  assert.deepEqual((await api(`/api/reports?id=${saved.id}`, owner.cookie)).body.content.narrative, saved.content.narrative);
  const updated = await api('/api/reports', owner.cookie, { content: revised, id: saved.id, updatedAt: saved.updatedAt });
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.id, saved.id, 'save revisions must replace the same report');
  assert.equal((await api('/api/reports', owner.cookie, { content, id: saved.id, updatedAt: saved.updatedAt })).status, 409, 'stale saves must fail');
  const reopened = await api(`/api/reports?id=${saved.id}`, owner.cookie);
  assert.deepEqual(reopened.body.content, updated.body.content);
  assert.ok(buildReportHtml(reopened.body.content).includes('selesai diperiksa'));
  assert.ok(!buildReportHtml(reopened.body.content).includes('draft lama'));
  // A saved report can be revised and saved again.
  revised = { ...reopened.body.content, narrative: { ...reopened.body.content.narrative, penutup: 'Penutup revisi kedua.' } };
  const second = await api('/api/reports', owner.cookie, { content: revised, id: saved.id, updatedAt: reopened.body.updatedAt });
  assert.equal(second.status, 200);
  assert.equal(second.body.content.narrative.penutup, 'Penutup revisi kedua.');
  console.log('OK: preview/revisi, simpan, buka ulang, revisi ulang, PDF, kepemilikan, validasi, dan konflik versi.');
} finally {
  for (const id of reportIds) {
    await client.execute({ sql: 'DELETE FROM reports WHERE id = ? AND user_id = ?', args: [id, accounts[0].id] });
  }
  for (const account of accounts) {
    if (account.sessionId) await client.execute({ sql: 'DELETE FROM sessions WHERE id = ? AND user_id = ?', args: [account.sessionId, account.id] });
    await client.execute({ sql: 'DELETE FROM users WHERE id = ? AND username = ?', args: [account.id, account.username] });
  }
  client.close();
}
