import { NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  }

  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id: rawId } = await params;
  const id = rawId?.trim() ?? '';
  if (!id) {
    return NextResponse.json({ ok: false, error: 'id is required' }, { status: 400 });
  }

  try {
    const row = await prisma.supportIssue.findUnique({
      where: { id },
      select: { appLogs: true },
    });
    if (!row) {
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      appLogs: row.appLogs,
    });
  } catch (e) {
    console.error('[admin/support/:id GET]', e);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 503 });
  }
}
