import { NextResponse } from 'next/server';

import { ApiErrorCode } from '@/lib/api-error-codes';
import { recordApiError } from '@/lib/api-telemetry';
import type { AiUsage } from '@/lib/ai-rate-limit';

export const HttpStatus = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  TOO_MANY_REQUESTS: 429,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type ApiErrorOptions = {
  pathname?: string;
  code?: string;
  usage?: AiUsage;
  details?: Record<string, unknown>;
};

export function apiError(
  message: string,
  status: number = HttpStatus.BAD_REQUEST,
  opts?: ApiErrorOptions,
) {
  if (opts?.pathname && status >= 400) {
    void recordApiError(opts.pathname, status);
  }
  const body: Record<string, unknown> = { error: message };
  if (opts?.code) {
    body.code = opts.code;
  }
  if (opts?.usage) {
    body.usage = opts.usage;
  }
  if (opts?.details && Object.keys(opts.details).length > 0) {
    body.details = opts.details;
  }
  return NextResponse.json(body, { status });
}

/** 429 when the device has exhausted the weekly cloud AI quota (same shape as before, plus `code`). */
export function weeklyAiLimitExceededResponse(usage: AiUsage): NextResponse {
  const retryAfterSeconds = Math.max(
    0,
    Math.ceil((new Date(usage.resetAt).getTime() - Date.now()) / 1000),
  );
  return NextResponse.json(
    {
      error: 'Weekly AI limit reached',
      code: ApiErrorCode.WeeklyAiLimit,
      usage,
    },
    {
      status: HttpStatus.TOO_MANY_REQUESTS,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    },
  );
}
