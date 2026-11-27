export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderedBBox extends BBox {
  /** The coordinate space measured in: the viewBox, or 0 0 width height */
  canvas: BBox;
  /** Size of one rendered pixel in canvas units — the measurement's precision */
  pixelSize: number;
}

// Long side of the rasterized image — 512px for a 32-unit canvas = 1/16 unit precision
const RENDER_SIZE = 512;
// Pixels fainter than this (0–255) are anti-aliasing fuzz, not visible content (~5%)
const ALPHA_THRESHOLD = 12;

let canvas: HTMLCanvasElement | null = null;
function getContext(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  canvas ??= document.createElement('canvas');
  return canvas.getContext('2d', { willReadFrequently: true });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('SVG failed to render'));
    img.src = src;
  });
}

/**
 * Bounding box of what an SVG VISIBLY paints, in its viewBox coordinates.
 *
 * The icon is rendered to an off-screen canvas and the box is taken around
 * every pixel that isn't (nearly) transparent. Measuring pixels instead of
 * geometry means everything that affects the visible result is accounted for
 * automatically: stroke width and corners, clip-paths of any shape, masks,
 * opacity, fill="none", filters — and shapes that extend outside a clip but
 * are hidden don't count.
 *
 * Returns null when the SVG can't be rendered/read or paints nothing.
 */
export async function measureRenderedBBox(svgContent: string): Promise<RenderedBBox | null> {
  const ctx = getContext();
  if (!ctx) return null;

  const doc = new DOMParser().parseFromString(svgContent, 'image/svg+xml');
  const svg = doc.documentElement;
  if (doc.querySelector('parsererror') || svg.tagName.toLowerCase() !== 'svg') return null;

  // Coordinate space being measured: the viewBox, or width/height (default 32)
  let [vx, vy, vw, vh] =
    svg
      .getAttribute('viewBox')
      ?.trim()
      .split(/[\s,]+/)
      .map(Number) ?? [];
  if (![vx, vy, vw, vh].every(Number.isFinite) || vw <= 0 || vh <= 0) {
    vx = 0;
    vy = 0;
    vw = parseFloat(svg.getAttribute('width') ?? '') || 32;
    vh = parseFloat(svg.getAttribute('height') ?? '') || 32;
    svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  }

  // Render at RENDER_SIZE on the long side, keeping the viewBox aspect ratio so
  // pixels map linearly back to viewBox units
  const scale = RENDER_SIZE / Math.max(vw, vh);
  const pw = Math.max(1, Math.round(vw * scale));
  const ph = Math.max(1, Math.round(vh * scale));
  svg.setAttribute('width', String(pw));
  svg.setAttribute('height', String(ph));
  svg.setAttribute('preserveAspectRatio', 'none');

  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;

  let data: Uint8ClampedArray;
  try {
    const img = await loadImage(src);
    const c = ctx.canvas;
    c.width = pw;
    c.height = ph;
    // draw + read synchronously, so concurrent measurements can share the canvas
    ctx.clearRect(0, 0, pw, ph);
    ctx.drawImage(img, 0, 0, pw, ph);
    data = ctx.getImageData(0, 0, pw, ph).data;
  } catch {
    // unrenderable SVG, or a tainted canvas (e.g. <foreignObject>)
    return null;
  }

  let minX = pw;
  let minY = ph;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < ph; y++) {
    const row = y * pw * 4;
    for (let x = 0; x < pw; x++) {
      if (data[row + x * 4 + 3] > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null; // nothing visible

  // Pixel edges → viewBox units (maxX/maxY are inclusive pixel indices)
  return {
    x: vx + minX / scale,
    y: vy + minY / scale,
    width: (maxX + 1 - minX) / scale,
    height: (maxY + 1 - minY) / scale,
    canvas: { x: vx, y: vy, width: vw, height: vh },
    pixelSize: 1 / scale,
  };
}
