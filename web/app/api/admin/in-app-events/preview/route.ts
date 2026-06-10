import { NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/admin-session';
import { isInAppEventContentType, parseInAppEventTheme } from '@/lib/in-app-event-page';
import { buildInAppEventDocumentHtml } from '@/lib/in-app-event-page-render';

type PreviewBody = {
  contentType?: unknown;
  body?: unknown;
  theme?: unknown;
};

export async function POST(request: Request): Promise<NextResponse> {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: PreviewBody;
  try {
    body = (await request.json()) as PreviewBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const contentTypeRaw = typeof body.contentType === 'string' ? body.contentType.trim() : '';
  if (!isInAppEventContentType(contentTypeRaw)) {
    return NextResponse.json({ ok: false, error: 'contentType must be html or markdown' }, { status: 400 });
  }

  const contentBody = typeof body.body === 'string' ? body.body : '';
  if (contentBody.length < 1) {
    return NextResponse.json({ ok: false, error: 'body is required' }, { status: 400 });
  }

  const theme =
    typeof body.theme === 'string' ? parseInAppEventTheme(body.theme.trim()) : null;

  try {
    const documentHtml = await buildInAppEventDocumentHtml(contentTypeRaw, contentBody, theme);
    return NextResponse.json({ ok: true, documentHtml });
  } catch (e) {
    console.error('[admin/in-app-events/preview]', e);
    return NextResponse.json({ ok: false, error: 'Preview failed' }, { status: 500 });
  }
}
