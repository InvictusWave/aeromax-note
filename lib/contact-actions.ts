/**
 * Utilitas aksi kontak Aeromax: WhatsApp template generator & export vCard (.vcf)
 */

export function cleanPhoneNumber(raw: string): string | null {
  if (!raw) return null;
  // Ambil hanya digit dan tanda tambah
  const cleaned = raw.replace(/[^\d+]/g, '');
  if (!cleaned) return null;

  let digits = cleaned.replace(/^\+/, '');

  if (digits.startsWith('08')) {
    digits = '628' + digits.slice(2);
  } else if (digits.startsWith('8')) {
    digits = '628' + digits.slice(1);
  } else if (digits.startsWith('6208')) {
    digits = '628' + digits.slice(4);
  }

  // Validasi panjang nomor HP (minimal 9 digit, maksimal 15 digit)
  if (/^62\d{7,13}$/.test(digits) || /^\d{9,15}$/.test(digits)) {
    return digits;
  }

  return null;
}

export function extractEmail(raw: string): string | null {
  if (!raw) return null;
  const match = raw.match(/[\w.-]+@[\w.-]+\.\w+/);
  return match ? match[0] : null;
}

export type WhatsAppTemplateKey = 'intro' | 'catalog' | 'meeting';

export interface WhatsAppTemplate {
  key: WhatsAppTemplateKey;
  label: string;
  description: string;
  getText: (name: string, eventName: string) => string;
}

export const WA_TEMPLATES: WhatsAppTemplate[] = [
  {
    key: 'intro',
    label: 'Salam & Perkenalan',
    description: 'Sapaan hangat pasca pertemuan di event',
    getText: (name: string, eventName: string) =>
      `Halo Pak/Bu ${name || ''}, salam kenal. Senang bisa berdiskusi di event ${eventName || 'kemarin'}.\n\nSaya dari tim Aeromax, ingin menyambung silaturahmi dan menindaklanjuti obrolan kita terkait peluang kolaborasi. Apakah ada waktu yang tepat untuk kita mengobrol santai? Terima kasih.`,
  },
  {
    key: 'catalog',
    label: 'Kirim Katalog & Solusi',
    description: 'Menyampaikan materi atau penawaran produk',
    getText: (name: string, eventName: string) =>
      `Halo Pak/Bu ${name || ''}, menindaklanjuti obrolan kita di event ${eventName || 'kemarin'}, berikut saya kirimkan info katalog dan solusi dari Aeromax.\n\nJika ada kebutuhan atau diskusi teknis lebih lanjut, silakan kabari saya ya Pak/Bu. Senang bisa terhubung!`,
  },
  {
    key: 'meeting',
    label: 'Jadwalkan Diskusi Lanjutan',
    description: 'Ajakan meeting lanjutan via online / tatap muka',
    getText: (name: string, eventName: string) =>
      `Halo Pak/Bu ${name || ''}, terima kasih banyak atas waktu dan diskusinya di event ${eventName || 'kemarin'}.\n\nApakah ada waktu luang di minggu ini untuk kita jadwalkan diskusi singkat via Zoom / Google Meet atau tatap muka? Kami siap menyesuaikan jadwal Bapak/Ibu. Terima kasih.`,
  },
];

export function getWhatsAppUrl(
  phone: string,
  name: string,
  eventName: string,
  templateKey: WhatsAppTemplateKey = 'intro'
): string | null {
  const cleanPhone = cleanPhoneNumber(phone);
  if (!cleanPhone) return null;

  const template = WA_TEMPLATES.find((t) => t.key === templateKey) || WA_TEMPLATES[0];
  const message = template.getText(name, eventName);

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export interface VCardContactData {
  name: string;
  company?: string;
  position?: string;
  contact?: string;
  social?: string;
  chatSummary?: string;
  eventName?: string;
}

export function downloadVCard(data: VCardContactData) {
  const name = (data.name || 'Kontak').trim();
  const phone = cleanPhoneNumber(data.contact || '') || '';
  const email = extractEmail(data.contact || '') || '';
  const company = (data.company || '').trim();
  const position = (data.position || '').trim();
  const eventName = (data.eventName || 'Aeromax Notes').trim();
  const notes = (data.chatSummary || '').trim();

  // Escape karakter khusus vCard
  const escapeVCard = (str: string) =>
    str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

  const vcardLines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVCard(name)}`,
    `N:${escapeVCard(name)};;;;`,
  ];

  if (company) {
    vcardLines.push(`ORG:${escapeVCard(company)}`);
  }

  if (position) {
    vcardLines.push(`TITLE:${escapeVCard(position)}`);
  }

  if (phone) {
    vcardLines.push(`TEL;TYPE=CELL,VOICE:${phone.startsWith('+') ? phone : '+' + phone}`);
  }

  if (email) {
    vcardLines.push(`EMAIL;TYPE=WORK,INTERNET:${escapeVCard(email)}`);
  }

  const noteParts = [`Kontak dari event ${eventName}`];
  if (data.social) noteParts.push(`Social: ${data.social}`);
  if (notes) noteParts.push(`Catatan: ${notes}`);

  vcardLines.push(`NOTE:${escapeVCard(noteParts.join(' | '))}`);
  vcardLines.push('END:VCARD');

  const vcardString = vcardLines.join('\r\n');
  const blob = new Blob([vcardString], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const safeFilename = name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'kontak';
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFilename}.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
