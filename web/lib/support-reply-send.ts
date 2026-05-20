import type { AdminSession } from '@/lib/admin-session';
import { writeAdminAudit } from '@/lib/admin-audit';
import { sendTransactionalMail, isSmtpConfigured } from '@/lib/mailer';
import { prisma } from '@/lib/prisma';
import { buildSupportReplyEmail } from '@/lib/support-reply-email';

const REPLY_MARKDOWN_MAX = 12_000;

export type SupportReplySendResult = { ok: true } | { ok: false; error: string; status: number };

function guessLocaleFromDiagnostics(diagnostics: unknown): 'en' | 'ru' | undefined {
  if (!diagnostics || typeof diagnostics !== 'object') return undefined;
  const locales = (diagnostics as { locales?: unknown }).locales;
  if (!Array.isArray(locales) || locales.length === 0) return undefined;
  const first = locales[0];
  if (!first || typeof first !== 'object' || !('languageCode' in first)) return undefined;
  const code = String((first as { languageCode: unknown }).languageCode).toLowerCase();
  if (code === 'ru' || code === 'en') return code;
  return undefined;
}

export async function sendSupportReplyEmailForIssue(
  issueId: string,
  markdown: string,
  admin: AdminSession,
  localeHint?: 'en' | 'ru' | 'auto',
): Promise<SupportReplySendResult> {
  if (!isSmtpConfigured()) {
    return {
      ok: false,
      error: 'SMTP is not configured (set SMTP_HOST and MAIL_FROM)',
      status: 503,
    };
  }

  const body = markdown.trim();
  if (!body) {
    return { ok: false, error: 'Reply message is required', status: 400 };
  }
  if (body.length > REPLY_MARKDOWN_MAX) {
    return {
      ok: false,
      error: `Message is too long (max ${REPLY_MARKDOWN_MAX} characters)`,
      status: 400,
    };
  }

  const issue = await prisma.supportIssue.findUnique({
    where: { id: issueId },
    select: {
      id: true,
      referenceNumber: true,
      email: true,
      diagnostics: true,
      status: true,
    },
  });

  if (!issue) {
    return { ok: false, error: 'Support issue not found', status: 404 };
  }

  if (!issue.email?.trim()) {
    return {
      ok: false,
      error: 'This request has no email — ask the user to resubmit with an address',
      status: 400,
    };
  }

  const locale =
    localeHint === 'en' || localeHint === 'ru'
      ? localeHint
      : (guessLocaleFromDiagnostics(issue.diagnostics) ?? 'en');

  const { subject, text, html } = await buildSupportReplyEmail({
    referenceNumber: issue.referenceNumber,
    markdown: body,
    locale,
  });

  try {
    await sendTransactionalMail({
      to: issue.email.trim(),
      subject,
      text,
      html,
    });
  } catch (e) {
    console.error('[support-reply-send] mail', e);
    return { ok: false, error: 'Failed to send email', status: 503 };
  }

  if (issue.status === 'open') {
    await prisma.supportIssue.update({
      where: { id: issueId },
      data: { status: 'closed', closedAt: new Date() },
    });
  }

  await writeAdminAudit(admin, 'support.reply_email', {
    issueId,
    referenceNumber: issue.referenceNumber,
    to: issue.email.trim(),
    locale,
    length: body.length,
  });

  return { ok: true };
}
