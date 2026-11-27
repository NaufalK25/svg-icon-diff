'use client';

import { GitPullRequest, LoaderCircle } from 'lucide-react';

import { parseIssueUrl, parsePrUrl, prInputError, type PrRef } from '@/utils/githubPr';

import { BUTTON_PRIMARY, FIELD_ERROR } from './ui';

interface PrUrlInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (ref: PrRef) => void;
  /** Called with the message when the input can't be a pull request */
  onInvalid: (message: string) => void;
  /** Input problem to show under the field; owned by the page so there is only one */
  error?: string | null;
  loading?: boolean;
}

export default function PrUrlInput({ value, onChange, onSubmit, onInvalid, error, loading = false }: PrUrlInputProps) {
  const submit = () => {
    const ref = parsePrUrl(value);
    if (ref) onSubmit(ref);
    else onInvalid(prInputError(parseIssueUrl(value)));
  };

  return (
    <div className="space-y-1.5">
      <form
        className="flex gap-2"
        onSubmit={e => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="relative min-w-0 flex-1">
          <GitPullRequest className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="https://github.com/owner/repo/pull/1234"
            spellCheck={false}
            aria-label="Pull request URL"
            aria-invalid={!!error}
            aria-describedby={error ? 'pr-url-error' : undefined}
            className={`h-11 w-full rounded-sm border bg-card pl-9 pr-3 font-mono text-sm text-foreground placeholder:text-muted-foreground ${error ? 'border-destructive' : 'border-input'
              }`}
          />
        </div>
        <button type="submit" disabled={!value.trim() || loading} className={`${BUTTON_PRIMARY} h-11 px-5 text-base`}>
          {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
          Review
        </button>
      </form>
      {error && (
        <p id="pr-url-error" className={FIELD_ERROR} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
