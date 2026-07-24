import { NextResponse } from 'next/server';

import {
  inAppEventEtag,
  isInAppEventContentType,
  isInAppEventLocale,
  parseInAppEventTheme,
  validateInAppEventId,
} from '@/lib/in-app-event-page';
import { buildInAppEventDocumentHtml } from '@/lib/in-app-event-page-render';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, { params }: RouteContext): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  }

  const { eventId: rawEventId } = await params;
  const eventIdErr = validateInAppEventId(rawEventId ?? '');
  if (eventIdErr) {
    return NextResponse.json({ ok: false, error: 'Invalid eventId' }, { status: 400 });
  }
  const eventId = rawEventId.trim().toLowerCase();

  const url = new URL(request.url);
  const localeParam = url.searchParams.get('locale')?.trim() || 'en';
  const locale = isInAppEventLocale(localeParam) ? localeParam : 'en';
  const theme = parseInAppEventTheme(url.searchParams.get('theme'));

  let row = await prisma.inAppEventPage.findFirst({
    where: { eventId, locale, published: true },
  });

  if (!row && locale !== 'en') {
    row = await prisma.inAppEventPage.findFirst({
      where: { eventId, locale: 'en', published: true },
    });
  }

  if (!row) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  if (!isInAppEventContentType(row.contentType)) {
    return NextResponse.json({ ok: false, error: 'Invalid stored contentType' }, { status: 500 });
  }

  const resolvedLocale = row.locale;
  const documentHtml = await buildInAppEventDocumentHtml(row.contentType, row.body, theme);
  const payload = {
    ok: true as const,
    eventId: row.eventId,
    locale: resolvedLocale,
    revision: row.revision,
    ctaLabel: row.ctaLabel,
    documentHtml,
  };

  const etag = inAppEventEtag(row.eventId, resolvedLocale, row.revision);
  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
      },
    });
  }

  return NextResponse.json(payload, {
    headers: {
      ETag: etag,
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
    },
  });
}
