import { NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/admin-session';
import { getTodayApiErrorStats } from '@/lib/api-telemetry';

export async function GET(): Promise<NextResponse> {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const apiErrors = await getTodayApiErrorStats();

  return NextResponse.json({
    ok: true,
    vercelWebAnalyticsNote:
      'Page views and Web Vitals are in the Vercel dashboard (Analytics). This endpoint shows API 4xx/5xx histograms stored in Redis for the current UTC day.',
    apiErrorsToday: apiErrors,
  });
}
