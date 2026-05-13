import {
  APP_STORE_URL,
  BASE_URL_OR_FALLBACK,
  GOOGLE_PLAY_URL,
  SUPPORT_EMAIL,
} from '@/config/constants';

const MUTED = '#64748b';
const BORDER_SOFT = '#e2e8f0';
const FOOTER_LINK = '#2563eb';
const FOOTER_LEGAL = '#64748b';
const PAGE_BG = '#e8edf5';
const TEXT_DARK = '#0f172a';
const PRIMARY = '#1d4ed8';
const KEY_PANEL_BG = '#f0f9ff';
const KEY_PANEL_BORDER = '#7dd3fc';

export function resolveProLicenseEmailLogoUrl(): string {
  const base = BASE_URL_OR_FALLBACK.replace(/\/$/, '');

  return `${base}/icon.svg`;
}

function resolveProLicenseEmailPublicAsset(path: string): string {
  const base = BASE_URL_OR_FALLBACK.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
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

function buildFooterDividerHtml(): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
  <tr>
    <td style="padding:0 28px 12px 28px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="border-top:1px solid #bae6fd;font-size:1px;line-height:1px;">&nbsp;</td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
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

  const hasAppStore = appStoreHref !== '#';
  const hasGooglePlay = googlePlayHref !== '#';
  const storeCells: string[] = [];
  if (hasAppStore) {
    const padRight = hasGooglePlay ? '6px' : '0';
    storeCells.push(`<td style="padding:0 ${padRight} 0 0;vertical-align:middle;">
      <a href="${escapeHtml(appStoreHref)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
        <img src="${escapeHtml(appBadgeSrc)}" width="150" height="50" alt="Download on the App Store" style="display:block;width:150px;height:50px;border:0;" />
      </a>
    </td>`);
  }
  if (hasGooglePlay) {
    const padLeft = hasAppStore ? '6px' : '0';
    storeCells.push(`<td style="padding:0 0 0 ${padLeft};vertical-align:middle;">
      <a href="${escapeHtml(googlePlayHref)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
        <img src="${escapeHtml(gpBadgeSrc)}" width="150" height="50" alt="Get it on Google Play" style="display:block;width:150px;height:50px;border:0;" />
      </a>
    </td>`);
  }
  const storeRow =
    storeCells.length > 0
      ? `<table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;">
  <tr>
    ${storeCells.join('\n    ')}
  </tr>
</table>`
      : '';

  const hasStores = storeCells.length > 0;
  const linkStyle = `color:${FOOTER_LINK};text-decoration:underline;font-size:13px;line-height:1.5;font-weight:600;`;

  const storeBlock = hasStores
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
  <tr>
    <td style="padding:0 0 28px 0;text-align:center;">
      <p style="margin:0 0 6px 0;font-size:13px;line-height:1.35;color:${TEXT_DARK};font-weight:700;">Get the app</p>
      ${storeRow}
    </td>
  </tr>
</table>`
    : '';

  const legalNav = `<table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;">
  <tr>
    <td style="padding:2px 6px;"><a href="${privacyHref}" style="${linkStyle}">Privacy Policy</a></td>
    <td style="padding:2px 6px;"><a href="${termsHref}" style="${linkStyle}">Terms of Service</a></td>
  </tr>
</table>`;

  const divider = buildFooterDividerHtml();

  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
  <tr>
    <td style="padding:12px 28px 18px 28px;text-align:center;background-color:#ffffff;border-radius:0 0 16px 16px;">
      ${storeBlock}
      ${hasStores ? divider : ''}
      ${legalNav}
      <p style="margin:6px 0 0 0;padding:0 8px;font-size:11px;line-height:1.45;color:${FOOTER_LEGAL};">© ${year} Voice Inbox AI. All rights reserved.</p>
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
    site ? `Privacy Policy: ${site}/privacy · Terms of Service: ${site}/terms` : '',
  ];
  const text = textLines.filter(Boolean).join('\n');

  const keyHtml = escapeHtml(keyDisplay);
  const logoUrl = escapeHtml(resolveProLicenseEmailLogoUrl());
  const shieldIconUrl = escapeHtml(
    resolveProLicenseEmailPublicAsset('/email/pro-license-shield.svg'),
  );
  const infoIconUrl = escapeHtml(resolveProLicenseEmailPublicAsset('/email/pro-license-info.svg'));

  const headlineHtml = recipient
    ? `Pro license (${durationPhraseHtml(dur)}) for <strong style="color:${TEXT_DARK};">${escapeHtml(recipient)}</strong>`
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
<body style="margin:0;padding:0;background-color:${PAGE_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${PAGE_BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border-radius:16px;overflow:hidden;box-shadow:0 12px 48px rgba(15,23,42,0.08);background-color:#ffffff;">
          <tr>
            <td style="padding:0;background:linear-gradient(180deg,#dbeafe 0%,#eff6ff 38%,#f8fafc 72%,#ffffff 100%);border-radius:16px 16px 0 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:24px 28px 8px 28px;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align:middle;width:48px;">
                          <img
                            src="${logoUrl}"
                            width="40"
                            height="40"
                            alt=""
                            style="display:block;width:40px;height:40px;border-radius:10px;box-shadow:0 2px 8px rgba(37,99,235,0.2);"
                          />
                        </td>
                        <td style="vertical-align:middle;padding-left:12px;">
                          <span style="font-size:18px;font-weight:800;color:${TEXT_DARK};letter-spacing:-0.03em;line-height:1.2;">Voice Inbox AI</span>
                          <span style="display:block;margin-top:4px;font-size:13px;font-weight:600;color:${PRIMARY};letter-spacing:0.01em;">Pro license</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 28px 22px 28px;">
                    <p style="margin:0;font-size:16px;line-height:1.45;font-weight:700;color:${TEXT_DARK};">${headlineHtml}</p>
                    <p style="margin:8px 0 0 0;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${MUTED};">One-time activation key</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px 8px 28px;background-color:#ffffff;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color:${KEY_PANEL_BG};border:1px solid ${KEY_PANEL_BORDER};border-radius:12px;padding:20px 16px;text-align:center;">
                    <span style="font-size:22px;font-weight:800;letter-spacing:0.1em;color:${TEXT_DARK};font-family:ui-monospace,Menlo,Consolas,'Courier New',monospace;">${keyHtml}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 10px 28px;background-color:#ffffff;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${BORDER_SOFT};border-radius:16px;background-color:#ffffff;">
                <tr>
                  <td style="padding:16px 0 16px 14px;vertical-align:middle;width:54px;">
                    <img src="${shieldIconUrl}" width="40" height="40" alt="" style="display:block;width:40px;height:40px;" />
                  </td>
                  <td style="padding:16px 14px 16px 4px;font-size:14px;line-height:1.55;color:#334155;vertical-align:middle;">
                    One device only. Do not share this code.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 20px 28px;background-color:#ffffff;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${BORDER_SOFT};border-radius:16px;background-color:#ffffff;">
                <tr>
                  <td style="padding:16px 0 16px 14px;vertical-align:middle;width:54px;">
                    <img src="${infoIconUrl}" width="40" height="40" alt="" style="display:block;width:40px;height:40px;" />
                  </td>
                  <td style="padding:16px 14px 16px 4px;font-size:14px;line-height:1.55;color:#334155;vertical-align:middle;">
                    <strong style="color:${TEXT_DARK};">Activate:</strong> Settings → About → Tap the app icon 8 times.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0;background-color:#ffffff;">
              <p style="margin:0;padding:0 28px 18px 28px;font-size:12px;line-height:1.55;color:${MUTED};text-align:center;">
                ${escapeHtml(supportLine)}
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
