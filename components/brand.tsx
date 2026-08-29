'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, NotebookPen, Plus, Sparkles, UserRound } from 'lucide-react';

const links = [
  { href: '/dashboard', label: 'Dasbor', icon: LayoutDashboard },
  { href: '/notes', label: 'Catatan', icon: NotebookPen },
  { href: '/ai', label: 'AI', icon: Sparkles },
  { href: '/form', label: 'Tambah', icon: Plus },
];
const desktopLinks = [...links, { href: '/account', label: 'Akun', icon: UserRound }];

export function Brand(_: { dashboard?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    router.prefetch('/dashboard');
    router.prefetch('/notes');
    router.prefetch('/ai');
    router.prefetch('/account');
  }, [router]);

  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-6">
        <Link href="/dashboard" className="flex min-h-11 items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-sm font-black text-lime">A</span>
          <span className="font-bold tracking-tight">AEROMAX<span className="text-leaf">.</span></span>
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          {desktopLinks.map(link => {
            const Icon = link.icon;
            const active = pathname === link.href || (link.href === '/form' && pathname.startsWith('/form'));
            return (
              <Link key={link.href} href={link.href} className={`flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold ${active ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-ink'}`}>
                <Icon size={17} />{link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 sm:hidden">
          <Link href="/account" aria-label="Buka akun" className={`grid h-11 w-11 place-items-center rounded-xl border ${pathname.startsWith('/account') ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink'}`}>
            <UserRound size={18} />
          </Link>
          <Link href="/form" className="flex min-h-11 items-center gap-1.5 rounded-xl bg-ink px-3 text-xs font-semibold text-white">
            <Plus size={15} /> Tambah
          </Link>
        </div>
      </header>

      <nav className="fixed inset-x-3 bottom-[calc(.75rem+env(safe-area-inset-bottom))] z-40 grid grid-cols-4 rounded-2xl border border-line bg-white/95 p-1.5 shadow-soft backdrop-blur sm:hidden">
        {links.map(link => {
          const Icon = link.icon;
          const active = pathname === link.href || (link.href === '/form' && pathname.startsWith('/form'));
          return (
            <Link key={link.href} href={link.href} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold ${active ? 'bg-ink text-white' : 'text-slate-500'}`}>
              <Icon size={18} />{link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
