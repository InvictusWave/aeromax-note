import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(2_000),
});

const requestSchema = z.object({
  mode: z.enum(['chat', 'analysis']),
  prompt: z.string().trim().max(2_000).optional(),
  messages: z.array(messageSchema).max(12).optional(),
}).superRefine((value, context) => {
  if (value.mode === 'chat' && !value.messages?.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['messages'], message: 'Pesan wajib diisi' });
  }
  if (value.mode === 'analysis' && !value.prompt) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['prompt'], message: 'Instruksi analisis wajib diisi' });
  }
});

const requests = new Map<string, { count: number; resetAt: number }>();

function withinRateLimit(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const key = forwarded || request.headers.get('x-real-ip') || 'local';
  const now = Date.now();
  const current = requests.get(key);
  if (!current || current.resetAt <= now) {
    requests.set(key, { count: 1, resetAt: now + 10 * 60_000 });
    return true;
  }
  if (current.count >= 20) return false;
  current.count += 1;
  return true;
}

function systemInstruction(eventContext: string) {
  return `Anda adalah asisten AI internal Aeromax Studio (Aeromax Production & Aeromedia Production), sebuah production house audio-visual, tata suara (sound system), dan studio rekaman panggung yang berpusat di Karanganyar (Lalung & Ngaliyan Kepuh), Solo Raya, Jawa Tengah, Indonesia.

PROFIL & EKOSISTEM BISNIS AEROMAX:
1. Layanan Utama:
   - Studio Broadcast & Live Streaming: Rekaman live studio ("Markas Aeromax"), multicam broadcasting ke YouTube untuk grup orkes dangdut, dangdut koplo, campursari, pop Jawa, dan DJ lokal.
   - Audio Production & Sound System: Mixing/mastering rekaman, penyewaan sound system FOH panggung outdoor/indoor berskala besar dengan speaker Line Array Eropa (RCF, dBTechnologies) dan digital mixer Yamaha.
   - Aeromedia Production: Video shooting multicam switcher, videografi acara panggung, video clip, dan editing purna-produksi (post-production).
   - Tata Cahaya & Visual: Lighting moving head/beam, stage rigging panggung, dan layar LED Videotron visual.
2. Portofolio & Mitra Utama:
   - Orkes Melayu (OM): OM Adella, OM Lorenza ("Dangdut Jadul"), dan orkes musik daerah lainnya.
   - DJ & Komunitas Audio: DJ Tanti, Kelud Team Official, dan audio performance.
   - Artis/Penyanyi: Penyanyi Jawa Timur & Jawa Tengah (Dewi Satria, Monalisa, dll.).
   - EO, Wedding Organizer, Panggung Rakyat, dan Instansi di Solo Raya & sekitarnya.

PANDUAN RESPONS:
- Selalu jawab dalam Bahasa Indonesia yang profesional, ramah, dan berbasis fakta data event nyata.
- Pahami konteks industri musik panggung, live recording dangdut/campursari, broadcast YouTube, dan sound system.
- Berikan saran tindak lanjut yang taktis & peluang bisnis (misal: rekomendasi upselling paket lighting/LED jika klien mengambil live streaming, penawaran sound FOH RCF, atau paket rekaman in-house di Karanganyar).
- Gunakan data pada DATA CATATAN EVENT AEROMAX. Jika ada informasi yang belum lengkap, beri saran data spesifik apa yang perlu ditanyakan ke PIC / manajer orkes / EO.
- Format ringkas, terstruktur dengan poin-poin agar nyaman dibaca di smartphone.

DATA CATATAN EVENT AEROMAX:
${eventContext}`;
}

async function generateWithFallback(apiKey: string, contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>, context: string, mode: 'chat' | 'analysis') {
  const ai = new GoogleGenAI({ apiKey });
  const analysisModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const models = Array.from(new Set(mode === 'chat'
    ? ['gemini-2.5-flash', analysisModel]
    : [analysisModel, 'gemini-2.5-flash']));
  let lastError: unknown;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: systemInstruction(context),
          temperature: 0.35,
          maxOutputTokens: mode === 'chat' ? 900 : 1_400,
          ...(model.startsWith('gemini-3')
            ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } }
            : { thinkingConfig: { thinkingBudget: mode === 'chat' ? 0 : 512 } }),
        },
      });
      const text = response.text?.trim();
      if (text) return { text, model: response.modelVersion || model };
      lastError = new Error(`Model ${model} tidak menghasilkan teks`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Gemini tidak menghasilkan respons');
}

export async function POST(request: Request) {
  if (!(await getSessionUser(request))) return NextResponse.json({ error: 'Akses tidak sah' }, { status: 401 });
  if (!withinRateLimit(request)) return NextResponse.json({ error: 'Batas penggunaan AI tercapai. Coba lagi beberapa menit.' }, { status: 429 });
  if (!db) return NextResponse.json({ error: 'Database belum dikonfigurasi' }, { status: 503 });
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: 'Gemini belum dikonfigurasi' }, { status: 503 });

  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Permintaan AI tidak valid' }, { status: 400 });

    const eventRows = await db.query.events.findMany({
      with: { networking: true, prospects: true },
      orderBy: (event, { desc }) => [desc(event.createdAt)],
      limit: 30,
    });

    const context = JSON.stringify(eventRows.map(event => ({
      id: event.id,
      event: event.name,
      tanggal: event.date,
      lokasi: event.location,
      penyelenggara: event.organizer,
      tipe: event.type,
      tindakLanjut: event.nextActions,
      statusSelesai: event.followUpDone,
      catatan: event.generalNotes,
      kontak: event.networking.map(person => ({
        nama: person.name,
        perusahaan: person.company,
        jabatan: person.position,
        ringkasan: person.chatSummary,
        potensi: person.potential,
        perluFollowUp: person.followUp,
      })),
      prospek: event.prospects.map(prospect => ({
        perusahaan: prospect.companyName,
        industri: prospect.industry,
        orangDitemui: prospect.personMet,
        ringkasanPotensi: prospect.potentialSummary,
        catatan: prospect.notes,
      })),
    })), null, 2);

    const contents = parsed.data.mode === 'chat'
      ? parsed.data.messages!.map(message => ({
          role: message.role === 'assistant' ? 'model' as const : 'user' as const,
          parts: [{ text: message.content }],
        }))
      : [{ role: 'user' as const, parts: [{ text: parsed.data.prompt! }] }];

    const result = await generateWithFallback(process.env.GEMINI_API_KEY, contents, context, parsed.data.mode);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Gemini error:', error);
    return NextResponse.json({ error: 'AI sedang tidak dapat merespons. Coba lagi.' }, { status: 500 });
  }
}
