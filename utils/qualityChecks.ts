import type { SVGMetadata } from '@/types/icon';

/**
 * Single source of truth for every quality check. Adding or removing an entry
 * here updates the check type, filter tabs, stats breakdown and the
 * max score. `name` is the checklist title, `label` the filter tab text, and
 * `short` the compact stats label. Every key must be emitted by performQualityChecks.
 */
export const QUALITY_CHECKS = [
  { key: 'dimensions', name: '32×32 dimensions', label: '32×32 Dimensions', short: '32×32' },
  { key: 'viewbox', name: 'ViewBox attribute', label: 'ViewBox', short: 'ViewBox' },
  { key: 'origin', name: 'Origin at (0, 0)', label: 'Origin at (0,0)', short: 'Origin' },
  { key: 'filesize', name: 'Size < 2KB', label: 'File Size < 2KB', short: '< 2KB' },
  { key: 'vector_only', name: 'Vector only', label: 'Vector Only', short: 'Vector' },
  { key: 'margin', name: '2px margin', label: '2px Margin', short: 'Margin' },
  { key: 'centered', name: 'Centered', label: 'Centered', short: 'Center' },
  { key: 'single_line', name: 'Single line', label: 'Single Line', short: '1 line' },
  { key: 'clean_attrs', name: 'Clean attributes', label: 'Clean Attributes', short: 'Attrs' },
] as const;

export type QualityCheckType = (typeof QUALITY_CHECKS)[number]['key'];

/** One point per check, so the max score follows the number of checks. */
export const MAX_QUALITY_SCORE = QUALITY_CHECKS.length;

const CHECK_NAMES = Object.fromEntries(QUALITY_CHECKS.map(c => [c.key, c.name])) as Record<QualityCheckType, string>;
const CHECK_ORDER = new Map<QualityCheckType, number>(QUALITY_CHECKS.map((c, i) => [c.key, i]));

export interface QualityCheck {
  /** Stable identifier — use this instead of array position to look up a check */
  key: QualityCheckType;
  name: string;
  status: 'pass' | 'warning' | 'fail';
  details?: string;
  /** A warning that still scores and filters as a pass */
  countsAsPass?: boolean;
}

export const isPassing = (check: QualityCheck | undefined) =>
  !!check && (check.status === 'pass' || !!check.countsAsPass);

export function getCheck(checks: QualityCheck[], key: QualityCheckType): QualityCheck | undefined {
  return checks.find(c => c.key === key);
}

/**
 * Whether an icon's checks match the quality filter. "passed" means status pass,
 * "failed" means warning or fail (a countsAsPass warning counts as passed). With "and" every selected check must match,
 * with "or" any one of them is enough. No selected checks matches everything.
 */
export function matchesQualityFilter(
  checks: QualityCheck[],
  keys: readonly QualityCheckType[],
  mode: 'passed' | 'failed',
  op: 'and' | 'or',
): boolean {
  if (keys.length === 0) return true;
  const matches = (key: QualityCheckType) => isPassing(getCheck(checks, key)) === (mode === 'passed');
  return op === 'and' ? keys.every(matches) : keys.some(matches);
}

export function performQualityChecks(metadata: SVGMetadata): QualityCheck[] {
  const checks: QualityCheck[] = [];
  const add = (key: QualityCheckType, status: QualityCheck['status'], details?: string, countsAsPass?: boolean) =>
    checks.push({ key, name: CHECK_NAMES[key], status, details, ...(countsAsPass && { countsAsPass }) });

  // 32x32 dimensions (guideline requirement)
  if (metadata.width === 32 && metadata.height === 32) {
    add('dimensions', 'pass', 'Explicit dimensions match standard');
  } else if (metadata.width === null && metadata.height === null) {
    add('dimensions', 'pass', 'ViewBox-based (implicit 32×32 canvas)');
  } else {
    add('dimensions', 'fail', `Current: ${metadata.width ?? '?'}×${metadata.height ?? '?'} (incorrect)`);
  }

  // ViewBox present and normalized to "0 0 32 32", and the only thing sizing
  // the icon — explicit width/height is redundant and only warns.
  // Parse numerically so "0,0,32,32" and "0.0 0 32 32" pass
  const vbParts =
    metadata.viewBox
      ?.trim()
      .split(/[\s,]+/)
      .map(Number) ?? [];
  const isStandardViewBox =
    vbParts.length >= 4 && vbParts[0] === 0 && vbParts[1] === 0 && vbParts[2] === 32 && vbParts[3] === 32;
  const explicitSize = [
    metadata.width !== null && `width="${metadata.width}"`,
    metadata.height !== null && `height="${metadata.height}"`,
  ]
    .filter(Boolean)
    .join(' ');
  if (metadata.viewBox && isStandardViewBox && explicitSize) {
    add('viewbox', 'warning', `${metadata.viewBox}, but ${explicitSize} is set explicitly (prefer viewBox only)`);
  } else if (metadata.viewBox && isStandardViewBox) {
    add('viewbox', 'pass', metadata.viewBox);
  } else if (metadata.viewBox && explicitSize) {
    // Explicit size papers over a wrong viewBox — the canvas is still wrong
    add('viewbox', 'fail', `${metadata.viewBox} with ${explicitSize} (expected viewBox 0 0 32 32)`);
  } else if (metadata.viewBox) {
    add('viewbox', 'warning', `${metadata.viewBox} (expected 0 0 32 32)`);
  } else {
    add(
      'viewbox',
      'fail',
      explicitSize ? `Missing viewBox, sized only by ${explicitSize} (viewBox required)` : 'Missing viewBox (required)',
    );
  }

  // Origin at (0, 0)
  const originOk = vbParts.length >= 2 && vbParts[0] === 0 && vbParts[1] === 0;
  if (metadata.viewBox && originOk) {
    add('origin', 'pass', 'ViewBox correctly positioned');
  } else {
    add(
      'origin',
      'fail',
      metadata.viewBox
        ? `ViewBox must start at origin — got (${vbParts[0]}, ${vbParts[1]})`
        : 'No viewBox (cannot verify origin)',
    );
  }

  // File size < 2KB (guideline target)
  const kb = (n: number) => `${(n / 1024).toFixed(2)} KB`;
  const sizeDetails =
    metadata.gzipSize > 0 ? `${kb(metadata.byteSize)} (${kb(metadata.gzipSize)} gzipped)` : kb(metadata.byteSize);
  if (metadata.byteSize < 2048) {
    add('filesize', 'pass', sizeDetails);
  } else if (metadata.byteSize < 5120) {
    add('filesize', 'warning', `${sizeDetails} (try to reduce)`);
  } else {
    add('filesize', 'fail', `${sizeDetails} (excessive)`);
  }

  // No raster images (vector only)
  if (!metadata.hasRasterImages) {
    add('vector_only', 'pass', 'Pure SVG graphics');
  } else {
    add('vector_only', 'fail', 'Raster <image>/<foreignObject> found (incorrect)');
  }

  // 2px margin and centering — folder icons are exempt from both (folder_type_* plus
  // default_folder* / default_root_folder*, incl. _opened and light_ variants):
  // they follow the folder shape's fixed layout, not a centered 28×28 area
  const isFolderIcon = metadata.type === 'folder_type' || /^(light_)?default_(root_)?folder/.test(metadata.filename);
  if (isFolderIcon) {
    const na = `Not applicable to folder icons (${metadata.marginDetails})`;
    add('margin', 'pass', na);
    add('centered', 'pass', na);
  } else if (!metadata.overflowSides || !metadata.marginIssues) {
    const unmeasured = `Not measured (${metadata.marginDetails}) — re-analyze this icon`;
    add('margin', 'warning', unmeasured);
    add('centered', 'warning', unmeasured);
  } else {
    const issuesOf = (prefix: string) => metadata.marginIssues!.filter(i => i.startsWith(prefix));
    const withDetails = (issues: string[]) => `${issues.length ? issues.join('; ') : 'OK'} · ${metadata.marginDetails}`;

    // Margin: overflow has no tolerance and fails; underflow only warns
    const marginIssues = [...issuesOf('Overflow'), ...issuesOf('Underflow')];
    if (metadata.overflowSides.length > 0) {
      add('margin', 'fail', withDetails(marginIssues));
    } else if (metadata.isUnderflow) {
      add('margin', 'warning', withDetails(marginIssues), true);
    } else {
      add('margin', 'pass', withDetails([]));
    }

    // Centered: opposite margins already compared within a tolerance when measured
    if (metadata.isCentered) {
      add('centered', 'pass', withDetails([]));
    } else {
      add('centered', 'fail', withDetails(issuesOf('Off-center')));
    }
  }

  // Single line — must be one line ending with a trailing newline; a missing newline warns,
  // line breaks inside the content fail
  if (typeof metadata.lineCount !== 'number') {
    add('single_line', 'warning', 'Line count unknown — re-analyze this icon');
  } else if (metadata.lineCount > 1) {
    add('single_line', 'fail', `${metadata.lineCount} lines (more than 1 line)`);
  } else if (!metadata.hasTrailingNewline) {
    add('single_line', 'warning', 'Single line, but missing a trailing newline');
  } else {
    add('single_line', 'pass', 'Single line with a trailing newline');
  }

  // Clean attributes — extra attributes on the root <svg> fail; removable ones on
  // inner elements only warn and still count as a pass
  const unneeded = Array.isArray(metadata.unneededAttributes) ? metadata.unneededAttributes : null;
  const onRoot = unneeded?.filter(a => a.endsWith(' on <svg>')) ?? [];
  if (!unneeded) {
    add('clean_attrs', 'warning', 'Not checked yet — re-analyze this icon');
  } else if (unneeded.length === 0) {
    add('clean_attrs', 'pass', '<svg> has only xmlns and viewBox, no removable attributes');
  } else if (onRoot.length > 0) {
    add('clean_attrs', 'fail', `Removable: ${unneeded.join(', ')}`);
  } else {
    add('clean_attrs', 'warning', `<svg> is clean, but removable inside: ${unneeded.join(', ')}`, true);
  }

  // Keep output in registry order regardless of the order checks run in
  return checks.sort((a, b) => CHECK_ORDER.get(a.key)! - CHECK_ORDER.get(b.key)!);
}

/** Score 0–MAX_QUALITY_SCORE: full point per pass (or countsAsPass warning), half point per other warning.
 *  Rounded down, so any non-passing check keeps the icon below a perfect score. */
export function calculateQualityScore(checks: QualityCheck[]): number {
  let score = 0;
  checks.forEach(check => {
    if (isPassing(check)) score += 1;
    else if (check.status === 'warning') score += 0.5;
  });
  return Math.floor(score);
}

/** Fraction of the max score achieved, 0–1. */
export function getQualityRatio(score: number, max: number = MAX_QUALITY_SCORE): number {
  return max > 0 ? Math.min(Math.max(score / max, 0), 1) : 0;
}

export type QualityTier = 'good' | 'ok' | 'poor';

/** Good ≥ 80%, OK ≥ 60%, otherwise poor. */
export function getQualityTier(score: number, max: number = MAX_QUALITY_SCORE): QualityTier {
  const ratio = getQualityRatio(score, max);
  if (ratio >= 0.8) return 'good';
  if (ratio >= 0.6) return 'ok';
  return 'poor';
}

// Ten-step palettes from worst to best; the score is mapped onto them by ratio
// so they stay valid however many checks exist.
const BG_STEPS = [
  'bg-red-900/40 border-red-700/40',
  'bg-red-800/40 border-red-700/40',
  'bg-red-700/40 border-red-600/40',
  'bg-orange-600/40 border-orange-500/40',
  'bg-orange-500/40 border-orange-400/40',
  'bg-yellow-600/40 border-yellow-500/40',
  'bg-yellow-500/40 border-yellow-400/40',
  'bg-lime-600/40 border-lime-500/40',
  'bg-lime-500/40 border-lime-400/40',
  'bg-green-500/40 border-green-400/40',
];

const BORDER_STEPS = [
  'border-red-900/60',
  'border-red-800/60',
  'border-red-700/60',
  'border-orange-600/60',
  'border-orange-500/60',
  'border-yellow-600/60',
  'border-yellow-500/60',
  'border-lime-600/60',
  'border-lime-500/60',
  'border-green-500/60',
];

const GLOW_STEPS = [
  'shadow-red-900/20',
  'shadow-red-800/20',
  'shadow-red-700/20',
  'shadow-orange-600/20',
  'shadow-orange-500/20',
  'shadow-yellow-600/20',
  'shadow-yellow-500/20',
  'shadow-lime-600/20',
  'shadow-lime-500/20',
  'shadow-green-500/20',
];

/** Only a perfect score reaches the last (green) step. */
function pickStep(steps: string[], score: number, max: number): string {
  const ratio = getQualityRatio(score, max);
  if (ratio >= 1) return steps[steps.length - 1];
  return steps[Math.min(Math.floor(ratio * (steps.length - 1)), steps.length - 2)];
}

export function getQualityBgColor(score: number, max: number = MAX_QUALITY_SCORE): string {
  return pickStep(BG_STEPS, score, max);
}

export function getQualityBorderColor(score: number, max: number = MAX_QUALITY_SCORE): string {
  return pickStep(BORDER_STEPS, score, max);
}

export function getQualityGlowColor(score: number, max: number = MAX_QUALITY_SCORE): string {
  return pickStep(GLOW_STEPS, score, max);
}
