const svgDataUrl = (content: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('SVG failed to render'));
    img.src = src;
  });
}

/**
 * The SVG resized to exactly size×size: an icon without a viewBox gets one from
 * its width/height (default 32, like measureRenderedBBox in svgBBox.ts), so it
 * scales instead of being cropped.
 */
function sizedSvg(content: string, size: number): string {
  const doc = new DOMParser().parseFromString(content, 'image/svg+xml');
  const svg = doc.documentElement;
  if (doc.querySelector('parsererror') || svg.localName !== 'svg') throw new Error('Not a valid SVG');
  if (!svg.getAttribute('viewBox')) {
    const w = parseFloat(svg.getAttribute('width') ?? '') || 32;
    const h = parseFloat(svg.getAttribute('height') ?? '') || 32;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  return new XMLSerializer().serializeToString(svg);
}

/**
 * Draw an SVG onto a transparent size×size canvas. The SVG is only ever loaded
 * as an <img> from a data URL, so scripts don't run and external references
 * don't load. Browser only.
 */
export async function rasterizeToCanvas(content: string, size: number): Promise<HTMLCanvasElement> {
  const img = await loadImage(svgDataUrl(sizedSvg(content, size)));
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D is not available');
  ctx.drawImage(img, 0, 0, size, size);
  return canvas;
}

/** Pixels of the SVG drawn at size×size on a transparent background */
export async function rasterize(content: string, size: number): Promise<ImageData> {
  const canvas = await rasterizeToCanvas(content, size);
  return canvas.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, size, size);
}

// PNG URLs are reused by every view showing the same icon at the same size
const urlCache = new Map<string, Promise<string>>();
const MAX_CACHED = 400;

/** PNG data URL of the SVG drawn at size×size, for pixel-accurate display with image-rendering: pixelated */
export function rasterUrl(content: string, size: number): Promise<string> {
  const key = `${size}\0${content}`;
  const hit = urlCache.get(key);
  if (hit) return hit;
  const promise = rasterizeToCanvas(content, size).then(c => c.toDataURL('image/png'));
  // A failed render may succeed later (e.g. fonts loading), so don't keep failures
  promise.catch(() => urlCache.delete(key));
  if (urlCache.size >= MAX_CACHED) urlCache.delete(urlCache.keys().next().value!);
  urlCache.set(key, promise);
  return promise;
}
