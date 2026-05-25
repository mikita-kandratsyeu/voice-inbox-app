/** End of a share-note section: next heading or export footer. */
export const SHARE_NOTE_SECTION_END =
  /\r?\n(?:## |(?:Создано в Voice Inbox AI|Created with Voice Inbox AI))/i;

/** Fixed width for timestamp / speaker label column (px). Inline on `<col>` and `<td>`. */
export const SHARE_NOTE_EMAIL_TABLE_FIRST_COL_PX = 100;

const TABLE_BLOCK_OPEN = '\n\n§§SHARE_NOTE_TABLE§§\n';
const TABLE_BLOCK_CLOSE = '\n§§/SHARE_NOTE_TABLE§§\n\n';
const TABLE_BLOCK_RE = /\n*§§SHARE_NOTE_TABLE§§\n([\s\S]*?)\n§§\/SHARE_NOTE_TABLE§§\n*/g;

export type ShareNoteEmailRenderSegment =
  | { type: 'markdown'; content: string }
  | { type: 'table'; html: string };

export function escapeMarkdownTableCell(value: string): string {
  return value
    .replace(/\|/g, '\\|')
    .replace(/\r?\n+/g, ' ')
    .trim();
}

function escapeHtmlCell(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Two-column layout table with a fixed narrow first column (email-safe inline styles). */
export function buildTwoColumnShareNoteEmailTableHtml(
  rows: Array<{ first: string; second: string }>,
): string {
  if (rows.length === 0) {
    return '';
  }

  const w = SHARE_NOTE_EMAIL_TABLE_FIRST_COL_PX;
  const firstCellStyle = [
    'border:1px solid #e5e7eb',
    'padding:8px 6px 8px 10px',
    'vertical-align:top',
    `width:${w}px`,
    'white-space:nowrap',
    'font-weight:600',
    'color:#111827',
    'font-size:14px',
    'line-height:1.5',
  ].join(';');

  const secondCellStyle = [
    'border:1px solid #e5e7eb',
    'padding:8px 10px',
    'vertical-align:top',
    'color:#374151',
    'font-size:14px',
    'line-height:1.5',
    'word-break:break-word',
  ].join(';');

  const bodyRows = rows
    .map(
      (row) =>
        `<tr><td style="${firstCellStyle}">${escapeHtmlCell(row.first)}</td><td style="${secondCellStyle}">${escapeHtmlCell(row.second || '—')}</td></tr>`,
    )
    .join('');

  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;table-layout:fixed;border-collapse:collapse;margin:0 0 16px"><colgroup><col width="${w}" /><col /></colgroup><tbody>${bodyRows}</tbody></table>`;
}

export function splitShareNoteEmailTableBlocks(markdown: string): ShareNoteEmailRenderSegment[] {
  const segments: ShareNoteEmailRenderSegment[] = [];
  let lastIndex = 0;

  for (const match of markdown.matchAll(TABLE_BLOCK_RE)) {
    if (match.index == null) continue;

    if (match.index > lastIndex) {
      segments.push({ type: 'markdown', content: markdown.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'table', html: match[1]!.trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < markdown.length) {
    segments.push({ type: 'markdown', content: markdown.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: 'markdown', content: markdown }];
}

export function twoColumnMarkdownTable(rows: Array<{ first: string; second: string }>): string {
  const html = buildTwoColumnShareNoteEmailTableHtml(rows);
  if (!html) {
    return '';
  }
  return `${TABLE_BLOCK_OPEN}${html}${TABLE_BLOCK_CLOSE}`;
}

export function replaceMarkdownSection(
  markdown: string,
  headingPattern: RegExp,
  transformBody: (body: string) => string,
): string {
  const headingMatch = markdown.match(headingPattern);
  if (!headingMatch || headingMatch.index == null) {
    return markdown;
  }

  const headingEnd = headingMatch.index + headingMatch[0].length;
  const rest = markdown.slice(headingEnd);
  const endMatch = rest.match(SHARE_NOTE_SECTION_END);
  const bodyEnd = endMatch?.index ?? rest.length;
  const body = rest.slice(0, bodyEnd);
  const tail = rest.slice(bodyEnd);

  const normalizedBody = transformBody(body);
  return markdown.slice(0, headingEnd) + normalizedBody + tail;
}
