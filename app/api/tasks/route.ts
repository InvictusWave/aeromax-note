import { NextResponse } from 'next/server';
import { and, eq, like } from 'drizzle-orm';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { taskSchema } from '@/lib/task-types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Akses tidak sah' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database belum dikonfigurasi' }, { status: 503 });

  const month = new URL(request.url).searchParams.get('month');
  const rows = await db
    .select()
    .from(tasks)
    .where(
      month && monthPattern.test(month)
        ? and(eq(tasks.userId, user.id), like(tasks.date, `${month}%`))
        : eq(tasks.userId, user.id)
    )
    .orderBy(tasks.date);

  return NextResponse.json(rows.reverse(), { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Akses tidak sah' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database belum dikonfigurasi' }, { status: 503 });

  const parsed = taskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validasi gagal', issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const [row] = await db
      .insert(tasks)
      .values({ ...parsed.data, userId: user.id, endDate: parsed.data.endDate || '', createdAt: new Date().toISOString() })
      .returning();
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error('Gagal menyimpan tugas harian:', error);
    return NextResponse.json({ error: 'Tugas tidak dapat disimpan' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Akses tidak sah' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database belum dikonfigurasi' }, { status: 503 });

  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'ID tugas tidak valid' }, { status: 400 });

  // Scoped to the owner so one user can never delete another creator's task.
  const removed = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    .returning({ id: tasks.id });

  if (!removed.length) return NextResponse.json({ error: 'Tugas tidak ditemukan' }, { status: 404 });
  return NextResponse.json({ id, deleted: true });
}
