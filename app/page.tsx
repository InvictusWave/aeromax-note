'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, LockKeyhole, UserRound } from 'lucide-react';
import { Button, Card, Input, Label } from '@/components/ui';
import { setCachedAuthUser, useAuth } from '@/hooks/use-auth';
import type { AuthUser } from '@/lib/auth';

export default function Gatekeeper() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, loading: checking } = useAuth();

  useEffect(() => {
    if (!checking && user) router.replace('/dashboard');
  }, [checking, router, user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error || 'Tidak dapat masuk. Coba lagi.');
        return;
      }
      setCachedAuthUser(result.user as AuthUser);
      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-[100svh] items-center justify-center px-4 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <Card className="w-full max-w-sm p-6 sm:p-8">
        <div className="mb-7">
          <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-ink text-xl font-black text-lime">A</div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-leaf">Ruang kerja Aeromax</p>
          <h1 className="text-2xl font-bold tracking-tight">Selamat datang.</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Masuk menggunakan akun dan PIN yang telah didaftarkan oleh tim.</p>
        </div>

        {checking ? (
          <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 size={17} className="animate-spin text-leaf" /> Memeriksa sesi...</div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Nama pengguna</Label>
              <div className="relative">
                <UserRound className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                <Input autoFocus autoComplete="username" autoCapitalize="none" value={username} onChange={event => { setUsername(event.target.value); setError(''); }} placeholder="Masukkan nama pengguna" className="pl-11" aria-label="Nama pengguna" />
              </div>
            </div>
            <div>
              <Label>PIN</Label>
              <div className="relative">
                <LockKeyhole className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                <Input type="password" autoComplete="current-password" value={pin} onChange={event => { setPin(event.target.value); setError(''); }} placeholder="Masukkan PIN" className="pl-11" aria-label="PIN" />
              </div>
            </div>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <Button disabled={submitting || !username.trim() || !pin} type="submit" className="w-full bg-ink text-white">
              {submitting ? <><Loader2 size={17} className="animate-spin" /> Memproses...</> : <>Masuk <ArrowRight size={17} /></>}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
