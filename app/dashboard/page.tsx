'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Contact2,
  Download,
  Flame,
  Layers,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Brand } from '@/components/brand';
import { Button, Card } from '@/components/ui';
import { Protected } from '@/components/protected';
import { FollowUpBadge } from '@/components/follow-up-badge';
import { followUpState, type EventNote } from '@/lib/event-types';
import { useEvents } from '@/hooks/use-events';
import { exportEventsToCsv } from '@/lib/export';
import { actionLabel, potentialLabel } from '@/lib/labels';
import { cleanPhoneNumber, downloadVCard } from '@/lib/contact-actions';
import { WhatsAppTemplateModal } from '@/components/whatsapp-template-modal';


function formatContactHref(contactStr: string) {
  if (!contactStr) return null;
  const clean = contactStr.trim();
  if (clean.includes('@')) return `mailto:${clean}`;
  const digits = clean.replace(/\D/g, '');
  if (digits.length >= 8) {
    const formatted = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
    return `https://wa.me/${formatted}`;
  }
  return `tel:${clean}`;
}

function Metric({
  label,
  value,
  note,
  icon: Icon,
  tone = 'light',
}: {
  label: string;
  value: string | number;
  note: string;
  icon: typeof Users;
  tone?: 'dark' | 'light' | 'lime' | 'emerald';
}) {
  const toneClasses = {
    dark: 'border-ink bg-ink text-white shadow-md',
    lime: 'border-lime/80 bg-lime/40 text-ink shadow-xs',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950 shadow-xs',
    light: 'border-line bg-white text-ink shadow-xs',
  };

  return (
    <Card className={`rounded-2xl p-4 transition-all hover:border-slate-300 sm:p-5 ${toneClasses[tone]}`}>
      <div className="flex items-start justify-between">
        <p className={`text-xs font-bold uppercase tracking-wider ${tone === 'dark' ? 'text-white/70' : 'text-slate-500'}`}>
          {label}
        </p>
        <span
          className={`grid h-8 w-8 place-items-center rounded-xl ${
            tone === 'dark' ? 'bg-white/10 text-lime' : 'bg-mist text-leaf'
          }`}
        >
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-4 text-3xl font-extrabold tracking-tight">{value}</p>
      <p className={`mt-1.5 text-xs font-medium ${tone === 'dark' ? 'text-white/60' : 'text-slate-500'}`}>
        {note}
      </p>
    </Card>
  );
}

export default function DashboardPage() {
  const { events, loading, error, reload, updateFollowUp } = useEvents();
  const [activeWaLead, setActiveWaLead] = useState<{
    contactId: number;
    eventId: number;
    eventName: string;
    name: string;
    contact: string;
    company: string;
  } | null>(null);

  const contacts = useMemo(
    () => events.reduce((total, event) => total + event.networking.length, 0),
    [events]
  );
  const prospects = useMemo(
    () => events.reduce((total, event) => total + event.prospects.length, 0),
    [events]
  );

  const actionable = useMemo(
    () => events.filter(event => followUpState(event) !== 'none'),
    [events]
  );
  const completed = useMemo(
    () => actionable.filter(event => followUpState(event) === 'done').length,
    [actionable]
  );
  const completion = actionable.length ? Math.round((completed / actionable.length) * 100) : 0;

  // Potential composition
  const potential = useMemo(() => {
    return events
      .flatMap(event => event.networking)
      .reduce(
        (result, contact) => {
          const key = contact.potential?.toLowerCase();
          if (key === 'high' || key === 'medium' || key === 'low') {
            result[key] += 1;
          }
          return result;
        },
        { high: 0, medium: 0, low: 0 }
      );
  }, [events]);

  const realPotentialTotal = potential.high + potential.medium + potential.low;
  const potentialTotal = realPotentialTotal || 1;
  const highAngle = (potential.high / potentialTotal) * 360;
  const mediumAngle = (potential.medium / potentialTotal) * 360;

  // Hot leads: High potential contacts or contacts needing follow-up
  const hotLeads = useMemo(() => {
    const list: Array<{
      contactId: number;
      eventId: number;
      eventName: string;
      eventDate: string;
      name: string;
      company: string;
      position: string;
      contact: string;
      potential: string;
      followUp: boolean;
      eventFollowUpDone: boolean;
    }> = [];

    for (const event of events) {
      for (const person of event.networking) {
        if (person.potential?.toLowerCase() === 'high' || person.followUp) {
          list.push({
            contactId: person.id,
            eventId: event.id,
            eventName: event.name,
            eventDate: event.date,
            name: person.name,
            company: person.company,
            position: person.position,
            contact: person.contact,
            potential: person.potential,
            followUp: person.followUp,
            eventFollowUpDone: event.followUpDone,
          });
        }
      }
    }
    return list.slice(0, 5);
  }, [events]);

  // Industry Breakdown
  const topIndustries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of events) {
      for (const prospect of event.prospects) {
        const ind = prospect.industry?.trim() || 'Lainnya';
        counts.set(ind, (counts.get(ind) ?? 0) + 1);
      }
    }
    const total = Array.from(counts.values()).reduce((a, b) => a + b, 0) || 1;
    return Array.from(counts.entries())
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [events]);

  // Next Actions Distribution
  const nextActionsStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of events) {
      for (const action of event.nextActions) {
        if (action) {
          counts.set(action, (counts.get(action) ?? 0) + 1);
        }
      }
    }
    return Array.from(counts.entries())
      .map(([action, count]) => ({
        key: action,
        label: actionLabel(action),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [events]);

  // Monthly Activity
  const monthData = useMemo(() => {
    return Array.from(
      events.reduce((map, event) => {
        const date = new Date(`${event.date}T00:00:00`);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const item = map.get(key) ?? {
          label: date.toLocaleDateString('id-ID', { month: 'short' }),
          value: 0,
          order: date.getTime(),
        };
        item.value += 1;
        map.set(key, item);
        return map;
      }, new Map<string, { label: string; value: number; order: number }>()).values()
    )
      .sort((a, b) => a.order - b.order)
      .slice(-6);
  }, [events]);

  const maxMonth = Math.max(...monthData.map(item => item.value), 1);

  return (
    <Protected>
      <Brand />
      <main className="mx-auto max-w-6xl px-4 pb-32 sm:px-6 sm:pb-12 animate-page-enter">
        {/* Header & Quick Actions */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.2em] text-leaf">Ringkasan Eksekutif</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Dasbor</h1>
            <p className="mt-1 text-sm text-slate-500">Analisis performa pemasaran event dan tindak lanjut Aeromax.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              disabled={!events.length}
              onClick={() => exportEventsToCsv(events)}
              className="border border-line bg-white px-3.5 text-ink shadow-xs hover:bg-slate-50 active:scale-95"
            >
              <Download size={16} /> <span className="hidden min-[400px]:inline">Unduh Rekap</span> CSV
            </Button>
            <Link href="/form">
              <Button className="bg-ink text-white shadow-xs hover:bg-slate-900 active:scale-95">
                <Plus size={17} /> Tambah Catatan
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <Card className="mb-4 flex items-center justify-between gap-3 border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-none">
            <span>{error}</span>
            <Button onClick={reload} className="border border-red-200 bg-white text-red-700">
              <RefreshCw size={15} /> Coba lagi
            </Button>
          </Card>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map(item => (
              <div key={item} className="h-36 rounded-2xl skeleton-shimmer" />
            ))}
          </div>
        ) : (
          <>
            {/* KPI Metric Cards */}
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric
                label="Total Event"
                value={events.length}
                note="Event telah terdokumentasi"
                icon={CalendarDays}
                tone="dark"
              />
              <Metric
                label="Total Kontak"
                value={contacts}
                note="Relasi bisnis terjalin"
                icon={Users}
              />
              <Metric
                label="Prospek Terbuka"
                value={prospects}
                note="Peluang bisnis potensial"
                icon={BriefcaseBusiness}
                tone="lime"
              />
              <Metric
                label="Follow-Up Selesai"
                value={`${completion}%`}
                note={`${completed} dari ${actionable.length} event selesai`}
                icon={CheckCircle2}
                tone={completion >= 80 ? 'emerald' : 'light'}
              />
            </section>

            {/* Hot Leads & Urgent Follow-up Section */}
            <section className="mt-5">
              <Card className="p-4 shadow-none sm:p-6">
                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-red-50 text-red-600">
                      <Flame size={18} />
                    </span>
                    <div>
                      <h2 className="font-bold text-ink">Kontak Prioritas & Hot Leads</h2>
                      <p className="text-xs text-slate-500">Kontak potensi tinggi dan perlu tindak lanjut cepat.</p>
                    </div>
                  </div>
                  <span className="self-start rounded-full bg-mist px-3 py-1 text-[11px] font-semibold text-slate-600 sm:self-auto">
                    {hotLeads.length} Kontak Utama
                  </span>
                </div>

                {hotLeads.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-slate-400">
                    Belum ada kontak dengan potensi tinggi atau status follow-up pending.
                  </div>
                ) : (
                  <div className="divide-y divide-line/80 overflow-hidden">
                    {hotLeads.map(lead => {
                      const href = formatContactHref(lead.contact);
                      return (
                        <div
                          key={`${lead.eventId}-${lead.contactId}`}
                          className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mist text-sm font-bold text-leaf">
                              {lead.name.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-bold text-sm text-ink">{lead.name}</p>
                                {lead.potential && (
                                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                    {potentialLabel(lead.potential)}
                                  </span>
                                )}
                                {lead.followUp && !lead.eventFollowUpDone && (
                                  <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                    Perlu Follow-up
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 truncate text-xs text-slate-500">
                                {lead.position || 'PIC'} · {lead.company || 'Perusahaan'}
                              </p>
                              <p className="mt-1 truncate text-[11px] text-slate-400">
                                Dari event: <strong className="text-slate-600">{lead.eventName}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end sm:self-center">
                            {cleanPhoneNumber(lead.contact) ? (
                              <button
                                type="button"
                                onClick={() => setActiveWaLead(lead)}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-line bg-emerald-50/60 px-2.5 text-xs font-semibold text-emerald-800 shadow-xs transition hover:bg-emerald-100/80 active:scale-95"
                              >
                                <MessageCircle size={14} className="text-emerald-600" />
                                <span>WhatsApp</span>
                              </button>
                            ) : href ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-2.5 text-xs font-semibold text-ink shadow-xs transition hover:bg-slate-50 active:scale-95"
                              >
                                <Phone size={14} className="text-leaf" />
                                <span>Hubungi</span>
                              </a>
                            ) : null}

                            <button
                              type="button"
                              onClick={() =>
                                downloadVCard({
                                  name: lead.name,
                                  company: lead.company,
                                  position: lead.position,
                                  contact: lead.contact,
                                  eventName: lead.eventName,
                                })
                              }
                              title="Simpan kontak ke HP (.vcf)"
                              className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-white text-slate-500 shadow-xs transition hover:bg-slate-50 hover:text-ink active:scale-95"
                            >
                              <Download size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => updateFollowUp(lead.eventId, !lead.eventFollowUpDone)}
                              title="Tandai follow-up event selesai"
                              className={`grid h-9 w-9 place-items-center rounded-xl border transition ${
                                lead.eventFollowUpDone
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                  : 'border-line bg-white text-slate-400 hover:text-ink'
                              }`}
                            >
                              <Check size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </section>

            {/* Charts & Analytics Grid */}
            <section className="mt-5 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              {/* Monthly Activity Bar Chart */}
              <Card className="p-4 shadow-none sm:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-bold text-ink">
                      <TrendingUp size={17} className="text-leaf" />
                      <span>Aktivitas Event Bulanan</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Distribusi event yang diikuti dalam 6 bulan terakhir</p>
                  </div>
                  <span className="rounded-full bg-mist px-2.5 py-1 text-[10px] font-bold text-leaf">
                    6 BULAN
                  </span>
                </div>
                <div className="mt-8 flex h-44 items-end gap-3 sm:gap-5">
                  {monthData.length ? (
                    monthData.map((item, index) => (
                      <div key={`${item.label}-${index}`} className="flex h-full flex-1 flex-col justify-end">
                        <div className="mb-2 text-center text-xs font-bold">{item.value}</div>
                        <div
                          className="w-full rounded-t-xl bg-ink transition-all hover:bg-emerald-800"
                          style={{ height: `${Math.max(14, (item.value / maxMonth) * 100)}%` }}
                        />
                        <p className="mt-2 text-center text-[10px] font-semibold uppercase text-slate-400">
                          {item.label}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="grid h-full w-full place-items-center text-sm text-slate-400">
                      Belum ada data event.
                    </div>
                  )}
                </div>
              </Card>

              {/* Potential Contacts Donut */}
              <Card className="p-4 shadow-none sm:p-6">
                <div className="flex items-center gap-2 font-bold text-ink">
                  <Sparkles size={17} className="text-leaf" />
                  <span>Komposisi Peluang Kontak</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Tingkat prospek dari total kontak yang dihimpun</p>
                <div className="mt-6 flex items-center gap-6">
                  <div
                    className="relative h-32 w-32 shrink-0 rounded-full shadow-inner"
                    style={{
                      background: `conic-gradient(#17211b 0deg ${highAngle}deg, #34d399 ${highAngle}deg ${
                        highAngle + mediumAngle
                      }deg, #dff2b2 ${highAngle + mediumAngle}deg 360deg)`,
                    }}
                  >
                    <div className="absolute inset-4 grid place-items-center rounded-full bg-white text-center shadow-xs">
                      <div>
                        <p className="text-2xl font-bold">{realPotentialTotal}</p>
                        <p className="text-[9px] uppercase tracking-wider text-slate-400">kontak</p>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    {[
                      ['Tinggi', potential.high, 'bg-ink'],
                      ['Sedang', potential.medium, 'bg-emerald-400'],
                      ['Rendah', potential.low, 'bg-lime'],
                    ].map(([label, value, color]) => (
                      <div key={String(label)} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2">
                          <i className={`h-2.5 w-2.5 rounded-full ${color}`} />
                          {label}
                        </span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </section>

            {/* Pipeline Industries & Action Tracker Grid */}
            <section className="mt-5 grid gap-4 lg:grid-cols-2">
              {/* Top Industries */}
              <Card className="p-4 shadow-none sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-ink">
                    <Building2 size={17} className="text-leaf" />
                    <span>Top Sektor Industri Prospek</span>
                  </div>
                  <span className="rounded-full bg-mist px-2.5 py-1 text-[10px] font-bold text-slate-600">
                    {topIndustries.length} Industri
                  </span>
                </div>

                {topIndustries.length === 0 ? (
                  <p className="rounded-xl bg-mist p-6 text-center text-sm text-slate-400">
                    Belum ada data industri pada prospek.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {topIndustries.map(ind => (
                      <div key={ind.name}>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 truncate">{ind.name}</span>
                          <span className="font-bold text-ink">
                            {ind.count} prospek <span className="text-slate-400 font-normal">({ind.percent}%)</span>
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-mist">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-lime transition-all duration-500"
                            style={{ width: `${ind.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Next Actions Tracker */}
              <Card className="p-4 shadow-none sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-ink">
                    <Layers size={17} className="text-leaf" />
                    <span>Rencana Tindak Lanjut Terjadwal</span>
                  </div>
                  <span className="rounded-full bg-mist px-2.5 py-1 text-[10px] font-bold text-slate-600">
                    {nextActionsStats.reduce((acc, cur) => acc + cur.count, 0)} Aksi
                  </span>
                </div>

                {nextActionsStats.length === 0 ? (
                  <p className="rounded-xl bg-mist p-6 text-center text-sm text-slate-400">
                    Belum ada rencana tindak lanjut yang dipilih.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {nextActionsStats.map(item => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between rounded-xl border border-line bg-mist/50 p-3"
                      >
                        <span className="truncate text-xs font-semibold text-slate-700">{item.label}</span>
                        <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-leaf shadow-xs">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </section>

            {/* Recent Events Section */}
            <section className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-ink">Catatan Event Terbaru</h2>
                  <p className="text-xs text-slate-500">Aktivitas event terakhir yang dicatat oleh tim.</p>
                </div>
                <Link href="/notes" className="flex min-h-11 items-center gap-1 text-xs font-bold text-leaf hover:underline">
                  Lihat Semua <ArrowUpRight size={15} />
                </Link>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {events.slice(0, 3).map(event => (
                  <Link href="/notes" key={event.id} className="block group">
                    <Card className="h-full p-4 shadow-none transition group-hover:border-leaf group-hover:shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 font-bold text-ink">{event.name}</p>
                        <FollowUpBadge state={followUpState(event)} />
                      </div>
                      <p className="mt-4 text-xs text-slate-500">
                        {event.date} · {event.networking.length} kontak · {event.prospects.length} prospek
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {activeWaLead && (
        <WhatsAppTemplateModal
          isOpen={Boolean(activeWaLead)}
          onClose={() => setActiveWaLead(null)}
          contactName={activeWaLead.name}
          contactPhone={activeWaLead.contact}
          companyName={activeWaLead.company}
          eventName={activeWaLead.eventName}
        />
      )}
    </Protected>
  );
}


