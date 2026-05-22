import { NextResponse } from 'next/server';

import { HEADER_DEVICE_ID } from '@/config/constants';
import { ApiErrorCode } from '@/lib/api-error-codes';
import { cancelAiJob } from '@/lib/ai-job-cancel';
import {
  apiError,
  HttpStatus,
  requireAppAuth,
  requireMobileUserAgent,
  validateDeviceId,
} from '@/lib/api';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export const POST = async (request: Request, { params }: RouteContext): Promise<NextResponse> => {
  const pathname = new URL(request.url).pathname;

  const authError = await requireAppAuth();
  if (authError) return authError;

  const uaError = await requireMobileUserAgent();
  if (uaError) return uaError;

  const deviceIdRaw = request.headers.get(HEADER_DEVICE_ID);
  const deviceIdError = validateDeviceId(deviceIdRaw);
  if (deviceIdError) {
    return apiError(deviceIdError, HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.InvalidDeviceId,
    });
  }

  const deviceId = deviceIdRaw!.trim();
  const { id: jobId } = await params;

  if (!jobId.trim()) {
    return apiError('Invalid job id', HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.ValidationError,
    });
  }

  const result = await cancelAiJob(jobId.trim(), deviceId);

  if (!result.ok) {
    return apiError('Forbidden', HttpStatus.FORBIDDEN, {
      pathname,
      code: ApiErrorCode.ForbiddenDeviceMismatch,
    });
  }

  return NextResponse.json({
    ok: true,
    cancelled: result.cancelled,
    ...(!result.cancelled && result.reason ? { reason: result.reason } : {}),
  });
};
