import { BASE_URL_OR_FALLBACK } from '@/config/constants';
import { shareEmailBrand } from '@/lib/share-email-brand';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type ShareNoteBrandedEmailOptions = {
  title: string;
  bodyInnerHtml: string;
  preheader?: string;
  /** Shown under the card (default: voice-inbox.online link). */
  footerHtml?: string;
};

/**
 * Table-based branded wrapper for share / export emails (client-safe inline styles).
 */
export function buildShareNoteBrandedEmailHtml(options: ShareNoteBrandedEmailOptions): string {
  const { title, bodyInnerHtml, preheader, footerHtml } = options;
  const b = shareEmailBrand;
  const escapedTitle = escapeHtml(title);
  const preheaderBlock = preheader?.trim()
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${escapeHtml(preheader.trim())}</div>`
    : '';

  const defaultFooter = `<p style="margin:0;font-size:12px;line-height:1.5;color:${b.faint};"><a href="${escapeHtml(BASE_URL_OR_FALLBACK)}" style="color:${b.muted};text-decoration:none;">Voice Inbox AI</a> · <span style="color:${b.faint};">voice-inbox.online</span></p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapedTitle}</title>
</head>
<body style="margin:0;padding:0;background:${b.canvas};font-family:${b.font};color:${b.ink};">
  ${preheaderBlock}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${b.canvas};">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
          <tr>
            <td style="border-radius:16px 16px 0 0;padding:20px 24px;background:linear-gradient(135deg, ${b.gradientStart} 0%, ${b.gradientEnd} 100%);">
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.88);">Voice Inbox AI</p>
              <h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:700;color:#ffffff;">${escapedTitle}</h1>
            </td>
          </tr>
          <tr>
            <td style="background:${b.card};border:1px solid ${b.border};border-top:none;border-radius:0 0 16px 16px;padding:24px 24px 28px;">
              ${bodyInnerHtml}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 8px 0;">
              ${footerHtml ?? defaultFooter}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
