// Comments, CDATA, processing instructions, doctype, tags (quoted attribute
// values may contain ">"), and the text between them
const TOKEN =
  /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<![^>]*>|<\/?[A-Za-z][^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>|[^<]+|</g;

const INDENT = '  ';

/** Collapse whitespace inside a tag to single spaces, leaving quoted values untouched */
function normalizeTag(tag: string): string {
  let out = '';
  let quote: string | null = null;
  let pendingSpace = false;
  for (let i = 0; i < tag.length; i++) {
    const ch = tag[i];
    if (quote) {
      out += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (/\s/.test(ch)) {
      pendingSpace = true;
      continue;
    }
    // No space right after "<" or "</", around "=", or before the closing ">" / "/>"
    const closing = ch === '>' || (ch === '/' && tag[i + 1] === '>');
    const afterOpen = out === '<' || out === '</';
    if (pendingSpace && !closing && !afterOpen && ch !== '=' && !out.endsWith('=')) out += ' ';
    pendingSpace = false;
    if (ch === '"' || ch === "'") quote = ch;
    out += ch;
  }
  return out;
}

/**
 * Pretty-print SVG markup: one element per line, 2-space indent, whitespace
 * inside tags collapsed. An element holding only text stays on one line
 * (`<title>x</title>`). Attribute values and text are kept as written, so the
 * result renders the same; it exists so a minified file and a formatted one
 * don't diff as a full rewrite. Works on malformed input too, without a DOM.
 */
export function formatSvg(content: string): string {
  const tokens = content.match(TOKEN) ?? [];
  const lines: string[] = [];
  let depth = 0;
  const push = (text: string) => lines.push(INDENT.repeat(Math.max(depth, 0)) + text);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token.startsWith('<') || token === '<') {
      const text = token.trim();
      if (text) push(text.replace(/\s+/g, ' '));
      continue;
    }
    if (token.startsWith('<!') || token.startsWith('<?')) {
      push(token.trim());
      continue;
    }

    const tag = normalizeTag(token);
    if (tag.startsWith('</')) {
      depth--;
      push(tag);
    } else if (tag.endsWith('/>')) {
      push(tag);
    } else {
      // <name>text</name> → one line
      const next = tokens[i + 1];
      const close = tokens[i + 2];
      if (next !== undefined && !next.startsWith('<') && close?.startsWith('</')) {
        push(`${tag}${next.trim().replace(/\s+/g, ' ')}${normalizeTag(close)}`);
        i += 2;
        continue;
      }
      if (next?.startsWith('</') && normalizeTag(next) === `</${tag.slice(1).split(/[\s>/]/)[0]}>`) {
        push(`${tag}${normalizeTag(next)}`);
        i += 1;
        continue;
      }
      push(tag);
      depth++;
    }
  }
  return lines.join('\n') + '\n';
}
