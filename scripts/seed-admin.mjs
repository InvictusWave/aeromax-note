import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { createClient } from '@libsql/client/http';

const required = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'INITIAL_ADMIN_USERNAME', 'INITIAL_ADMIN_NAME', 'INITIAL_ADMIN_PIN'];
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} belum dikonfigurasi`);
}

const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const scryptAsync = promisify(scrypt);

await client.executeMultiple(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    pin_hash TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    created_by INTEGER
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
`);

const username = process.env.INITIAL_ADMIN_USERNAME.trim().toLowerCase().replace(/\s+/g, '');
const existing = await client.execute({ sql: 'SELECT id FROM users WHERE username = ? LIMIT 1', args: [username] });

if (!existing.rows.length) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(process.env.INITIAL_ADMIN_PIN, salt, 64);
  const pinHash = `scrypt$${salt}$${Buffer.from(derived).toString('hex')}`;
  await client.execute({
    sql: 'INSERT INTO users (name, username, pin_hash, active, created_at) VALUES (?, ?, ?, 1, ?)',
    args: [process.env.INITIAL_ADMIN_NAME, username, pinHash, new Date().toISOString()],
  });
  console.log(`Akun awal dibuat: ${username}`);
} else {
  console.log(`Akun awal sudah tersedia: ${username}`);
}

client.close();
