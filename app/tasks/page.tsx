'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays, ClipboardList, Loader2, MapPin, Plus, Trash2 } from 'lucide-react';


import { Brand } from '@/components/brand';
import { Protected } from '@/components/protected';
import { Button, Card, Input, Textarea } from '@/components/ui';
import { NativeSelect } from '@/components/base-ui/native-select';
import { DatePicker } from '@/components/date-picker';
import { MonthPicker } from '@/components/base-ui/month-picker';
import { TASK_CATEGORIES, taskSchema, type DailyTask, type TaskForm } from '@/lib/task-types';

const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export default function TasksPage() {
  const [month, setMonth] = useState(currentMonth);
  const [items, setItems] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [removing, setRemoving] = useState<number | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: { date: today(), endDate: '', title: '', category: '', location: '', result: '' },
  });

  const load = useCallback(async (target: string) => {
    setLoading(true);
    setListError('');
    try {
      const response = await fetch(`/api/tasks?month=${target}`, { credentials: 'include', cache: 'no-store' });
      if (!response.ok) throw new Error('Gagal memuat tugas harian');
      setItems((await response.json()) as DailyTask[]);
    } catch {
      setListError('Gagal memuat tugas harian.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(month);
  }, [load, month]);

  async function onSubmit(values: TaskForm) {
    setError('');
    const response = await fetch('/api/tasks', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      setError('Tugas tidak dapat disimpan.');
      return;
    }

    const saved = (await response.json()) as DailyTask;
    reset({ date: values.date, title: '', category: '', location: '', result: '' });
    if (saved.date.startsWith(month)) setItems(current => [saved, ...current]);
    else setMonth(saved.date.slice(0, 7));
  }

  async function remove(id: number) {
    setRemoving(id);
    const response = await fetch(`/api/tasks?id=${id}`, { method: 'DELETE', credentials: 'include' });
    if (response.ok) setItems(current => current.filter(item => item.id !== id));
    else setListError('Tugas tidak dapat dihapus.');
    setRemoving(null);
  }

  const grouped = useMemo(() => {
    const map = new Map<string, DailyTask[]>();
    for (const item of items) map.set(item.date, [...(map.get(item.date) ?? []), item]);
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [items]);

  return (
    <Protected>
      <Brand />
      <main className="mx-auto max-w-3xl px-3 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-12 animate-page-enter">
        <header className="mb-5 px-1 sm:px-0">
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-leaf sm:text-xs">Aktivitas harian</p>
          <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-tight sm:text-4xl">Tugas Harian</h1>
          <p className="mt-2 max-w-xl text-sm leading-5 text-slate-500">
            Catat pekerjaan di luar event &mdash; foto produk, editing, perawatan alat, dan lainnya. Semua tercatat atas
            nama Anda dan ikut masuk ke laporan kerja bulanan.
          </p>
        </header>

        <Card className="p-4 sm:p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tanggal" error={errors.date?.message}>
                <DatePicker control={control} name="date" />
              </Field>
              <Field label="Sampai tanggal" error={errors.endDate?.message}>
                <Input type="date" max={today()} {...register('endDate')} />
              </Field>
              <Field label="Jenis pekerjaan" error={errors.category?.message}>
                <NativeSelect {...register('category')}>
                  <option value="">Pilih jenis pekerjaan</option>
                  {TASK_CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            <Field label="Uraian tugas" error={errors.title?.message}>
              <Input placeholder="Contoh: Bantu foto produk klien di kantor" {...register('title')} />
            </Field>

            <Field label="Lokasi" error={errors.location?.message}>
              <Input placeholder="Kantor Lalung / Studio / lokasi klien" {...register('location')} />
            </Field>

            <Field label="Hasil atau catatan" error={errors.result?.message}>
              <Textarea rows={3} placeholder="Hasil pekerjaan, kendala, atau tindak lanjut..." {...register('result')} />
            </Field>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <Button type="submit" disabled={isSubmitting} className="w-full bg-ink text-white shadow-sm">
              {isSubmitting ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
              {isSubmitting ? 'Menyimpan...' : 'Simpan Tugas'}
            </Button>
          </form>
        </Card>

        <div className="mb-3 mt-8 flex items-end justify-between gap-3 px-1 sm:px-0">
          <div>
            <h2 className="text-lg font-bold">Riwayat tugas</h2>
            <p className="mt-0.5 text-sm text-slate-500">{items.length} tugas tercatat</p>
          </div>
          <MonthPicker value={month} onChange={setMonth} label="Bulan" className="w-[11rem]" />
        </div>

        {listError ? <p className="mb-3 px-1 text-sm text-red-600 sm:px-0">{listError}</p> : null}

        {loading ? (
          <Card className="p-6 text-center text-sm text-slate-500">Memuat...</Card>
        ) : grouped.length === 0 ? (
          <Card className="p-8 text-center">
            <ClipboardList size={26} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">Belum ada tugas harian pada bulan ini.</p>
          </Card>
        ) : (
          <div className="space-y-5">
            {grouped.map(([date, dayItems]) => (
              <section key={date}>
                <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider text-slate-500 sm:px-0">
                  <CalendarDays size={13} /> {formatDate(date)}
                </p>
                <div className="space-y-2">
                  {dayItems.map(item => (
                    <Card key={item.id} className="flex items-start gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-snug">{item.title}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          {item.category ? (
                            <span className="rounded-full bg-mist px-2 py-0.5 font-semibold text-leaf">
                              {item.category}
                            </span>
                          ) : null}
                          {item.location ? (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} /> {item.location}
                            </span>
                          ) : null}
                        </div>
                        {item.result ? <p className="mt-2 text-sm text-slate-600">{item.result}</p> : null}
                      </div>
                      <button
                        type="button"
                        aria-label={`Hapus tugas ${item.title}`}
                        disabled={removing === item.id}
                        onClick={() => void remove(item.id)}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                      >
                        {removing === item.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </button>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </Protected>
  );
}
