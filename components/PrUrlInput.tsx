'use client';

import { GitPullRequest, LoaderCircle } from 'lucide-react';

import { notAPullRequest, parseIssueUrl, parsePrUrl, type PrRef } from '@/utils/githubPr';

import { BUTTON_PRIMARY } from './ui';

const FORMATS = 'Use https://github.com/owner/repo/pull/1234 or owner/repo#1234.';

/**
 * The one wording for input problems, whether found here (an issue link, text that isn't a PR)
 * or by GitHub (a short-form number that turns out to be an issue)
 */
export function prInputError(issue: PrRef | null): string {
  return `${issue ? notAPullRequest(issue) : 'Not a pull request URL.'} ${FORMATS}`;
}

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
            className={`h-11 w-full rounded-sm border bg-card pl-9 pr-3 font-mono text-sm text-foreground placeholder:text-muted-foreground ${
              error ? 'border-destructive' : 'border-input'
            }`}
          />
        </div>
        <button type="submit" disabled={!value.trim() || loading} className={`${BUTTON_PRIMARY} h-11 px-5 text-base`}>
          {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
          Review
        </button>
      </form>
      {error && (
        <p id="pr-url-error" className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
