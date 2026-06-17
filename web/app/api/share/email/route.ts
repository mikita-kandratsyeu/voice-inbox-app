import { apiError, checkShareEmailRateLimit, HttpStatus, parseJsonBody } from '@/lib/api';
import { assertMobileAuthenticatedDevice } from '@/lib/mobile-api-guard';
import { isSmtpConfigured, sendTransactionalMail } from '@/lib/mailer';
import {
  buildShareNoteEmailPlainText,
  buildShareNoteEmailShellStrings,
  defaultExportBody,
  normalizeShareNoteEmailLocale,
} from '@/lib/share-note-email-copy';
import {
  buildShareNoteEmailHtml,
  buildShareNoteEmailShellHtml,
} from '@/lib/shareNoteMarkdownEmailHtml';
import { stripShareNoteSectionMarkers } from '@/lib/shareNoteSectionMarkers';
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
  attachMarkdown?: unknown;
  locale?: unknown;
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

function htmlParagraphFromText(text: string, fallback: string): string {
  const lines = escapeHtml(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const body = lines.length > 0 ? lines.join('<br>') : escapeHtml(fallback);
  return `<p style="margin:0;font-size:15px;line-height:1.6;color:#374151;">${body}</p>`;
}

export async function POST(request: Request): Promise<NextResponse> {
  const path = new URL(request.url).pathname;

  const gate = await assertMobileAuthenticatedDevice(request, path);
  if (!gate.ok) {
    return gate.response;
  }

  const rate = await checkShareEmailRateLimit(gate.deviceId);
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

    const locale = normalizeShareNoteEmailLocale(formData.get('locale'));

    const bodyTextRaw = formData.get('bodyText');
    const bodyText =
      typeof bodyTextRaw === 'string' && bodyTextRaw.trim().length > 0
        ? bodyTextRaw.trim().slice(0, BODY_TEXT_MAX)
        : defaultExportBody(locale);

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

    try {
      const shell = buildShareNoteEmailShellStrings({
        locale,
        title,
        kind: 'export',
        attachmentKind,
        attachmentFilename: attachmentFilename,
      });
      const text = buildShareNoteEmailPlainText({
        locale,
        title,
        body: bodyText,
        kind: 'export',
        attachmentKind,
        attachmentFilename: attachmentFilename,
      });
      const html = buildShareNoteEmailShellHtml({
        title,
        bodyInnerHtml: htmlParagraphFromText(bodyText, defaultExportBody(locale)),
        preheader: shell.preheader,
        intro: shell.intro,
        attachmentLabel: shell.attachmentLabel,
        attachmentPrefix: shell.attachmentPrefix,
        footerLine: shell.footerLine,
      });

      await sendTransactionalMail({
        to,
        subject,
        text,
        html,
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
  const attachMarkdown = body.attachMarkdown !== false;
  const locale = normalizeShareNoteEmailLocale(body.locale);

  try {
    const markdownForDelivery = stripShareNoteSectionMarkers(markdown);
    const shell = buildShareNoteEmailShellStrings({
      locale,
      title,
      kind: 'note',
      attachmentKind: attachMarkdown ? 'markdown' : undefined,
      attachmentFilename: attachMarkdown ? safeMarkdownAttachmentFilename(title) : undefined,
    });
    const html = await buildShareNoteEmailHtml(markdown, title, {
      preheader: shell.preheader,
      intro: shell.intro,
      attachmentLabel: shell.attachmentLabel,
      attachmentPrefix: shell.attachmentPrefix,
      footerLine: shell.footerLine,
    });
    const text = buildShareNoteEmailPlainText({
      locale,
      title,
      body: markdownForDelivery,
      kind: 'note',
      attachmentKind: attachMarkdown ? 'markdown' : undefined,
      attachmentFilename: attachMarkdown ? safeMarkdownAttachmentFilename(title) : undefined,
    });
    await sendTransactionalMail({
      to,
      subject,
      text,
      html,
      attachments: attachMarkdown
        ? [
            {
              filename: safeMarkdownAttachmentFilename(title),
              content: Buffer.from(markdownForDelivery, 'utf8'),
              contentType: 'text/markdown; charset=utf-8',
            },
          ]
        : undefined,
    });
  } catch (e) {
    console.error('[share/email POST]', e);
    return apiError('Failed to send email', HttpStatus.SERVICE_UNAVAILABLE, { pathname: path });
  }

  return NextResponse.json({ ok: true });
}
