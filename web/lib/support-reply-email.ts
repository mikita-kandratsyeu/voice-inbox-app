import { SUPPORT_EMAIL } from '@/config/constants';
import { formatSupportReference } from '@/lib/support-reference';
import { shareEmailBrand } from '@/lib/share-email-brand';
import { renderShareNotePlainText } from '@/lib/share-note-markdown';
import { renderShareNoteMarkdownEmailInnerHtml } from '@/lib/shareNoteMarkdownEmailHtml';
import { buildShareNoteBrandedEmailHtml } from '@/lib/share-note-email-shell';

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

  const plainBody = renderShareNotePlainText(params.markdown.trim());
  const text = `${intro}${plainBody}${footer}`;

  const support = SUPPORT_EMAIL.trim();
  const brand = shareEmailBrand;
  const supportLine = support
    ? locale === 'ru'
      ? `Вопросы: <a href="mailto:${escapeHtml(support)}" style="color:${brand.link}">${escapeHtml(support)}</a>`
      : `Questions: <a href="mailto:${escapeHtml(support)}" style="color:${brand.link}">${escapeHtml(support)}</a>`
    : '';

  const introHtml =
    locale === 'ru'
      ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${brand.ink}">Здравствуйте! Ниже ответ по обращению <strong>${escapeHtml(ref)}</strong>:</p>`
      : `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${brand.ink}">Hello! Below is our reply regarding request <strong>${escapeHtml(ref)}</strong>:</p>`;

  const footerBlock = `<p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:${brand.muted}">${
    locale === 'ru' ? '— Команда Voice Inbox AI' : '— Voice Inbox AI team'
  }${supportLine ? `<br>${supportLine}` : ''}</p>`;

  const emailTitle = locale === 'ru' ? `Ответ по обращению ${ref}` : `Reply to request ${ref}`;

  const html = buildShareNoteBrandedEmailHtml({
    title: emailTitle,
    bodyInnerHtml: `${introHtml}${inner}${footerBlock}`,
    preheader: plainBody.slice(0, 140),
  });

  return { subject, text, html };
}
