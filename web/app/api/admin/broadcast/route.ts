import { NextResponse } from 'next/server';

import { writeAdminAudit } from '@/lib/admin-audit';
import { getAdminSession } from '@/lib/admin-session';
import { apiError, HttpStatus, parseJsonBody } from '@/lib/api';
import { writeBroadcastHistory } from '@/lib/broadcast-history-log';
import {
  parseBroadcastBody,
  parseLooseBroadcastBody,
  resolveBroadcastStrings,
  runBroadcast,
  validateBroadcastMessageLengths,
} from '@/lib/broadcast-push';

type BroadcastBody = {
  type?: unknown;
  title?: unknown;
  body?: unknown;
  message?: unknown;
  i18n?: unknown;
};

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

  const input = parseLooseBroadcastBody(body);
  const lenErr = validateBroadcastMessageLengths(input);
  if (lenErr) {
    return apiError(lenErr, HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const parsed = parseBroadcastBody(input);
  const previewEn = resolveBroadcastStrings(input, 'en');

  try {
    const result = await runBroadcast(input);
    await writeBroadcastHistory(admin, {
      kind: 'broadcast',
      notifyType: parsed.type,
      title: previewEn.title,
      body: previewEn.body,
      message: previewEn.message,
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
