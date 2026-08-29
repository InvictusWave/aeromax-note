// The HTTP client talks to remote Turso without loading a platform-specific
// native binary. This keeps `next dev` stable on Apple Silicon/Rosetta setups.
import { createClient } from '@libsql/client/http';
import { drizzle } from 'drizzle-orm/libsql/http';
import * as schema from './schema';

export const db = process.env.TURSO_DATABASE_URL ? drizzle(createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN }), { schema }) : null;
