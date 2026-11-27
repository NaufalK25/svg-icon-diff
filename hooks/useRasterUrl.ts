'use client';

import { useEffect, useState } from 'react';

import { svgDataUrl } from '@/components/GridPreview';
import type { RenderSize } from '@/types/diff';
import { rasterUrl } from '@/utils/rasterize';

/**
 * Image source for an icon: at a pixel size, a PNG drawn at exactly that size
 * (shown with image-rendering: pixelated, it matches how VS Code renders it);
 * at 'fit', the SVG itself so it stays sharp at any zoom. Null while rendering.
 */
export function useRasterUrl(content: string, size: RenderSize): string | null {
  const [result, setResult] = useState<{ key: string; url: string } | null>(null);
  const key = `${size}\0${content}`;

  useEffect(() => {
    if (size === 'fit') return;
    let cancelled = false;
    rasterUrl(content, size)
      .then(url => {
        if (!cancelled) setResult({ key: `${size}\0${content}`, url });
      })
      .catch(err => console.warn(`[useRasterUrl] ${err instanceof Error ? err.message : String(err)}`));
    return () => {
      cancelled = true;
    };
  }, [content, size]);

  if (size === 'fit') return svgDataUrl(content);
  return result?.key === key ? result.url : null;
}
