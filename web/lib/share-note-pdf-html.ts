import { createSharePdfMarkdownIt } from '@/lib/create-share-pdf-markdown-it';
import { prepareShareNotePdfMarkdown } from '@/lib/prepareShareNotePdfMarkdown';
import {
  buildSharePdfBrandBadgeHtml,
  buildSharePdfGeneratedAtFooterHtml,
  SHARE_PDF_BRAND_BADGE_STYLES,
  type ShareNotePdfDocumentOptions,
} from '@/lib/share-note-pdf-footer';
import { splitShareNoteEmailTableBlocks } from '@/lib/shareNoteEmailMarkdownTables';
import { SHARE_PDF_WIKI_LINK_HREF } from '@/lib/stripWikiLinksForShareDelivery';

const md = createSharePdfMarkdownIt();

/** Matches mobile `shareMarkdownToHtml.ts` print styles. */
const SHARE_PDF_HTML_STYLES = `
  @page { margin: 28pt; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    color: #111827;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    font-size: 11pt;
    line-height: 1.5;
  }
  ${SHARE_PDF_BRAND_BADGE_STYLES}
  h1 { font-size: 20pt; margin: 0 0 12pt; line-height: 1.25; }
  h2 { font-size: 15pt; margin: 18pt 0 8pt; line-height: 1.3; }
  h3 { font-size: 12pt; margin: 14pt 0 6pt; }
  p { margin: 0 0 8pt; }
  p + p { margin-top: 6pt; }
  ul, ol { margin: 0 0 10pt; padding-left: 20pt; }
  li { margin: 0 0 4pt; }
  strong { font-weight: 600; color: #1f2937; }
  em { font-style: italic; color: #4b5563; }
  s, del { color: #6b7280; text-decoration: line-through; }
  blockquote {
    margin: 0 0 12pt;
    padding: 0 0 0 12pt;
    border-left: 3pt solid #d1d5db;
    color: #4b5563;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 12pt;
    font-size: 10pt;
    line-height: 1.45;
    table-layout: fixed;
  }
  thead { background: #f9fafb; }
  th, td {
    border: 1px solid #d1d5db;
    padding: 6pt 8pt;
    text-align: left;
    vertical-align: top;
    word-break: break-word;
  }
  th { font-weight: 600; color: #111827; }
  .share-note-pdf-table {
    margin: 0 0 12pt;
  }
  .share-note-pdf-table table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    margin: 0;
    font-size: 10.5pt;
    line-height: 1.5;
  }
  .share-note-pdf-table td:first-child {
    width: 88px;
    white-space: nowrap;
    font-weight: 600;
    color: #111827;
    font-variant-numeric: tabular-nums;
  }
  .share-note-pdf-table td:last-child {
    color: #374151;
  }
  ul.contains-task-list { list-style: none; padding-left: 0; }
  li.task-list-item {
    list-style: none;
    display: block;
    margin: 0 0 8pt;
  }
  li.task-list-item > label {
    display: flex;
    align-items: flex-start;
    gap: 8pt;
  }
  input.task-list-item-checkbox {
    margin: 2pt 0 0;
    width: 12pt;
    height: 12pt;
    flex-shrink: 0;
  }
  hr {
    border: none;
    border-top: 1px solid #d1d5db;
    margin: 20pt 0;
  }
  code {
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 10pt;
    background: #f3f4f6;
    padding: 1pt 4pt;
    border-radius: 3pt;
  }
  pre {
    background: #f3f4f6;
    padding: 10pt;
    border-radius: 6pt;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
    margin: 0 0 10pt;
  }
  pre code { background: transparent; padding: 0; }
  a { color: #2563eb; text-decoration: none; }
  a.share-pdf-wiki-link,
  a[href="${SHARE_PDF_WIKI_LINK_HREF}"] {
    color: #2563eb;
    font-weight: 500;
    text-decoration: none;
  }
  li.task-list-item > ul {
    list-style: none;
    margin: 4pt 0 0;
    padding: 4pt 0 0 10pt;
    border-left: 2pt solid #e5e7eb;
  }
  li.task-list-item > ul > li {
    margin: 0 0 4pt;
    color: #4b5563;
    font-size: 10pt;
    line-height: 1.45;
  }
  li.task-list-item > ul > li strong {
    color: #6b7280;
    font-weight: 600;
  }
  .share-pdf-generated-at {
    margin-top: 20pt;
    padding-top: 10pt;
    border-top: 1px solid #e5e7eb;
    color: #9ca3af;
    font-size: 9pt;
    line-height: 1.4;
    text-align: center;
  }
  .share-pdf-generated-at p {
    margin: 0;
  }
`;

function renderShareNotePdfBodyHtml(markdown: string): string {
  const prepared = prepareShareNotePdfMarkdown(markdown);
  const segments = splitShareNoteEmailTableBlocks(prepared);

  return segments
    .map((segment) => {
      if (segment.type === 'table') {
        return `<div class="share-note-pdf-table">${segment.html}</div>`;
      }

      const content = segment.content.trim();
      if (!content) {
        return '';
      }

      return md
        .render(content)
        .replace(
          new RegExp(`<a href="${SHARE_PDF_WIKI_LINK_HREF}">`, 'g'),
          `<a class="share-pdf-wiki-link" href="${SHARE_PDF_WIKI_LINK_HREF}">`,
        );
    })
    .join('\n');
}

/** Renders export markdown into a full HTML document for PDF generation. */
export function buildShareNotePdfHtmlDocument(
  markdown: string,
  documentTitle: string,
  options?: ShareNotePdfDocumentOptions,
): string {
  const bodyHtml = renderShareNotePdfBodyHtml(markdown);
  const brandBadgeHtml = buildSharePdfBrandBadgeHtml(options);
  const footerHtml = buildSharePdfGeneratedAtFooterHtml(options);
  const safeTitle = documentTitle.replace(/[<>&]/g, '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>${SHARE_PDF_HTML_STYLES}</style>
</head>
<body>
${brandBadgeHtml}
${bodyHtml}
${footerHtml}
</body>
</html>`;
}
