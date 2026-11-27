'use client';

import { useEffect, useRef } from 'react';

/**
 * Single-key shortcuts by `KeyboardEvent.key` ('[', ' ', 'x', …). Ignored while
 * typing in a field and when Ctrl, Cmd or Alt is held, so browser shortcuts keep
 * working. Handlers may change every render; only the latest ones run.
 */
export function useHotkeys(handlers: Record<string, (e: KeyboardEvent) => void>, enabled = true) {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (target?.tagName === 'SELECT') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const handler = latest.current[e.key] ?? latest.current[e.key.toLowerCase()];
      if (!handler) return;
      e.preventDefault();
      handler(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
