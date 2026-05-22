import type { ReactNode } from 'react';
import type { Components } from 'react-markdown';
import {
  extractShareEmailPreheader,
  isSpeakerTurnBlockquote,
  prepareShareNoteMarkdownForEmail,
  renderShareNotePlainText,
  speakerSlotFromBlockquote,
} from '@/lib/share-note-markdown';
import { shareEmailBrand } from '@/lib/share-email-brand';
import { buildShareNoteBrandedEmailHtml } from '@/lib/share-note-email-shell';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

const b = shareEmailBrand;

function blockquoteChildrenText(children: ReactNode): string {
  if (children == null) return '';
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(blockquoteChildrenText).join('');
  if (typeof children === 'object' && 'props' in children) {
    const props = (children as { props?: { children?: ReactNode } }).props;
    return blockquoteChildrenText(props?.children);
  }
  return String(children);
}

const emailMarkdownComponents: Components = {
  h1: ({ children }) => (
    <h2
      style={{
        margin: '22px 0 10px',
        fontSize: '18px',
        lineHeight: 1.35,
        fontWeight: 700,
        color: b.ink,
        borderBottom: `2px solid ${b.gradientStart}`,
        paddingBottom: '6px',
      }}
    >
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h3
      style={{
        margin: '20px 0 8px',
        fontSize: '16px',
        lineHeight: 1.35,
        fontWeight: 700,
        color: b.ink,
      }}
    >
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4
      style={{
        margin: '16px 0 8px',
        fontSize: '15px',
        lineHeight: 1.35,
        fontWeight: 600,
        color: b.ink,
      }}
    >
      {children}
    </h4>
  ),
  h4: ({ children }) => (
    <h5
      style={{
        margin: '14px 0 6px',
        fontSize: '15px',
        lineHeight: 1.35,
        fontWeight: 600,
        color: b.ink,
      }}
    >
      {children}
    </h5>
  ),
  h5: ({ children }) => (
    <h6
      style={{
        margin: '12px 0 6px',
        fontSize: '14px',
        lineHeight: 1.35,
        fontWeight: 600,
        color: b.muted,
      }}
    >
      {children}
    </h6>
  ),
  h6: ({ children }) => (
    <h6
      style={{
        margin: '12px 0 6px',
        fontSize: '14px',
        lineHeight: 1.35,
        fontWeight: 600,
        color: b.muted,
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
        color: b.body,
      }}
    >
      {children}
    </p>
  ),
  strong: ({ children }) => <strong style={{ fontWeight: 600, color: b.ink }}>{children}</strong>,
  em: ({ children }) => <em style={{ fontStyle: 'italic', color: b.body }}>{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      style={{ color: b.link, textDecoration: 'underline' }}
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
        color: b.body,
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
        color: b.body,
      }}
    >
      {children}
    </ol>
  ),
  li: ({ children }) => <li style={{ marginBottom: '4px' }}>{children}</li>,
  blockquote: ({ children }) => {
    const text = blockquoteChildrenText(children);
    const speaker = isSpeakerTurnBlockquote(text);
    const slot = speaker ? speakerSlotFromBlockquote(text) : 0;
    const accent = b.speakerBorder[slot] ?? b.gradientStart;
    return (
      <blockquote
        style={{
          margin: '0 0 14px',
          padding: '12px 14px',
          borderLeft: `4px solid ${accent}`,
          background: b.surface,
          borderRadius: '0 8px 8px 0',
          color: b.body,
          fontSize: '15px',
          lineHeight: 1.55,
        }}
      >
        {children}
      </blockquote>
    );
  },
  hr: () => (
    <hr
      style={{
        border: 'none',
        height: '1px',
        background: `linear-gradient(90deg, ${b.gradientStart}, ${b.gradientEnd})`,
        margin: '24px 0',
        opacity: 0.35,
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
            fontFamily: b.mono,
            fontSize: '13px',
            lineHeight: 1.55,
            color: b.ink,
          }}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        style={{
          fontFamily: b.mono,
          fontSize: '0.9em',
          background: b.codeBg,
          padding: '2px 6px',
          borderRadius: '4px',
          border: `1px solid ${b.border}`,
          color: b.ink,
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
        background: b.codeBg,
        borderRadius: '10px',
        border: `1px solid ${b.border}`,
        overflowX: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontFamily: b.mono,
        fontSize: '13px',
        lineHeight: 1.55,
        color: b.ink,
      }}
    >
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <table
      role="presentation"
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        margin: '0 0 16px',
        fontSize: '14px',
        lineHeight: 1.5,
        color: b.body,
      }}
    >
      {children}
    </table>
  ),
  thead: ({ children }) => <thead style={{ background: b.surface }}>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th
      style={{
        border: `1px solid ${b.border}`,
        padding: '8px 10px',
        textAlign: 'left',
        fontWeight: 600,
        color: b.ink,
      }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td style={{ border: `1px solid ${b.border}`, padding: '8px 10px', verticalAlign: 'top' }}>
      {children}
    </td>
  ),
  del: ({ children }) => (
    <del style={{ color: b.muted, textDecoration: 'line-through' }}>{children}</del>
  ),
};

/**
 * Renders user note markdown to an HTML fragment for transactional email.
 */
export async function renderShareNoteMarkdownEmailInnerHtml(
  markdown: string,
  options?: { emailTitle?: string },
): Promise<string> {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const prepared = prepareShareNoteMarkdownForEmail(markdown, options?.emailTitle);
  return renderToStaticMarkup(
    <div style={{ fontFamily: b.font, marginTop: '2px' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={emailMarkdownComponents}
        skipHtml
      >
        {prepared}
      </ReactMarkdown>
    </div>,
  );
}

export type ShareNoteEmailContent = {
  html: string;
  text: string;
  preheader: string;
};

/** Full branded HTML + plain text + preheader for share emails. */
export async function buildShareNoteEmailContent(
  markdown: string,
  title: string,
): Promise<ShareNoteEmailContent> {
  const prepared = prepareShareNoteMarkdownForEmail(markdown, title);
  const preheader = extractShareEmailPreheader(prepared) || title;
  const inner = await renderShareNoteMarkdownEmailInnerHtml(markdown, { emailTitle: title });
  const html = buildShareNoteBrandedEmailHtml({
    title,
    bodyInnerHtml: inner,
    preheader,
  });
  const text = renderShareNotePlainText(markdown, title);
  return { html, text, preheader };
}
