import type { PixelDiffResult } from '@/types/diff';

/** Per-channel difference (0–255) at or below which a pixel counts as unchanged.
 *  Hides the anti-aliasing noise browsers add along edges that merely moved. */
export const DEFAULT_THRESHOLD = 16;

export type DiffStyle = 'difference' | 'highlight';

const HIGHLIGHT = [255, 0, 255]; // magenta: rarely an icon color, so changes stand out
const DIM_ALPHA = 0.3; // unchanged pixels of A in highlight style

/**
 * Compare two same-sized rasters pixel by pixel.
 *
 * Both are compared as if drawn on black: |A − B| per color channel after
 * premultiplying by alpha. Alpha is compared too, so a black shape that appears
 * on a transparent background still counts as a change (on black alone it
 * wouldn't). A pixel changed when its largest channel difference exceeds the threshold.
 *
 * - `difference`: opaque image, unchanged pixels black, changes glow with their difference
 * - `highlight`: changed pixels magenta over a dimmed, transparent copy of A
 */
export function diffPixels(
  a: ImageData,
  b: ImageData,
  threshold = DEFAULT_THRESHOLD,
  style: DiffStyle = 'difference',
): PixelDiffResult {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`Size mismatch: ${a.width}×${a.height} vs ${b.width}×${b.height}`);
  }
  const { width, height } = a;
  const out = new ImageData(width, height);
  const pa = a.data;
  const pb = b.data;
  const po = out.data;
  let changed = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const aa = pa[i + 3];
      const ab = pb[i + 3];
      const dA = Math.abs(aa - ab);
      const dR = Math.abs((pa[i] * aa - pb[i] * ab) / 255);
      const dG = Math.abs((pa[i + 1] * aa - pb[i + 1] * ab) / 255);
      const dB = Math.abs((pa[i + 2] * aa - pb[i + 2] * ab) / 255);
      const isChanged = Math.max(dR, dG, dB, dA) > threshold;

      if (isChanged) {
        changed++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }

      if (style === 'difference') {
        // Below the threshold stays black, so noise doesn't glow either
        po[i] = isChanged ? Math.max(dR, dA) : 0;
        po[i + 1] = isChanged ? Math.max(dG, dA) : 0;
        po[i + 2] = isChanged ? Math.max(dB, dA) : 0;
        po[i + 3] = 255;
      } else if (isChanged) {
        po[i] = HIGHLIGHT[0];
        po[i + 1] = HIGHLIGHT[1];
        po[i + 2] = HIGHLIGHT[2];
        po[i + 3] = 255;
      } else {
        po[i] = pa[i];
        po[i + 1] = pa[i + 1];
        po[i + 2] = pa[i + 2];
        po[i + 3] = Math.round(aa * DIM_ALPHA);
      }
    }
  }

  return {
    changed,
    total: width * height,
    bbox: maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
    image: out,
  };
}

/** Changed share as a short label: "0%", "<0.1%", "3.1%" */
export function formatChangedPercent(changed: number, total: number): string {
  if (changed === 0 || total === 0) return '0%';
  const pct = (changed / total) * 100;
  if (pct < 0.1) return '<0.1%';
  return `${pct < 10 ? pct.toFixed(1) : Math.round(pct)}%`;
}
