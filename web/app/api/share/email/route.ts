import {
  apiError,
  checkSupportRateLimit,
  HttpStatus,
  parseJsonBody,
  requireAppAuth,
  requireMobileUserAgent,
  validateDeviceId,
} from '@/lib/api';
import { HEADER_DEVICE_ID } from '@/config/constants';
import { isSmtpConfigured, sendTransactionalMail } from '@/lib/mailer';
import { NextResponse } from 'next/server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TITLE_MAX = 200;
const SUBJECT_MAX = 220;
const MARKDOWN_MAX = 80_000;

type ShareEmailBody = {
  to?: unknown;
  subject?: unknown;
  title?: unknown;
  markdown?: unknown;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim();
  if (email.length === 0 || email.length > 254 || !EMAIL_RE.test(email)) return null;
  return email;
}

function normalizeBoundedString(raw: unknown, max: number): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value || value.length > max) return null;
  return value;
}

export async function POST(request: Request): Promise<NextResponse> {
  const path = new URL(request.url).pathname;

  const authError = await requireAppAuth();
  if (authError) return authError;

  const uaError = await requireMobileUserAgent();
  if (uaError) return uaError;

  const deviceId = request.headers.get(HEADER_DEVICE_ID);
  const deviceIdError = validateDeviceId(deviceId);
  if (deviceIdError) {
    return apiError(deviceIdError, HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const rate = await checkSupportRateLimit(deviceId!.trim());
  if (rate) return rate;

  if (!isSmtpConfigured()) {
    return apiError('Email is not configured', HttpStatus.SERVICE_UNAVAILABLE, { pathname: path });
  }

  const body = await parseJsonBody<ShareEmailBody>(request);
  if (!body) {
    return apiError('Invalid JSON', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const to = normalizeEmail(body.to);
  if (!to) {
    return apiError('Valid recipient email is required', HttpStatus.BAD_REQUEST, {
      pathname: path,
    });
  }

  const title = normalizeBoundedString(body.title, TITLE_MAX);
  if (!title) {
    return apiError('title is required', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const markdown = normalizeBoundedString(body.markdown, MARKDOWN_MAX);
  if (!markdown) {
    return apiError('markdown is required', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const subject =
    normalizeBoundedString(body.subject, SUBJECT_MAX) ??
    `Voice Inbox note: ${title}`.slice(0, SUBJECT_MAX);
  const escapedTitle = escapeHtml(title);
  const escapedMarkdown = escapeHtml(markdown);

  try {
    await sendTransactionalMail({
      to,
      subject,
      text: markdown,
      html: `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f7fb;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <main style="max-width:720px;margin:0 auto;background:#ffffff;border-radius:16px;padding:24px;border:1px solid #e5e7eb;">
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">${escapedTitle}</h1>
      <pre style="white-space:pre-wrap;word-break:break-word;font:14px/1.6 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace;margin:0;">${escapedMarkdown}</pre>
    </main>
  </body>
</html>`,
    });
  } catch (e) {
    console.error('[share/email POST]', e);
    return apiError('Failed to send email', HttpStatus.SERVICE_UNAVAILABLE, { pathname: path });
  }

  return NextResponse.json({ ok: true });
}
