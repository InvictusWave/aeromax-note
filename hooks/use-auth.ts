'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AuthUser } from '@/lib/auth';

let cachedUser: AuthUser | null | undefined;
let activeRequest: Promise<AuthUser | null> | null = null;

export function setCachedAuthUser(user: AuthUser | null) {
  cachedUser = user;
}

async function requestUser(force = false) {
  if (!force && cachedUser !== undefined) return cachedUser;
  if (activeRequest) return activeRequest;
  activeRequest = fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
    .then(async response => {
      if (!response.ok) return null;
      const result = await response.json();
      return result.user as AuthUser;
    })
    .then(user => {
      cachedUser = user;
      return user;
    })
    .finally(() => {
      activeRequest = null;
    });
  return activeRequest;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(cachedUser ?? null);
  const [loading, setLoading] = useState(cachedUser === undefined);

  const refresh = useCallback(async () => {
    setLoading(true);
    const nextUser = await requestUser(true).catch(() => null);
    setUser(nextUser);
    setLoading(false);
    return nextUser;
  }, []);

  useEffect(() => {
    if (cachedUser !== undefined) return;
    void requestUser().then(nextUser => {
      setUser(nextUser);
      setLoading(false);
    }).catch(() => {
      cachedUser = null;
      setUser(null);
      setLoading(false);
    });
  }, []);

  return { user, loading, refresh };
}
