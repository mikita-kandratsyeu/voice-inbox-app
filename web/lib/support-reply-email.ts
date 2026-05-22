import { BASE_URL_OR_FALLBACK, SUPPORT_EMAIL } from '@/config/constants';
import { formatSupportReference } from '@/lib/support-reference';
import { renderShareNoteMarkdownEmailInnerHtml } from '@/lib/shareNoteMarkdownEmailHtml';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type SupportReplyEmailCopy = {
  subject: string;
  text: string;
  html: string;
};

export async function buildSupportReplyEmail(params: {
  referenceNumber: number;
  markdown: string;
  locale?: 'en' | 'ru';
}): Promise<SupportReplyEmailCopy> {
  const ref = formatSupportReference(params.referenceNumber);
  const locale = params.locale === 'ru' ? 'ru' : 'en';
  const inner = await renderShareNoteMarkdownEmailInnerHtml(params.markdown.trim());

  const subject =
    locale === 'ru'
      ? `Ответ по обращению ${ref} — Voice Inbox AI`
      : `Reply to your request ${ref} — Voice Inbox AI`;

  const intro =
    locale === 'ru'
      ? `Здравствуйте!\n\nОтвет по вашему обращению ${ref} в поддержку Voice Inbox AI:\n\n`
      : `Hello,\n\nHere is our reply to your support request ${ref} for Voice Inbox AI:\n\n`;

  const footer = locale === 'ru' ? `\n\n— Команда Voice Inbox AI` : `\n\n— Voice Inbox AI team`;

  const text = `${intro}${params.markdown.trim()}${footer}`;

  const support = SUPPORT_EMAIL.trim();
  const supportLine = support
    ? locale === 'ru'
      ? `Вопросы: <a href="mailto:${escapeHtml(support)}" style="color:#2563eb">${escapeHtml(support)}</a>`
      : `Questions: <a href="mailto:${escapeHtml(support)}" style="color:#2563eb">${escapeHtml(support)}</a>`
    : '';

  const introHtml =
    locale === 'ru'
      ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0f172a">Здравствуйте! Ниже ответ по обращению <strong>${escapeHtml(ref)}</strong>:</p>`
      : `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#0f172a">Hello! Below is our reply regarding request <strong>${escapeHtml(ref)}</strong>:</p>`;

  const footerHtml = `<p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#64748b">${
    locale === 'ru' ? '— Команда Voice Inbox AI' : '— Voice Inbox AI team'
  }${supportLine ? `<br>${supportLine}` : ''}</p>`;

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#e8edf5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:12px;padding:28px 24px"><tr><td>${introHtml}${inner}${footerHtml}</td></tr></table><p style="margin:16px 0 0;font-size:12px;color:#94a3b8"><a href="${escapeHtml(BASE_URL_OR_FALLBACK)}" style="color:#64748b">voice-inbox.online</a></p></td></tr></table></body></html>`;

  return { subject, text, html };
}
