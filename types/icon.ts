// Shared with vscode-icons-explorer (types/icon.ts): keep these identical so the
// copied utils (parseSVG, qualityChecks) work unchanged in both repos

export interface GitHubRateLimit {
  remaining: number;
  reset: number;
}

// Parsed icon representation
export interface IconMetadata {
  filename: string;
  path: string;
  width: number | null;
  height: number | null;
  viewBox: string | null;
  preserveAspectRatio: string | null;
  pathCount: number;
  circleCount: number;
  rectCount: number;
  polygonCount: number;
  useCount: number;
  groupCount: number;
  hasInlineStyles: boolean;
  hasRasterImages: boolean;
  hasHardcodedColors: boolean;
  isCentered: boolean;
  marginDetails: string;
  /** Plain-language reason per margin problem (overflow, off-center, underflow) */
  marginIssues?: string[];
  /** Sides whose content reaches into the 2px margin; undefined when not measured */
  overflowSides?: ('left' | 'top' | 'right' | 'bottom')[];
  /** Content is smaller than the margin guideline allows (long side under 20px) */
  isUnderflow?: boolean;
  /** Number of lines, not counting trailing newlines */
  lineCount: number;
  /** Content ends with one or more line breaks */
  hasTrailingNewline: boolean;
  /** Attributes removable without changing rendering, one entry per kind */
  unneededAttributes: string[];
  colors: string[];
}

export interface SVGMetadata extends IconMetadata {
  content: string;
  byteSize: number;
  gzipSize: number;
  type: 'file_type' | 'folder_type' | 'default';
  /** Content hash (from the tree listing) of the version that was analyzed */
  sha?: string;
  /** When this entry was analyzed (ms since epoch) */
  analyzedAt?: number;
  /** Analysis logic version that produced this entry */
  version?: number;
}

// Derived from the QUALITY_CHECKS registry — add/remove checks there
import type { QualityCheckType } from '@/utils/qualityChecks';
export type { QualityCheckType };
