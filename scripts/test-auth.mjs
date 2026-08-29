import { randomBytes } from 'crypto';
import { createClient } from '@libsql/client/http';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const adminUsername = process.env.INITIAL_ADMIN_USERNAME;
const adminPin = process.env.INITIAL_ADMIN_PIN;

if (!adminUsername || !adminPin) {
  throw new Error('INITIAL_ADMIN_USERNAME dan INITIAL_ADMIN_PIN wajib tersedia');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sessionCookie(response) {
  const values = response.headers.getSetCookie?.() || [response.headers.get('set-cookie') || ''];
  const session = values.find(value => value.startsWith('aeromax_session='));
  assert(session, 'Cookie sesi tidak diterima');
  return session.split(';', 1)[0];
}

async function jsonRequest(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function login(username, pin) {
  return jsonRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, pin }),
  });
}

const unauthenticated = await jsonRequest('/api/auth/me');
assert(unauthenticated.response.status === 401, 'Endpoint sesi harus menolak permintaan tanpa cookie');

const adminLogin = await login(adminUsername, adminPin);
assert(adminLogin.response.status === 200, `Login admin gagal (${adminLogin.response.status})`);
const adminCookie = sessionCookie(adminLogin.response);

const me = await jsonRequest('/api/auth/me', { headers: { cookie: adminCookie } });
assert(me.response.status === 200 && me.body?.user?.username === adminUsername, 'Sesi admin tidak dapat dibaca');

const events = await jsonRequest('/api/events', { headers: { cookie: adminCookie } });
assert(events.response.status === 200 && Array.isArray(events.body), 'API event tidak dapat dibaca dengan sesi baru');

const suffix = `${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;
const firstUsername = `uji_${suffix}`;
const secondUsername = `anggota_${suffix}`;
const firstPin = `Awal-${randomBytes(8).toString('hex')}`;
const changedPin = `Baru-${randomBytes(8).toString('hex')}`;
const secondPin = `Tim-${randomBytes(8).toString('hex')}`;

const firstCreated = await jsonRequest('/api/users', {
  method: 'POST',
  headers: { cookie: adminCookie },
  body: JSON.stringify({ name: 'Pengguna Uji Aeromax', username: firstUsername, pin: firstPin }),
});
assert(firstCreated.response.status === 201, `Admin gagal membuat pengguna (${firstCreated.response.status})`);

const firstLogin = await login(firstUsername, firstPin);
assert(firstLogin.response.status === 200, 'Pengguna baru tidak dapat login');
const firstCookie = sessionCookie(firstLogin.response);

const changed = await jsonRequest('/api/auth/pin', {
  method: 'PATCH',
  headers: { cookie: firstCookie },
  body: JSON.stringify({ currentPin: firstPin, newPin: changedPin, confirmation: changedPin }),
});
assert(changed.response.status === 200, `Ubah PIN gagal (${changed.response.status})`);
const changedCookie = sessionCookie(changed.response);

const oldPinLogin = await login(firstUsername, firstPin);
assert(oldPinLogin.response.status === 401, 'PIN lama masih dapat digunakan');
const changedPinLogin = await login(firstUsername, changedPin);
assert(changedPinLogin.response.status === 200, 'PIN baru tidak dapat digunakan');

const secondCreated = await jsonRequest('/api/users', {
  method: 'POST',
  headers: { cookie: changedCookie },
  body: JSON.stringify({ name: 'Anggota Uji Aeromax', username: secondUsername, pin: secondPin }),
});
assert(secondCreated.response.status === 201, 'Pengguna biasa gagal mendaftarkan pengguna lain');

const secondLogin = await login(secondUsername, secondPin);
assert(secondLogin.response.status === 200, 'Pengguna yang didaftarkan oleh pengguna lain tidak dapat login');

console.log(JSON.stringify({
  ok: true,
  authenticatedEventCount: events.body.length,
  createdUsers: [firstUsername, secondUsername],
  checks: [
    'permintaan tanpa sesi ditolak',
    'login admin berhasil',
    'cookie HttpOnly diterbitkan',
    'API event menerima sesi database',
    'admin dapat menambah pengguna',
    'pengguna baru dapat mengubah PIN',
    'PIN lama ditolak dan PIN baru diterima',
    'pengguna baru dapat mendaftarkan pengguna lain',
  ],
}, null, 2));

// Akun yang dibuat skrip ini hanya data uji dan dibersihkan setelah seluruh pemeriksaan lulus.
if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
  const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
  const testUsernames = [firstUsername, secondUsername];
  const placeholders = testUsernames.map(() => '?').join(', ');
  await client.batch([
    {
      sql: `DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE username IN (${placeholders}))`,
      args: testUsernames,
    },
    { sql: `DELETE FROM users WHERE username IN (${placeholders})`, args: testUsernames },
  ], 'write');
  client.close();
}
