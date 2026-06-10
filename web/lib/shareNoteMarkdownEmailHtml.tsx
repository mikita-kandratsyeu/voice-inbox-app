import type { Components } from 'react-markdown';
import { normalizeInlineSpeakerLabelsToParagraphBreaks } from '@/lib/normalizeSpeakerTurnsMarkdown';
import { normalizeSpeakerTurnsForEmail } from '@/lib/normalizeSpeakerTurnsForEmail';
import { normalizeTranscriptTimestampLinesForEmail } from '@/lib/normalizeTranscriptTimestampsForEmail';
import { splitShareNoteEmailTableBlocks } from '@/lib/shareNoteEmailMarkdownTables';
import { stripShareNoteSectionMarkers } from '@/lib/shareNoteSectionMarkers';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

const bodyFont = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const monoFont =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace";

const tableCellBaseStyle = {
  border: '1px solid #e5e7eb',
  padding: '8px 10px',
  verticalAlign: 'top' as const,
};

const emailMarkdownComponents: Components = {
  h1: ({ children }) => (
    <h1
      style={{
        margin: '24px 0 10px',
        fontSize: '20px',
        lineHeight: 1.35,
        fontWeight: 700,
        color: '#111827',
      }}
    >
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2
      style={{
        margin: '22px 0 8px',
        fontSize: '18px',
        lineHeight: 1.35,
        fontWeight: 700,
        color: '#111827',
      }}
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3
      style={{
        margin: '18px 0 8px',
        fontSize: '17px',
        lineHeight: 1.35,
        fontWeight: 600,
        color: '#111827',
      }}
    >
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4
      style={{
        margin: '16px 0 6px',
        fontSize: '16px',
        lineHeight: 1.35,
        fontWeight: 600,
        color: '#111827',
      }}
    >
      {children}
    </h4>
  ),
  h5: ({ children }) => (
    <h5
      style={{
        margin: '14px 0 6px',
        fontSize: '15px',
        lineHeight: 1.35,
        fontWeight: 600,
        color: '#111827',
      }}
    >
      {children}
    </h5>
  ),
  h6: ({ children }) => (
    <h6
      style={{
        margin: '14px 0 6px',
        fontSize: '15px',
        lineHeight: 1.35,
        fontWeight: 600,
        color: '#4b5563',
      }}
    >
      {children}
    </h6>
  ),
  p: ({ children }) => (
    <p
      style={{
        margin: '0 0 12px',
        fontSize: '15px',
        lineHeight: 1.6,
        color: '#374151',
      }}
    >
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong style={{ fontWeight: 600, color: '#111827' }}>{children}</strong>
  ),
  em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      style={{ color: '#2563eb', textDecoration: 'underline' }}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul
      style={{
        margin: '0 0 12px',
        paddingLeft: '22px',
        fontSize: '15px',
        lineHeight: 1.6,
        color: '#374151',
      }}
    >
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol
      style={{
        margin: '0 0 12px',
        paddingLeft: '22px',
        fontSize: '15px',
        lineHeight: 1.6,
        color: '#374151',
      }}
    >
      {children}
    </ol>
  ),
  li: ({ children }) => <li style={{ marginBottom: '4px' }}>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote
      style={{
        margin: '0 0 12px',
        paddingLeft: '14px',
        borderLeft: '3px solid #d1d5db',
        color: '#4b5563',
        fontSize: '15px',
        lineHeight: 1.55,
      }}
    >
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr
      style={{
        border: 'none',
        borderTop: '1px solid #e5e7eb',
        margin: '20px 0',
      }}
    />
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className?.includes('language-'));
    if (isBlock) {
      return (
        <code
          className={className}
          style={{
            fontFamily: monoFont,
            fontSize: '14px',
            lineHeight: 1.55,
          }}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        style={{
          fontFamily: monoFont,
          fontSize: '0.9em',
          background: '#f3f4f6',
          padding: '2px 6px',
          borderRadius: '4px',
          border: '1px solid #e5e7eb',
          color: '#1f2937',
        }}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre
      style={{
        margin: '0 0 16px',
        padding: '14px 16px',
        background: '#f3f4f6',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        overflowX: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <table
      style={{
        width: '100%',
        tableLayout: 'fixed',
        borderCollapse: 'collapse',
        margin: '0 0 16px',
        fontSize: '14px',
        lineHeight: 1.5,
        color: '#374151',
      }}
    >
      {children}
    </table>
  ),
  thead: ({ children }) => <thead style={{ background: '#f9fafb' }}>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th
      style={{
        ...tableCellBaseStyle,
        textAlign: 'left',
        fontWeight: 600,
        color: '#111827',
      }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => <td style={tableCellBaseStyle}>{children}</td>,
  del: ({ children }) => (
    <del style={{ color: '#6b7280', textDecoration: 'line-through' }}>{children}</del>
  ),
};

/**
 * Renders user note markdown to an HTML fragment for transactional email.
 */
export async function renderShareNoteMarkdownEmailInnerHtml(markdown: string): Promise<string> {
  const { renderToStaticMarkup } = await import('react-dom/server');
  let markdownForEmail = normalizeTranscriptTimestampLinesForEmail(markdown);
  markdownForEmail = normalizeSpeakerTurnsForEmail(markdownForEmail);
  markdownForEmail = stripShareNoteSectionMarkers(markdownForEmail);
  markdownForEmail = normalizeInlineSpeakerLabelsToParagraphBreaks(markdownForEmail);

  const segments = splitShareNoteEmailTableBlocks(markdownForEmail);
  let key = 0;

  return renderToStaticMarkup(
    <div style={{ fontFamily: bodyFont, marginTop: '4px' }}>
      {segments.map((segment) => {
        if (segment.type === 'table') {
          return <div key={`table-${key++}`} dangerouslySetInnerHTML={{ __html: segment.html }} />;
        }

        if (!segment.content.trim()) {
          return null;
        }

        return (
          <ReactMarkdown
            key={`md-${key++}`}
            remarkPlugins={[remarkGfm, remarkBreaks]}
            rehypePlugins={[rehypeSanitize]}
            components={emailMarkdownComponents}
            skipHtml
          >
            {segment.content}
          </ReactMarkdown>
        );
      })}
    </div>,
  );
}

function buildSimpleShareNoteEmailHtml(title: string, bodyInnerHtml: string): string {
  const escapedTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f7fb;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <main style="max-width:720px;margin:0 auto;background:#ffffff;border-radius:16px;padding:24px;border:1px solid #e5e7eb;">
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">${escapedTitle}</h1>
      ${bodyInnerHtml}
    </main>
  </body>
</html>`;
}

export async function buildShareNoteEmailHtml(markdown: string, title: string): Promise<string> {
  const inner = await renderShareNoteMarkdownEmailInnerHtml(markdown);
  return buildSimpleShareNoteEmailHtml(title, inner);
}
