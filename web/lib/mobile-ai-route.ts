import { NextResponse } from 'next/server';

import { HEADER_DEVICE_ID } from '@/config/constants';
import {
  apiError,
  checkDeviceRateLimit,
  HttpStatus,
  requireAppAuth,
  requireMobileUserAgent,
  validateDeviceId,
} from '@/lib/api';
import { ApiErrorCode } from '@/lib/api-error-codes';
import { resolveAiOperation } from '@/lib/ai-operation';
import type { AiOperation } from '@/lib/ai-operation';

/**
 * Shared guard chain for authenticated mobile AI HTTP routes:
 * app JWT → mobile User-Agent → device id header → per-device burst rate limit.
 *
 * Callers keep route-specific JSON parsing and validation; pass `ctx.pathname` into apiError / rate limit helpers for telemetry.
 */
export type MobileAiRouteContext = {
  readonly deviceId: string;
  readonly pathname: string;
  readonly request: Request;
  /** Logical AI job (from `HEADER_AI_OPERATION` or route default). */
  readonly aiOperation: AiOperation;
};

export async function assertMobileAiRouteContext(
  request: Request,
): Promise<{ ok: true; ctx: MobileAiRouteContext } | { ok: false; response: NextResponse }> {
  const pathname = new URL(request.url).pathname;

  const authError = await requireAppAuth();
  if (authError) {
    return { ok: false, response: authError };
  }

  const uaError = await requireMobileUserAgent();
  if (uaError) {
    return { ok: false, response: uaError };
  }

  const deviceId = request.headers.get(HEADER_DEVICE_ID);
  const deviceIdError = validateDeviceId(deviceId);
  if (deviceIdError) {
    return {
      ok: false,
      response: apiError(deviceIdError, HttpStatus.BAD_REQUEST, {
        pathname,
        code: ApiErrorCode.InvalidDeviceId,
      }),
    };
  }

  const rateLimitError = await checkDeviceRateLimit(deviceId!.trim(), { pathname });
  if (rateLimitError) {
    return { ok: false, response: rateLimitError };
  }

  const opResolved = resolveAiOperation(request, pathname);
  if (!opResolved.ok) {
    return {
      ok: false,
      response: apiError(opResolved.error, HttpStatus.BAD_REQUEST, {
        pathname,
        code: ApiErrorCode.ValidationError,
      }),
    };
  }

  return {
    ok: true,
    ctx: {
      deviceId: deviceId!.trim(),
      pathname,
      request,
      aiOperation: opResolved.operation,
    },
  };
}
