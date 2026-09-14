import { z } from 'zod';

export const TASK_CATEGORIES = [
  'Foto produk',
  'Video shooting',
  'Editing & post-production',
  'Rekaman studio',
  'Perawatan alat',
  'Persiapan & muat alat',
  'Survei lokasi',
  'Meeting internal',
  'Administrasi & penawaran',
  'Lainnya',
] as const;

export const taskSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal wajib diisi'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().default(''),
  title: z.string().trim().min(3, 'Uraian tugas minimal 3 karakter').max(200),
  category: z.string().trim().max(60).default(''),
  location: z.string().trim().max(120).default(''),
  result: z.string().trim().max(1_000).default(''),
}).refine(d => !d.endDate || d.date <= d.endDate, 'Tanggal akhir harus setelah atau sama dengan tanggal awal');

export type TaskForm = z.infer<typeof taskSchema>;
export type DailyTask = TaskForm & { id: number; userId: number; createdAt: string };
