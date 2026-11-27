// Ports of the folder rules in vscode-icons' svglint config (folder-shape, folder-margins, folder-icon-overlay).
// Browser only: geometry is measured on SVG elements attached to the page.

import type { SvgItem } from '@/types/diff';
import { DEFAULT_THRESHOLD, diffPixels } from '@/utils/pixelDiff';
import { rasterize } from '@/utils/rasterize';
import { SVG_NAMESPACE } from '@/utils/svgLint';

export const LINT_FOLDER_ICON = /^(?:folder_type_.+|default_(?:root_)?folder(?:_opened)?)\.svg$/;

/** The other variant (closed ↔ opened) of a folder icon's path, or null for other icons */
export function folderVariantPath(path: string): string | null {
  const name = path.split('/').pop() ?? '';
  if (!LINT_FOLDER_ICON.test(name)) return null;
  const other = name.endsWith('_opened.svg')
    ? name.replace(/_opened\.svg$/, '.svg')
    : name.replace(/\.svg$/, '_opened.svg');
  return path.slice(0, path.length - name.length) + other;
}

// vscode-icons' icons/default_folder.svg and default_folder_opened.svg
const DEFAULT_FOLDER = {
  closed: {
    name: 'default_folder.svg',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="#c09553" d="M27.5 5.5h-9.3l-2.1 4.2H4.4v16.8h25.2v-21Zm0 4.2h-8.2l1.1-2.1h7.1Z"/></svg>',
  },
  opened: {
    name: 'default_folder_opened.svg',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="#dcb67a" d="M27.5 5.5h-9.3l-2.1 4.2H4.4v16.8h25.2v-21Zm0 18.7H6.6V11.8h20.8Zm0-14.5h-8.2l1.1-2.1h7.1Z"/><path fill="#dcb67a" d="M25.7 13.7H.5l3.8 12.8h25.2z"/></svg>',
  },
};

const ARTWORK = 'path, rect, circle, ellipse, line, polyline, polygon, text, use, image';
const NON_ARTWORK = 'defs, clipPath, mask, pattern, marker, symbol';
// Points compared along each path; the lint compares resvg-normalized path data instead
const PATH_SAMPLES = 64;
const PATH_TOLERANCE = 0.01;
const EDGE_TOLERANCE = 0.001;

export interface FolderLintResult {
  template: string;
  /** The first artwork elements are the default folder's paths */
  shapeMatches: boolean;
  /** Edges of the folder shape that differ from the default; null when it isn't visible */
  edgeMismatches: string[] | null;
}

const parse = (svg: string) => new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;

function artworks(root: Element): Element[] {
  return Array.from(root.querySelectorAll(ARTWORK)).filter(el => !el.parentElement?.closest(NON_ARTWORK));
}

/** Runs fn on a hidden copy of root attached to the page, where SVG geometry can be measured */
function measure<T>(root: Element, fn: (svg: SVGSVGElement) => T): T | null {
  const svg = document.importNode(root, true);
  if (!(svg instanceof SVGSVGElement)) return null;
  svg.setAttribute('width', '32');
  svg.setAttribute('height', '32');
  Object.assign(svg.style, { position: 'absolute', left: '-9999px', top: '0', visibility: 'hidden' });
  document.body.append(svg);
  try {
    return fn(svg);
  } finally {
    svg.remove();
  }
}

function samePath(a: string, b: string): boolean {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  for (const d of [a, b]) {
    const path = document.createElementNS(SVG_NAMESPACE, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return (
    measure(svg, host => {
      const [pa, pb] = Array.from(host.querySelectorAll('path'));
      const [la, lb] = [pa.getTotalLength(), pb.getTotalLength()];
      if (Math.abs(la - lb) > PATH_TOLERANCE * PATH_SAMPLES) return false;
      for (let i = 0; i <= PATH_SAMPLES; i++) {
        const p = pa.getPointAtLength((la * i) / PATH_SAMPLES);
        const q = pb.getPointAtLength((lb * i) / PATH_SAMPLES);
        if (Math.hypot(p.x - q.x, p.y - q.y) > PATH_TOLERANCE) return false;
      }
      return true;
    }) ?? false
  );
}

function folderEdges(root: Element, folderLength: number) {
  const copy = root.cloneNode(true) as Element;
  artworks(copy)
    .slice(folderLength)
    .forEach(el => el.remove());
  const box = measure(copy, svg => svg.getBBox());
  if (!box || (box.width === 0 && box.height === 0)) return null;
  return { top: box.y, right: box.x + box.width, bottom: box.y + box.height };
}

/** Null for icons the folder rules don't apply to, or that don't parse */
export function lintFolder(content: string, filename: string): FolderLintResult | null {
  const name = filename.split('/').pop() ?? '';
  if (!LINT_FOLDER_ICON.test(name) || typeof document === 'undefined') return null;
  const root = parse(content);
  if (root.querySelector('parsererror') || root.localName !== 'svg') return null;

  const template = DEFAULT_FOLDER[name.includes('opened') ? 'opened' : 'closed'];
  const templateRoot = parse(template.svg);
  const expected = artworks(templateRoot);
  const folder = artworks(root).slice(0, expected.length);
  const shapeMatches =
    folder.length === expected.length &&
    folder.every((el, i) => {
      const d = el.getAttribute('d');
      return el.nodeName === expected[i].nodeName && !!d && samePath(d, expected[i].getAttribute('d')!);
    });

  const edges = folderEdges(root, expected.length);
  const expectedEdges = folderEdges(templateRoot, expected.length);
  const edgeMismatches =
    edges && expectedEdges
      ? (Object.keys(edges) as (keyof typeof edges)[]).filter(
          edge => Math.abs(edges[edge] - expectedEdges[edge]) > EDGE_TOLERANCE,
        )
      : null;

  return { template: template.name, shapeMatches, edgeMismatches };
}

/** A folder icon with its other variant taken from the same set, when that set has it */
export function withFolderVariant(item: SvgItem, items: SvgItem[]): SvgItem {
  const variantName = folderVariantPath(item.name);
  if (!variantName) return item;
  return { ...item, variant: items.find(i => i.name === variantName)?.content };
}

/**
 * - `match`, `none`: the same overlay in both variants, or none in either
 * - `invisible`: only one variant has an overlay, or one of them can't be seen
 * - `different`: the overlays differ
 * - `no-variant`: the other variant doesn't exist, so the lint skips the rule
 * - `not-loaded`: the other variant wasn't available, or one of them doesn't parse
 */
export type FolderOverlay = 'match' | 'none' | 'invisible' | 'different' | 'no-variant' | 'not-loaded';

// Overlays are compared as renders; the lint compares resvg's normalized trees
const OVERLAY_RENDER_SIZE = 128;

function overlayOf(content: string, opened: boolean) {
  const root = parse(content);
  if (root.querySelector('parsererror') || root.localName !== 'svg') return null;
  const folderLength = artworks(parse(DEFAULT_FOLDER[opened ? 'opened' : 'closed'].svg)).length;
  const elements = artworks(root);
  elements.slice(0, folderLength).forEach(el => el.remove());
  const box = measure(root, svg => svg.getBBox());
  return {
    hasOverlay: elements.length > folderLength,
    visible: !!box && (box.width > 0 || box.height > 0),
    svg: new XMLSerializer().serializeToString(root),
  };
}

/** Whether a folder icon and its other variant carry the same overlay. `variant` is that variant's content:
 *  null when it doesn't exist, undefined when it isn't known. Undefined for icons that aren't folders. */
export async function lintFolderOverlay(
  content: string,
  filename: string,
  variant: string | null | undefined,
): Promise<FolderOverlay | undefined> {
  if (!folderVariantPath(filename) || typeof document === 'undefined') return undefined;
  if (variant === null) return 'no-variant';
  if (variant === undefined) return 'not-loaded';

  const opened = filename.endsWith('_opened.svg');
  const self = overlayOf(content, opened);
  const other = overlayOf(variant, !opened);
  if (!self || !other) return 'not-loaded';
  if (self.hasOverlay !== other.hasOverlay || (self.hasOverlay && (!self.visible || !other.visible))) {
    return 'invisible';
  }
  if (!self.hasOverlay) return 'none';
  const [a, b] = await Promise.all([
    rasterize(self.svg, OVERLAY_RENDER_SIZE),
    rasterize(other.svg, OVERLAY_RENDER_SIZE),
  ]);
  return diffPixels(a, b, DEFAULT_THRESHOLD).changed === 0 ? 'match' : 'different';
}

export const FOLDER_OVERLAY_MAX = { width: 28, height: 23 };
// Same sampling as the lint: 16 samples per px, with one sample of slack for rasterization
const OVERLAY_SIZE_SCALE = 16;
export const OVERLAY_SIZE_TOLERANCE = 1 / OVERLAY_SIZE_SCALE;

/** Rendered width and height (px) of a folder icon's overlay. Null when it has none (or it can't be seen),
 *  undefined for icons that aren't folders or don't parse. */
export async function measureFolderOverlay(
  content: string,
  filename: string,
): Promise<{ width: number; height: number } | null | undefined> {
  if (!folderVariantPath(filename) || typeof document === 'undefined') return undefined;
  const overlay = overlayOf(content, filename.endsWith('_opened.svg'));
  if (!overlay) return undefined;
  if (!overlay.hasOverlay) return null;

  const size = 32 * OVERLAY_SIZE_SCALE;
  const { data } = await rasterize(overlay.svg, size);
  let [left, right, top, bottom] = [size, -1, size, -1];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (data[(y * size + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) return null;
  return { width: (right - left + 1) / OVERLAY_SIZE_SCALE, height: (bottom - top + 1) / OVERLAY_SIZE_SCALE };
}
