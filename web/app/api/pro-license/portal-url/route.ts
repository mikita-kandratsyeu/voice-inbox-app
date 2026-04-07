import { BASE_URL_OR_FALLBACK, HEADER_DEVICE_ID } from '@/config/constants';
import {
  apiError,
  checkDeviceRateLimit,
  HttpStatus,
  requireAppAuth,
  requireMobileUserAgent,
  validateDeviceId,
} from '@/lib/api';
import { routing } from '@/lib/i18n';
import {
  createProAccountPortalToken,
  isProAccountPortalConfigured,
} from '@/lib/pro-account-portal';
import { getProActivationKind } from '@/lib/pro-entitlement';
import { NextResponse } from 'next/server';

type PortalBody = {
  locale?: unknown;
};

export const POST = async (request: Request): Promise<NextResponse> => {
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

  const deviceIdTrimmed = deviceId!.trim();

  const rateLimitError = await checkDeviceRateLimit(deviceIdTrimmed);
  if (rateLimitError) return rateLimitError;

  if (!isProAccountPortalConfigured()) {
    return apiError('portal_not_configured', HttpStatus.SERVICE_UNAVAILABLE, { pathname: path });
  }

  const kind = await getProActivationKind(deviceIdTrimmed);

  if (kind !== 'license') {
    return apiError('portal_license_only', HttpStatus.FORBIDDEN, { pathname: path });
  }

  let locale: 'en' | 'ru' = routing.defaultLocale;

  try {
    const body = (await request.json()) as PortalBody;

    if (body?.locale === 'en' || body?.locale === 'ru') {
      locale = body.locale;
    }
  } catch {
    return apiError('invalid_locale', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const token = await createProAccountPortalToken(deviceIdTrimmed);

  if (!token) {
    return apiError('portal_token_failed', HttpStatus.SERVICE_UNAVAILABLE, { pathname: path });
  }

  const base = BASE_URL_OR_FALLBACK.replace(/\/$/, '');
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
  const url = `${base}${prefix}/account/pro?t=${encodeURIComponent(token)}`;

  return NextResponse.json({ url });
};
