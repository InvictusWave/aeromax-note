import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { reports } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { saveReportSchema } from '@/lib/report-schema';
import { sanitizeReportHtml } from '@/lib/report';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Akses tidak sah' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database belum dikonfigurasi' }, { status: 503 });
  const id = new URL(request.url).searchParams.get('id');
  if (id && (!Number.isSafeInteger(Number(id)) || Number(id) <= 0)) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
  try {
    if (id) {
      const [row] = await db.select().from(reports).where(and(eq(reports.id, Number(id)), eq(reports.userId, user.id)));
      if (!row) return NextResponse.json({ error: 'Laporan tidak ditemukan' }, { status: 404 });
      return NextResponse.json(row, { headers: { 'Cache-Control': 'no-store' } });
    }
    const rows = await db.select({ id: reports.id, title: reports.title, startDate: reports.startDate, endDate: reports.endDate, updatedAt: reports.updatedAt })
      .from(reports).where(eq(reports.userId, user.id)).orderBy(desc(reports.updatedAt));
    return NextResponse.json(rows, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Gagal memuat laporan:', error);
    return NextResponse.json({ error: 'Laporan tidak dapat dimuat' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Akses tidak sah' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database belum dikonfigurasi' }, { status: 503 });
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > 2_000_000) return NextResponse.json({ error: 'Laporan terlalu besar (maksimal 2 MB)' }, { status: 413 });
  let body;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 }); }
  const parsed = saveReportSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Isi laporan tidak valid' }, { status: 400 });
  const { content, id, updatedAt } = parsed.data;
  // The author and personal task ownership are enforced server-side.
  if (content.tasks.some(task => task.userId !== user.id)) return NextResponse.json({ error: 'Tugas bukan milik Anda' }, { status: 403 });
  const values = { title: content.narrative.judul, startDate: content.startDate, endDate: content.endDate,
    content: { ...content, editedHtml: content.editedHtml ? sanitizeReportHtml(content.editedHtml) : undefined, author: user.name }, updatedAt: new Date().toISOString() };
  try {
    const [row] = id
      ? await db.update(reports).set(values).where(and(eq(reports.id, id), eq(reports.userId, user.id), eq(reports.updatedAt, updatedAt!))).returning()
      : await db.insert(reports).values({ ...values, userId: user.id }).returning();
    if (!row) return NextResponse.json({ error: 'Laporan sudah berubah atau tidak ditemukan. Buka ulang laporan sebelum menyimpan.' }, { status: 409 });
    return NextResponse.json(row, { status: id ? 200 : 201 });
  } catch (error) {
    console.error('Gagal menyimpan laporan:', error);
    return NextResponse.json({ error: 'Laporan tidak dapat disimpan. Draft Anda tetap tersedia.' }, { status: 500 });
  }
}
