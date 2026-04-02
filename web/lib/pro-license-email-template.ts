import {
  APP_STORE_URL,
  BASE_URL_OR_FALLBACK,
  GOOGLE_PLAY_URL,
  SUPPORT_EMAIL,
} from '@/config/constants';

/** Brand accent (links) — matches app green, Link-style bold green. */
const ACCENT = '#10b981';

export function resolveProLicenseEmailLogoUrl(): string {
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

function isHttpStoreUrl(url: string): boolean {
  const u = url.trim();
  return u.length > 0 && u !== '#' && /^https?:\/\//i.test(u);
}

function hr(): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="height:1px;line-height:1px;font-size:1px;background-color:#eeeeee;">&nbsp;</td></tr></table>`;
}

function buildLinkStyleFooterHtml(params: { support: string; site: string }): string {
  const { support, site } = params;
  const supportMailHref = support ? `mailto:${escapeHtml(support)}` : '';
  const siteHref = escapeHtml(site);
  const siteHost = escapeHtml(site.replace(/^https?:\/\//i, ''));
  const privacyHref = escapeHtml(`${site}/privacy`);
  const termsHref = escapeHtml(`${site}/terms`);
  const year = new Date().getFullYear();

  const linkStyle = `color:${ACCENT};font-weight:700;text-decoration:none;`;
  const linkStyleHover = linkStyle; /* email clients ignore :hover */

  const supportPhrase =
    support && supportMailHref
      ? `Received this by mistake or need assistance? <a href="${supportMailHref}" style="${linkStyleHover}">Contact Support</a>.`
      : `If you believe you are getting this email in error, you can safely ignore it.`;

  const learnPhrase = `<a href="${siteHref}" style="${linkStyleHover}">${siteHost}</a>`;

  const storeBits: string[] = [];
  if (isHttpStoreUrl(APP_STORE_URL)) {
    storeBits.push(
      `<a href="${escapeHtml(APP_STORE_URL.trim())}" style="${linkStyle}">App Store</a>`,
    );
  }
  if (isHttpStoreUrl(GOOGLE_PLAY_URL)) {
    storeBits.push(
      `<a href="${escapeHtml(GOOGLE_PLAY_URL.trim())}" style="${linkStyle}">Google Play</a>`,
    );
  }
  const storeLine =
    storeBits.length > 0
      ? `<p style="margin:16px 0 0 0;font-size:14px;line-height:1.55;color:#111111;">Get the app: ${storeBits.join(' · ')}.</p>`
      : '';

  const legalLine = `© ${year} Voice Inbox AI. All rights reserved.`;

  return `${hr()}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
  <tr>
    <td style="padding:24px 40px 20px 40px;">
      <p style="margin:0;font-size:14px;line-height:1.6;color:#111111;">
        ${supportPhrase}<br>
        Discover more at ${learnPhrase}.
      </p>
      ${storeLine}
      <p style="margin:14px 0 0 0;font-size:12px;line-height:1.5;color:#888888;">
        <a href="${privacyHref}" style="color:#888888;text-decoration:underline;">Privacy Policy</a>
        ·
        <a href="${termsHref}" style="color:#888888;text-decoration:underline;">Terms of Service</a>
      </p>
      <p style="margin:16px 0 0 0;font-size:11px;line-height:1.5;color:#aaaaaa;">
        ${legalLine}
      </p>
    </td>
  </tr>
</table>`;
}

export function buildProLicenseKeyEmail(params: {
  plainKey: string;
  durationMonths: number;
  recipientEmail?: string | null;
}): {
  subject: string;
  text: string;
  html: string;
} {
  const keyDisplay = formatProKeyEmailBlock(params.plainKey);
  const months = params.durationMonths;
  const support = SUPPORT_EMAIL.trim();
  const site = BASE_URL_OR_FALLBACK.replace(/\/$/, '');
  const recipient = params.recipientEmail?.trim() ?? null;
  const supportLine = support
    ? `If you did not request this key, contact us at ${support}.`
    : `If you did not request this key, please ignore this message.`;

  const subject = `Your Voice Inbox AI Pro license (${months} mo)`;

  const introPlain = recipient
    ? `One-Time Activation Key for ${recipient} (${months} month${months === 1 ? '' : 's'}) is:`
    : `One-Time Activation Key (${months} month${months === 1 ? '' : 's'}) is:`;

  const textLines = [
    introPlain,
    '',
    keyDisplay,
    '',
    'This key can be used once on one device only. Never share this code with anyone.',
    'Enter it in the app: Settings → About → tap the app icon 8 times.',
    '',
    supportLine,
    site ? `Website: ${site}` : '',
    site ? `Privacy: ${site}/privacy · Terms: ${site}/terms` : '',
  ];
  if (isHttpStoreUrl(APP_STORE_URL)) textLines.push(`App Store: ${APP_STORE_URL.trim()}`);
  if (isHttpStoreUrl(GOOGLE_PLAY_URL)) textLines.push(`Google Play: ${GOOGLE_PLAY_URL.trim()}`);
  const text = textLines.filter(Boolean).join('\n');

  const keyHtml = escapeHtml(keyDisplay);
  const logoUrl = escapeHtml(resolveProLicenseEmailLogoUrl());

  const introHtml = recipient
    ? `One-Time Activation Key for <strong style="color:#111111;">${escapeHtml(recipient)}</strong> is:`
    : `One-Time Activation Key (${months}&nbsp;month${months === 1 ? '' : 's'}) is:`;

  const footerHtml = buildLinkStyleFooterHtml({ support, site });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f6f6f6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;box-shadow:0 1px 2px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:36px 40px 24px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                <tr>
                  <td style="vertical-align:middle;width:48px;">
                    <img
                      src="${logoUrl}"
                      width="40"
                      height="40"
                      alt=""
                      style="display:block;width:40px;height:40px;border-radius:10px;object-fit:cover;"
                    />
                  </td>
                  <td style="vertical-align:middle;padding-left:4px;">
                    <span style="font-size:22px;font-weight:700;color:#111111;letter-spacing:-0.02em;">Voice Inbox AI</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px;">${hr()}</td>
          </tr>
          <tr>
            <td style="padding:28px 40px 8px 40px;">
              <p style="margin:0;font-size:16px;line-height:1.5;color:#111111;">${introHtml}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px 8px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color:#e8f7ed;border-radius:12px;padding:22px 20px;text-align:center;">
                    <span style="font-size:24px;font-weight:700;letter-spacing:0.06em;color:#111111;font-family:ui-monospace,Menlo,Consolas,'Courier New',monospace;">${keyHtml}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 32px 40px;">
              <p style="margin:0;font-size:14px;line-height:1.55;color:#444444;">
                This key activates Voice Inbox AI Pro <strong>on one device only</strong>. For security, never share it
              </p>
              <p style="margin:12px 0 0 0;font-size:14px;line-height:1.55;color:#444444;"><strong>To activate:</strong><br>Settings → About → tap the app icon 8 times.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0;">${footerHtml}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
