import { BASE_URL_OR_FALLBACK, SUPPORT_EMAIL } from '@/config/constants';

export function resolveProLicenseEmailLogoUrl(): string {
  const custom = process.env.EMAIL_LOGO_URL?.trim();
  if (custom) return custom;
  const base = BASE_URL_OR_FALLBACK.replace(/\/$/, '');
  return `${base}/icon.svg`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatProKeyEmailBlock(plainKey: string): string {
  return plainKey.trim();
}

export function buildProLicenseKeyEmail(params: { plainKey: string; durationMonths: number }): {
  subject: string;
  text: string;
  html: string;
} {
  const keyDisplay = formatProKeyEmailBlock(params.plainKey);
  const months = params.durationMonths;
  const support = SUPPORT_EMAIL.trim();
  const site = BASE_URL_OR_FALLBACK.replace(/\/$/, '');
  const supportLine = support
    ? `If you did not request this key, contact us at ${support}.`
    : `If you did not request this key, please ignore this message.`;

  const subject = `Your Voice Inbox AI Pro license (${months} mo)`;

  const text = [
    `Your Voice Inbox AI Pro license key (${months} month${months === 1 ? '' : 's'}):`,
    '',
    keyDisplay,
    '',
    'Enter this key once in the app settings. The key works on a single device and cannot be reused elsewhere.',
    '',
    'Do not share this key with anyone.',
    '',
    supportLine,
    site ? `Website: ${site}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const keyHtml = escapeHtml(keyDisplay);
  const supportMailHref = support ? `mailto:${escapeHtml(support)}` : '';
  const siteHref = escapeHtml(site);
  const logoUrl = escapeHtml(resolveProLicenseEmailLogoUrl());

  const footerBits: string[] = [];
  if (support) {
    footerBits.push(
      `Questions? Email <a href="${supportMailHref}" style="color:#2563eb;text-decoration:underline;">${escapeHtml(support)}</a>.`,
    );
  }
  if (site) {
    footerBits.push(
      `More about the app: <a href="${siteHref}" style="color:#2563eb;text-decoration:underline;">${siteHref}</a>.`,
    );
  }
  const footerInner =
    footerBits.length > 0 ? footerBits.join('<br /><br />') : 'Thank you for using Voice Inbox AI.';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f6f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f6f6f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:40px 40px 28px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;width:44px;">
                    <img
                      src="${logoUrl}"
                      width="40"
                      height="40"
                      alt="Voice Inbox AI"
                      style="display:block;width:40px;height:40px;border-radius:11px;object-fit:cover;"
                    />
                  </td>
                  <td style="vertical-align:middle;font-size:20px;font-weight:700;color:#111111;">Voice Inbox AI</td>
                </tr>
              </table>
              <p style="margin:28px 0 16px 0;font-size:16px;line-height:1.5;color:#111111;">Pro License Key (${months}&nbsp;month${months === 1 ? '' : 's'}):</p>
              <div style="background-color:#e8f7ed;border-radius:12px;padding:20px 24px;text-align:center;">
                <span style="font-size:22px;font-weight:700;letter-spacing:0.04em;color:#111111;font-family:ui-monospace,Menlo,Consolas,monospace;">${keyHtml}</span>
              </div>
              <p style="margin:20px 0 0 0;font-size:14px;line-height:1.55;color:#444444;">
                Enter your key to instantly activate Pro features in the app.
              </p>
              <p style="margin:12px 0 0 0;font-size:14px;line-height:1.55;color:#444444;">Go to Settings → About → Tap the app icon 8 times.</p>
              <p style="margin:12px 0 0 0;font-size:14px;line-height:1.55;color:#444444;"><strong>One-time redemption — non-transferable.</strong></p>
              <p style="margin:12px 0 0 0;font-size:14px;line-height:1.55;color:#444444;">Never share this code with anyone.</p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #eeeeee;padding:24px 40px 32px 40px;">
              <p style="margin:0;font-size:13px;line-height:1.55;color:#666666;">${footerInner}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
