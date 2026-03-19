import { apiError, HttpStatus, requireAppAuth } from '@/lib/api';
import { getMessageById } from '@/services/message.service';
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
  const authError = await requireAppAuth();
  if (authError) return authError;

  const { id } = await params;
  const syncToken = getSyncToken(request);

  const message = await getMessageById(id, syncToken);

  if (!message) {
    return apiError('Not found', HttpStatus.NOT_FOUND);
  }

  return NextResponse.json(message);
}
