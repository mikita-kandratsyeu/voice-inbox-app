import { ApiErrorCode } from '@/lib/api-error-codes';
import { apiError, HttpStatus } from '@/lib/api';
import { isProductionLikeAppEnv } from '@/lib/app-env';
import { parseAccountProPreviewOptions } from '@/lib/account-pro-preview-fixtures';
import {
  renderAccountProPreviewExamplesIndexHtml,
  renderAccountProPreviewHtml,
} from '@/lib/render-account-pro-preview-html';
import { NextResponse, type NextRequest } from 'next/server';

const PATH = '/api/dev/account-pro-preview';

/**
 * Renders the `/account/pro` portal UI for local QA. Disabled in production.
 *
 * Examples:
 * - http://localhost:3000/api/dev/account-pro-preview?list=1
 * - http://localhost:3000/api/dev/account-pro-preview?variant=voucher-success
 * - http://localhost:3000/api/dev/account-pro-preview?variant=license-success
 * - http://localhost:3000/api/dev/account-pro-preview?variant=store-success&theme=dark
 * - http://localhost:3000/api/dev/account-pro-preview?state=success&kind=voucher&locale=ru
 * - http://localhost:3000/api/dev/account-pro-preview?variant=missing
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (isProductionLikeAppEnv()) {
    return apiError('Not found', HttpStatus.NOT_FOUND, {
      pathname: PATH,
      code: ApiErrorCode.NotFound,
    });
  }

  const { searchParams } = req.nextUrl;

  if (searchParams.get('list') === '1' || searchParams.get('examples') === '1') {
    const html = renderAccountProPreviewExamplesIndexHtml(req.nextUrl.origin);
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  const opts = parseAccountProPreviewOptions(searchParams);
  const html = await renderAccountProPreviewHtml(opts);

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
