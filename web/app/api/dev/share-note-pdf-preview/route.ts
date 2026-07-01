import { ApiErrorCode } from '@/lib/api-error-codes';
import { apiError, HttpStatus } from '@/lib/api';
import { isProductionLikeAppEnv } from '@/lib/app-env';
import { renderShareNotePdf } from '@/lib/render-share-note-pdf';
import {
  getShareNoteEmailPreviewMarkdown,
  getShareNoteEmailPreviewTitle,
  parseShareNoteEmailPreviewVariant,
} from '@/lib/share-note-email-preview-fixtures';
import { NextResponse, type NextRequest } from 'next/server';

const PATH = '/api/dev/share-note-pdf-preview';

/**
 * Renders the share-note email PDF attachment for local QA. Disabled in production.
 *
 * Examples:
 * - http://localhost:3000/api/dev/share-note-pdf-preview
 * - http://localhost:3000/api/dev/share-note-pdf-preview?variant=meeting-brief
 * - http://localhost:3000/api/dev/share-note-pdf-preview?variant=tasks
 * - http://localhost:3000/api/dev/share-note-pdf-preview?variant=transcript&title=Demo
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

  let pdf: Buffer;
  try {
    pdf = await renderShareNotePdf(markdown, title);
  } catch (e) {
    console.error('[dev/share-note-pdf-preview]', e);
    return apiError('Failed to render PDF preview', HttpStatus.SERVICE_UNAVAILABLE, {
      pathname: PATH,
    });
  }

  const safeFileName =
    titleParam != null && titleParam.length > 0
      ? 'share-note-preview.pdf'
      : `share-note-${variant}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${safeFileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
