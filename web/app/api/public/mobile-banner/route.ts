import { BASE_URL_OR_FALLBACK } from '@/config/constants';
import { stringifyMobileBannerManifest } from '@/lib/mobile-banner-manifest';
import { resolvePublishedMobileBannerManifest } from '@/lib/mobile-banner-manifest-store';
import { NextResponse } from 'next/server';

export async function GET(request: Request): Promise<NextResponse> {
  const { manifest, source } = await resolvePublishedMobileBannerManifest();
  const body = stringifyMobileBannerManifest(manifest);
  const etag = `W/"b${manifest.schemaVersion}-${source}-${manifest.revision}"`;

  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
        'X-Mobile-Banner-Source': source,
        'X-Base-Url': BASE_URL_OR_FALLBACK,
      },
    });
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ETag: etag,
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
      'X-Mobile-Banner-Source': source,
      'X-Base-Url': BASE_URL_OR_FALLBACK,
    },
  });
}
