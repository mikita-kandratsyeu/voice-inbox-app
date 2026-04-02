import { writeAdminAudit } from '@/lib/admin-audit';
import { getAdminSession } from '@/lib/admin-session';
import { apiError, HttpStatus, parseJsonBody } from '@/lib/api';
import { createProLicenseKeyRecord, parseProLicenseDurationMonths } from '@/lib/pro-license-admin';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

type PostBody = { durationMonths?: unknown };

export async function GET(): Promise<NextResponse> {
  const admin = await getAdminSession();
  if (!admin) {
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED);
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'DATABASE_URL is not configured' },
      { status: 503 },
    );
  }

  try {
    const rows = await prisma.proLicenseKey.findMany({
      orderBy: { createdAt: 'desc' },
      take: 80,
      select: {
        id: true,
        durationMonths: true,
        createdAt: true,
        issuedToEmail: true,
        consumedAt: true,
        consumedByDeviceId: true,
      },
    });

    const items = rows.map((r) => ({
      id: r.id,
      durationMonths: r.durationMonths,
      createdAt: r.createdAt.toISOString(),
      issuedToEmail: r.issuedToEmail,
      consumed: r.consumedAt != null,
      consumedAt: r.consumedAt?.toISOString() ?? null,
      devicePrefix:
        r.consumedByDeviceId && r.consumedByDeviceId.length > 8
          ? `${r.consumedByDeviceId.slice(0, 6)}…`
          : r.consumedByDeviceId,
    }));

    return NextResponse.json({ ok: true, items });
  } catch (e) {
    console.error('[admin/pro-licenses GET]', e);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 503 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
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

  const body = await parseJsonBody<PostBody>(request);
  const n = parseProLicenseDurationMonths(body?.durationMonths);
  if (n == null) {
    return apiError('durationMonths must be 1, 3, 6, or 12', HttpStatus.BAD_REQUEST, {
      pathname: path,
    });
  }

  let plain: string;
  try {
    const created = await createProLicenseKeyRecord(admin.adminId, n);
    plain = created.plainKey;
  } catch (e) {
    console.error('[admin/pro-licenses POST]', e);
    return NextResponse.json({ ok: false, error: 'Failed to create key' }, { status: 503 });
  }

  await writeAdminAudit(admin, 'pro_license.generate', {
    durationMonths: n,
  });

  return NextResponse.json({
    ok: true,
    plainKey: plain,
    durationMonths: n,
    hint: 'Copy now — the plaintext key is not stored and cannot be shown again.',
  });
}
