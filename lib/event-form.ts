import { z } from 'zod';

const text = z.string().catch('');
const required = (message: string) => z.string({ required_error: message }).trim().min(1, message);
export const personSchema = z.object({ name: text, company: text, position: text, contact: text, social: text, chatSummary: text, potential: text, followUp: z.boolean().catch(false) });
export const prospectSchema = z.object({ companyName: text, industry: text, personMet: text, potentialSummary: text, notes: text });
export const hasPersonData = (person: z.infer<typeof personSchema>) => person.followUp || [person.name, person.company, person.position, person.contact, person.social, person.chatSummary, person.potential].some(value => value.trim());
export const hasProspectData = (prospect: z.infer<typeof prospectSchema>) => [prospect.companyName, prospect.industry, prospect.personMet, prospect.potentialSummary, prospect.notes].some(value => value.trim());

export const eventFormSchema = z.object({ name: required('Nama event wajib diisi'), date: required('Tanggal wajib diisi'), location: required('Lokasi wajib diisi'), organizer: text, type: text, networking: z.array(personSchema).catch([]), prospects: z.array(prospectSchema).catch([]), nextActions: z.array(z.string()).catch([]), generalNotes: text }).superRefine((data, context) => {
  data.networking.forEach((person, index) => { if (hasPersonData(person) && !person.name.trim()) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Nama kontak wajib diisi', path: ['networking', index, 'name'] }); });
  data.prospects.forEach((prospect, index) => { if (hasProspectData(prospect) && !prospect.companyName.trim()) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Nama perusahaan wajib diisi', path: ['prospects', index, 'companyName'] }); });
});
export type EventFormValues = z.infer<typeof eventFormSchema>;
export function cleanEventForm(data: EventFormValues): EventFormValues { return { ...data, name: data.name.trim(), date: data.date.trim(), location: data.location.trim(), organizer: data.organizer.trim(), type: data.type.trim(), networking: data.networking.filter(hasPersonData), prospects: data.prospects.filter(hasProspectData), generalNotes: data.generalNotes.trim() }; }
