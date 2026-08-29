import type { EventNote } from '@/lib/event-types';
import { actionLabel, potentialLabel } from '@/lib/labels';

function escapeCsv(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportEventsToCsv(events: EventNote[]) {
  if (!events.length) return;

  const rows: string[][] = [
    [
      'ID Event',
      'Nama Event',
      'Tanggal',
      'Lokasi',
      'Penyelenggara',
      'Tipe Event',
      'Status Follow-Up',
      'Tindak Lanjut',
      'Catatan Umum',
      'Jumlah Kontak',
      'Daftar Kontak & Perusahaan',
      'Jumlah Prospek',
      'Daftar Prospek & Industri',
      'Dibuat Pada',
    ],
  ];

  for (const event of events) {
    const contactsSummary = event.networking
      .map(
        (c) =>
          `${c.name} (${c.company || '-'}${c.position ? ` - ${c.position}` : ''}${
            c.potential ? ` [Potensi ${potentialLabel(c.potential)}]` : ''
          }${c.contact ? ` Telp/WA: ${c.contact}` : ''})`
      )
      .join('; ');

    const prospectsSummary = event.prospects
      .map(
        (p) =>
          `${p.companyName} (${p.industry || '-'}${p.personMet ? ` PIC: ${p.personMet}` : ''}${
            p.potentialSummary ? ` Catatan: ${p.potentialSummary}` : ''
          })`
      )
      .join('; ');

    const actions = event.nextActions.map(actionLabel).join(', ');

    rows.push([
      String(event.id),
      event.name,
      event.date,
      event.location,
      event.organizer || '',
      event.type || '',
      event.followUpDone ? 'Selesai' : event.networking.some((c) => c.followUp) ? 'Belum Selesai' : 'Tidak Perlu',
      actions,
      event.generalNotes || '',
      String(event.networking.length),
      contactsSummary,
      String(event.prospects.length),
      prospectsSummary,
      event.createdAt,
    ]);
  }

  const csvContent = '\uFEFF' + rows.map((r) => r.map(escapeCsv).join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `aeromax-catatan-event-${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
