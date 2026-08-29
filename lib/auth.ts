import { createHash, randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { and, eq, gt } from 'drizzle-orm';
import type { NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';

const scryptAsync = promisify(scrypt);
export const SESSION_COOKIE = 'aeromax_session';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1_000;

export type AuthUser = {
  id: number;
  name: string;
  username: string;
  createdAt: string;
};

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

export async function hashPin(pin: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(pin, salt, 64) as Buffer;
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

export async function verifyPin(pin: string, storedHash: string) {
  const [algorithm, salt, hash] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !hash) return false;
  const stored = Buffer.from(hash, 'hex');
  const derived = await scryptAsync(pin, salt, stored.length) as Buffer;
  return stored.length === derived.length && timingSafeEqual(stored, derived);
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function readCookie(request: Request, name: string) {
  const value = request.headers.get('cookie')?.split(';')
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : null;
}

export async function createSession(userId: number) {
  if (!db) throw new Error('Database belum dikonfigurasi');
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DURATION);
  await db.insert(sessions).values({
    id: tokenHash(token),
    userId,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  });
  return { token, expires };
}

export function setSessionCookie(response: NextResponse, token: string, expires: Date) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  });
  response.cookies.set('aeromax_access', '', { path: '/', maxAge: 0 });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  response.cookies.set('aeromax_access', '', { path: '/', maxAge: 0 });
}

export async function getSessionUser(request: Request): Promise<AuthUser | null> {
  if (!db) return null;
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;

  const [row] = await db.select({
    id: users.id,
    name: users.name,
    username: users.username,
    createdAt: users.createdAt,
  })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(
      eq(sessions.id, tokenHash(token)),
      gt(sessions.expiresAt, new Date().toISOString()),
      eq(users.active, true),
    ))
    .limit(1);

  return row ?? null;
}

export async function deleteCurrentSession(request: Request) {
  if (!db) return;
  const token = readCookie(request, SESSION_COOKIE);
  if (token) await db.delete(sessions).where(eq(sessions.id, tokenHash(token)));
}
