import hljs from 'highlight.js/lib/core';
import xml from 'highlight.js/lib/languages/xml';

hljs.registerLanguage('xml', xml);

// highlight.js token colours come from the --code-* tokens in app/globals.css (.hljs-* rules);
// this class only sets the base text colour of highlighted code
export const HLJS_COLORS = 'text-foreground';

/** Split highlight.js HTML into per-line HTML, closing spans at each line end
 *  and reopening them on the next line so tokens spanning lines stay colored. */
function splitHighlightedLines(html: string): string[] {
  const lines: string[] = [];
  const open: string[] = [];
  for (const raw of html.split('\n')) {
    const prefix = open.join('');
    for (const [tag] of raw.matchAll(/<span[^>]*>|<\/span>/g)) {
      if (tag === '</span>') open.pop();
      else open.push(tag);
    }
    lines.push(prefix + raw + '</span>'.repeat(open.length));
  }
  // Drop the empty line after a trailing newline
  if (lines.length > 1 && lines[lines.length - 1].replace(/<[^>]*>/g, '') === '') lines.pop();
  return lines;
}

const escapeHTML = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Highlighted HTML per line. highlight.js escapes the source, so the result is
 * safe to set as innerHTML: the SVG markup is shown as text, never parsed.
 * Lines match splitLines() in textDiff.ts one to one.
 */
export function highlightLines(content: string): string[] {
  const text = content.replace(/\r\n?/g, '\n');
  let html: string;
  try {
    html = hljs.highlight(text, { language: 'xml' }).value;
  } catch {
    html = escapeHTML(text);
  }
  return splitHighlightedLines(html);
}
