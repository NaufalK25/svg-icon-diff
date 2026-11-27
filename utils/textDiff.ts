import { diffArrays, diffWordsWithSpace } from 'diff';

/** Character range [start, end) inside a line */
export type Range = [number, number];

export interface DiffLine {
  type: 'context' | 'added' | 'removed';
  text: string;
  /** 1-based line number in A; set for context and removed lines */
  oldNo?: number;
  /** 1-based line number in B; set for context and added lines */
  newNo?: number;
  /** Changed words inside a changed line that has a counterpart on the other side */
  ranges?: Range[];
}

/** One row of the split view: A on the left, B on the right */
export interface SplitRow {
  left?: DiffLine;
  right?: DiffLine;
}

export interface TextDiff {
  /** Unified order: every line once, removed before added inside a change */
  lines: DiffLine[];
  rows: SplitRow[];
  added: number;
  removed: number;
}

/** Lines of a text, LF only; a trailing newline doesn't add an empty last line */
export function splitLines(text: string): string[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

// Paired lines sharing less than this share of their characters are treated as
// rewritten: highlighting every word in them would only add noise
const MIN_SHARED = 0.4;

/** Word-level ranges that differ between two versions of a line, or null when they barely match */
function wordRanges(oldText: string, newText: string): { old: Range[]; new: Range[] } | null {
  const parts = diffWordsWithSpace(oldText, newText);
  const old: Range[] = [];
  const next: Range[] = [];
  let o = 0;
  let n = 0;
  let shared = 0;
  for (const part of parts) {
    const len = part.value.length;
    if (part.removed) {
      old.push([o, o + len]);
      o += len;
    } else if (part.added) {
      next.push([n, n + len]);
      n += len;
    } else {
      shared += len;
      o += len;
      n += len;
    }
  }
  if (shared < Math.max(oldText.length, newText.length) * MIN_SHARED) return null;
  return { old, new: next };
}

/** Line diff of two texts, with word-level ranges inside changed lines that pair up. */
export function diffText(oldText: string, newText: string): TextDiff {
  const changes = diffArrays(splitLines(oldText), splitLines(newText));
  const lines: DiffLine[] = [];
  const rows: SplitRow[] = [];
  let oldNo = 1;
  let newNo = 1;
  let added = 0;
  let removed = 0;

  for (let c = 0; c < changes.length; c++) {
    const change = changes[c];
    if (!change.added && !change.removed) {
      for (const text of change.value) {
        const line: DiffLine = { type: 'context', text, oldNo: oldNo++, newNo: newNo++ };
        lines.push(line);
        rows.push({ left: line, right: line });
      }
      continue;
    }

    // A removal followed by an addition is one change: pair its lines up
    const removedText = change.removed ? change.value : [];
    const addedText = change.removed && changes[c + 1]?.added ? changes[++c].value : change.added ? change.value : [];
    const left = removedText.map<DiffLine>(text => ({ type: 'removed', text, oldNo: oldNo++ }));
    const right = addedText.map<DiffLine>(text => ({ type: 'added', text, newNo: newNo++ }));
    for (let i = 0; i < Math.min(left.length, right.length); i++) {
      const ranges = wordRanges(left[i].text, right[i].text);
      if (ranges) {
        left[i].ranges = ranges.old;
        right[i].ranges = ranges.new;
      }
    }
    lines.push(...left, ...right);
    for (let i = 0; i < Math.max(left.length, right.length); i++) rows.push({ left: left[i], right: right[i] });
    removed += left.length;
    added += right.length;
  }

  return { lines, rows, added, removed };
}

/**
 * Wrap the characters inside `ranges` of highlighted HTML (highlight.js output)
 * in `<mark>`. Tags pass through untouched and an entity counts as one character,
 * so ranges index the plain text. Marks close before every tag and reopen after
 * it, keeping the nesting valid.
 */
export function markRanges(html: string, ranges: Range[] | undefined, markClass: string): string {
  if (!ranges?.length) return html;
  let out = '';
  let pos = 0;
  let r = 0;
  let open = false;
  for (const token of html.match(/<[^>]*>|&[^;\s]+;|[^<&]|&/g) ?? []) {
    if (token.startsWith('<')) {
      if (open) out += '</mark>';
      open = false;
      out += token;
      continue;
    }
    while (r < ranges.length && pos >= ranges[r][1]) r++;
    const inside = r < ranges.length && pos >= ranges[r][0];
    if (inside !== open) {
      out += inside ? `<mark class="${markClass}">` : '</mark>';
      open = inside;
    }
    out += token;
    pos++;
  }
  if (open) out += '</mark>';
  return out;
}
