'use client';

import { useEffect, useState } from 'react';

import { analyzeSvg, type SvgAnalysis } from '@/utils/analyzeSvg';

/** Metadata and quality checks of an icon; null while analyzing or when content is null */
export function useSvgAnalysis(content: string | null, filename: string): SvgAnalysis | null {
  const [result, setResult] = useState<{ key: string; analysis: SvgAnalysis } | null>(null);
  const key = content === null ? null : `${filename}\0${content}`;

  useEffect(() => {
    if (content === null) return;
    let cancelled = false;
    analyzeSvg(content, filename)
      .then(analysis => {
        if (!cancelled) setResult({ key: `${filename}\0${content}`, analysis });
      })
      .catch(err => console.warn(`[useSvgAnalysis] ${filename}: ${err instanceof Error ? err.message : String(err)}`));
    return () => {
      cancelled = true;
    };
  }, [content, filename]);

  // A result for older content is stale; hide it instead of showing the wrong icon's checks
  return result && result.key === key ? result.analysis : null;
}
