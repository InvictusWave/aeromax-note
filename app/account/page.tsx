'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2, LogOut, Plus, ShieldCheck, UserPlus, UsersRound } from 'lucide-react';
import { Brand } from '@/components/brand';
import { Protected } from '@/components/protected';
import { Button, Card, Input, Label } from '@/components/ui';
import { setCachedAuthUser, useAuth } from '@/hooks/use-auth';
import { invalidateEventsCache } from '@/hooks/use-events';

type UserItem = {
  id: number;
  name: string;
  username: string;
  active: boolean;
  createdAt: string;
  createdBy: number | null;
};

let activeUsersRequest: Promise<UserItem[]> | null = null;

function requestUsers() {
  if (activeUsersRequest) return activeUsersRequest;
  activeUsersRequest = fetch('/api/users', { credentials: 'include', cache: 'no-store' })
    .then(async response => {
      if (!response.ok) throw new Error('Daftar pengguna tidak dapat dimuat');
      return response.json() as Promise<UserItem[]>;
    })
    .finally(() => {
      activeUsersRequest = null;
    });
  return activeUsersRequest;
}

export default function AccountPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userStatus, setUserStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [pinStatus, setPinStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [changingPin, setChangingPin] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', username: '', pin: '' });
  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '', confirmation: '' });

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      setUsers(await requestUsers());
    } catch {
      setUserStatus({ type: 'error', text: 'Daftar pengguna tidak dapat dimuat.' });
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (user) void loadUsers();
  }, [loadUsers, user]);

  async function addUser(event: FormEvent) {
    event.preventDefault();
    if (adding) return;
    setAdding(true);
    setUserStatus(null);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setUserStatus({ type: 'error', text: result?.error || 'Pengguna tidak dapat ditambahkan.' });
        return;
      }
      setNewUser({ name: '', username: '', pin: '' });
      setUserStatus({ type: 'success', text: `Akun @${result.username} berhasil dibuat.` });
      await loadUsers();
    } catch {
      setUserStatus({ type: 'error', text: 'Tidak dapat terhubung ke server.' });
    } finally {
      setAdding(false);
    }
  }

  async function changePin(event: FormEvent) {
    event.preventDefault();
    if (changingPin) return;
    setChangingPin(true);
    setPinStatus(null);
    try {
      const response = await fetch('/api/auth/pin', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pinForm),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setPinStatus({ type: 'error', text: result?.error || 'PIN tidak dapat diperbarui.' });
        return;
      }
      setPinForm({ currentPin: '', newPin: '', confirmation: '' });
      setPinStatus({ type: 'success', text: 'PIN berhasil diperbarui. Sesi lain telah dikeluarkan.' });
    } catch {
      setPinStatus({ type: 'error', text: 'Tidak dapat terhubung ke server.' });
    } finally {
      setChangingPin(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => null);
    setCachedAuthUser(null);
    invalidateEventsCache();
    router.replace('/');
    router.refresh();
  }

  return (
    <Protected>
      <Brand />
      <main className="mx-auto max-w-5xl px-3 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-12">
        <header className="mb-5 px-1 sm:px-0">
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-leaf">Pengaturan akses</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <div>
              <h1 className="text-[28px] font-bold leading-tight tracking-tight sm:text-4xl">Akun</h1>
              <p className="mt-2 text-sm text-slate-500">Kelola PIN dan daftarkan anggota tim Aeromax.</p>
            </div>
            <Button type="button" onClick={logout} className="shrink-0 border border-line bg-white px-3 text-red-600"><LogOut size={16} /> Keluar</Button>
          </div>
        </header>

        <Card className="mb-4 flex items-center gap-3 border-ink bg-ink p-4 text-white shadow-none">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10"><ShieldCheck size={20} /></span>
          <div className="min-w-0">
            <p className="truncate font-bold">{user?.name || 'Pengguna Aeromax'}</p>
            <p className="mt-0.5 truncate text-xs text-white/60">@{user?.username}</p>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4 shadow-none sm:p-5">
            <div className="mb-4 flex items-center gap-2"><KeyRound size={18} className="text-leaf" /><h2 className="font-bold">Ubah PIN saya</h2></div>
            <form onSubmit={changePin} className="space-y-3">
              <div><Label>PIN saat ini</Label><Input type="password" autoComplete="current-password" value={pinForm.currentPin} onChange={event => setPinForm(current => ({ ...current, currentPin: event.target.value }))} placeholder="Masukkan PIN saat ini" /></div>
              <div><Label>PIN baru</Label><Input type="password" autoComplete="new-password" value={pinForm.newPin} onChange={event => setPinForm(current => ({ ...current, newPin: event.target.value }))} placeholder="Minimal 6 karakter" /></div>
              <div><Label>Ulangi PIN baru</Label><Input type="password" autoComplete="new-password" value={pinForm.confirmation} onChange={event => setPinForm(current => ({ ...current, confirmation: event.target.value }))} placeholder="Masukkan ulang PIN baru" /></div>
              {pinStatus && <p className={`rounded-xl p-3 text-sm ${pinStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{pinStatus.text}</p>}
              <Button disabled={changingPin || !pinForm.currentPin || !pinForm.newPin || !pinForm.confirmation} type="submit" className="w-full bg-ink text-white">
                {changingPin ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><KeyRound size={16} /> Simpan PIN Baru</>}
              </Button>
            </form>
          </Card>

          <Card className="p-4 shadow-none sm:p-5">
            <div className="mb-1 flex items-center gap-2"><UserPlus size={18} className="text-leaf" /><h2 className="font-bold">Tambah pengguna</h2></div>
            <p className="mb-4 text-xs leading-5 text-slate-500">Hanya pengguna yang sudah masuk yang dapat membuat akun baru.</p>
            <form onSubmit={addUser} className="space-y-3">
              <div><Label>Nama lengkap</Label><Input value={newUser.name} onChange={event => setNewUser(current => ({ ...current, name: event.target.value }))} placeholder="Nama anggota tim" /></div>
              <div><Label>Nama pengguna</Label><Input autoComplete="username" autoCapitalize="none" value={newUser.username} onChange={event => setNewUser(current => ({ ...current, username: event.target.value }))} placeholder="contoh: nadia" /></div>
              <div><Label>PIN awal</Label><Input type="password" value={newUser.pin} onChange={event => setNewUser(current => ({ ...current, pin: event.target.value }))} placeholder="Minimal 6 karakter" /></div>
              {userStatus && <p className={`rounded-xl p-3 text-sm ${userStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{userStatus.text}</p>}
              <Button disabled={adding || !newUser.name.trim() || !newUser.username.trim() || !newUser.pin} type="submit" className="w-full bg-leaf text-white">
                {adding ? <><Loader2 size={16} className="animate-spin" /> Menambahkan...</> : <><Plus size={16} /> Buat Akun Pengguna</>}
              </Button>
            </form>
          </Card>
        </div>

        <section className="mt-4">
          <div className="mb-3 flex items-center justify-between px-1 sm:px-0">
            <div><h2 className="flex items-center gap-2 font-bold"><UsersRound size={18} /> Pengguna aktif</h2><p className="mt-1 text-xs text-slate-500">Semua akun yang dapat mengakses aplikasi.</p></div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-leaf shadow-sm">{users.length}</span>
          </div>
          <Card className="divide-y divide-line overflow-hidden shadow-none">
            {loadingUsers ? <div className="flex items-center justify-center gap-2 p-6 text-sm text-slate-500"><Loader2 size={16} className="animate-spin text-leaf" /> Memuat pengguna...</div> : users.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mist text-sm font-bold text-leaf">{item.name.charAt(0).toUpperCase()}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">@{item.username}</p></div>
                {item.id === user?.id && <span className="rounded-full bg-lime/60 px-2.5 py-1 text-[10px] font-semibold text-leaf">Anda</span>}
              </div>
            ))}
          </Card>
        </section>
      </main>
    </Protected>
  );
}
