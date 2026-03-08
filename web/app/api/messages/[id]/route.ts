import { getMessageById } from '@/services/message.service';
import { NextResponse } from 'next/server';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const syncToken =
    request.headers.get('x-upstash-sync-token') ?? request.headers.get('upstash-sync-token');
  const message = await getMessageById(id, syncToken ?? undefined);

  if (!message) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(message);
}
