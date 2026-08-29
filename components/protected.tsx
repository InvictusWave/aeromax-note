'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export function Protected({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, router, user]);

  if (loading) {
    return <main className="grid min-h-[100svh] place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-2 border-line border-t-leaf" aria-label="Memeriksa sesi" /></main>;
  }
  if (!user) return null;
  return <>{children}</>;
}
