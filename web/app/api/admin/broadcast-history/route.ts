import { NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  }

  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const take = Math.min(
    Math.max(Number(new URL(request.url).searchParams.get('limit')) || 40, 1),
    100,
  );

  try {
    const rows = await prisma.broadcastHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        createdAt: true,
        kind: true,
        notifyType: true,
        title: true,
        sent: true,
        failed: true,
        total: true,
        errorSample: true,
        adminLogin: true,
        deviceId: true,
        bodyPreview: true,
        messagePreview: true,
      },
    });

    return NextResponse.json({
      ok: true,
      items: rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        kind: r.kind,
        notifyType: r.notifyType,
        title: r.title,
        bodyPreview: r.bodyPreview,
        messagePreview: r.messagePreview,
        sent: r.sent,
        failed: r.failed,
        total: r.total,
        errorSample: r.errorSample,
        adminLogin: r.adminLogin,
        deviceId: r.deviceId,
      })),
    });
  } catch (e) {
    console.error('[admin/broadcast-history]', e);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 503 });
  }
}
