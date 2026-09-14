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
  month: string;
  monthLabel: string;
  author: string;
  narrative: ReportNarrative;
  events: EventNote[];
  tasks: DailyTask[];
};
