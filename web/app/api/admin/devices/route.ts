import { NextResponse } from 'next/server';

import { getAllDeviceIdsWithPushTokens } from '@/lib/push-tokens';

export async function GET(): Promise<NextResponse> {
  const deviceIds = await getAllDeviceIdsWithPushTokens();
  return NextResponse.json({ deviceIds });
}
