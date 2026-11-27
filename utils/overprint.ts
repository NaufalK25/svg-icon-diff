import { DEFAULT_THRESHOLD } from './pixelDiff';

/**
 * Overprint: A and B printed like two ink plates on white paper, so every pixel says
 * which version it belongs to.
 *
 * - ink both versions share prints in `both` (they register: unchanged)
 * - ink only A has prints in `a` (lost in B)
 * - ink only B has prints in `b` (added in B)
 * - with `compareColor`, ink both share but in a different colour prints in `recolor`
 *
 * Coverage is the pixel's alpha, so anti-aliased edges blend smoothly instead of turning
 * into hard blocks. A coverage or colour difference at or below `threshold` (0–255) is
 * treated as anti-aliasing noise and prints as shared ink.
 */
export type OverprintStyle = 'shape' | 'color';

export interface OverprintInks {
  paper: RGB;
  both: RGB;
  a: RGB;
  b: RGB;
  recolor: RGB;
}

export type RGB = [number, number, number];

export interface OverprintResult {
  /** Pixels where A has ink that B doesn't */
  aOnly: number;
  /** Pixels where B has ink that A doesn't */
  bOnly: number;
  /**
   * Pixels both cover but in a different colour. Counted in both styles: the shape style
   * doesn't paint them, but the view can still say inner changes are hidden
   */
  recolored: number;
  /** Pixels the current style shows as changed: A only, B only, and recoloured in the colour style */
  changed: number;
  total: number;
  image: ImageData;
}

export function overprintPixels(
  a: ImageData,
  b: ImageData,
  inks: OverprintInks,
  style: OverprintStyle = 'shape',
  threshold = DEFAULT_THRESHOLD,
): OverprintResult {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`Size mismatch: ${a.width}×${a.height} vs ${b.width}×${b.height}`);
  }
  const { width, height } = a;
  const out = new ImageData(width, height);
  const pa = a.data;
  const pb = b.data;
  const po = out.data;
  let aOnly = 0;
  let bOnly = 0;
  let recolored = 0;
  let changed = 0;

  for (let i = 0; i < pa.length; i += 4) {
    let ca = pa[i + 3];
    let cb = pb[i + 3];
    // Coverage differences within the threshold are edge noise: treat as registered
    if (Math.abs(ca - cb) <= threshold) ca = cb = Math.max(ca, cb);

    const common = Math.min(ca, cb) / 255;
    const onlyA = (ca - Math.min(ca, cb)) / 255;
    const onlyB = (cb - Math.min(ca, cb)) / 255;

    // Shared ink in a different colour: compare the two colours where both have ink. Always
    // measured; only the colour style paints it
    let isRecolor = false;
    if (common > 0) {
      const d = Math.max(Math.abs(pa[i] - pb[i]), Math.abs(pa[i + 1] - pb[i + 1]), Math.abs(pa[i + 2] - pb[i + 2]));
      isRecolor = d * common > threshold;
    }
    const shared = isRecolor && style === 'color' ? inks.recolor : inks.both;
    const paper = 1 - common - onlyA - onlyB;

    for (let c = 0; c < 3; c++) {
      po[i + c] = Math.round(inks.paper[c] * paper + shared[c] * common + inks.a[c] * onlyA + inks.b[c] * onlyB);
    }
    po[i + 3] = 255;

    const isA = onlyA * 255 > threshold;
    const isB = onlyB * 255 > threshold;
    if (isA) aOnly++;
    if (isB) bOnly++;
    if (isRecolor) recolored++;
    if (isA || isB || (isRecolor && style === 'color')) changed++;
  }

  return { aOnly, bOnly, recolored, changed, total: width * height, image: out };
}

/** "#rrggbb" (or "#rgb") → [r, g, b]; the overprint inks are defined as hex tokens */
export function hexToRgb(hex: string): RGB {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = [...h].map(x => x + x).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
