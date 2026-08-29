import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { getSessionUser, hashPin, normalizeUsername } from '@/lib/auth';

const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(80),
  username: z.string().trim().min(3, 'Nama pengguna minimal 3 karakter').max(40).regex(/^[a-zA-Z0-9._-]+$/, 'Nama pengguna hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung'),
  pin: z.string().min(6, 'PIN minimal 6 karakter').max(64),
});

export async function GET(request: Request) {
  if (!db) return NextResponse.json({ error: 'Database belum dikonfigurasi' }, { status: 503 });
  if (!(await getSessionUser(request))) return NextResponse.json({ error: 'Akses tidak sah' }, { status: 401 });
  const rows = await db.select({ id: users.id, name: users.name, username: users.username, active: users.active, createdAt: users.createdAt, createdBy: users.createdBy })
    .from(users)
    .where(eq(users.active, true))
    .orderBy(users.name);
  return NextResponse.json(rows, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!db) return NextResponse.json({ error: 'Database belum dikonfigurasi' }, { status: 503 });
  const creator = await getSessionUser(request);
  if (!creator) return NextResponse.json({ error: 'Akses tidak sah' }, { status: 401 });
  const parsed = createUserSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Data pengguna tidak valid' }, { status: 400 });

  const username = normalizeUsername(parsed.data.username);
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (existing) return NextResponse.json({ error: 'Nama pengguna sudah digunakan' }, { status: 409 });

  const [created] = await db.insert(users).values({
    name: parsed.data.name,
    username,
    pinHash: await hashPin(parsed.data.pin),
    active: true,
    createdAt: new Date().toISOString(),
    createdBy: creator.id,
  }).returning({ id: users.id, name: users.name, username: users.username, createdAt: users.createdAt });

  return NextResponse.json(created, { status: 201 });
}
