'use client';

import React from 'react';

import { CircleCheck, CircleX, TriangleAlert } from 'lucide-react';

import { SVGMetadata } from '@/types/icon';
import {
  calculateQualityScore,
  getQualityRatio,
  getQualityTier,
  MAX_QUALITY_SCORE,
  performQualityChecks,
} from '@/utils/qualityChecks';

import { TIER_TEXT } from './AddedCard';

interface QualityChecklistProps {
  metadata: SVGMetadata;
}

function scoreMessage(allPassed: boolean, score: number): string {
  if (allPassed) return 'Perfect! All checks passed';
  const ratio = getQualityRatio(score);
  if (ratio >= 0.85) return 'Excellent quality';
  if (ratio >= 0.75) return 'Very good quality';
  if (ratio >= 0.6) return 'Good quality';
  if (ratio >= 0.45) return 'Fair quality - some issues';
  if (ratio >= 0.3) return 'Needs improvement';
  if (ratio >= 0.15) return 'Multiple issues';
  if (score > 0) return 'Significant issues';
  return 'No checks passed';
}

export const STATUS_ICONS = {
  pass: { icon: CircleCheck, color: 'text-success' },
  warning: { icon: TriangleAlert, color: 'text-warning' },
  fail: { icon: CircleX, color: 'text-destructive' },
} as const;

export default function QualityChecklist({ metadata }: QualityChecklistProps) {
  const checks = performQualityChecks(metadata);
  const score = calculateQualityScore(checks);
  const allPassed = checks.every(c => c.status === 'pass');

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      {/* Score: coloured by tier only, no ladder of tints */}
      <div className="flex items-baseline justify-between gap-4 border-b border-border px-3 py-3">
        <div>
          <h3 className="text-sm font-semibold">Quality score</h3>
          <p className="text-xs text-muted-foreground">{scoreMessage(allPassed, score)}</p>
        </div>
        <div className={`font-mono text-2xl font-bold tabular-nums ${TIER_TEXT[getQualityTier(score)]}`}>
          {score}/{MAX_QUALITY_SCORE}
        </div>
      </div>

      {/* Checks list */}
      <ul className="divide-y divide-border">
        {checks.map((check, i) => {
          const { icon: StatusIcon, color } = STATUS_ICONS[check.status];
          return (
            <li key={i} className="flex items-start gap-2.5 px-3 py-2">
              <StatusIcon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} aria-label={check.status} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{check.name}</p>
                {check.details && (
                  <p className="truncate text-xs text-muted-foreground" title={check.details}>
                    {check.details}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
