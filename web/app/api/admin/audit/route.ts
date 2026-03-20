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

  const { searchParams } = new URL(request.url);
  const take = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 200);
  const cursor = searchParams.get('cursor')?.trim() || null;

  try {
    const raw = await prisma.adminAuditLog.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        createdAt: true,
        adminLogin: true,
        action: true,
        metadata: true,
      },
    });

    const hasMore = raw.length > take;
    const page = hasMore ? raw.slice(0, take) : raw;
    const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

    return NextResponse.json({
      ok: true,
      items: page.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        adminLogin: r.adminLogin,
        action: r.action,
        metadata: r.metadata,
      })),
      nextCursor,
    });
  } catch (e) {
    console.error('[admin/audit GET]', e);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 503 });
  }
}
