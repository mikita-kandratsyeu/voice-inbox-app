import { ApiErrorCode } from '@/lib/api-error-codes';
import { apiError, HttpStatus } from '@/lib/api';
import { isProductionLikeAppEnv } from '@/lib/app-env';
import { buildShareNoteEmailHtml } from '@/lib/shareNoteMarkdownEmailHtml';
import { buildShareNoteEmailShellStrings } from '@/lib/share-note-email-copy';
import {
  getShareNoteEmailPreviewMarkdown,
  getShareNoteEmailPreviewTitle,
  parseShareNoteEmailPreviewVariant,
} from '@/lib/share-note-email-preview-fixtures';
import { NextResponse, type NextRequest } from 'next/server';

const PATH = '/api/dev/share-note-email-preview';

/**
 * Renders the share-note email HTML for local QA. Disabled in production.
 *
 * Examples:
 * - http://localhost:3000/api/dev/share-note-email-preview
 * - http://localhost:3000/api/dev/share-note-email-preview?variant=meeting-brief
 * - http://localhost:3000/api/dev/share-note-email-preview?variant=tasks
 * - http://localhost:3000/api/dev/share-note-email-preview?variant=transcript&title=Demo
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (isProductionLikeAppEnv()) {
    return apiError('Not found', HttpStatus.NOT_FOUND, {
      pathname: PATH,
      code: ApiErrorCode.NotFound,
    });
  }

  const variant = parseShareNoteEmailPreviewVariant(req.nextUrl.searchParams.get('variant'));
  const titleParam = req.nextUrl.searchParams.get('title')?.trim();
  const title = titleParam || getShareNoteEmailPreviewTitle(variant);
  const markdown = getShareNoteEmailPreviewMarkdown(variant);
  const locale = req.nextUrl.searchParams.get('locale') === 'ru' ? 'ru' : 'en';
  const shell = buildShareNoteEmailShellStrings({ locale, title, kind: 'note' });

  const html = await buildShareNoteEmailHtml(markdown, title, {
    preheader: shell.preheader,
    intro: shell.intro,
    footerLine: shell.footerLine,
  });

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
