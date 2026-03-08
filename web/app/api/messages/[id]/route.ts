import { getMessageById } from '@/services/message.service';
import { NextResponse } from 'next/server';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const message = await getMessageById(id);

  if (!message) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(message);
}
