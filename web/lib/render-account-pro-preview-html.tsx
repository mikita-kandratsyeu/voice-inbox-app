import { AccountProDevPreview } from '@/lib/account-pro-preview-document';
import type { AccountProPreviewOptions } from '@/lib/account-pro-preview-fixtures';
import { buildAccountProPreviewExampleLinks } from '@/lib/account-pro-preview-fixtures';

function previewDocumentShell(bodyHtml: string, opts: AccountProPreviewOptions): string {
  const lang = opts.locale === 'ru' ? 'ru' : 'en';
  const htmlClass = opts.theme === 'dark' ? 'dark' : '';

  return `<!DOCTYPE html>
<html lang="${lang}" class="${htmlClass}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Dev preview — account/pro (${opts.state}, ${opts.kind})</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = { darkMode: 'class' };
  </script>
</head>
<body class="min-h-screen antialiased">
${bodyHtml}
</body>
</html>`;
}

/** Dev-only: full HTML page matching `/account/pro` success UI. */
export async function renderAccountProPreviewHtml(opts: AccountProPreviewOptions): Promise<string> {
  const { renderToStaticMarkup } = await import('react-dom/server');

  const body = renderToStaticMarkup(
    <div className={opts.theme === 'dark' ? 'dark min-h-screen' : 'min-h-screen'}>
      <AccountProDevPreview {...opts} />
    </div>,
  );

  return previewDocumentShell(body, opts);
}

export function renderAccountProPreviewExamplesIndexHtml(origin: string): string {
  const links = buildAccountProPreviewExampleLinks(origin);
  const listItems = links
    .map(
      (l) =>
        `<li style="margin:0.5rem 0"><a href="${l.href}" style="color:#2563eb;text-decoration:underline">${l.label}</a><br /><code style="font-size:12px;color:#64748b">${l.href}</code></li>`,
    )
    .join('\n');

  const body = `<main style="max-width:42rem;margin:2.5rem auto;padding:0 1.25rem;font-family:system-ui,sans-serif">
  <h1 style="font-size:1.35rem;font-weight:600;margin:0 0 0.5rem">Account Pro preview (dev)</h1>
  <p style="color:#64748b;font-size:0.9rem;line-height:1.5;margin:0 0 1.25rem">Local QA for <code>/account/pro</code>. Each link renders HTML via this API (same UI as the app portal page).</p>
  <ul style="list-style:none;padding:0;margin:0">${listItems}</ul>
  <p style="margin-top:1.5rem;font-size:0.8rem;color:#94a3b8">Also: <code>/dev/account-pro-preview</code> (Next.js page, same query params).</p>
</main>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Dev preview — account/pro examples</title>
</head>
<body>${body}</body>
</html>`;
}
