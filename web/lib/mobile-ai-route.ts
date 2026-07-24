import { NextResponse } from 'next/server';

import { apiError, HttpStatus } from '@/lib/api';
import { ApiErrorCode } from '@/lib/api-error-codes';
import { resolveAiOperation } from '@/lib/ai-operation';
import type { AiOperation } from '@/lib/ai-operation';
import { assertMobileAuthenticatedDevice } from '@/lib/mobile-api-guard';

/**
 * Shared guard chain for authenticated mobile AI HTTP routes:
 * app JWT → mobile User-Agent → device id header → per-device burst rate limit → AI operation header.
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
  const gate = await assertMobileAuthenticatedDevice(request, {
    invalidDeviceIdCode: ApiErrorCode.InvalidDeviceId,
  });
  if (!gate.ok) {
    return gate;
  }

  const opResolved = resolveAiOperation(request, gate.pathname);
  if (!opResolved.ok) {
    return {
      ok: false,
      response: apiError(opResolved.error, HttpStatus.BAD_REQUEST, {
        pathname: gate.pathname,
        code: ApiErrorCode.ValidationError,
      }),
    };
  }

  return {
    ok: true,
    ctx: {
      deviceId: gate.deviceId,
      pathname: gate.pathname,
      request,
      aiOperation: opResolved.operation,
    },
  };
}
