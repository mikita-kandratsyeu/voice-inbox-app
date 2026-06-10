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

const EVENT_DOCUMENT_STYLES = `
  :root {
    color-scheme: light dark;
    --bg: #ffffff;
    --text: #0f172a;
    --text-secondary: #64748b;
    --accent: #6366f1;
    --accent-soft: rgba(99, 102, 241, 0.12);
    --card: #ffffff;
    --border: rgba(15, 23, 42, 0.08);
    --pro-bg: rgba(99, 102, 241, 0.14);
    --pro-text: #4f46e5;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #0b0f17;
      --text: #f8fafc;
      --text-secondary: #94a3b8;
      --accent: #818cf8;
      --accent-soft: rgba(129, 140, 248, 0.16);
      --card: #111827;
      --border: rgba(148, 163, 184, 0.18);
      --pro-bg: rgba(129, 140, 248, 0.2);
      --pro-text: #a5b4fc;
    }
  }
  html[data-theme="light"] {
    color-scheme: light;
    --bg: #ffffff;
    --text: #0f172a;
    --text-secondary: #64748b;
    --accent: #6366f1;
    --accent-soft: rgba(99, 102, 241, 0.12);
    --card: #ffffff;
    --border: rgba(15, 23, 42, 0.08);
    --pro-bg: rgba(99, 102, 241, 0.14);
    --pro-text: #4f46e5;
  }
  html[data-theme="dark"] {
    color-scheme: dark;
    --bg: #0b0f17;
    --text: #f8fafc;
    --text-secondary: #94a3b8;
    --accent: #818cf8;
    --accent-soft: rgba(129, 140, 248, 0.16);
    --card: #111827;
    --border: rgba(148, 163, 184, 0.18);
    --pro-bg: rgba(129, 140, 248, 0.2);
    --pro-text: #a5b4fc;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 20px 20px 28px;
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 15px;
    line-height: 1.5;
    -webkit-text-size-adjust: 100%;
  }
  .badge {
    display: inline-block;
    margin: 0 0 24px;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
    background: var(--accent-soft);
    color: var(--accent);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .app-name {
    margin: 0;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .version {
    margin: 4px 0 0;
    font-size: 32px;
    font-weight: 800;
    line-height: 1.1;
    color: var(--accent);
    letter-spacing: -0.02em;
  }
  .tagline {
    margin: 8px 0 0;
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.45;
  }
  .features {
    margin: 20px 0 0;
    padding: 0;
    list-style: none;
  }
  .features li {
    margin: 0 0 8px;
    padding: 16px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: var(--card);
  }
  .features li strong {
    display: inline;
    font-size: 15px;
    font-weight: 600;
  }
  .pro {
    display: inline-block;
    margin-left: 6px;
    padding: 2px 6px;
    border-radius: 6px;
    background: var(--pro-bg);
    color: var(--pro-text);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    vertical-align: middle;
  }
  .event-h1, h1 { margin: 0 0 8px; font-size: 26px; font-weight: 700; }
  .event-h2, h2 { margin: 16px 0 8px; font-size: 22px; font-weight: 700; }
  .event-h3, h3 { margin: 14px 0 6px; font-size: 18px; font-weight: 600; }
  .event-p, p { margin: 0 0 12px; color: var(--text-secondary); }
  .event-ul, ul { margin: 0 0 12px; padding-left: 1.25rem; }
  .event-ol, ol { margin: 0 0 12px; padding-left: 1.25rem; }
  .event-li, li { margin: 0 0 6px; }
  .event-link, a { color: var(--accent); }
  img { max-width: 100%; height: auto; border-radius: 12px; }
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
