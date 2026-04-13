import { writeAdminAudit } from '@/lib/admin-audit';
import { getAdminSession } from '@/lib/admin-session';
import { apiError, HttpStatus, parseJsonBody } from '@/lib/api';
import {
  createProLicenseKeyRecord,
  parseProLicenseDurationFromBody,
} from '@/lib/pro-license-admin';
import {
  buildEntitlementMapForRows,
  enrichProLicenseRows,
  fetchActiveProDeviceIds,
  fetchProLicenseGlobalStats,
  parseProLicenseListQuery,
  proLicenseAdminWhere,
  queryProLicenseRows,
} from '@/lib/pro-license-admin-list';
import { NextResponse } from 'next/server';

type PostBody = { durationMonths?: unknown; durationDays?: unknown };

export async function GET(request: Request): Promise<NextResponse> {
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
    const now = new Date();
    const { searchParams } = new URL(request.url);
    const { status, devicePro } = parseProLicenseListQuery(searchParams);

    const activeDeviceIds = await fetchActiveProDeviceIds(now);
    const where = proLicenseAdminWhere(status, devicePro, activeDeviceIds);

    const [rows, stats] = await Promise.all([
      queryProLicenseRows({ where, take: 120 }),
      fetchProLicenseGlobalStats(now),
    ]);

    const entitlementByDevice = await buildEntitlementMapForRows(rows);
    const items = enrichProLicenseRows(rows, now, entitlementByDevice);

    return NextResponse.json({ ok: true, items, stats, filters: { status, devicePro } });
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
  const spec = parseProLicenseDurationFromBody(body ?? {});
  if (spec == null) {
    return apiError(
      'Provide exactly one of durationMonths (1, 3, 6, 12) or durationDays (1, 7, 14)',
      HttpStatus.BAD_REQUEST,
      { pathname: path },
    );
  }

  let plain: string;
  try {
    const created = await createProLicenseKeyRecord(admin.adminId, spec);
    plain = created.plainKey;
  } catch (e) {
    console.error('[admin/pro-licenses POST]', e);
    return NextResponse.json({ ok: false, error: 'Failed to create key' }, { status: 503 });
  }

  await writeAdminAudit(admin, 'pro_license.generate', {
    durationMonths: spec.kind === 'months' ? spec.months : 0,
    durationDays: spec.kind === 'days' ? spec.days : null,
  });

  return NextResponse.json({
    ok: true,
    plainKey: plain,
    durationMonths: spec.kind === 'months' ? spec.months : 0,
    durationDays: spec.kind === 'days' ? spec.days : null,
    hint: 'Copy now — the plaintext key is not stored and cannot be shown again.',
  });
}
