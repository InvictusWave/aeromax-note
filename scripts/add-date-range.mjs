// Add end_date columns to events and tasks tables
import { createClient } from '@libsql/client/http';

for (const name of ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN']) {
  if (!process.env[name]) throw new Error(`${name} belum dikonfigurasi`);
}

const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

try {
  await client.executeMultiple(`
    ALTER TABLE events ADD COLUMN end_date TEXT NOT NULL DEFAULT '';
    ALTER TABLE tasks ADD COLUMN end_date TEXT NOT NULL DEFAULT '';
  `);
  console.log('✓ Kolom end_date berhasil ditambahkan ke events dan tasks');
} catch (error) {
  if (error.message?.includes('duplicate column')) {
    console.log('✓ Kolom end_date sudah ada');
  } else {
    throw error;
  }
}
