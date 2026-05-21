import type { ProLicenseDurationSpec } from '@/lib/pro-license-admin';
import type { VoucherLocale } from '@/lib/pro-license-voucher-copy';
import { formatVoucherPremiumAccessLabel } from '@/lib/pro-license-voucher-copy';

function durationLabel(spec: ProLicenseDurationSpec, locale: VoucherLocale): string {
  if (locale === 'ru') {
    if (spec.kind === 'days') {
      if (spec.days === 1) return '1 день Premium';
      return `${spec.days} ${spec.days >= 5 ? 'дней' : 'дня'} Premium`;
    }
    if (spec.months === 1) return '1 месяц Premium';
    const mod10 = spec.months % 10;
    const mod100 = spec.months % 100;
    const word = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'месяца' : 'месяцев';
    return `${spec.months} ${word} Premium`;
  }
  if (spec.kind === 'days') {
    if (spec.days === 1) return '1 day of Premium';
    return `${spec.days} days of Premium`;
  }
  if (spec.months === 1) return '1 month of Premium';
  return `${spec.months} months of Premium`;
}

export function buildVoucherGiftEmail(params: {
  plainKey: string;
  duration: ProLicenseDurationSpec;
  locale: VoucherLocale;
  recipientEmail: string;
}): { subject: string; text: string; html: string; pdfFilename: string } {
  const { plainKey, duration, locale } = params;
  const access = durationLabel(duration, locale);
  const pdfFilename = `voice-inbox-gift-voucher-${formatVoucherPremiumAccessLabel(duration)}-${locale}.pdf`;

  if (locale === 'ru') {
    const subject = 'Ваш подарочный ваучер Voice Inbox AI';
    const text = [
      'Здравствуйте!',
      '',
      `Во вложении — подарочный ваучер Voice Inbox AI (${access}).`,
      '',
      `Ваш код: ${plainKey}`,
      '',
      'Как активировать:',
      '1. Установите или откройте приложение (QR на ваучере).',
      '2. Настройки → О приложении → 8 раз нажмите на иконку приложения.',
      '3. Введите код и нажмите «Применить».',
      '',
      'Код одноразовый и привязан к одному устройству.',
      '',
      '— Voice Inbox AI',
    ].join('\n');
    const html = `<!DOCTYPE html><html lang="ru"><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>Здравствуйте!</p>
<p>Во вложении — подарочный ваучер <strong>Voice Inbox AI</strong> (${access}).</p>
<p style="font-size:18px;font-weight:700;letter-spacing:0.05em;font-family:monospace">${plainKey}</p>
<p>Как активировать:</p>
<ol>
<li>Установите или откройте приложение (QR на ваучере).</li>
<li>Настройки → О приложении → 8 раз нажмите на иконку приложения.</li>
<li>Введите код и нажмите «Применить».</li>
</ol>
<p style="font-size:13px;color:#555">Код одноразовый и привязан к одному устройству.</p>
</body></html>`;
    return { subject, text, html, pdfFilename };
  }

  const subject = 'Your Voice Inbox AI gift voucher';
  const text = [
    'Hello,',
    '',
    `Attached is your Voice Inbox AI gift voucher (${access}).`,
    '',
    `Your code: ${plainKey}`,
    '',
    'How to redeem:',
    '1. Install or open the app (QR code on the voucher).',
    '2. Settings → About the app → tap the app icon eight times quickly.',
    '3. Enter your code and tap Apply.',
    '',
    'This code is for one-time use on a single device.',
    '',
    '— Voice Inbox AI',
  ].join('\n');
  const html = `<!DOCTYPE html><html lang="en"><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>Hello,</p>
<p>Attached is your <strong>Voice Inbox AI</strong> gift voucher (${access}).</p>
<p style="font-size:18px;font-weight:700;letter-spacing:0.05em;font-family:monospace">${plainKey}</p>
<p>How to redeem:</p>
<ol>
<li>Install or open the app (QR code on the voucher).</li>
<li>Settings → About the app → tap the app icon eight times quickly.</li>
<li>Enter your code and tap Apply.</li>
</ol>
<p style="font-size:13px;color:#555">This code is for one-time use on a single device.</p>
</body></html>`;
  return { subject, text, html, pdfFilename };
}
