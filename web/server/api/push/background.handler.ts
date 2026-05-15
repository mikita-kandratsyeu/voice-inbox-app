import { assertMobileAuthenticatedDevice } from '@/lib/api';
import { clearAppForeground } from '@/lib/push-tokens';
import { NextResponse } from 'next/server';

const PATH = '/api/push/background';

export async function postPushBackground(request: Request): Promise<NextResponse> {
  const gate = await assertMobileAuthenticatedDevice(request, PATH);
  if (!gate.ok) {
    return gate.response;
  }

  await clearAppForeground(gate.deviceId);

  return NextResponse.json({ ok: true });
}
