import { ApiErrorCode } from '@/lib/api-error-codes';
import { apiError, HttpStatus, parseJsonBody } from '@/lib/api';
import { assertMobileAuthenticatedDevice } from '@/lib/mobile-api-guard';
import { submitInboxAskToolResult } from '@/services/inbox-ask.service';
import type { InboxAskToolResult } from '@/lib/inbox-ask-tools';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext): Promise<NextResponse> {
  const gate = await assertMobileAuthenticatedDevice(request);
  if (!gate.ok) {
    return gate.response;
  }

  const pathname = gate.pathname;
  const { id } = await params;
  const body = await parseJsonBody<InboxAskToolResult>(request);
  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.InvalidJson,
    });
  }

  const result = await submitInboxAskToolResult(id, gate.deviceId, body);
  if (!result.ok) {
    return apiError(result.error, result.status, {
      pathname,
      code:
        result.status === HttpStatus.NOT_FOUND ? ApiErrorCode.NotFound : ApiErrorCode.ValidationError,
    });
  }

  return NextResponse.json({
    id,
    status: 'processing',
    ...(result.syncToken ? { syncToken: result.syncToken } : {}),
  });
}
