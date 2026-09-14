import { z } from 'zod/v4';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const text = z.string().max(20_000);
const lines = z.array(text).max(500);
export const reportNarrativeSchema = z.object({
  judul: z.string().trim().min(1).max(300), ringkasan: lines, aktivitas: lines,
  tugasHarian: lines, analisisPotensi: lines, rekomendasi: lines, penutup: text,
});
export const reportSchema = z.object({
  generatedAt: z.string().datetime().optional(),
  editedHtml: z.string().max(2_000_000).optional(),
  startDate: date, endDate: date, dateRangeLabel: z.string().max(200), author: z.string().max(200),
  narrative: reportNarrativeSchema,
  events: z.array(z.object({
    id: z.number().int(), name: text, date, endDate: z.union([date, z.literal('')]).default(''),
    location: text, organizer: text, type: text, nextActions: lines, generalNotes: text,
    followUpDone: z.boolean(), createdAt: text,
    networking: z.array(z.object({
      id: z.number().int(), eventId: z.number().int(), name: text, company: text, position: text,
      contact: text, social: text, chatSummary: text, potential: text, followUp: z.boolean(),
    })).max(2_000),
    prospects: z.array(z.object({
      id: z.number().int(), eventId: z.number().int(), companyName: text, industry: text,
      personMet: text, potentialSummary: text, notes: text,
    })).max(2_000),
  })).max(2_000),
  tasks: z.array(z.object({
    id: z.number().int(), userId: z.number().int(), date,
    endDate: z.union([date, z.literal('')]).default(''), title: text, category: text,
    location: text, result: text, createdAt: text,
  })).max(2_000),
}).refine(value => value.startDate <= value.endDate, 'Rentang tanggal tidak valid');

export const saveReportSchema = z.object({
  content: reportSchema,
  id: z.number().int().positive().optional(),
  updatedAt: z.string().max(100).optional(),
}).refine(value => !value.id || !!value.updatedAt, 'Versi laporan wajib diisi');
