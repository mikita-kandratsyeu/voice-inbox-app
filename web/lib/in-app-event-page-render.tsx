import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import rehypeParse from 'rehype-parse';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import { unified } from 'unified';

import {
  buildEventDocumentHtml,
  type InAppEventContentType,
  type InAppEventTheme,
  looksLikeHtmlFragment,
} from './in-app-event-page';
import { inAppEventSanitizeSchema } from './in-app-event-sanitize-schema';

const eventMarkdownComponents: Components = {
  h1: ({ children }) => <h1 className="event-h1">{children}</h1>,
  h2: ({ children }) => <h2 className="event-h2">{children}</h2>,
  h3: ({ children }) => <h3 className="event-h3">{children}</h3>,
  p: ({ children }) => <p className="event-p">{children}</p>,
  strong: ({ children }) => <strong>{children}</strong>,
  a: ({ href, children }) => (
    <a href={href} className="event-link" rel="noopener noreferrer">
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="event-ul">{children}</ul>,
  ol: ({ children }) => <ol className="event-ol">{children}</ol>,
  li: ({ children }) => <li className="event-li">{children}</li>,
};

function extractHtmlBodyFragment(html: string): string {
  const trimmed = html.trim();
  const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(trimmed);
  if (bodyMatch?.[1]) {
    return bodyMatch[1].trim();
  }
  return trimmed
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<\/?html[^>]*>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .trim();
}

export async function sanitizeHtmlFragment(html: string): Promise<string> {
  const fragment = extractHtmlBodyFragment(html);
  const file = await unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeSanitize, inAppEventSanitizeSchema)
    .use(rehypeStringify)
    .process(fragment);
  return String(file).trim();
}

export async function renderInAppEventMarkdownToHtml(markdown: string): Promise<string> {
  const { renderToStaticMarkup } = await import('react-dom/server');
  return renderToStaticMarkup(
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeSanitize, inAppEventSanitizeSchema]]}
      components={eventMarkdownComponents}
    >
      {markdown}
    </ReactMarkdown>,
  );
}

export async function renderInAppEventBodyHtml(
  contentType: InAppEventContentType,
  body: string,
): Promise<string> {
  const treatAsHtml =
    contentType === 'html' || (contentType === 'markdown' && looksLikeHtmlFragment(body));
  if (treatAsHtml) {
    return sanitizeHtmlFragment(body);
  }
  return renderInAppEventMarkdownToHtml(body);
}

export async function buildInAppEventDocumentHtml(
  contentType: InAppEventContentType,
  body: string,
  theme?: InAppEventTheme | null,
): Promise<string> {
  const inner = await renderInAppEventBodyHtml(contentType, body);
  return buildEventDocumentHtml(inner, theme);
}
