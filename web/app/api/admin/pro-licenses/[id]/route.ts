import { writeAdminAudit } from '@/lib/admin-audit';
import { getAdminSession } from '@/lib/admin-session';
import { apiError, HttpStatus } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: RouteContext): Promise<NextResponse> {
  const path = new URL(request.url).pathname;
  const admin = await getAdminSession();
  if (!admin) {
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED, { pathname: path });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'DATABASE_URL is not configured' },
      { status: 503 },
    );
  }

  const { id } = await params;
  const trimmed = id?.trim();
  if (!trimmed) {
    return apiError('Invalid id', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  try {
    const row = await prisma.proLicenseKey.findUnique({
      where: { id: trimmed },
      select: { id: true, consumedAt: true },
    });

    if (!row) {
      return apiError('Key not found', HttpStatus.NOT_FOUND, { pathname: path });
    }

    if (row.consumedAt != null) {
      return apiError('Cannot delete a redeemed key', HttpStatus.BAD_REQUEST, { pathname: path });
    }

    await prisma.proLicenseKey.delete({ where: { id: row.id } });

    await writeAdminAudit(admin, 'pro_license.delete_unused', { keyId: row.id });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/pro-licenses DELETE]', e);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 503 });
  }
}
