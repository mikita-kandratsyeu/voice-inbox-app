import type { InAppEventContentType } from './in-app-event-page';

/** Dark/light page background — keep in sync with EVENT_DOCUMENT_STYLES and mobile eventSurfaceColor. */
export const IN_APP_EVENT_SURFACE_COLORS = {
  light: '#ffffff',
  dark: '#121418',
} as const;

/** Inner page padding inside the WebView document (px). */
export const IN_APP_EVENT_CONTENT_PADDING = {
  top: 32,
  horizontal: 20,
  bottom: 28,
} as const;

/** Extra gap below the native status bar before WebView content (px). */
export const IN_APP_EVENT_NATIVE_TOP_GAP = 12;

export const IN_APP_EVENT_LAYOUT_CLASSES = [
  'badge — small uppercase pill above the title',
  'app-name — product name (h1)',
  'version — large accent headline (version or promo title)',
  'tagline — one-line subtitle',
  'features — card-style feature list (ul)',
  'pro — inline Pro badge inside a feature row',
] as const;

export const IN_APP_EVENT_HTML_EXAMPLE = `<p class="badge">What's new</p>
<h1 class="app-name">Voice Inbox AI</h1>
<p class="version">1.2.0</p>
<p class="tagline">More powerful AI, richer export, and an inbox that fits your style.</p>
<ul class="features">
<li><strong>Advanced AI models</strong> <span class="pro">Pro</span><br/>Choose stronger models for summaries and Q&amp;A.</li>
<li><strong>Extended export</strong> <span class="pro">Pro</span><br/>Email summaries and batch-export multiple notes.</li>
<li><strong>Polish &amp; stability</strong><br/>Fixes and refinements for a smoother everyday experience.</li>
</ul>
<p class="footnote">Thank you for using Voice Inbox AI.</p>`;

export const IN_APP_EVENT_MARKDOWN_EXAMPLE = `## Voice Inbox AI 1.2.0

More powerful AI, richer export, and an inbox that fits your style.

### Highlights

- **Advanced AI models** — choose stronger models for summaries and Q&A.
- **Extended export** — email summaries and batch-export multiple notes.
- **Polish & stability** — fixes and refinements across the app.

[Learn more](https://voiceinbox.app)`;

export const IN_APP_EVENT_AI_PROMPT = `You write in-app event page content for the Voice Inbox AI mobile app.

Output rules:
1. Ask which format is required: "html" or "markdown". Use ONLY that format.
2. For HTML: return a BODY FRAGMENT only — no <!DOCTYPE>, <html>, <head>, <body>, or <style>. The app wraps your fragment and injects theme CSS.
3. For HTML layout events (release notes, promos), prefer these classes on the matching elements:
   - <p class="badge"> — eyebrow label (e.g. "What's new")
   - <h1 class="app-name"> — product name
   - <p class="version"> — version or promo headline
   - <p class="tagline"> — one-line subtitle
   - <ul class="features"> with <li> rows; use <strong> for the title, optional <span class="pro">Pro</span>, then <br/> and a short description
   - <p class="footnote"> — optional closing line
4. For Markdown: use GFM (headings, lists, links). No raw HTML tags. Headings and lists receive automatic event-* classes when rendered.
5. Keep copy concise and scannable. Pro-only items should include a Pro badge in HTML or mention Pro in Markdown.
6. Do not use scripts, inline styles, iframes, or external CSS. Links must be https:// only.
7. Escape HTML entities in HTML mode (&amp; for &, etc.).

Example HTML fragment:
${IN_APP_EVENT_HTML_EXAMPLE}

Example Markdown:
${IN_APP_EVENT_MARKDOWN_EXAMPLE}`;

export function getInAppEventBodyExample(contentType: InAppEventContentType): string {
  return contentType === 'markdown' ? IN_APP_EVENT_MARKDOWN_EXAMPLE : IN_APP_EVENT_HTML_EXAMPLE;
}
