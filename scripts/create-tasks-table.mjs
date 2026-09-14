// Creates the `tasks` table only. Existing tables and rows are never touched.
// Run: npm run db:create-tasks
import { createClient } from '@libsql/client/http';

for (const name of ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN']) {
  if (!process.env[name]) throw new Error(`${name} belum dikonfigurasi`);
}

const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

await client.executeMultiple(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    result TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS tasks_user_date_idx ON tasks (user_id, date);
`);

const { rows } = await client.execute("SELECT count(*) AS total FROM tasks");
console.log(`Tabel tasks siap. Baris saat ini: ${rows[0].total}`);
