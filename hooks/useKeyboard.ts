'use client';

import { useCallback, useEffect } from 'react';

interface KeyboardHandlers {
  onSearchFocus?: () => void;
  onPanelClose?: () => void;
  onNextIcon?: () => void;
  onPrevIcon?: () => void;
  onCopyUrl?: () => void;
}

export function useKeyboard(handlers: KeyboardHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') handlers.onPanelClose?.();
        return;
      }

      switch (e.key) {
        case '/':
          e.preventDefault();
          handlers.onSearchFocus?.();
          break;
        case 'Escape':
          handlers.onPanelClose?.();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handlers.onNextIcon?.();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlers.onPrevIcon?.();
          break;
        case 'c':
        case 'C':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            handlers.onCopyUrl?.();
          }
          break;
      }
    },
    [handlers],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
