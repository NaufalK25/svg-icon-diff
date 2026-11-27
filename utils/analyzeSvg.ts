import type { SVGMetadata } from '@/types/icon';
import { folderVariantPath, lintFolderOverlay, measureFolderOverlay } from '@/utils/folderLint';
import { estimateGzipSize } from '@/utils/formatBytes';
import { parseSVGMetadata } from '@/utils/parseSVG';
import { calculateQualityScore, performQualityChecks, type QualityCheck } from '@/utils/qualityChecks';

export interface SvgAnalysis {
  metadata: SVGMetadata;
  checks: QualityCheck[];
  score: number;
  /** References to outside resources, which <img> rendering leaves out */
  externalRefs: string[];
}

/** Same as the explorer's guessIconType (utils/githubApi.ts) */
export function guessIconType(path: string): 'file_type' | 'folder_type' | 'default' {
  if (path.includes('file_type')) return 'file_type';
  if (path.includes('folder_type')) return 'folder_type';
  return 'default';
}

export function getFilenameFromPath(path: string): string {
  return path.split('/').pop() || path;
}

export const isSvgFile = (file: File) => file.name.toLowerCase().endsWith('.svg') || file.type === 'image/svg+xml';
export const looksLikeSvg = (text: string) => /<svg[\s>]/i.test(text);

/** Why content can't be used as an SVG icon, or null when it can. Browser only (DOMParser). */
export function validateSvg(content: string): string | null {
  if (!looksLikeSvg(content)) return 'no <svg> root element';
  const doc = new DOMParser().parseFromString(content, 'image/svg+xml');
  const error = doc.querySelector('parsererror');
  if (error) {
    // Firefox and Chrome put the reason in the first line of the error text
    const reason = (error.textContent ?? '').trim().split('\n')[0];
    return `parse error${reason ? ` (${reason})` : ''}`;
  }
  if (doc.documentElement.localName !== 'svg') return `root element is <${doc.documentElement.localName}>, not <svg>`;
  return null;
}

/** href / url() / @import targets that point outside the file (fonts, linked images, stylesheets) */
export function findExternalRefs(content: string): string[] {
  const refs = new Set<string>();
  for (const m of content.matchAll(/(?:xlink:)?href\s*=\s*["']([^"']+)["']/gi)) {
    if (!m[1].startsWith('#')) refs.add(m[1]);
  }
  for (const m of content.matchAll(/url\(\s*['"]?([^'")\s]+)/gi)) {
    if (!m[1].startsWith('#')) refs.add(m[1]);
  }
  for (const m of content.matchAll(/@import\s+(?:url\()?\s*['"]?([^'");\s]+)/gi)) refs.add(m[1]);
  return Array.from(refs);
}

// Analysis renders the icon several times (margins, badge detection), so each
// (name, content) pair is analyzed once and shared by every card and view
const cache = new Map<string, Promise<SvgAnalysis>>();
const MAX_CACHED = 500;

/** Cache key of an analysis; the folder variant only matters to folder icons */
export function analysisKey(content: string, filename: string, variant?: string | null): string {
  const other =
    !folderVariantPath(filename) || variant === undefined ? '' : variant === null ? '\0none' : `\0${variant}`;
  return `${filename}\0${content}${other}`;
}

/**
 * Metadata, quality checks and score, as in the explorer's upload checker. Browser only.
 * `variant` is the other folder variant's content (closed ↔ opened): null when it doesn't exist,
 * undefined when it isn't known.
 */
export function analyzeSvg(content: string, filename: string, variant?: string | null): Promise<SvgAnalysis> {
  const key = analysisKey(content, filename, variant);
  const hit = cache.get(key);
  if (hit) return hit;

  const promise = (async () => {
    const [parsed, overlay, overlaySize] = await Promise.all([
      parseSVGMetadata(content),
      lintFolderOverlay(content, filename, variant).catch(() => 'not-loaded' as const),
      measureFolderOverlay(content, filename).catch(() => undefined),
    ]);
    const metadata: SVGMetadata = {
      ...parsed,
      content,
      byteSize: new Blob([content]).size,
      gzipSize: estimateGzipSize(content),
      filename,
      path: filename,
      type: guessIconType(filename),
    };
    const checks = performQualityChecks(metadata, { overlay, overlaySize });
    return { metadata, checks, score: calculateQualityScore(checks), externalRefs: findExternalRefs(content) };
  })();

  if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value!);
  cache.set(key, promise);
  return promise;
}
