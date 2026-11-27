'use client';

import { ExternalLink, GitFork } from 'lucide-react';

import type { PullRequestInfo } from '@/types/diff';
import { prUrl } from '@/utils/githubPr';

import { CHIP } from './ui';

const STATE_CLASS: Record<PullRequestInfo['state'], string> = {
  open: 'bg-success-soft text-success',
  merged: 'bg-merged-soft text-merged',
  closed: 'bg-destructive-soft text-destructive',
};

const short = (sha: string) => sha.slice(0, 7);

interface PrSummaryProps {
  info: PullRequestInfo;
}

export default function PrSummary({ info }: PrSummaryProps) {
  const baseRepo = `${info.owner}/${info.repo}`;
  const fork = info.headRepo !== baseRepo;

  return (
    <div className="space-y-2.5 pt-2">
      <h2 className="text-2xl font-bold leading-tight tracking-[-0.015em] sm:text-[1.75rem]">{info.title}</h2>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span className={`${CHIP} capitalize ${STATE_CLASS[info.state]}`}>{info.state}</span>
        <a
          href={prUrl(info)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-foreground underline decoration-input underline-offset-4 hover:decoration-foreground"
        >
          PR #{info.number}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <span>@{info.author}</span>
        <span className="font-mono text-xs" title="Changes are shown against the merge base">
          base {short(info.mergeBaseSha)} ← head {short(info.headSha)}
        </span>
        {fork && (
          <span className="inline-flex items-center gap-1" title="Head branch is in a fork">
            <GitFork className="h-3.5 w-3.5" />
            {info.headRepo}
          </span>
        )}
      </div>
    </div>
  );
}
