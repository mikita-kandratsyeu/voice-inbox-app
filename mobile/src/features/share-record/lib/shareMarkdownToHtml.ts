import { parseMarkdownWithOptions } from 'react-native-nitro-markdown/headless';

import { markdownAstToHtml } from './markdownAstToHtml';
import { stripShareSectionMarkers } from './shareSectionMarkers';

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
  ul.contains-task-list { list-style: none; padding-left: 0; }
  li.task-list-item {
    list-style: none;
    display: flex;
    align-items: flex-start;
    gap: 8pt;
    margin: 0 0 6pt;
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
`;

function renderSharePdfMarkdownHtml(markdown: string): string {
  const ast = parseMarkdownWithOptions(stripShareSectionMarkers(markdown), {
    gfm: true,
    math: false,
    html: false,
    sourceOffsets: false,
  });
  return markdownAstToHtml(ast);
}

/** Renders export markdown into a full HTML document for on-device PDF generation. */
export function shareMarkdownToHtmlDocument(markdown: string, documentTitle: string): string {
  const bodyHtml = renderSharePdfMarkdownHtml(markdown);
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
${bodyHtml}
</body>
</html>`;
}
