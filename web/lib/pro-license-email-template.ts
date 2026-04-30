import {
  APP_STORE_URL,
  BASE_URL_OR_FALLBACK,
  GOOGLE_PLAY_URL,
  SUPPORT_EMAIL,
} from '@/config/constants';

const MUTED = '#6b7280';
const BORDER = '#e5e7eb';

export function resolveProLicenseEmailLogoUrl(): string {
  const base = BASE_URL_OR_FALLBACK.replace(/\/$/, '');

  return `${base}/icon.svg`;
}

function resolveStoreBadgeUrls(): { appStore: string; googlePlay: string } {
  const base = BASE_URL_OR_FALLBACK.replace(/\/$/, '');

  return {
    appStore: `${base}/app-stores/app-store-en-dark.png`,
    googlePlay: `${base}/app-stores/gp-store-en-dark.png`,
  };
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

function hr(): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="height:1px;line-height:1px;font-size:1px;background-color:${BORDER};">&nbsp;</td></tr></table>`;
}

function buildFooterHtml(params: {
  support: string;
  site: string;
  appStoreHref: string;
  googlePlayHref: string;
}): string {
  const { site, appStoreHref, googlePlayHref } = params;
  const supportHref = escapeHtml(`${site}/support`);
  const privacyHref = escapeHtml(`${site}/privacy`);
  const termsHref = escapeHtml(`${site}/terms`);
  const year = new Date().getFullYear();
  const { appStore: appBadgeSrc, googlePlay: gpBadgeSrc } = resolveStoreBadgeUrls();

  const storeRow =
    appStoreHref !== '#' || googlePlayHref !== '#'
      ? `<table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;">
  <tr>
    <td style="padding:4px 6px 4px 0;vertical-align:middle;">
      <a href="${escapeHtml(appStoreHref)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
        <img src="${escapeHtml(appBadgeSrc)}" width="150" height="50" alt="Download on the App Store" style="display:block;width:150px;height:50px;border:0;" />
      </a>
    </td>
    <td style="padding:4px 0 4px 6px;vertical-align:middle;">
      <a href="${escapeHtml(googlePlayHref)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
        <img src="${escapeHtml(gpBadgeSrc)}" width="150" height="50" alt="Get it on Google Play" style="display:block;width:150px;height:50px;border:0;" />
      </a>
    </td>
  </tr>
</table>`
      : '';

  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
  <tr>
    <td style="padding:8px 28px 18px 28px;text-align:center;">
      ${storeRow}
      <p style="margin:10px 0 0 0;font-size:12px;line-height:1.5;color:#9ca3af;">
        <a href="${supportHref}" style="color:#9ca3af;text-decoration:underline;">Support</a>
        &nbsp;
        <a href="${privacyHref}" style="color:#9ca3af;text-decoration:underline;">Privacy</a>
        &nbsp;
        <a href="${termsHref}" style="color:#9ca3af;text-decoration:underline;">Terms</a>
      </p>
      <p style="margin:10px 0 0 0;font-size:12px;line-height:1.5;color:#9ca3af;">© ${year} Voice Inbox AI. All rights reserved.</p>
    </td>
  </tr>
</table>`;
}

export type ProLicenseEmailDuration =
  | { kind: 'months'; months: number }
  | { kind: 'days'; days: number };

function durationPhrasePlain(d: ProLicenseEmailDuration): string {
  if (d.kind === 'days') {
    return `${d.days} day${d.days === 1 ? '' : 's'}`;
  }
  return `${d.months} month${d.months === 1 ? '' : 's'}`;
}

function durationPhraseHtml(d: ProLicenseEmailDuration): string {
  if (d.kind === 'days') {
    return `${d.days}&nbsp;day${d.days === 1 ? '' : 's'}`;
  }
  return `${d.months}&nbsp;month${d.months === 1 ? '' : 's'}`;
}

export function buildProLicenseKeyEmail(params: {
  plainKey: string;
  duration: ProLicenseEmailDuration;
  recipientEmail?: string | null;
}): {
  subject: string;
  text: string;
  html: string;
} {
  const keyDisplay = formatProKeyEmailBlock(params.plainKey);
  const dur = params.duration;
  const support = SUPPORT_EMAIL.trim();
  const site = BASE_URL_OR_FALLBACK.replace(/\/$/, '');
  const recipient = params.recipientEmail?.trim() ?? null;
  const supportLine = support
    ? `If you did not request this key, contact us at ${support}.`
    : `If you did not request this key, please ignore this message.`;

  const appStoreHref = APP_STORE_URL.trim() || '#';
  const googlePlayHref = GOOGLE_PLAY_URL.trim() || '#';

  const subject = `Your Pro license (${durationPhrasePlain(dur)})`;

  const phrase = durationPhrasePlain(dur);
  const introPlain = recipient
    ? `Pro license (${phrase}) for ${recipient} — one-time key:`
    : `Pro license (${phrase}) — one-time key:`;

  const textLines = [
    introPlain,
    '',
    keyDisplay,
    '',
    'Activates Pro on one device only. Do not share this code.',
    'Activate: Settings → About → Tap the app icon 8 times.',
    '',
    supportLine,
    site ? `Website: ${site}` : '',
    appStoreHref !== '#' ? `App Store: ${appStoreHref}` : '',
    googlePlayHref !== '#' ? `Google Play: ${googlePlayHref}` : '',
    site ? `Privacy: ${site}/privacy · Terms: ${site}/terms` : '',
  ];
  const text = textLines.filter(Boolean).join('\n');

  const keyHtml = escapeHtml(keyDisplay);
  const logoUrl = escapeHtml(resolveProLicenseEmailLogoUrl());

  const introHtml = recipient
    ? `Pro license (${durationPhraseHtml(dur)}) for <strong style="color:#111827;">${escapeHtml(recipient)}</strong>`
    : `Pro license (${durationPhraseHtml(dur)})`;

  const footerHtml = buildFooterHtml({
    support,
    site,
    appStoreHref,
    googlePlayHref,
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;padding:28px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:10px;border:1px solid ${BORDER};">
          <tr>
            <td style="padding:22px 28px 16px 28px;">
              <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                <tr>
                  <td style="vertical-align:middle;width:44px;">
                    <img
                      src="${logoUrl}"
                      width="36"
                      height="36"
                      alt=""
                      style="display:block;width:36px;height:36px;border-radius:8px;"
                    />
                  </td>
                  <td style="vertical-align:middle;padding-left:10px;">
                    <span style="font-size:17px;font-weight:700;color:#111827;letter-spacing:-0.02em;">Voice Inbox AI</span>
                    <span style="display:block;margin-top:2px;font-size:12px;color:${MUTED};">Pro license</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px;">${hr()}</td>
          </tr>
          <tr>
            <td style="padding:18px 28px 6px 28px;">
              <p style="margin:0;font-size:15px;line-height:1.45;color:#111827;">${introHtml}</p>
              <p style="margin:6px 0 0 0;font-size:13px;color:${MUTED};">One-time activation key</p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px 6px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:16px 14px;text-align:center;">
                    <span style="font-size:20px;font-weight:700;letter-spacing:0.08em;color:#111827;font-family:ui-monospace,Menlo,Consolas,'Courier New',monospace;">${keyHtml}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 28px 20px 28px;">
              <p style="margin:0;font-size:13px;line-height:1.5;color:#4b5563;">
                One device only. Do not share this code.
              </p>
              <p style="margin:8px 0 0 0;font-size:13px;line-height:1.5;color:#4b5563;">
                <strong style="color:#111827;">Activate:</strong> Settings → About → Tap the app icon 8 times.
              </p>
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
