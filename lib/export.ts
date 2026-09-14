import type { EventNote } from './event-types.ts';
import { actionLabel, potentialLabel } from './labels.ts';

type Cell = {
  value: string | number;
  type: StringConstructor | NumberConstructor;
  fontWeight?: 'bold';
};

const text = (value: string | null | undefined): Cell => ({
  value: value || '',
  type: String,
});
const num = (value: number): Cell => ({ value, type: Number });
const header = (titles: string[]) =>
  titles.map((value): Cell => ({ value, type: String, fontWeight: 'bold' }));
const widths = (sizes: number[]) => sizes.map(width => ({ width }));

function followUpLabel(event: EventNote) {
  if (event.followUpDone) return 'Selesai';
  return event.networking.some(contact => contact.followUp) ? 'Belum Selesai' : 'Tidak Perlu';
}

export function buildSheets(events: EventNote[]) {
  const eventRows: Cell[][] = [
    header([
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
    ]),
  ];

  const contactRows: Cell[][] = [
    header([
      'ID Event',
      'Nama Event',
      'Tanggal',
      'Lokasi',
      'Nama Kontak',
      'Perusahaan',
      'Jabatan',
      'Telp/WA',
      'Media Sosial',
      'Potensi',
      'Perlu Follow-Up',
      'Ringkasan Obrolan',
    ]),
  ];

  const prospectRows: Cell[][] = [
    header([
      'ID Event',
      'Nama Event',
      'Tanggal',
      'Lokasi',
      'Nama Perusahaan',
      'Industri',
      'PIC Ditemui',
      'Ringkasan Potensi',
      'Catatan',
    ]),
  ];

  for (const event of events) {
    const origin = [num(event.id), text(event.name), text(event.date), text(event.location)];

    const contactsSummary = event.networking
      .map(
        c =>
          `${c.name} (${c.company || '-'}${c.position ? ` - ${c.position}` : ''}${
            c.potential ? ` [Potensi ${potentialLabel(c.potential)}]` : ''
          }${c.contact ? ` Telp/WA: ${c.contact}` : ''})`,
      )
      .join('; ');

    const prospectsSummary = event.prospects
      .map(
        p =>
          `${p.companyName} (${p.industry || '-'}${p.personMet ? ` PIC: ${p.personMet}` : ''}${
            p.potentialSummary ? ` Catatan: ${p.potentialSummary}` : ''
          })`,
      )
      .join('; ');

    eventRows.push([
      ...origin,
      text(event.organizer),
      text(event.type),
      text(followUpLabel(event)),
      text(event.nextActions.map(actionLabel).join(', ')),
      text(event.generalNotes),
      num(event.networking.length),
      text(contactsSummary),
      num(event.prospects.length),
      text(prospectsSummary),
      text(event.createdAt),
    ]);

    for (const contact of event.networking) {
      contactRows.push([
        ...origin,
        text(contact.name),
        text(contact.company),
        text(contact.position),
        text(contact.contact),
        text(contact.social),
        text(contact.potential ? potentialLabel(contact.potential) : ''),
        text(contact.followUp ? 'Ya' : 'Tidak'),
        text(contact.chatSummary),
      ]);
    }

    for (const prospect of event.prospects) {
      prospectRows.push([
        ...origin,
        text(prospect.companyName),
        text(prospect.industry),
        text(prospect.personMet),
        text(prospect.potentialSummary),
        text(prospect.notes),
      ]);
    }
  }

  return [
    {
      data: eventRows,
      sheet: 'Catatan Event',
      columns: widths([10, 28, 14, 22, 22, 16, 16, 26, 40, 12, 50, 12, 50, 22]),
      stickyRowsCount: 1,
    },
    {
      data: contactRows,
      sheet: 'Kontak',
      columns: widths([10, 28, 14, 22, 24, 26, 20, 20, 22, 12, 14, 40]),
      stickyRowsCount: 1,
    },
    {
      data: prospectRows,
      sheet: 'Prospek',
      columns: widths([10, 28, 14, 22, 28, 20, 22, 40, 40]),
      stickyRowsCount: 1,
    },
  ];
}

export async function exportEventsToExcel(events: EventNote[]) {
  if (!events.length) return;
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  await writeXlsxFile(buildSheets(events)).toFile(
    `aeromax-catatan-event-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}
