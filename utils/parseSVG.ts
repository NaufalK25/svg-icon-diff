import { IconMetadata } from '@/types/icon';
import { measureRenderedBBox } from '@/utils/svgBBox';

/** Async because margins are measured by rendering the icon to pixels. */
export async function parseSVGMetadata(svgContent: string): Promise<IconMetadata> {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svg = doc.documentElement;

    if (svg.tagName === 'parsererror') {
      throw new Error('Failed to parse SVG');
    }

    const width = parseFloat(svg.getAttribute('width') || '0') || null;
    const height = parseFloat(svg.getAttribute('height') || '0') || null;
    const viewBox = svg.getAttribute('viewBox');
    const preserveAspectRatio = svg.getAttribute('preserveAspectRatio');

    const pathCount = svg.querySelectorAll('path').length;
    const circleCount = svg.querySelectorAll('circle').length;
    const rectCount = svg.querySelectorAll('rect').length;
    const polygonCount = svg.querySelectorAll('polygon').length;
    const useCount = svg.querySelectorAll('use').length;
    const groupCount = svg.querySelectorAll('g').length;

    const hasInlineStyles = !!svg.querySelector('[style]');
    // <foreignObject> can embed arbitrary HTML (incl. raster <img>) — not pure vector
    const hasRasterImages = !!svg.querySelector('image, foreignObject');

    const colors = extractColors(svgContent);

    const hasHardcodedColors = colors.some(c => c && c !== 'none' && c !== 'currentColor');

    // Trailing newline(s) are tracked separately from real line breaks
    const { lineCount, hasTrailingNewline } = countLines(svgContent);

    const unneededAttributes = findUnneededAttributes(svg);

    const marginInfo = await calculateMarginAndCentering(svgContent);

    return {
      filename: '',
      path: '',
      width,
      height,
      viewBox,
      preserveAspectRatio,
      pathCount,
      circleCount,
      rectCount,
      polygonCount,
      useCount,
      groupCount,
      hasInlineStyles,
      hasRasterImages,
      hasHardcodedColors,
      lineCount,
      hasTrailingNewline,
      unneededAttributes,
      ...marginInfo,
      colors,
    };
  } catch (err) {
    console.error('[parseSVG] parsing error:', err);
    return {
      filename: '',
      path: '',
      width: null,
      height: null,
      viewBox: null,
      preserveAspectRatio: null,
      pathCount: 0,
      circleCount: 0,
      rectCount: 0,
      polygonCount: 0,
      useCount: 0,
      groupCount: 0,
      hasInlineStyles: false,
      hasRasterImages: false,
      hasHardcodedColors: false,
      isCentered: false,
      marginDetails: 'Unable to calculate',
      ...countLines(svgContent),
      unneededAttributes: [],
      colors: [],
    };
  }
}

type Side = 'left' | 'top' | 'right' | 'bottom';
const SIDES: Side[] = ['left', 'top', 'right', 'bottom'];

// Guideline: 2px margin on all sides, i.e. content inside the 28×28 area.
//  - every side ≥ 2px, judged like vscode-icons' lint (see overflowSidesOf)
//  - the LONGER side spans ≥ 20px (≤ 6px margins on that axis), else underflow
// Only the longer side is bounded — a tall narrow icon correctly has wide
// left/right margins (e.g. 19×28 → 6.5px each side).
// Everything visible counts, badges included.
const MIN_MARGIN = 2;
const MAX_LONG_SIDE_MARGIN = 6;
// Opposite margins may differ by this much (px) and still count as centered
const MAX_CENTER_OFFSET = 2;

type Measured = Record<Side, number> & {
  width: number;
  height: number;
  canvasWidth: number;
  canvasHeight: number;
  pixelSize: number;
};

/** Margins of what's VISIBLE, measured by rendering to pixels — strokes,
 *  clip-paths, masks and hidden overflow are all accounted for automatically. */
async function measure(svgContent: string): Promise<Measured | null> {
  const bbox = await measureRenderedBBox(svgContent);
  if (!bbox) return null;
  const c = bbox.canvas;
  return {
    left: bbox.x - c.x,
    top: bbox.y - c.y,
    right: c.x + c.width - (bbox.x + bbox.width),
    bottom: c.y + c.height - (bbox.y + bbox.height),
    width: bbox.width,
    height: bbox.height,
    canvasWidth: c.width,
    canvasHeight: c.height,
    pixelSize: bbox.pixelSize,
  };
}

// Overflow follows vscode-icons' icon-margin lint rule: resvg renders at 32×32
// and any pixel with alpha > 0 in the outer 2px fails. resvg anti-aliases with
// 4 samples per pixel per axis, the outermost 1/8px inside the border pixel, so
// a border pixel only gets alpha once content crosses the 2px line by 1/8px.
// The fine render's margins snap to 1/16px, which lands exactly on that point.
const RESVG_SAMPLE_INSET = 1 / 8;
const overflowSidesOf = (m: Measured) => SIDES.filter(s => m[s] < MIN_MARGIN - RESVG_SAMPLE_INSET - 1e-6);

async function calculateMarginAndCentering(
  svgContent: string,
): Promise<Pick<IconMetadata, 'isCentered' | 'marginDetails' | 'marginIssues' | 'overflowSides' | 'isUnderflow'>> {
  const noResult = (reason: string) => ({ isCentered: false, marginDetails: reason });

  if (typeof document === 'undefined') return noResult('SSR context');

  try {
    const m = await measure(svgContent);
    if (!m) return noResult('Nothing visible to measure');

    const fmt = (n: number) => n.toFixed(1);
    const marginIssues: string[] = [];

    const overflowSides = overflowSidesOf(m);
    if (overflowSides.length > 0) {
      const list = overflowSides.map(s => `${s} ${fmt(m[s])}`).join(', ');
      marginIssues.push(`Overflow ${list} (min ${MIN_MARGIN})`);
    }

    // Centered: opposite margins within MAX_CENTER_OFFSET of each other
    const offCenter = ([a, b]: [Side, Side]) => Math.abs(m[a] - m[b]) > MAX_CENTER_OFFSET;
    const unbalanced = (
      [
        ['left', 'right'],
        ['top', 'bottom'],
      ] as [Side, Side][]
    ).filter(offCenter);
    const isCentered = unbalanced.length === 0;
    for (const [a, b] of unbalanced) {
      marginIssues.push(`Off-center ${a} ${fmt(m[a])} vs ${b} ${fmt(m[b])}`);
    }

    const longSide = Math.max(m.width, m.height);
    const minLongSide = Math.min(m.canvasWidth, m.canvasHeight) - MAX_LONG_SIDE_MARGIN * 2;
    const isUnderflow = longSide < minLongSide;
    if (isUnderflow) marginIssues.push(`Underflow (min ${minLongSide})`);

    // Content size — the margins themselves are only named when they're a problem
    const marginDetails = `${fmt(m.width)}×${fmt(m.height)}`;

    return { isCentered, marginDetails, marginIssues, overflowSides, isUnderflow };
  } catch (err) {
    console.error('[parseSVG] margin calculation error:', err);
    return noResult('Error calculating margin');
  }
}

export function extractColors(svgContent: string): string[] {
  const colors = new Set<string>();

  const patterns = [
    // Attribute values: fill="…", stroke="…", stop-color="…"
    /fill\s*=\s*["']([^"']+)["']/gi,
    /stroke\s*=\s*["']([^"']+)["']/gi,
    /stop-color\s*=\s*["']([^"']+)["']/gi,
    // CSS property inside style="…" or <style> blocks: fill:…; stroke:…; color:…;
    /(?:fill|stroke|color|stop-color)\s*:\s*([^;,"'\s)]+)/gi,
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(svgContent)) !== null) {
      const color = match[1]?.trim();
      if (color) colors.add(color);
    }
  });

  return Array.from(colors).slice(0, 10);
}

// The only attributes the root <svg> may carry
const ROOT_ALLOWED = new Set(['xmlns', 'viewBox']);
// Editor / exporter leftovers (Inkscape, Sodipodi, Sketch, Affinity Serif)
const EDITOR_PREFIX = /^(inkscape|sodipodi|sketch|serif):/;

/**
 * List attributes that are removable or misplaced.
 * The root <svg> may only carry xmlns and viewBox — anything else is flagged,
 * since presentation attributes (fill, xml:space, …) can move to a wrapping <g>.
 * On other elements an attribute is only flagged when it is provably unneeded:
 *  - id         → only if nothing references it (url(#id), href="#id", <style>)
 *  - fill-rule  → only the default "nonzero" (evenodd changes rendering)
 *  - clip-rule  → the default "nonzero", or anywhere outside a <clipPath>
 *  - xmlns:xlink → only if no xlink:* attribute is used
 *  - xml:space  → only if there is no <text>
 *  - class      → if there is no <style>, or per class name the <style> never selects
 * Returns one entry per kind, e.g. `id ×3 (unreferenced)`.
 */
function findUnneededAttributes(svg: Element): string[] {
  const elements = [svg, ...Array.from(svg.querySelectorAll('*'))];
  const found = new Map<string, number>();
  const flag = (label: string) => found.set(label, (found.get(label) ?? 0) + 1);

  // Everything that can reference an id
  const styleText = Array.from(svg.querySelectorAll('style'))
    .map(s => s.textContent ?? '')
    .join('\n');
  const referenced = new Set<string>();
  const collectRefs = (text: string) => {
    for (const m of text.matchAll(/url\(\s*['"]?#([^'")\s]+)/g)) referenced.add(m[1]);
  };
  collectRefs(styleText);
  // "#id" selectors — only outside { } blocks, so hex colors like #fff don't count
  const selectorText = styleText.replace(/\{[^}]*\}/g, ' ');
  for (const m of selectorText.matchAll(/#(-?[_a-zA-Z][\w-]*)/g)) referenced.add(m[1]);

  let usesXlink = false;
  for (const el of elements) {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('xlink:')) usesXlink = true;
      if (attr.name === 'href' || attr.name === 'xlink:href') {
        if (attr.value.startsWith('#')) referenced.add(attr.value.slice(1));
      } else {
        collectRefs(attr.value);
      }
    }
  }

  const hasText = !!svg.querySelector('text');
  const hasStyle = styleText.trim().length > 0;
  // Class names used by the stylesheet (".cls-1" selectors)
  const styledClasses = new Set(Array.from(selectorText.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g), m => m[1]));

  for (const { name } of Array.from(svg.attributes)) {
    if (!ROOT_ALLOWED.has(name)) flag(`${name} on <svg>`);
  }

  for (const el of elements.slice(1)) {
    const inClipPath = !!el.closest('clipPath');
    for (const { name, value } of Array.from(el.attributes)) {
      const v = value.trim();
      if (name === 'xmlns:xlink') {
        if (!usesXlink) flag('xmlns:xlink (no xlink used)');
      } else if (name.startsWith('xmlns:')) flag(`${name} (editor namespace)`);
      else if (EDITOR_PREFIX.test(name)) flag(`${name.split(':')[0]}:* (editor data)`);
      else if (name.startsWith('data-')) flag('data-* (editor data)');
      else if (name === 'xml:space') {
        if (!hasText) flag('xml:space');
      } else if (name === 'id') {
        if (!referenced.has(v)) flag(`id "${v}" (unreferenced)`);
      } else if (name === 'class') {
        if (!hasStyle) flag('class (no <style>)');
        else {
          for (const cls of v.split(/\s+/).filter(Boolean)) {
            if (!styledClasses.has(cls)) flag(`class "${cls}" (not in <style>)`);
          }
        }
      } else if (name === 'fill-rule') {
        if (v === 'nonzero') flag('fill-rule="nonzero" (default)');
      } else if (name === 'clip-rule') {
        if (v === 'nonzero') flag('clip-rule="nonzero" (default)');
        else if (!inClipPath) flag('clip-rule (outside <clipPath>)');
      }
    }
  }

  return Array.from(found, ([label, n]) => (n > 1 ? `${label} ×${n}` : label));
}

function countLines(content: string): { lineCount: number; hasTrailingNewline: boolean } {
  const body = content.replace(/(?:\r\n|\r|\n)+$/, '');
  return {
    lineCount: body.split(/\r\n|\r|\n/).length,
    hasTrailingNewline: body.length !== content.length,
  };
}

export function estimateSVGQualityScore(metadata: IconMetadata): number {
  let score = 0;

  if (metadata.width && metadata.height) score += 1;
  if (metadata.viewBox) score += 1;
  if (metadata.viewBox?.startsWith('0 0')) score += 1;
  if (metadata.width && metadata.height && Math.abs(metadata.width - metadata.height) < metadata.width * 0.1)
    score += 1;
  if (!metadata.hasInlineStyles) score += 1;
  if (!metadata.hasRasterImages) score += 1;
  if (!metadata.hasHardcodedColors) score += 1;
  if (metadata.lineCount === 1 && metadata.hasTrailingNewline) score += 1;

  return Math.min(score, 8);
}
