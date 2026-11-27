'use client';

import { useEffect, useState } from 'react';

import {
  hexToRgb,
  type OverprintInks,
  overprintPixels,
  type OverprintResult,
  type OverprintStyle,
} from '@/utils/overprint';
import { DEFAULT_THRESHOLD } from '@/utils/pixelDiff';
import { rasterize } from '@/utils/rasterize';

/** The overprint inks, read from the --overprint-* tokens in app/globals.css */
function readInks(): OverprintInks {
  const css = getComputedStyle(document.documentElement);
  const ink = (name: string) => hexToRgb(css.getPropertyValue(`--overprint-${name}`));
  return { paper: ink('paper'), both: ink('both'), a: ink('a'), b: ink('b'), recolor: ink('recolor') };
}

/** Overprint of two icons rasterized at size×size; null while rendering */
export function useOverprint(
  a: string,
  b: string,
  size: number,
  style: OverprintStyle,
  threshold = DEFAULT_THRESHOLD,
): OverprintResult | null {
  const [result, setResult] = useState<{ key: string; value: OverprintResult } | null>(null);
  const key = JSON.stringify([a, b, size, style, threshold]);

  useEffect(() => {
    let cancelled = false;
    const k = JSON.stringify([a, b, size, style, threshold]);
    Promise.all([rasterize(a, size), rasterize(b, size)])
      .then(([pa, pb]) => {
        if (!cancelled) setResult({ key: k, value: overprintPixels(pa, pb, readInks(), style, threshold) });
      })
      .catch(err => console.warn(`[useOverprint] ${err instanceof Error ? err.message : String(err)}`));
    return () => {
      cancelled = true;
    };
  }, [a, b, size, style, threshold]);

  return result?.key === key ? result.value : null;
}
