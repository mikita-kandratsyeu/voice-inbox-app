import {
  IN_APP_EVENT_CONTENT_PADDING,
  IN_APP_EVENT_SURFACE_COLORS,
} from './in-app-event-content-guide';

export const IN_APP_EVENT_LOCALES = ['en', 'ru'] as const;
export type InAppEventLocale = (typeof IN_APP_EVENT_LOCALES)[number];

export const IN_APP_EVENT_CONTENT_TYPES = ['html', 'markdown'] as const;
export type InAppEventContentType = (typeof IN_APP_EVENT_CONTENT_TYPES)[number];

export const IN_APP_EVENT_BODY_MAX_LENGTH = 200_000;

const EVENT_ID_RE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

export type InAppEventTheme = 'light' | 'dark';

export function isInAppEventLocale(value: string): value is InAppEventLocale {
  return (IN_APP_EVENT_LOCALES as readonly string[]).includes(value);
}

export function isInAppEventContentType(value: string): value is InAppEventContentType {
  return (IN_APP_EVENT_CONTENT_TYPES as readonly string[]).includes(value);
}

export function validateInAppEventId(eventId: string): string | null {
  const trimmed = eventId.trim().toLowerCase();
  if (trimmed.length < 2 || trimmed.length > 120) return 'eventId length 2–120';
  if (!EVENT_ID_RE.test(trimmed)) {
    return 'eventId: lowercase letters, digits, hyphens, underscores only';
  }
  return null;
}

export function parseInAppEventTheme(value: string | null): InAppEventTheme | null {
  if (value === 'light' || value === 'dark') return value;
  return null;
}

/** True when admin pasted HTML into the body (even if contentType is still markdown). */
export function looksLikeHtmlFragment(body: string): boolean {
  const trimmed = body.trim();
  if (!trimmed.startsWith('<')) return false;
  return /<\/?[a-z][\w-]*\b/i.test(trimmed);
}

const EVENT_DOCUMENT_STYLES = `
  :root {
    color-scheme: light dark;
    --bg: ${IN_APP_EVENT_SURFACE_COLORS.light};
    --text: #111827;
    --text-secondary: #6b7280;
    --accent: #6366f1;
    --accent-soft: rgba(99, 102, 241, 0.12);
    --card: #f9fafb;
    --card-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
    --border: rgba(15, 23, 42, 0.08);
    --pro-bg: rgba(99, 102, 241, 0.14);
    --pro-text: #4f46e5;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: ${IN_APP_EVENT_SURFACE_COLORS.dark};
      --text: #f3f4f6;
      --text-secondary: #9ca3af;
      --accent: #818cf8;
      --accent-soft: rgba(129, 140, 248, 0.16);
      --card: #1c1f28;
      --card-shadow: none;
      --border: rgba(255, 255, 255, 0.08);
      --pro-bg: rgba(129, 140, 248, 0.22);
      --pro-text: #c7d2fe;
    }
  }
  html[data-theme="light"] {
    color-scheme: light;
    --bg: ${IN_APP_EVENT_SURFACE_COLORS.light};
    --text: #111827;
    --text-secondary: #6b7280;
    --accent: #6366f1;
    --accent-soft: rgba(99, 102, 241, 0.12);
    --card: #f9fafb;
    --card-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
    --border: rgba(15, 23, 42, 0.08);
    --pro-bg: rgba(99, 102, 241, 0.14);
    --pro-text: #4f46e5;
  }
  html[data-theme="dark"] {
    color-scheme: dark;
    --bg: ${IN_APP_EVENT_SURFACE_COLORS.dark};
    --text: #f3f4f6;
    --text-secondary: #9ca3af;
    --accent: #818cf8;
    --accent-soft: rgba(129, 140, 248, 0.16);
    --card: #1c1f28;
    --card-shadow: none;
    --border: rgba(255, 255, 255, 0.08);
    --pro-bg: rgba(129, 140, 248, 0.22);
    --pro-text: #c7d2fe;
  }
  * { box-sizing: border-box; }
  html {
    background: var(--bg);
    min-height: 100%;
  }
  body {
    margin: 0;
    padding: ${IN_APP_EVENT_CONTENT_PADDING.top}px ${IN_APP_EVENT_CONTENT_PADDING.horizontal}px ${IN_APP_EVENT_CONTENT_PADDING.bottom}px;
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 15px;
    line-height: 1.55;
    -webkit-text-size-adjust: 100%;
    -webkit-font-smoothing: antialiased;
  }
  .badge {
    display: inline-block;
    margin: 0 0 20px;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
    background: var(--accent-soft);
    color: var(--accent);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .app-name {
    margin: 0;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text);
    line-height: 1.2;
  }
  .version {
    margin: 6px 0 0;
    font-size: 30px;
    font-weight: 800;
    line-height: 1.1;
    color: var(--accent);
    letter-spacing: -0.03em;
  }
  .tagline {
    margin: 10px 0 0;
    color: var(--text-secondary);
    font-size: 15px;
    line-height: 1.5;
    max-width: 36em;
  }
  .features {
    margin: 24px 0 0;
    padding: 0;
    list-style: none;
  }
  .features li {
    margin: 0 0 10px;
    padding: 16px 18px;
    border-radius: 16px;
    border: 1px solid var(--border);
    background: var(--card);
    box-shadow: var(--card-shadow);
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.5;
  }
  .features li:last-child {
    margin-bottom: 0;
  }
  .features li strong {
    display: inline;
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
  }
  .pro {
    display: inline-block;
    margin-left: 6px;
    padding: 2px 7px;
    border-radius: 6px;
    background: var(--pro-bg);
    color: var(--pro-text);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    vertical-align: middle;
  }
  .footnote {
    margin: 24px 0 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-secondary);
  }
  .event-h1, h1:not(.app-name) {
    margin: 0 0 10px;
    font-size: 26px;
    font-weight: 700;
    color: var(--text);
    line-height: 1.2;
  }
  .event-h2, h2 {
    margin: 20px 0 10px;
    font-size: 22px;
    font-weight: 700;
    color: var(--text);
    line-height: 1.25;
  }
  .event-h3, h3 {
    margin: 16px 0 8px;
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.3;
  }
  .event-p, p:not(.badge):not(.version):not(.tagline):not(.footnote) {
    margin: 0 0 12px;
    color: var(--text-secondary);
    line-height: 1.55;
  }
  .event-ul, ul:not(.features) {
    margin: 0 0 14px;
    padding-left: 1.35rem;
    color: var(--text-secondary);
  }
  .event-ol, ol {
    margin: 0 0 14px;
    padding-left: 1.35rem;
    color: var(--text-secondary);
  }
  .event-li, li:not(.features li) {
    margin: 0 0 8px;
    line-height: 1.5;
  }
  .event-link, a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 500;
  }
  img {
    display: block;
    max-width: 100%;
    height: auto;
    margin: 12px 0;
    border-radius: 14px;
  }
`;

export function buildEventDocumentHtml(innerHtml: string, theme?: InAppEventTheme | null): string {
  const themeAttr = theme ? ` data-theme="${theme}"` : '';
  return `<!DOCTYPE html>
<html lang="en"${themeAttr}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
  <style>${EVENT_DOCUMENT_STYLES}</style>
</head>
<body>
${innerHtml}
</body>
</html>`;
}

export function inAppEventEtag(eventId: string, locale: string, revision: number): string {
  return `W/"event-${eventId}-${locale}-${revision}"`;
}
