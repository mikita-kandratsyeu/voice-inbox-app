import { NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';

export async function GET(): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  }

  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const d7 = new Date(now - 7 * 86400000);
  const d30 = new Date(now - 30 * 86400000);

  try {
    const [totalOpen, openCreatedLast7d, openCreatedLast30d, closedSample] = await Promise.all([
      prisma.supportIssue.count({ where: { status: 'open' } }),
      prisma.supportIssue.count({
        where: { status: 'open', createdAt: { gte: d7 } },
      }),
      prisma.supportIssue.count({
        where: { status: 'open', createdAt: { gte: d30 } },
      }),
      prisma.supportIssue.findMany({
        where: { status: 'closed' },
        select: { createdAt: true, closedAt: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5000,
      }),
    ]);

    let sumMs = 0;
    let n = 0;
    for (const r of closedSample) {
      const end = r.closedAt ?? r.updatedAt;
      const ms = end.getTime() - r.createdAt.getTime();
      if (ms >= 0) {
        sumMs += ms;
        n += 1;
      }
    }
    const avgResolutionHours = n > 0 ? sumMs / n / 3600000 : null;

    return NextResponse.json({
      ok: true,
      totalOpen,
      openCreatedInLast7Days: openCreatedLast7d,
      openCreatedInLast30Days: openCreatedLast30d,
      avgResolutionHoursClosed: avgResolutionHours,
      closedSampleSize: n,
    });
  } catch (e) {
    console.error('[admin/support/stats]', e);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 503 });
  }
}
