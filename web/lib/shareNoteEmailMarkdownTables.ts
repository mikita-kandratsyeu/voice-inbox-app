/** End of a share-note section: next heading or export footer. */
export const SHARE_NOTE_SECTION_END =
  /\r?\n(?:## |(?:Создано в Voice Inbox AI|Created with Voice Inbox AI))/i;

export function escapeMarkdownTableCell(value: string): string {
  return value
    .replace(/\|/g, '\\|')
    .replace(/\r?\n+/g, ' ')
    .trim();
}

export function twoColumnMarkdownTable(rows: Array<{ first: string; second: string }>): string {
  if (rows.length === 0) {
    return '';
  }

  const tableRows = rows
    .map((row) => `| **${row.first}** | ${escapeMarkdownTableCell(row.second || '—')} |`)
    .join('\n');

  return `| | |\n| --- | --- |\n${tableRows}\n`;
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
