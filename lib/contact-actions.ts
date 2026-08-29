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

export type WhatsAppTemplateKey = 'intro' | 'live_recording' | 'sound_lighting' | 'meeting';

export interface WhatsAppTemplate {
  key: WhatsAppTemplateKey;
  label: string;
  badge: string;
  description: string;
  getText: (name: string, eventName: string) => string;
}

export const WA_TEMPLATES: WhatsAppTemplate[] = [
  {
    key: 'intro',
    label: 'Salam Perkenalan',
    badge: 'Umum',
    description: 'Sapaan hangat pasca pertemuan di event',
    getText: (name: string, eventName: string) =>
      `Halo Pak/Bu ${name || ''}, salam kenal. Senang bisa berdiskusi di event ${eventName || 'kemarin'}.\n\nSaya dari tim Aeromax Studio (Production & Audio), ingin menyambung silaturahmi dan menindaklanjuti obrolan kita terkait potensi kolaborasi. Apakah ada waktu yang tepat untuk kita mengobrol santai? Terima kasih.`,
  },
  {
    key: 'live_recording',
    label: 'Live Recording & YouTube',
    badge: 'Broadcast',
    description: 'Penawaran rekaman studio multicam & live streaming',
    getText: (name: string, eventName: string) =>
      `Halo Pak/Bu ${name || ''}, menindaklanjuti obrolan kita di ${eventName || 'kemarin'}, kami dari Aeromax Studio siap memfasilitasi live recording & streaming multicam YouTube profesional (bisa in-house di Markas Aeromax Karanganyar atau outdoor).\n\nKira-kira kapan rencana jadwal produksi/take video musik Bapak/Ibu? Kami siap siapkan technical rider dan jadwal studionya.`,
  },
  {
    key: 'sound_lighting',
    label: 'Sound System & Lighting/LED',
    badge: 'Panggung',
    description: 'Penawaran paket audio FOH RCF, mixer Yamaha & visual LED',
    getText: (name: string, eventName: string) =>
      `Halo Pak/Bu ${name || ''}, berikut kami sampaikan informasi layanan tata suara & visual dari Aeromax Production (Sound System Line Array RCF/dBTechnologies, Mixer Yamaha, Lighting Panggung, dan Layar LED Videotron).\n\nJika ada rencana agenda acara panggung atau konser selanjutnya, silakan kabari agar kami buatkan estimasi spesifikasi teknis terbaik. Terima kasih!`,
  },
  {
    key: 'meeting',
    label: 'Jadwalkan Diskusi',
    badge: 'Agenda',
    description: 'Ajakan meeting teknis / mampir ke Markas Aeromax',
    getText: (name: string, eventName: string) =>
      `Halo Pak/Bu ${name || ''}, terima kasih banyak atas waktu dan diskusinya di event ${eventName || 'kemarin'}.\n\nApakah ada waktu luang minggu ini untuk diskusi santai via WhatsApp call atau mampir ke Markas Aeromax di Karanganyar? Kami siap menyesuaikan waktu Bapak/Ibu. Terima kasih.`,
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
