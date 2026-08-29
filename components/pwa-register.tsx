'use client';

import { useEffect, useState } from 'react';
import { Download, Sparkles, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (installed app)
    const isApp = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isApp);

    // Register Service Worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((error) => {
          console.debug('ServiceWorker registration error:', error);
        });
      });
    }

    // Capture install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Check if user previously dismissed banner in this session
      const dismissed = sessionStorage.getItem('aeromax_install_dismissed');
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  }

  function dismissBanner() {
    setShowInstallBanner(false);
    sessionStorage.setItem('aeromax_install_dismissed', 'true');
  }

  if (isStandalone || !showInstallBanner || !deferredPrompt) {
    return null;
  }

  return (
    <aside
      aria-label="Pemberitahuan instalasi aplikasi"
      className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300 sm:bottom-5 sm:left-auto sm:right-5"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-ink/95 p-3.5 text-white shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
        <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-lime text-ink">
          <Sparkles size={18} className="text-ink" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-lime">Pasang Aeromax App</p>
          <p className="truncate text-[11px] text-white/70">Akses cepat & lebih hemat kuota di beranda Anda.</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex min-h-8 items-center gap-1 rounded-lg bg-lime px-2.5 py-1 text-xs font-bold text-ink transition hover:bg-emerald-300 active:scale-95"
          >
            <Download size={13} />
            <span>Pasang</span>
          </button>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Tutup saran instalasi"
            className="grid h-8 w-8 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
