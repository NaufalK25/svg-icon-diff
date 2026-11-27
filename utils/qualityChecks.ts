import type { SVGMetadata } from '@/types/icon';
import { LINT_FOLDER_ICON, lintFolder } from '@/utils/folderLint';
import { EXPECTED_VIEWBOX, lintSvg, SVG_NAMESPACE } from '@/utils/svgLint';

/**
 * Single source of truth for every quality check. Adding or removing an entry
 * here updates the check type, filter tabs, stats breakdown and the
 * max score. `name` is the checklist title, `label` the filter tab text, and
 * `short` the compact stats label. Every key must be emitted by performQualityChecks.
 */
export const QUALITY_CHECKS = [
  // Match vscode-icons' svglint rules (see utils/svgLint.ts): these fail exactly when the lint does
  { key: 'viewbox', name: 'viewBox 0 0 32 32', label: 'ViewBox', short: 'ViewBox' },
  { key: 'root_attrs', name: 'Only xmlns and viewBox on <svg>', label: 'Root Attributes', short: 'Root' },
  { key: 'no_extras', name: 'No comments or metadata', label: 'No Extras', short: 'Extras' },
  { key: 'vector_only', name: 'Vector only', label: 'Vector Only', short: 'Vector' },
  { key: 'inline_style', name: 'No inline styles', label: 'No Inline Styles', short: 'Style' },
  { key: 'editor_attrs', name: 'No editor attributes', label: 'No Editor Attributes', short: 'Editor' },
  { key: 'precision', name: 'Numeric precision', label: 'Numeric Precision', short: 'Precision' },
  { key: 'trailing_newline', name: 'Trailing newline', label: 'Trailing Newline', short: 'Newline' },
  { key: 'margin', name: '2px margin', label: '2px Margin', short: 'Margin' },
  { key: 'folder_shape', name: 'Default folder shape', label: 'Folder Shape', short: 'Folder' },
  // Guidelines the lint doesn't check
  { key: 'centered', name: 'Centered', label: 'Centered', short: 'Center' },
  { key: 'single_line', name: 'Single line', label: 'Single Line', short: '1 line' },
  { key: 'filesize', name: 'Size < 2KB', label: 'File Size < 2KB', short: '< 2KB' },
  { key: 'clean_attrs', name: 'No removable attributes', label: 'Clean Attributes', short: 'Attrs' },
] as const;

export type QualityCheckType = (typeof QUALITY_CHECKS)[number]['key'];

/** One point per check, so the max score follows the number of checks. */
export const MAX_QUALITY_SCORE = QUALITY_CHECKS.length;

const LINT_KEYS: QualityCheckType[] = [
  'viewbox',
  'root_attrs',
  'no_extras',
  'vector_only',
  'inline_style',
  'editor_attrs',
  'precision',
  'trailing_newline',
];
const MAX_LISTED_NUMBERS = 5;

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

  const lint = lintSvg(metadata.content);
  if (!lint) {
    for (const key of LINT_KEYS) add(key, 'fail', 'The SVG does not parse');
  } else {
    if (lint.viewBox === EXPECTED_VIEWBOX) add('viewbox', 'pass', lint.viewBox);
    else
      add(
        'viewbox',
        'fail',
        lint.viewBox === null ? 'Missing viewBox' : `"${lint.viewBox}" (must be exactly "${EXPECTED_VIEWBOX}")`,
      );

    const lintCheck = (key: QualityCheckType, problems: string[], passDetails: string, prefix: string) =>
      problems.length === 0 ? add(key, 'pass', passDetails) : add(key, 'fail', `${prefix}: ${problems.join(', ')}`);

    lintCheck('root_attrs', lint.rootAttributes, `xmlns="${SVG_NAMESPACE}" and viewBox only`, 'Found');
    lintCheck('no_extras', lint.extras, 'No comments, <title>, <desc>, <metadata>, <script> or empty <defs>', 'Found');
    lintCheck('vector_only', lint.embedded, 'No embedded or raster images', 'Found');
    lintCheck(
      'inline_style',
      lint.styleProperties,
      'style="" holds only isolation or mix-blend-mode, if any',
      'Use presentation attributes instead of style="" for',
    );
    lintCheck('editor_attrs', lint.editorAttributes, 'No Inkscape, Sodipodi, Illustrator or Sketch data', 'Found');
    const shown = lint.impreciseNumbers.slice(0, MAX_LISTED_NUMBERS);
    const more = lint.impreciseNumbers.length - shown.length;
    lintCheck(
      'precision',
      more > 0 ? [...shown, `+${more} more`] : shown,
      'At most 3 decimals (5 in scale() and matrix())',
      'Too many decimals',
    );
    if (lint.hasTrailingNewline) add('trailing_newline', 'pass', 'Ends with a newline');
    else add('trailing_newline', 'fail', 'Missing a newline at the end of the file');
  }

  const folder = lintFolder(metadata.content, metadata.filename);
  if (!folder) {
    add('folder_shape', 'pass', 'Not a folder icon');
  } else {
    const problems = [
      !folder.shapeMatches && `First paths are not the folder from ${folder.template}`,
      folder.edgeMismatches === null
        ? 'Folder shape is not visible'
        : folder.edgeMismatches.length > 0 &&
          `Edges differ from ${folder.template}: ${folder.edgeMismatches.join(', ')}`,
    ].filter(Boolean);
    if (problems.length === 0) add('folder_shape', 'pass', `Same folder shape and edges as ${folder.template}`);
    else add('folder_shape', 'fail', problems.join('; '));
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

  // Folder icons follow the default folder's layout: the lint skips their left margin
  // (the folder starts there), and centering and underflow don't apply
  const isFolderIcon = LINT_FOLDER_ICON.test(metadata.filename.split('/').pop() ?? '');
  if (isFolderIcon && metadata.overflowSides) {
    const overflow = metadata.overflowSides.filter(side => side !== 'left');
    const note = `left is not checked for folder icons · ${metadata.marginDetails}`;
    if (overflow.length > 0) add('margin', 'fail', `Overflow ${overflow.join(', ')} (${note})`);
    else add('margin', 'pass', `OK (${note})`);
    add('centered', 'pass', `Not applicable to folder icons (${metadata.marginDetails})`);
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

  // Line breaks before the final newline (that one is the trailing_newline check)
  if (typeof metadata.lineCount !== 'number') {
    add('single_line', 'warning', 'Line count unknown — re-analyze this icon');
  } else if (metadata.lineCount > 1) {
    add('single_line', 'fail', `${metadata.lineCount} lines (more than 1 line)`);
  } else {
    add('single_line', 'pass', 'Single line');
  }

  // Removable attributes inside the icon only warn and still count as a pass;
  // the root and editor attributes are root_attrs and editor_attrs
  const unneeded = Array.isArray(metadata.unneededAttributes) ? metadata.unneededAttributes : null;
  if (!unneeded) {
    add('clean_attrs', 'warning', 'Not checked yet — re-analyze this icon');
  } else if (unneeded.length === 0) {
    add('clean_attrs', 'pass', 'No removable attributes');
  } else {
    add('clean_attrs', 'warning', `Removable: ${unneeded.join(', ')}`, true);
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
