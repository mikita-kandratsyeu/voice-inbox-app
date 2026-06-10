import { ApiErrorCode } from '@/lib/api-error-codes';
import { apiError, HttpStatus } from '@/lib/api';
import { assertMobileAuthenticatedDevice } from '@/lib/mobile-api-guard';
import { getAutoOrganizeById } from '@/services/folder-organize.service';
import { NextResponse } from 'next/server';

const SYNC_TOKEN_HEADERS = ['x-upstash-sync-token', 'upstash-sync-token'] as const;

function getSyncToken(request: Request): string | undefined {
  for (const header of SYNC_TOKEN_HEADERS) {
    const value = request.headers.get(header);

    if (value) {
      return value;
    }
  }

  return undefined;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext): Promise<NextResponse> {
  const gate = await assertMobileAuthenticatedDevice(request);
  if (!gate.ok) {
    return gate.response;
  }

  const pathname = gate.pathname;
  const { id } = await params;
  const message = await getAutoOrganizeById(id, getSyncToken(request));

  if (!message) {
    return apiError('Not found', HttpStatus.NOT_FOUND, {
      pathname,
      code: ApiErrorCode.NotFound,
    });
  }

  return NextResponse.json(message);
}
