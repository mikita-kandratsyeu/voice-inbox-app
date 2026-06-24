import { BASE_URL_OR_FALLBACK, HEADER_DEVICE_ID } from '@/config/constants';
import { isValidDeviceId } from '@/lib/api';
import { stringifyMobileBannerManifest } from '@/lib/mobile-banner-manifest';
import {
  buildMobileBannerEtag,
  resolveMobileBannerManifestForDevice,
} from '@/lib/resolve-mobile-banner-manifest';
import { NextResponse } from 'next/server';

export async function GET(request: Request): Promise<NextResponse> {
  const deviceIdHeader = request.headers.get(HEADER_DEVICE_ID);
  const deviceId =
    deviceIdHeader && isValidDeviceId(deviceIdHeader.trim()) ? deviceIdHeader.trim() : null;

  const { manifest, source, personalized } = await resolveMobileBannerManifestForDevice(deviceId);
  const body = stringifyMobileBannerManifest(manifest);
  const etag = buildMobileBannerEtag(manifest, {
    personalized,
    deviceId: deviceId ?? undefined,
  });

  const cacheControl = personalized
    ? 'private, max-age=300, stale-while-revalidate=3600'
    : 'public, max-age=300, stale-while-revalidate=86400';

  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Cache-Control': cacheControl,
        ...(personalized ? { Vary: HEADER_DEVICE_ID } : {}),
        'X-Mobile-Banner-Source': source,
        'X-Mobile-Banner-Scope': personalized ? 'device' : 'global',
        'X-Base-Url': BASE_URL_OR_FALLBACK,
      },
    });
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ETag: etag,
      'Cache-Control': cacheControl,
      ...(personalized ? { Vary: HEADER_DEVICE_ID } : {}),
      'X-Mobile-Banner-Source': source,
      'X-Mobile-Banner-Scope': personalized ? 'device' : 'global',
      'X-Base-Url': BASE_URL_OR_FALLBACK,
    },
  });
}
