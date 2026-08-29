export type NetworkingContact = { id: number; eventId: number; name: string; company: string; position: string; contact: string; social: string; chatSummary: string; potential: string; followUp: boolean };
export type Prospect = { id: number; eventId: number; companyName: string; industry: string; personMet: string; potentialSummary: string; notes: string };
export type EventNote = { id: number; name: string; date: string; location: string; organizer: string; type: string; nextActions: string[]; generalNotes: string; followUpDone: boolean; createdAt: string; networking: NetworkingContact[]; prospects: Prospect[] };

export type FollowUpState = 'pending' | 'done' | 'none';
export function followUpState(event: EventNote): FollowUpState { if (event.followUpDone) return 'done'; return event.networking.some(contact => contact.followUp) || event.nextActions.includes('Follow up') ? 'pending' : 'none'; }
