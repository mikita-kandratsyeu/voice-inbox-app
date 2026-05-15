import { assertMobileAuthenticatedDevice } from '@/lib/api';
import { setAppForeground } from '@/lib/push-tokens';
import { NextResponse } from 'next/server';

const PATH = '/api/push/foreground';

export async function postPushForeground(request: Request): Promise<NextResponse> {
  const gate = await assertMobileAuthenticatedDevice(request, PATH);
  if (!gate.ok) {
    return gate.response;
  }

  await setAppForeground(gate.deviceId);

  return NextResponse.json({ ok: true });
}
