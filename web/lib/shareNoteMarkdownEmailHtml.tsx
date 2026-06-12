import type { Components } from 'react-markdown';
import { BASE_URL_OR_FALLBACK, SUPPORT_EMAIL } from '@/config/constants';
import { prepareShareNoteEmailMarkdown } from '@/lib/prepareShareNoteEmailMarkdown';
import { splitShareNoteEmailTableBlocks } from '@/lib/shareNoteEmailMarkdownTables';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

const bodyFont = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const monoFont =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace";
const siteUrl = BASE_URL_OR_FALLBACK;
const supportEmail = SUPPORT_EMAIL.trim() || 'hello@voice-inbox.online';

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
        margin: '24px 0 10px',
        paddingTop: '16px',
        borderTop: '1px solid #e5e7eb',
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
  li: ({ className, children }) => {
    const isTask = className?.includes('task-list-item');
    return (
      <li
        style={{
          marginBottom: '4px',
          ...(isTask ? { listStyleType: 'none', marginLeft: '-22px' } : {}),
        }}
      >
        {children}
      </li>
    );
  },
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
  input: ({ checked, type }) => {
    if (type !== 'checkbox') {
      return null;
    }

    return (
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          minWidth: '28px',
          marginRight: '4px',
          color: checked ? '#047857' : '#94a3b8',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        {checked ? '[x]' : '[ ]'}
      </span>
    );
  },
};

export type ShareNoteEmailShellOptions = {
  title: string;
  bodyInnerHtml: string;
  preheader?: string;
  intro?: string;
  attachmentLabel?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Renders user note markdown to an HTML fragment for transactional email.
 */
export async function renderShareNoteMarkdownEmailInnerHtml(markdown: string): Promise<string> {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const markdownForEmail = prepareShareNoteEmailMarkdown(markdown);

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

export function buildShareNoteEmailShellHtml(options: ShareNoteEmailShellOptions): string {
  const escapedTitle = escapeHtml(options.title);
  const preheader =
    options.preheader?.trim() || `Shared from Voice Inbox AI: ${options.title}`.slice(0, 160);
  const intro = options.intro?.trim() || 'A Voice Inbox AI user shared this note with you.';
  const attachmentLabel = options.attachmentLabel?.trim();

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapedTitle}</title>
  </head>
  <body style="margin:0;padding:0;background:#eef2f7;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;margin:0;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:24px 24px 18px;border-bottom:1px solid #eef2f7;background:#fbfcff;">
                <div style="margin:0 0 8px;font-size:12px;line-height:1.4;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">Voice Inbox AI</div>
                <h1 style="margin:0;font-size:24px;line-height:1.28;font-weight:750;color:#0f172a;">${escapedTitle}</h1>
                <p style="margin:12px 0 0;font-size:15px;line-height:1.55;color:#475569;">${escapeHtml(intro)}</p>
                ${
                  attachmentLabel
                    ? `<p style="margin:10px 0 0;font-size:13px;line-height:1.45;color:#64748b;">Attachment: ${escapeHtml(attachmentLabel)}</p>`
                    : ''
                }
              </td>
            </tr>
            <tr>
              <td style="padding:22px 24px 8px;">
                ${options.bodyInnerHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 24px;">
                <div style="border-top:1px solid #e5e7eb;padding-top:16px;font-size:13px;line-height:1.55;color:#64748b;">
                  <p style="margin:0 0 6px;">This email was sent from Voice Inbox AI by an app user.</p>
                  <p style="margin:0;">
                    <a href="${siteUrl}" style="color:#475569;text-decoration:underline;">voice-inbox.online</a>
                    <span style="color:#cbd5e1;"> · </span>
                    <a href="mailto:${supportEmail}" style="color:#475569;text-decoration:underline;">${supportEmail}</a>
                  </p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function buildShareNoteEmailHtml(markdown: string, title: string): Promise<string> {
  const inner = await renderShareNoteMarkdownEmailInnerHtml(markdown);
  return buildShareNoteEmailShellHtml({
    title,
    bodyInnerHtml: inner,
    preheader: `Shared note from Voice Inbox AI: ${title}`,
  });
}
