// Ports of the vscode-icons svglint rules (svglint.config.mjs), so a failing check here fails the repo's lint

export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
export const EXPECTED_VIEWBOX = '0 0 32 32';
export const LINT_EDITOR_ATTRIBUTE = /^(?:xmlns:)?(?:inkscape|sodipodi|illustrator|sketch)(?::|$)/i;

const ROOT_ATTRIBUTES = new Set(['xmlns', 'viewbox']);
const ALLOWED_STYLE_PROPERTIES = new Set(['isolation', 'mix-blend-mode']);
const BANNED_ELEMENTS = new Set(['title', 'desc', 'metadata', 'script']);
const EMBEDDED_ELEMENTS = new Set(['image', 'feimage', 'foreignobject']);

const RASTER_DATA_URI = /\bdata:image\/(?!svg\+xml(?:[;,]|$))/i;
const URL_REFERENCE = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi;
const RASTER_FILE = /\.(?:apng|avif|bmp|gif|heic|heif|ico|jpe?g|jxl|png|tiff?|webp)(?:[?#].*)?$/i;

const FLOAT_PRECISION = 3;
const TRANSFORM_PRECISION = 5;
const NUMERIC_ATTRIBUTES = new Set(['d', 'dx', 'dy', 'enable-background', 'points', 'stroke-dasharray', 'x', 'y']);
const TRANSFORM_ATTRIBUTES = new Set(['gradienttransform', 'patterntransform', 'transform']);
const NUMBER = /[-+]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?/g;
const NUMERIC_VALUE = /^[-+]?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?(?:px|pt|pc|mm|cm|m|in|ft|em|ex|%)?$/i;
const TRANSFORM_FUNCTION = /([a-z]+)\s*\(([^)]*)\)/gi;

export interface SvgLintResult {
  /** The root's viewBox exactly as written, or null when missing */
  viewBox: string | null;
  /** Root problems: a missing or wrong xmlns, attributes other than xmlns and viewBox */
  rootAttributes: string[];
  /** Comments, <title>, <desc>, <metadata>, <script> and empty <defs> */
  extras: string[];
  /** <image>, <feImage>, <foreignObject> and raster references */
  embedded: string[];
  /** style="" properties other than isolation and mix-blend-mode */
  styleProperties: string[];
  editorAttributes: string[];
  /** Numbers with more decimals than allowed */
  impreciseNumbers: string[];
  hasTrailingNewline: boolean;
}

function decimalPlaces(token: string): number {
  const [mantissa, exponent = '0'] = token.split(/[eE]/);
  return Math.max(0, (mantissa.split('.')[1]?.length ?? 0) - Number(exponent));
}

function hasRasterReference(value: string): boolean {
  return (
    RASTER_DATA_URI.test(value) ||
    Array.from(value.matchAll(URL_REFERENCE)).some(([, double, single, bare]) =>
      RASTER_FILE.test((double ?? single ?? bare).trim()),
    )
  );
}

function impreciseNumbersIn(name: string, value: string): string[] {
  const tooPrecise = (token: string, precision: number) => decimalPlaces(token) > precision;
  if (TRANSFORM_ATTRIBUTES.has(name)) {
    return Array.from(value.matchAll(TRANSFORM_FUNCTION)).flatMap(([, fn, args]) => {
      const f = fn.toLowerCase();
      return Array.from(args.matchAll(NUMBER), m => m[0]).filter((token, i) =>
        tooPrecise(token, f === 'scale' || (f === 'matrix' && i < 4) ? TRANSFORM_PRECISION : FLOAT_PRECISION),
      );
    });
  }
  if (!NUMERIC_ATTRIBUTES.has(name) && !NUMERIC_VALUE.test(value)) return [];
  return Array.from(value.matchAll(NUMBER), m => m[0]).filter(token => tooPrecise(token, FLOAT_PRECISION));
}

/** Counts repeated labels into one entry each, e.g. `<title> ×2` */
function tally(labels: string[]): string[] {
  const counts = new Map<string, number>();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  return Array.from(counts, ([label, n]) => (n > 1 ? `${label} ×${n}` : label));
}

/** Browser only (DOMParser). Null when the content doesn't parse. */
export function lintSvg(content: string): SvgLintResult | null {
  const doc = new DOMParser().parseFromString(content, 'image/svg+xml');
  if (doc.querySelector('parsererror')) return null;
  const root = doc.documentElement;

  const rootAttributes: string[] = [];
  const xmlns = root.getAttribute('xmlns');
  if (xmlns !== SVG_NAMESPACE) rootAttributes.push(xmlns === null ? 'missing xmlns' : `xmlns="${xmlns}"`);
  for (const { name } of Array.from(root.attributes)) {
    if (!ROOT_ATTRIBUTES.has(name.toLowerCase())) rootAttributes.push(name);
  }
  const viewBoxAttribute = Array.from(root.attributes).find(a => a.name.toLowerCase() === 'viewbox');

  const extras: string[] = [];
  const embedded: string[] = [];
  const styleProperties = new Set<string>();
  const editorAttributes: string[] = [];
  const impreciseNumbers = new Set<string>();
  let rasterReferences = 0;

  const visit = (node: Node) => {
    if (node.nodeType === Node.COMMENT_NODE) extras.push('comment');
    if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE) {
      if (hasRasterReference(node.nodeValue ?? '')) rasterReferences++;
    }
    if (node instanceof Element) {
      const name = node.nodeName;
      if (BANNED_ELEMENTS.has(name)) extras.push(`<${name}>`);
      if (name === 'defs' && node.children.length === 0) extras.push('empty <defs>');
      if (EMBEDDED_ELEMENTS.has(name.toLowerCase())) embedded.push(`<${name}>`);
      for (const { name: attribute, value } of Array.from(node.attributes)) {
        const lower = attribute.toLowerCase();
        if (LINT_EDITOR_ATTRIBUTE.test(attribute)) editorAttributes.push(attribute);
        if (hasRasterReference(value)) rasterReferences++;
        if (lower === 'style') {
          for (const declaration of value.split(';')) {
            const property = declaration.split(':')[0].trim().toLowerCase();
            if (property && !ALLOWED_STYLE_PROPERTIES.has(property)) styleProperties.add(property);
          }
        }
        for (const token of impreciseNumbersIn(lower, value)) impreciseNumbers.add(token);
      }
    }
    node.childNodes.forEach(visit);
  };
  doc.childNodes.forEach(visit);

  if (rasterReferences > 0)
    embedded.push(rasterReferences > 1 ? `raster reference ×${rasterReferences}` : 'raster reference');

  return {
    viewBox: viewBoxAttribute?.value ?? null,
    rootAttributes,
    extras: tally(extras),
    embedded: tally(embedded),
    styleProperties: Array.from(styleProperties),
    editorAttributes: tally(editorAttributes),
    impreciseNumbers: Array.from(impreciseNumbers),
    hasTrailingNewline: content.endsWith('\n'),
  };
}
