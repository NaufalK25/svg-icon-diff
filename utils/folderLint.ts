// Ports of the folder rules in vscode-icons' svglint config (folder-shape, folder-margins).
// Browser only: geometry is measured on SVG elements attached to the page.

import { SVG_NAMESPACE } from '@/utils/svgLint';

export const LINT_FOLDER_ICON = /^(?:folder_type_.+|default_(?:root_)?folder(?:_opened)?)\.svg$/;

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
