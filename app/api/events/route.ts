import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { events, networking, prospects } from '@/db/schema';
import { cleanEventForm, eventFormSchema } from '@/lib/event-form';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  if (!(await getSessionUser(request))) return NextResponse.json({ error: 'Akses tidak sah' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database belum dikonfigurasi' }, { status: 503 });
  try { const payload = eventFormSchema.safeParse(await request.json()); if (!payload.success) return NextResponse.json({ error: 'Validasi gagal', issues: payload.error.flatten() }, { status: 400 }); const body = cleanEventForm(payload.data); const now = new Date().toISOString(); const [event] = await db.insert(events).values({ name: body.name, date: body.date, location: body.location, organizer: body.organizer, type: body.type, nextActions: body.nextActions, generalNotes: body.generalNotes, createdAt: now }).returning({ id: events.id });
    if (body.networking.length) await db.insert(networking).values(body.networking.map(person => ({ eventId: event.id, name: person.name, company: person.company, position: person.position, contact: person.contact, social: person.social, chatSummary: person.chatSummary, potential: person.potential, followUp: person.followUp })));
    if (body.prospects.length) await db.insert(prospects).values(body.prospects.map(prospect => ({ eventId: event.id, companyName: prospect.companyName, industry: prospect.industry, personMet: prospect.personMet, potentialSummary: prospect.potentialSummary, notes: prospect.notes })));
    return NextResponse.json({ id: event.id }, { status: 201 });
  } catch (error) { console.error(error); return NextResponse.json({ error: 'Catatan tidak dapat disimpan' }, { status: 500 }); }
}

export async function GET(request: Request) {
  if (!(await getSessionUser(request))) return NextResponse.json({ error: 'Akses tidak sah' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database belum dikonfigurasi' }, { status: 503 });
  const rows = await db.query.events.findMany({ with: { networking: true, prospects: true }, orderBy: (event, { desc }) => [desc(event.createdAt)] });
  return NextResponse.json(rows, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

export async function PATCH(request: Request) {
  if (!(await getSessionUser(request))) return NextResponse.json({ error: 'Akses tidak sah' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database belum dikonfigurasi' }, { status: 503 });
  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isInteger(id)) return NextResponse.json({ error: 'ID catatan tidak valid' }, { status: 400 });
    if ('name' in body) {
      const payload = eventFormSchema.safeParse(body);
      if (!payload.success) return NextResponse.json({ error: 'Validasi gagal', issues: payload.error.flatten() }, { status: 400 });
      const data = cleanEventForm(payload.data);
      await db.transaction(async transaction => {
        await transaction.update(events).set({ name: data.name, date: data.date, location: data.location, organizer: data.organizer, type: data.type, nextActions: data.nextActions, generalNotes: data.generalNotes }).where(eq(events.id, id));
        await transaction.delete(networking).where(eq(networking.eventId, id));
        await transaction.delete(prospects).where(eq(prospects.eventId, id));
        if (data.networking.length) await transaction.insert(networking).values(data.networking.map(person => ({ eventId: id, name: person.name, company: person.company, position: person.position, contact: person.contact, social: person.social, chatSummary: person.chatSummary, potential: person.potential, followUp: person.followUp })));
        if (data.prospects.length) await transaction.insert(prospects).values(data.prospects.map(prospect => ({ eventId: id, companyName: prospect.companyName, industry: prospect.industry, personMet: prospect.personMet, potentialSummary: prospect.potentialSummary, notes: prospect.notes })));
      });
      return NextResponse.json({ id, updated: true });
    }
    await db.update(events).set({ followUpDone: Boolean(body.followUpDone) }).where(eq(events.id, id));
    return NextResponse.json({ id, followUpDone: Boolean(body.followUpDone) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Catatan tidak dapat diperbarui' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await getSessionUser(request))) return NextResponse.json({ error: 'Akses tidak sah' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database belum dikonfigurasi' }, { status: 503 });

  try {
    const url = new URL(request.url);
    let id = Number(url.searchParams.get('id'));
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = Number(body?.id);
    }
    if (!id || !Number.isInteger(id)) {
      return NextResponse.json({ error: 'ID catatan tidak valid' }, { status: 400 });
    }

    await db.transaction(async transaction => {
      await transaction.delete(networking).where(eq(networking.eventId, id));
      await transaction.delete(prospects).where(eq(prospects.eventId, id));
      await transaction.delete(events).where(eq(events.id, id));
    });

    return NextResponse.json({ id, deleted: true });
  } catch (error) {
    console.error('Gagal menghapus catatan event:', error);
    return NextResponse.json({ error: 'Catatan tidak dapat dihapus' }, { status: 500 });
  }
}

