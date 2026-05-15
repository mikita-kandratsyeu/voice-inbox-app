import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

import { ApiErrorCode } from '@/lib/api-error-codes';
import { apiError, HttpStatus } from '@/lib/api';

export function zodValidationErrorResponse(pathname: string, error: ZodError): NextResponse {
  return apiError('Validation failed', HttpStatus.BAD_REQUEST, {
    pathname,
    code: ApiErrorCode.ValidationError,
    details: error.flatten() as Record<string, unknown>,
  });
}
