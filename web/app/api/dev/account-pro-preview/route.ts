import { ApiErrorCode } from '@/lib/api-error-codes';
import { apiError, HttpStatus } from '@/lib/api';
import { NextResponse, type NextRequest } from 'next/server';

const PATH = '/api/dev/account-pro-preview';

/**
 * Legacy URL from when this preview returned HTML via `react-dom/server`.
 * Turbopack disallows that in Route Handlers; preview now lives at `/dev/account-pro-preview`.
 * This route only redirects (dev-only).
 */
export function GET(req: NextRequest): NextResponse {
  if (process.env.NODE_ENV === 'production') {
    return apiError('Not found', HttpStatus.NOT_FOUND, {
      pathname: PATH,
      code: ApiErrorCode.NotFound,
    });
  }

  const u = new URL(req.url);
  const locale = u.searchParams.get('locale') === 'ru' ? 'ru' : 'en';
  const qs = new URLSearchParams(u.searchParams);
  qs.delete('locale');

  const path = locale === 'en' ? '/dev/account-pro-preview' : '/ru/dev/account-pro-preview';
  const target = new URL(path, u.origin);
  target.search = qs.toString();

  return NextResponse.redirect(target, 307);
}
