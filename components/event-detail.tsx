import { useState } from 'react';
import Link from 'next/link';
import {
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Contact2,
  Download,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Users,
  X,
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { FollowUpBadge } from '@/components/follow-up-badge';
import { followUpState, type EventNote, type NetworkingContact } from '@/lib/event-types';
import { actionLabel, potentialLabel } from '@/lib/labels';
import { TimedUndoAction } from '@/components/timed-undo-action';
import { cleanPhoneNumber, downloadVCard } from '@/lib/contact-actions';
import { WhatsAppTemplateModal } from '@/components/whatsapp-template-modal';

type EventDetailProps = {
  event: EventNote;
  close: () => void;
  updateFollowUp: (id: number, done: boolean) => Promise<void>;
  deleteEvent?: (id: number) => Promise<void>;
};

export function EventDetail({ event, close, updateFollowUp, deleteEvent }: EventDetailProps) {
  const status = followUpState(event);
  const [activeWaContact, setActiveWaContact] = useState<NetworkingContact | null>(null);

  async function handleDelete() {
    if (!deleteEvent) return;
    await deleteEvent(event.id);
    close();
  }

  function handleSaveVCard(person: NetworkingContact) {
    downloadVCard({
      name: person.name,
      company: person.company,
      position: person.position,
      contact: person.contact,
      social: person.social,
      chatSummary: person.chatSummary,
      eventName: event.name,
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-ink/35 backdrop-blur-xs sm:flex sm:items-center sm:justify-center sm:p-6"
        onMouseDown={eventPointer => {
          if (eventPointer.target === eventPointer.currentTarget) close();
        }}
      >
        <div className="absolute inset-x-0 bottom-0 max-h-[92svh] overflow-y-auto overscroll-contain rounded-t-3xl bg-mist p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:relative sm:max-w-2xl sm:rounded-3xl sm:p-6 shadow-2xl">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <div className="mb-2"><FollowUpBadge state={status} /></div>
              <h2 className="text-2xl font-bold">{event.name}</h2>
            </div>
            <button onClick={close} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white shadow-xs" aria-label="Tutup">
              <X size={19} />
            </button>
          </div>

          <Card className="mb-4 grid gap-3 p-4 text-sm sm:grid-cols-2">
            <p><CalendarDays className="mr-2 inline text-leaf" size={16} />{event.date}</p>
            <p><MapPin className="mr-2 inline text-leaf" size={16} />{event.location}</p>
            <p>Penyelenggara: {event.organizer || '—'}</p>
            <p>Tipe: {event.type || '—'}</p>
          </Card>

          <div className="mb-4 space-y-2">
            <div className={`grid gap-2 ${status === 'none' ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <Link href={`/form?edit=${event.id}`} onClick={close} className="w-full">
                <Button type="button" className="w-full border border-line bg-white text-ink">
                  <Pencil size={16} /> Ubah Catatan
                </Button>
              </Link>
              {status !== 'none' && (
                <Button
                  type="button"
                  onClick={() => updateFollowUp(event.id, !event.followUpDone)}
                  className={event.followUpDone ? 'border border-line bg-white text-ink' : 'bg-ink text-white'}
                >
                  <Check size={16} />{event.followUpDone ? 'Belum selesai' : 'Sudah selesai'}
                </Button>
              )}
            </div>

            {deleteEvent && (
              <TimedUndoAction
                initialSeconds={10}
                deleteLabel="Hapus Catatan"
                undoLabel="Batalkan Penghapusan"
                confirmLabel="Hapus Sekarang"
                warningText="Catatan dan semua kontak/prospek di dalamnya akan dihapus permanen."
                onExecute={handleDelete}
                className="w-full"
              />
            )}
          </div>


          <section className="mb-4">
            <h3 className="mb-2 flex items-center gap-2 font-bold"><Users size={17} /> Kontak ({event.networking.length})</h3>
            {event.networking.length ? (
              <div className="space-y-2.5">
                {event.networking.map(person => {
                  const phone = cleanPhoneNumber(person.contact);
                  return (
                    <Card key={person.id} className="p-4 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold">{person.name} <span className="font-normal text-slate-500">· {person.company}</span></p>
                          <p className="mt-0.5 text-xs text-slate-600">{person.position} {person.contact ? `· ${person.contact}` : ''}</p>
                        </div>
                        {person.potential && <span className="rounded-full bg-lime/60 px-2 py-0.5 text-[10px] font-semibold">{potentialLabel(person.potential)}</span>}
                      </div>

                      {person.chatSummary && <p className="mt-2 text-xs leading-5 text-slate-700 bg-mist/60 p-2.5 rounded-xl">{person.chatSummary}</p>}

                      {/* Contact Actions Bar */}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-line/70">
                        {phone && (
                          <button
                            type="button"
                            onClick={() => setActiveWaContact(person)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition active:scale-95"
                          >
                            <MessageCircle size={14} /> WhatsApp
                          </button>
                        )}
                        {phone && (
                          <a
                            href={`tel:${phone}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition active:scale-95"
                          >
                            <Phone size={13} /> Telepon
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSaveVCard(person)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-mist px-2.5 py-1.5 text-xs font-semibold text-leaf hover:bg-emerald-100/50 transition active:scale-95 ml-auto"
                          title="Simpan kontak ke buku telepon"
                        >
                          <Download size={13} /> Simpan Kontak (.vcf)
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : <p className="text-sm text-slate-500">Tidak ada kontak.</p>}
          </section>


        <section className="mb-4">
          <h3 className="mb-2 flex items-center gap-2 font-bold"><BriefcaseBusiness size={17} /> Prospek ({event.prospects.length})</h3>
          {event.prospects.length ? (
            <div className="space-y-2">
              {event.prospects.map(prospect => (
                <Card key={prospect.id} className="p-4 text-sm">
                  <p className="font-bold">{prospect.companyName} <span className="font-normal text-slate-500">· {prospect.industry}</span></p>
                  <p className="mt-1">PIC: {prospect.personMet || '—'}</p>
                  <p className="mt-2 leading-5">{prospect.potentialSummary || prospect.notes}</p>
                </Card>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500">Tidak ada prospek.</p>}
        </section>

          <Card className="p-4 text-sm">
            <p className="font-bold">Tindak lanjut</p>
            <p className="mt-2 text-slate-600">{event.nextActions.map(actionLabel).join(' · ') || 'Tidak ada tindak lanjut.'}</p>
            {event.generalNotes && (
              <>
                <p className="mt-4 font-bold">Catatan umum</p>
                <p className="mt-2 whitespace-pre-wrap text-slate-600">{event.generalNotes}</p>
              </>
            )}
          </Card>
        </div>
      </div>

      {activeWaContact && (
        <WhatsAppTemplateModal
          isOpen={Boolean(activeWaContact)}
          onClose={() => setActiveWaContact(null)}
          contactName={activeWaContact.name}
          contactPhone={activeWaContact.contact}
          companyName={activeWaContact.company}
          eventName={event.name}
        />
      )}
    </>
  );
}

