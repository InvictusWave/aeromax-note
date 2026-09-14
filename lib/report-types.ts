import type { EventNote } from './event-types.ts';
import type { DailyTask } from './task-types.ts';

export type ReportNarrative = {
  judul: string;
  ringkasan: string[];
  aktivitas: string[];
  tugasHarian: string[];
  analisisPotensi: string[];
  rekomendasi: string[];
  penutup: string;
};

export type MonthlyReport = {
  generatedAt?: string;
  editedHtml?: string;
  startDate: string;
  endDate: string;
  dateRangeLabel: string;
  author: string;
  narrative: ReportNarrative;
  events: EventNote[];
  tasks: DailyTask[];
};

export type SavedReportSummary = { id: number; title: string; startDate: string; endDate: string; updatedAt: string };
export type SavedReport = SavedReportSummary & { content: MonthlyReport };
