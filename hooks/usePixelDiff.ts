'use client';

import { useEffect, useState } from 'react';

import type { PixelDiffResult } from '@/types/diff';
import { DEFAULT_THRESHOLD, diffPixels, type DiffStyle } from '@/utils/pixelDiff';
import { rasterize } from '@/utils/rasterize';

/** Pixel diff of two icons rasterized at size×size; null while rendering or when either is missing */
export function usePixelDiff(
  a: string | null,
  b: string | null,
  size: number,
  threshold = DEFAULT_THRESHOLD,
  style: DiffStyle = 'difference',
): PixelDiffResult | null {
  const [result, setResult] = useState<{ key: string; diff: PixelDiffResult } | null>(null);
  const key = JSON.stringify([a, b, size, threshold, style]);

  useEffect(() => {
    if (a === null || b === null) return;
    let cancelled = false;
    const k = JSON.stringify([a, b, size, threshold, style]);
    Promise.all([rasterize(a, size), rasterize(b, size)])
      .then(([pa, pb]) => {
        if (!cancelled) setResult({ key: k, diff: diffPixels(pa, pb, threshold, style) });
      })
      .catch(err => console.warn(`[usePixelDiff] ${err instanceof Error ? err.message : String(err)}`));
    return () => {
      cancelled = true;
    };
  }, [a, b, size, threshold, style]);

  return result?.key === key ? result.diff : null;
}
