'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, NotebookPen, Plus, Sparkles, UserRound } from 'lucide-react';
import { Logo } from '@/components/logo';

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
    router.prefetch('/form');
  }, [router]);

  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-6">
        <Link href="/dashboard" prefetch={true} className="flex min-h-11 items-center transition hover:opacity-90 active:scale-[0.98]">
          <Logo size="sm" />
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          {desktopLinks.map(link => {
            const Icon = link.icon;
            const active = pathname === link.href || (link.href === '/form' && pathname.startsWith('/form'));
            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch={true}
                className={`flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-all ${
                  active
                    ? 'bg-white text-ink shadow-sm ring-1 ring-black/5'
                    : 'text-slate-500 hover:bg-white/60 hover:text-ink'
                }`}
              >
                <Icon size={17} className={active ? 'text-leaf' : ''} />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 sm:hidden">
          <Link
            href="/account"
            prefetch={true}
            aria-label="Buka akun"
            className={`grid h-11 w-11 place-items-center rounded-xl border transition ${
              pathname.startsWith('/account')
                ? 'border-ink bg-ink text-white shadow-sm'
                : 'border-line bg-white text-ink shadow-xs'
            }`}
          >
            <UserRound size={18} />
          </Link>
          <Link
            href="/form"
            prefetch={true}
            className="flex min-h-11 items-center gap-1.5 rounded-xl bg-ink px-3.5 text-xs font-semibold text-white shadow-sm active:scale-95"
          >
            <Plus size={15} /> Tambah
          </Link>
        </div>
      </header>

      {/* Floating Bottom Navigation Bar for Mobile */}
      <nav className="fixed inset-x-3 bottom-[calc(.75rem+env(safe-area-inset-bottom))] z-40 grid grid-cols-4 rounded-2xl border border-line/80 bg-white/95 p-1.5 shadow-[0_10px_30px_rgba(23,33,27,0.12)] backdrop-blur-md sm:hidden">
        {links.map(link => {
          const Icon = link.icon;
          const active = pathname === link.href || (link.href === '/form' && pathname.startsWith('/form'));
          return (
            <Link
              key={link.href}
              href={link.href}
              prefetch={true}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold transition-all ${
                active
                  ? 'bg-ink text-white shadow-xs'
                  : 'text-slate-500 hover:text-ink active:scale-95'
              }`}
            >
              <Icon size={18} className={active ? 'text-lime' : ''} />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
