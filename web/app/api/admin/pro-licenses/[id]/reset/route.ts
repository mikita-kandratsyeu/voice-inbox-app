import { writeAdminAudit } from '@/lib/admin-audit';
import { getAdminSession } from '@/lib/admin-session';
import { apiError, HttpStatus } from '@/lib/api';
import { resetConsumedProLicenseKey } from '@/lib/pro-license-admin-reset';
import { NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext): Promise<NextResponse> {
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

  const result = await resetConsumedProLicenseKey(trimmed);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  await writeAdminAudit(admin, 'pro_license.reset_redeemed', {
    keyId: result.keyId,
    previousDeviceIdPrefix:
      result.previousDeviceId && result.previousDeviceId.length > 8
        ? `${result.previousDeviceId.slice(0, 6)}…`
        : result.previousDeviceId,
  });

  return NextResponse.json({ ok: true });
}
