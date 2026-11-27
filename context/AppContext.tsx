'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';

import type { AppContextType, GitHubUser, SvgItem } from '@/types/diff';
import type { GitHubRateLimit } from '@/types/icon';

/** GitHub sign-in needs an OAuth app; without its client id only pasted tokens are offered */
export const GITHUB_SIGN_IN_ENABLED = !!process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;

const AppContext = createContext<AppContextType | undefined>(undefined);

async function fetchUser(token: string): Promise<GitHubUser> {
  const res = await fetch('https://api.github.com/user', {
    headers: { Accept: 'application/vnd.github.v3+json', Authorization: `token ${token}` },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const user: { login: string; avatar_url: string } = await res.json();
  return { login: user.login, avatarUrl: user.avatar_url };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [token, setTokenState] = useState<string>('');
  const [authUser, setAuthUser] = useState<GitHubUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<GitHubRateLimit | null>(null);
  const [items, setItems] = useState<SvgItem[]>([]);
  const [baseId, setBaseIdState] = useState<string | null>(null);
  const [compareId, setCompareIdState] = useState<string | null>(null);
  const nextId = useRef(0);

  // localStorage only exists in the browser, so saved values load after hydration
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const savedToken = localStorage.getItem('token') || '';
    const savedUser = localStorage.getItem('authUser');
    if (savedTheme) setTheme(savedTheme);
    if (savedToken) setTokenState(savedToken);
    if (savedToken && savedUser) {
      try {
        setAuthUser(JSON.parse(savedUser) as GitHubUser);
      } catch {
        localStorage.removeItem('authUser');
      }
    }

    // Back from GitHub sign-in: the callback route puts the result in the URL fragment
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const signedIn = hash.get('gh_token');
    const failed = hash.get('gh_auth_error');
    if (!signedIn && !failed) return;
    // Drop the token from the address bar and history right away
    history.replaceState(null, '', window.location.pathname + window.location.search);
    if (failed) {
      setAuthError(failed);
      return;
    }
    setTokenState(signedIn!);
    setAuthUser(null);
    fetchUser(signedIn!)
      .then(setAuthUser)
      .catch(err => {
        console.warn(`[AppContext] signed in, but no user info: ${err instanceof Error ? err.message : String(err)}`);
        setAuthUser({ login: 'GitHub user', avatarUrl: '' });
      });
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('token', token);
  }, [token]);

  useEffect(() => {
    if (authUser) localStorage.setItem('authUser', JSON.stringify(authUser));
    else localStorage.removeItem('authUser');
  }, [authUser]);

  const setToken = (next: string) => {
    setTokenState(next);
    setAuthUser(null);
  };

  const signIn = ({ includePrivate = false }: { includePrivate?: boolean } = {}) => {
    const back = window.location.pathname + window.location.search;
    const params = new URLSearchParams({ return: back });
    if (includePrivate) params.set('private', '1');
    window.location.href = `/api/auth/login?${params.toString()}`;
  };

  const signOut = () => {
    if (authUser && token) {
      // keepalive: the request finishes even if the page navigates away right after
      void fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        keepalive: true,
      }).catch(err =>
        console.warn(`[AppContext] token not revoked: ${err instanceof Error ? err.message : String(err)}`),
      );
    }
    setToken('');
  };

  // A and B are filled in as icons arrive: the first becomes A, the next B
  useEffect(() => {
    const ids = items.map(i => i.id);
    const base = baseId && ids.includes(baseId) ? baseId : (ids[0] ?? null);
    const compare =
      compareId && ids.includes(compareId) && compareId !== base ? compareId : (ids.find(id => id !== base) ?? null);
    /* eslint-disable react-hooks/set-state-in-effect */
    if (base !== baseId) setBaseIdState(base);
    if (compare !== compareId) setCompareIdState(compare);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [items, baseId, compareId]);

  const addItems = (added: Omit<SvgItem, 'id'>[]) => {
    setItems(prev => {
      const next = [...prev];
      for (const item of added) {
        // Re-dropping a fixed file updates it in place, so it stays A or B
        const existing = next.findIndex(p => p.name === item.name);
        if (existing !== -1) next[existing] = { ...item, id: next[existing].id };
        else next.push({ ...item, id: `svg-${++nextId.current}` });
      }
      return next;
    });
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const clearItems = () => setItems([]);

  // Picking the other side's icon swaps A and B instead of comparing an icon with itself
  const setBaseId = (id: string) => {
    if (id === compareId) setCompareIdState(baseId);
    setBaseIdState(id);
  };

  const setCompareId = (id: string) => {
    if (id === baseId) setBaseIdState(compareId);
    setCompareIdState(id);
  };

  const swap = () => {
    setBaseIdState(compareId);
    setCompareIdState(baseId);
  };

  const value: AppContextType = {
    theme,
    token,
    authUser,
    authError,
    rateLimit,
    items,
    baseId,
    compareId,
    setTheme,
    setToken,
    signIn,
    signOut,
    clearAuthError: () => setAuthError(null),
    setRateLimit,
    addItems,
    removeItem,
    clearItems,
    setBaseId,
    setCompareId,
    swap,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
