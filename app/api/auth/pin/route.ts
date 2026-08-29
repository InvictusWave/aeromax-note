import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { createSession, getSessionUser, hashPin, setSessionCookie, verifyPin } from '@/lib/auth';

const schema = z.object({
  currentPin: z.string().min(6).max(64),
  newPin: z.string().min(6, 'PIN baru minimal 6 karakter').max(64),
  confirmation: z.string(),
}).refine(value => value.newPin === value.confirmation, { path: ['confirmation'], message: 'Konfirmasi PIN tidak sama' });

export async function PATCH(request: Request) {
  if (!db) return NextResponse.json({ error: 'Database belum dikonfigurasi' }, { status: 503 });
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: 'Akses tidak sah' }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Data PIN tidak valid' }, { status: 400 });

  const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);
  if (!user || !(await verifyPin(parsed.data.currentPin, user.pinHash))) {
    return NextResponse.json({ error: 'PIN saat ini tidak sesuai' }, { status: 400 });
  }
  if (parsed.data.currentPin === parsed.data.newPin) {
    return NextResponse.json({ error: 'PIN baru harus berbeda dari PIN saat ini' }, { status: 400 });
  }

  await db.update(users).set({ pinHash: await hashPin(parsed.data.newPin) }).where(eq(users.id, user.id));
  await db.delete(sessions).where(eq(sessions.userId, user.id));
  const session = await createSession(user.id);
  const response = NextResponse.json({ success: true });
  setSessionCookie(response, session.token, session.expires);
  return response;
}
