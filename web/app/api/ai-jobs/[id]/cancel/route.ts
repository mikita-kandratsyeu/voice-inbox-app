import { NextResponse } from 'next/server';

import { ApiErrorCode } from '@/lib/api-error-codes';
import { cancelAiJob } from '@/lib/ai-job-cancel';
import { apiError, HttpStatus } from '@/lib/api';
import { assertMobileAuthenticatedDevice } from '@/lib/mobile-api-guard';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export const POST = async (request: Request, { params }: RouteContext): Promise<NextResponse> => {
  const gate = await assertMobileAuthenticatedDevice(request, {
    invalidDeviceIdCode: ApiErrorCode.InvalidDeviceId,
  });
  if (!gate.ok) {
    return gate.response;
  }

  const pathname = gate.pathname;
  const deviceId = gate.deviceId;
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
