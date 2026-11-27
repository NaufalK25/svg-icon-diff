'use client';

import React from 'react';

import { TriangleAlert } from 'lucide-react';

import { GITHUB_SIGN_IN_ENABLED, useAppContext } from '@/context/AppContext';

import { BUTTON_PRIMARY, BUTTON_SECONDARY } from './ui';

interface ErrorStateProps {
  title: string;
  error: string;
  onRetry: () => void;
  /** Shown with the rate-limit notice, to open the token field */
  onAddToken?: () => void;
}

export default function ErrorState({ title, error, onRetry, onAddToken }: ErrorStateProps) {
  const { rateLimit, token } = useAppContext();

  const isRateLimited = error.includes('403') || error.includes('rate limit');

  return (
    <div className="py-6" role="alert">
      <div className="max-w-xl rounded-md border border-destructive/40 bg-destructive-soft p-5 sm:p-6">
        <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-destructive">
          <TriangleAlert className="h-5 w-5 shrink-0" />
          {title}
        </h3>
        <p className="mb-5 break-words font-mono text-sm text-foreground">{error}</p>

        {isRateLimited && (
          <div className="mb-5 space-y-2 border-t border-destructive/25 pt-4 text-sm text-foreground">
            <p className="font-semibold">Rate limit reached</p>
            <p className="max-w-[60ch]">
              Without a token GitHub allows 60 requests an hour. A personal access token raises the limit to 5000
              requests an hour.
            </p>
            {rateLimit && (
              <p className="text-muted-foreground">
                Reset time: {new Date(rateLimit.reset * 1000).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button onClick={onRetry} className={`${BUTTON_PRIMARY} h-9 px-4`}>
            Try again
          </button>
          {isRateLimited && !token && onAddToken && (
            <button onClick={onAddToken} className={`${BUTTON_SECONDARY} h-9 px-4`}>
              {GITHUB_SIGN_IN_ENABLED ? 'Sign in with GitHub or add a token' : 'Add a token'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
