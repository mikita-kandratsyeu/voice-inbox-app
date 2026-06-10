import { BASE_URL_OR_FALLBACK } from '@/config/constants';
import { apiError, HttpStatus } from '@/lib/api';
import { assertMobileAuthenticatedDevice } from '@/lib/mobile-api-guard';
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
  const gate = await assertMobileAuthenticatedDevice(request);
  if (!gate.ok) {
    return gate.response;
  }

  const deviceIdTrimmed = gate.deviceId;
  const path = gate.pathname;

  if (!isProAccountPortalConfigured()) {
    return apiError('portal_not_configured', HttpStatus.SERVICE_UNAVAILABLE, { pathname: path });
  }

  const kind = await getProActivationKind(deviceIdTrimmed);

  if (kind !== 'license' && kind !== 'voucher') {
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
