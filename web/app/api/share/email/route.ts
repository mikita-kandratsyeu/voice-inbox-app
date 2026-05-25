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
import { buildShareNoteEmailHtml } from '@/lib/shareNoteMarkdownEmailHtml';
import { NextResponse } from 'next/server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TITLE_MAX = 200;
const SUBJECT_MAX = 220;
const MARKDOWN_MAX = 80_000;
const ZIP_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
const BODY_TEXT_MAX = 8000;

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

function safeZipFileName(raw: string): string {
  const stripped = raw.replace(/[/\\]/g, '').replace(/[^a-zA-Z0-9._\u0400-\u04FF-]/g, '_');
  const base = stripped.slice(0, 120).trim() || 'voice-inbox-export';
  return base.toLowerCase().endsWith('.zip') ? base : `${base}.zip`;
}

function safePdfFileName(raw: string): string {
  const stripped = raw.replace(/[/\\]/g, '').replace(/[^a-zA-Z0-9._\u0400-\u04FF-]/g, '_');
  const base = stripped.slice(0, 120).trim() || 'voice-inbox-export';
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

function safeMarkdownAttachmentFilename(title: string): string {
  const stripped = title.replace(/[/\\]/g, '').replace(/[^a-zA-Z0-9._\u0400-\u04FF\s-]/g, '_');
  const base = stripped.replace(/\s+/g, '-').slice(0, 80).trim() || 'voice-inbox-note';
  return base.toLowerCase().endsWith('.md') ? base : `${base}.md`;
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

  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return apiError('Invalid multipart body', HttpStatus.BAD_REQUEST, { pathname: path });
    }

    const to = normalizeEmail(formData.get('to'));
    if (!to) {
      return apiError('Valid recipient email is required', HttpStatus.BAD_REQUEST, {
        pathname: path,
      });
    }

    const title = normalizeBoundedString(formData.get('title'), TITLE_MAX);
    if (!title) {
      return apiError('title is required', HttpStatus.BAD_REQUEST, { pathname: path });
    }

    const subject =
      normalizeBoundedString(formData.get('subject'), SUBJECT_MAX) ??
      `Voice Inbox AI: ${title}`.slice(0, SUBJECT_MAX);

    const bodyTextRaw = formData.get('bodyText');
    const bodyText =
      typeof bodyTextRaw === 'string' && bodyTextRaw.trim().length > 0
        ? bodyTextRaw.trim().slice(0, BODY_TEXT_MAX)
        : 'Your Voice Inbox export is attached.';

    const file = formData.get('file');
    if (!(file instanceof File)) {
      return apiError('File attachment is required', HttpStatus.BAD_REQUEST, { pathname: path });
    }

    const attachmentKindRaw = formData.get('attachmentKind');
    const attachmentKind =
      typeof attachmentKindRaw === 'string' && attachmentKindRaw.trim() === 'pdf' ? 'pdf' : 'zip';

    const mime = (file.type ?? '').toLowerCase();
    const nameLower = file.name.toLowerCase();
    const looksPdf = attachmentKind === 'pdf' || mime.includes('pdf') || nameLower.endsWith('.pdf');
    const looksZip =
      !looksPdf &&
      (mime.includes('zip') || mime.includes('octet-stream') || nameLower.endsWith('.zip'));

    if (!looksZip && !looksPdf) {
      return apiError('Attachment must be a ZIP or PDF file', HttpStatus.BAD_REQUEST, {
        pathname: path,
      });
    }

    if (file.size > ZIP_ATTACHMENT_MAX_BYTES) {
      return apiError(
        `Attachment too large (max ${ZIP_ATTACHMENT_MAX_BYTES} bytes)`,
        HttpStatus.PAYLOAD_TOO_LARGE,
        { pathname: path },
      );
    }

    if (file.size === 0) {
      return apiError('Empty attachment', HttpStatus.BAD_REQUEST, { pathname: path });
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
    } catch {
      return apiError('Could not read attachment', HttpStatus.BAD_REQUEST, { pathname: path });
    }

    const attachmentFilename = looksPdf
      ? (() => {
          const pdfNameRaw = formData.get('pdfFileName');
          return typeof pdfNameRaw === 'string' && pdfNameRaw.trim()
            ? safePdfFileName(pdfNameRaw.trim())
            : 'voice-inbox-export.pdf';
        })()
      : (() => {
          const zipNameRaw = formData.get('zipFileName');
          return typeof zipNameRaw === 'string' && zipNameRaw.trim()
            ? safeZipFileName(zipNameRaw.trim())
            : 'voice-inbox-export.zip';
        })();

    const escapedTitle = escapeHtml(title);
    const escapedBody = escapeHtml(bodyText);

    try {
      await sendTransactionalMail({
        to,
        subject,
        text: bodyText,
        html: `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f7fb;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <main style="max-width:720px;margin:0 auto;background:#ffffff;border-radius:16px;padding:24px;border:1px solid #e5e7eb;">
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">${escapedTitle}</h1>
      <p style="margin:0;font-size:15px;line-height:1.55;color:#374151;">${escapedBody}</p>
    </main>
  </body>
</html>`,
        attachments: [
          {
            filename: attachmentFilename,
            content: buffer,
            contentType: looksPdf ? 'application/pdf' : 'application/zip',
          },
        ],
      });
    } catch (e) {
      console.error('[share/email POST multipart]', e);
      return apiError('Failed to send email', HttpStatus.SERVICE_UNAVAILABLE, { pathname: path });
    }

    return NextResponse.json({ ok: true });
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
    `Voice Inbox AI note: ${title}`.slice(0, SUBJECT_MAX);

  try {
    const html = await buildShareNoteEmailHtml(markdown, title);
    await sendTransactionalMail({
      to,
      subject,
      text: markdown,
      html,
      attachments: [
        {
          filename: safeMarkdownAttachmentFilename(title),
          content: Buffer.from(markdown, 'utf8'),
          contentType: 'text/markdown; charset=utf-8',
        },
      ],
    });
  } catch (e) {
    console.error('[share/email POST]', e);
    return apiError('Failed to send email', HttpStatus.SERVICE_UNAVAILABLE, { pathname: path });
  }

  return NextResponse.json({ ok: true });
}
