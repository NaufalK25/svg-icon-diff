'use client';

import { useEffect, useState } from 'react';

import { analysisKey, analyzeSvg, type SvgAnalysis } from '@/utils/analyzeSvg';

/** Metadata and quality checks of an icon; null while analyzing or when content is null.
 *  `variant` is the other folder variant's content, for the overlay check (see analyzeSvg). */
export function useSvgAnalysis(content: string | null, filename: string, variant?: string | null): SvgAnalysis | null {
  const [result, setResult] = useState<{ key: string; analysis: SvgAnalysis } | null>(null);
  const key = content === null ? null : analysisKey(content, filename, variant);

  useEffect(() => {
    if (content === null) return;
    let cancelled = false;
    analyzeSvg(content, filename, variant)
      .then(analysis => {
        if (!cancelled) setResult({ key: analysisKey(content, filename, variant), analysis });
      })
      .catch(err => console.warn(`[useSvgAnalysis] ${filename}: ${err instanceof Error ? err.message : String(err)}`));
    return () => {
      cancelled = true;
    };
  }, [content, filename, variant]);

  // A result for older content is stale; hide it instead of showing the wrong icon's checks
  return result && result.key === key ? result.analysis : null;
}
