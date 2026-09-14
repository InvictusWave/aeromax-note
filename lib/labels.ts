const actionLabels: Record<string, string> = { 'Follow up': 'Follow-up', 'Send CP': 'Kirim profil perusahaan', 'Send Catalog': 'Kirim katalog', 'Contact PIC': 'Hubungi PIC', 'Schedule Meeting': 'Jadwalkan pertemuan' };
const potentialLabels: Record<string, string> = { High: 'Tinggi', Medium: 'Sedang', Low: 'Rendah' };
export const actionLabel = (value: string) => actionLabels[value] ?? value;
export const potentialLabel = (value: string) => potentialLabels[value] ?? value;
