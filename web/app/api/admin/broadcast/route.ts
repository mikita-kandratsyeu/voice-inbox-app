import { NextResponse } from 'next/server';

import { writeAdminAudit } from '@/lib/admin-audit';
import { getAdminSession } from '@/lib/admin-session';
import { apiError, HttpStatus, parseJsonBody } from '@/lib/api';
import { writeBroadcastHistory } from '@/lib/broadcast-history-log';
import { parseBroadcastBody, runBroadcast, type BroadcastInput } from '@/lib/broadcast-push';

type BroadcastBody = {
  type?: unknown;
  title?: unknown;
  body?: unknown;
  message?: unknown;
};

function toBroadcastInput(body: BroadcastBody): BroadcastInput {
  return {
    type: typeof body.type === 'string' ? body.type : undefined,
    title: typeof body.title === 'string' ? body.title : undefined,
    body: typeof body.body === 'string' ? body.body : undefined,
    message: typeof body.message === 'string' ? body.message : undefined,
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  const path = new URL(request.url).pathname;
  const admin = await getAdminSession();
  if (!admin) {
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED, { pathname: path });
  }

  const body = await parseJsonBody<BroadcastBody>(request);
  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const input = toBroadcastInput(body);
  const parsed = parseBroadcastBody(input);

  try {
    const result = await runBroadcast(input);
    await writeBroadcastHistory(admin, {
      kind: 'broadcast',
      notifyType: parsed.type,
      title: body.title as string | undefined,
      body: body.body as string | undefined,
      message: body.message as string | undefined,
      sent: result.sent,
      failed: result.failed,
      total: result.total,
    });
    await writeAdminAudit(admin, 'push.broadcast', {
      sent: result.sent,
      failed: result.failed,
      total: result.total,
      type: parsed.type,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Broadcast failed';
    return apiError(msg, HttpStatus.BAD_REQUEST, { pathname: path });
  }
}
