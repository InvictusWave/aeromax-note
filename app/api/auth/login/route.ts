import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { createSession, normalizeUsername, setSessionCookie, verifyPin } from '@/lib/auth';

const schema = z.object({
  username: z.string().trim().min(3).max(40),
  pin: z.string().min(6).max(64),
});

const failedAttempts = new Map<string, { count: number; resetAt: number }>();
const ATTEMPT_WINDOW = 15 * 60_000;
const MAX_ATTEMPTS = 8;

function attemptKey(request: Request, username: string) {
  const address = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'lokal';
  return `${address}:${username}`;
}

function isBlocked(key: string) {
  const attempt = failedAttempts.get(key);
  if (!attempt) return false;
  if (attempt.resetAt <= Date.now()) {
    failedAttempts.delete(key);
    return false;
  }
  return attempt.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string) {
  const now = Date.now();
  const attempt = failedAttempts.get(key);
  if (!attempt || attempt.resetAt <= now) {
    failedAttempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW });
    return;
  }
  attempt.count += 1;
}

export async function POST(request: Request) {
  if (!db) return NextResponse.json({ error: 'Database belum dikonfigurasi' }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Nama pengguna dan PIN wajib diisi' }, { status: 400 });

  const username = normalizeUsername(parsed.data.username);
  const key = attemptKey(request, username);
  if (isBlocked(key)) {
    return NextResponse.json(
      { error: 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.' },
      { status: 429, headers: { 'Retry-After': '900' } },
    );
  }

  const [user] = await db.select().from(users).where(and(
    eq(users.username, username),
    eq(users.active, true),
  )).limit(1);

  if (!user || !(await verifyPin(parsed.data.pin, user.pinHash))) {
    recordFailure(key);
    return NextResponse.json({ error: 'Nama pengguna atau PIN tidak sesuai' }, { status: 401 });
  }

  failedAttempts.delete(key);
  const session = await createSession(user.id);
  const response = NextResponse.json({ user: { id: user.id, name: user.name, username: user.username } });
  setSessionCookie(response, session.token, session.expires);
  return response;
}
