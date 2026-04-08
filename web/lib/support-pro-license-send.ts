import type { AdminSession } from '@/lib/admin-session';
import { writeAdminAudit } from '@/lib/admin-audit';
import { sendTransactionalMail, isSmtpConfigured } from '@/lib/mailer';
import { buildProLicenseKeyEmail } from '@/lib/pro-license-email-template';
import { createProLicenseKeyRecord, type ProLicenseDurationSpec } from '@/lib/pro-license-admin';
import { prisma } from '@/lib/prisma';
import {
  isSupportProKeyRequestSubject,
  SUPPORT_PRO_KEY_SUBJECT_MARKER,
} from '@/lib/support-pro-key-request';

export type SupportProLicenseSendResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export async function sendSupportProLicenseEmailForIssue(
  issueId: string,
  spec: ProLicenseDurationSpec,
  admin: AdminSession,
  auditAction: 'support.pro_license_email' | 'support.pro_license_email_auto',
): Promise<SupportProLicenseSendResult> {
  if (!isSmtpConfigured()) {
    return {
      ok: false,
      error: 'SMTP is not configured (set SMTP_HOST and MAIL_FROM)',
      status: 503,
    };
  }

  const issue = await prisma.supportIssue.findUnique({
    where: { id: issueId },
    select: {
      id: true,
      email: true,
      subject: true,
      proLicenseEmailSentAt: true,
    },
  });

  if (!issue) {
    return { ok: false, error: 'Support issue not found', status: 404 };
  }

  if (!issue.email?.trim()) {
    return {
      ok: false,
      error: 'This request has no email address — ask the user to resubmit with email',
      status: 400,
    };
  }

  if (!isSupportProKeyRequestSubject(issue.subject)) {
    return {
      ok: false,
      error: `Subject does not contain the Pro key marker (${SUPPORT_PRO_KEY_SUBJECT_MARKER})`,
      status: 400,
    };
  }

  if (issue.proLicenseEmailSentAt != null) {
    return { ok: false, error: 'A Pro key was already emailed for this request', status: 409 };
  }

  const to = issue.email.trim();
  let plainKey: string;
  let keyId: string;

  try {
    const created = await createProLicenseKeyRecord(admin.adminId, spec, {
      issuedToEmail: to,
    });
    plainKey = created.plainKey;
    keyId = created.keyId;
  } catch (e) {
    console.error('[support-pro-license-send] create key', e);
    return { ok: false, error: 'Failed to create license key', status: 503 };
  }

  const { subject, text, html } = buildProLicenseKeyEmail({
    plainKey,
    duration:
      spec.kind === 'days'
        ? { kind: 'days', days: spec.days }
        : { kind: 'months', months: spec.months },
    recipientEmail: to,
  });

  try {
    await sendTransactionalMail({ to, subject, text, html });
  } catch (e) {
    console.error('[support-pro-license-send] mail', e);
    try {
      await prisma.proLicenseKey.delete({ where: { id: keyId } });
    } catch (delErr) {
      console.error('[support-pro-license-send] rollback key', delErr);
    }
    return {
      ok: false,
      error: 'Failed to send email (check SMTP settings)',
      status: 503,
    };
  }

  const now = new Date();
  try {
    await prisma.supportIssue.update({
      where: { id: issueId },
      data: {
        proLicenseEmailSentAt: now,
        proLicenseDurationMonths: spec.kind === 'months' ? spec.months : null,
        proLicenseDurationDays: spec.kind === 'days' ? spec.days : null,
        status: 'closed',
        closedAt: now,
      },
    });
  } catch (e) {
    console.error('[support-pro-license-send] update issue', e);
    return {
      ok: false,
      error: 'Email was sent but failed to update the ticket',
      status: 503,
    };
  }

  await writeAdminAudit(admin, auditAction, {
    issueId,
    durationMonths: spec.kind === 'months' ? spec.months : null,
    durationDays: spec.kind === 'days' ? spec.days : null,
    to,
  });

  return { ok: true };
}
