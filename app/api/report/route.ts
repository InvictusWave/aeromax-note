import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, like } from 'drizzle-orm';
import { db } from '@/db';
import { events as eventsTable, tasks as tasksTable } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { AEROMAX_PROFILE } from '@/lib/ai-brand';
import type { ReportNarrative } from '@/lib/report-types';
import type { DailyTask } from '@/lib/task-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) });

const narrativeSchema = {
  type: 'object',
  properties: {
    judul: { type: 'string' },
    ringkasan: { type: 'array', items: { type: 'string' } },
    aktivitas: { type: 'array', items: { type: 'string' } },
    tugasHarian: { type: 'array', items: { type: 'string' } },
    analisisPotensi: { type: 'array', items: { type: 'string' } },
    rekomendasi: { type: 'array', items: { type: 'string' } },
    penutup: { type: 'string' },
  },
  required: ['judul', 'ringkasan', 'aktivitas', 'tugasHarian', 'analisisPotensi', 'rekomendasi', 'penutup'],
} as const;

function monthLabel(month: string) {
  const [year, index] = month.split('-').map(Number);
  return new Date(year, index - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

/** Deterministic wording used when Gemini is unavailable, so the report still prints. */
function fallbackNarrative(month: string, author: string, context: ReportContext): ReportNarrative {
  const label = monthLabel(month);
  return {
    judul: `Laporan Kerja ${label}`,
    ringkasan: [
      `Sepanjang ${label}, ${author} menangani ${context.totalEvent} event dengan total ${context.totalKontak} kontak baru dan ${context.totalProspek} prospek perusahaan yang tercatat, serta ${context.totalTugasHarian} tugas harian di luar event.`,
      `Dari seluruh kontak tersebut, ${context.potensiTinggi} orang tergolong berpotensi tinggi dan ${context.perluFollowUp} kontak masih menunggu tindak lanjut.`,
    ],
    aktivitas: context.events.map(
      event => `${event.event} (${event.tanggal}, ${event.lokasi}) — ${event.kontak.length} kontak, ${event.prospek.length} prospek.`
    ),
    tugasHarian: context.tugasHarian.map(
      task => `${task.tanggal} — ${task.uraian}${task.jenis ? ` (${task.jenis})` : ''}${task.lokasi ? ` di ${task.lokasi}` : ''}.`
    ),
    analisisPotensi: [
      'Ringkasan potensi disusun otomatis dari data catatan event. Narasi AI tidak tersedia saat laporan ini dibuat.',
    ],
    rekomendasi: ['Tindak lanjuti kontak berpotensi tinggi yang belum dihubungi pada daftar kontak di bawah.'],
    penutup: `Laporan ini disusun berdasarkan catatan event Aeromax Studio periode ${label}.`,
  };
}

type ReportContext = ReturnType<typeof buildContext>;

function buildContext(rows: Awaited<ReturnType<typeof loadMonth>>, taskRows: DailyTask[]) {
  const contacts = rows.flatMap(row => row.networking);
  return {
    totalEvent: rows.length,
    totalKontak: contacts.length,
    totalProspek: rows.reduce((total, row) => total + row.prospects.length, 0),
    potensiTinggi: contacts.filter(contact => contact.potential?.toLowerCase() === 'high').length,
    perluFollowUp: contacts.filter(contact => contact.followUp).length,
    totalTugasHarian: taskRows.length,
    tugasHarian: taskRows.map(task => ({
      tanggal: task.date,
      jenis: task.category,
      uraian: task.title,
      lokasi: task.location,
      hasil: task.result,
    })),
    events: rows.map(row => ({
      event: row.name,
      tanggal: row.date,
      lokasi: row.location,
      penyelenggara: row.organizer,
      tipe: row.type,
      tindakLanjut: row.nextActions,
      statusSelesai: row.followUpDone,
      catatan: row.generalNotes,
      kontak: row.networking.map(person => ({
        nama: person.name,
        perusahaan: person.company,
        jabatan: person.position,
        kontak: person.contact,
        ringkasan: person.chatSummary,
        potensi: person.potential,
        perluFollowUp: person.followUp,
      })),
      prospek: row.prospects.map(prospect => ({
        perusahaan: prospect.companyName,
        industri: prospect.industry,
        orangDitemui: prospect.personMet,
        ringkasanPotensi: prospect.potentialSummary,
        catatan: prospect.notes,
      })),
    })),
  };
}

function loadMonth(month: string) {
  return db!.query.events.findMany({
    with: { networking: true, prospects: true },
    where: like(eventsTable.date, `${month}%`),
    orderBy: (event, { asc }) => [asc(event.date)],
  });
}

/** Daily tasks are personal work logs, so a report only ever shows its own author's. */
function loadTasks(month: string, userId: number) {
  return db!
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.userId, userId), like(tasksTable.date, `${month}%`)))
    .orderBy(tasksTable.date) as Promise<DailyTask[]>;
}

async function writeNarrative(month: string, author: string, context: ReportContext) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  const models = Array.from(new Set([process.env.GEMINI_MODEL || 'gemini-2.5-flash', 'gemini-2.5-flash']));

  const prompt = `Tulis laporan kerja bulanan ${monthLabel(month)} untuk ${author}, staf Aeromax Studio. Laporan mencakup pekerjaan event maupun tugas harian di luar event.

ATURAN PENULISAN:
- Bahasa Indonesia formal untuk laporan internal ke manajemen. Tidak ada sapaan, emoji, atau markdown.
- SELURUH isi wajib bersumber dari DATA di bawah. Sebut nama event, nama orang, nama perusahaan/orkes, dan angka yang nyata. Dilarang mengarang fakta, angka, atau nama yang tidak ada di data.
- Pakai istilah yang sesuai bisnis Aeromax (live recording, multicam, sound system FOH, lighting, LED videotron, EO, manajer orkes) hanya jika memang tercermin di data.
- judul: judul laporan, maksimal 10 kata.
- ringkasan: 2-3 paragraf utuh (bukan poin) berisi capaian bulan ini beserta angkanya.
- aktivitas: satu poin per event, sebutkan nama event, tanggal, lokasi, dan hasil konkret pertemuannya. Kosongkan array ini jika tidak ada event.
- tugasHarian: rangkum pekerjaan harian di luar event dari data tugasHarian. Kelompokkan per jenis pekerjaan, sebutkan jumlah dan contoh konkretnya beserta tanggal. Kosongkan array ini jika data tugasHarian kosong.
- analisisPotensi: 1-2 paragraf tentang kualitas prospek, sektor yang dominan, dan peluang bisnis yang terbaca dari data.
- rekomendasi: 3-5 poin tindak lanjut spesifik, sebutkan nama kontak atau perusahaan yang dituju.
- penutup: satu paragraf singkat.

DATA CATATAN EVENT PERIODE INI:
${JSON.stringify(context, null, 2)}`;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: AEROMAX_PROFILE,
          temperature: 0.4,
          maxOutputTokens: 3_000,
          responseMimeType: 'application/json',
          responseSchema: narrativeSchema,
        },
      });
      const text = response.text?.trim();
      if (text) return JSON.parse(text) as ReportNarrative;
    } catch (error) {
      console.error(`Gemini report error (${model}):`, error);
    }
  }
  return null;
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Akses tidak sah' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database belum dikonfigurasi' }, { status: 503 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Bulan laporan tidak valid' }, { status: 400 });

  const { month } = parsed.data;

  try {
    const [rows, taskRows] = await Promise.all([loadMonth(month), loadTasks(month, user.id)]);
    if (!rows.length && !taskRows.length) {
      return NextResponse.json(
        { error: `Tidak ada catatan event maupun tugas harian pada ${monthLabel(month)}.` },
        { status: 404 }
      );
    }

    const context = buildContext(rows, taskRows);
    const narrative = (await writeNarrative(month, user.name, context)) ?? fallbackNarrative(month, user.name, context);

    return NextResponse.json({
      month,
      monthLabel: monthLabel(month),
      author: user.name,
      narrative,
      events: rows,
      tasks: taskRows,
    });
  } catch (error) {
    console.error('Gagal menyusun laporan:', error);
    return NextResponse.json({ error: 'Laporan tidak dapat disusun. Coba lagi.' }, { status: 500 });
  }
}
