'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Complete progress on route change
  useEffect(() => {
    setProgress(100);
    const timeout = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 250);

    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  // Intercept link clicks to start loading bar
  useEffect(() => {
    function handleAnchorClick(event: MouseEvent) {
      const target = (event.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        target.target === '_blank' ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      // If internal navigation to a different path
      const currentUrl = new URL(window.location.href);
      const targetUrl = new URL(href, window.location.href);

      if (
        currentUrl.origin === targetUrl.origin &&
        (currentUrl.pathname !== targetUrl.pathname ||
          currentUrl.search !== targetUrl.search)
      ) {
        setLoading(true);
        setProgress(25);
        // Simulate progressive loading
        setTimeout(() => setProgress((p) => (p > 0 && p < 80 ? p + 35 : p)), 100);
        setTimeout(() => setProgress((p) => (p > 0 && p < 90 ? p + 20 : p)), 300);
      }
    }

    document.addEventListener('click', handleAnchorClick, true);
    return () => {
      document.removeEventListener('click', handleAnchorClick, true);
    };
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none overflow-hidden bg-emerald-950/20"
    >
      <div
        className="h-full bg-gradient-to-r from-emerald-500 via-lime to-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transitionProperty: 'width, opacity',
        }}
      />
    </div>
  );
}
