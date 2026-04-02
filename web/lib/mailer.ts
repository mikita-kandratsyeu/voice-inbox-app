import nodemailer from 'nodemailer';

export type MailSendPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.MAIL_FROM?.trim());
}

export async function sendTransactionalMail(payload: MailSendPayload): Promise<void> {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.MAIL_FROM?.trim();
  if (!host || !from) {
    throw new Error('SMTP is not configured (SMTP_HOST and MAIL_FROM required)');
  }

  const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
  const secure = process.env.SMTP_SECURE === '1' || process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER?.trim() || undefined;
  const pass = process.env.SMTP_PASS?.trim() || undefined;

  const transporter = nodemailer.createTransport({
    host,
    port: Number.isFinite(port) ? port : 587,
    secure,
    ...(user && pass ? { auth: { user, pass } } : {}),
  });

  await transporter.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
}
