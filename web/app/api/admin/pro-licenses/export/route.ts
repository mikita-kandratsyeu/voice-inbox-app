import { writeAdminAudit } from '@/lib/admin-audit';
import { getAdminSession } from '@/lib/admin-session';
import { apiError, HttpStatus } from '@/lib/api';
import {
  buildEntitlementMapForRows,
  enrichProLicenseRowsForExport,
  fetchActiveProDeviceIds,
  parseProLicenseListQuery,
  proLicenseAdminWhere,
  queryProLicenseRows,
} from '@/lib/pro-license-admin-list';

const EXPORT_LIMIT = 10_000;

function csvCell(v: string | number | boolean | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: Request): Promise<Response> {
  const admin = await getAdminSession();
  if (!admin) {
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED);
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return new Response('DATABASE_URL is not configured', { status: 503 });
  }

  try {
    const now = new Date();
    const { searchParams } = new URL(request.url);
    const { status, devicePro } = parseProLicenseListQuery(searchParams);

    const activeDeviceIds = await fetchActiveProDeviceIds(now);
    const where = proLicenseAdminWhere(status, devicePro, activeDeviceIds);

    const rows = await queryProLicenseRows({ where, take: EXPORT_LIMIT });
    const entitlementByDevice = await buildEntitlementMapForRows(rows);
    const exportRows = enrichProLicenseRowsForExport(rows, now, entitlementByDevice);

    const header = [
      'id',
      'durationMonths',
      'durationDays',
      'createdAt',
      'issuedToEmail',
      'consumed',
      'consumedAt',
      'nominalGrantEndsAt',
      'deviceProExpiresAt',
      'deviceProActive',
      'consumedByDeviceId',
    ];

    const lines = [
      header.join(','),
      ...exportRows.map((r) =>
        [
          csvCell(r.id),
          csvCell(r.durationMonths),
          csvCell(r.durationDays),
          csvCell(r.createdAt),
          csvCell(r.issuedToEmail),
          csvCell(r.consumed),
          csvCell(r.consumedAt),
          csvCell(r.nominalGrantEndsAt),
          csvCell(r.deviceProExpiresAt),
          csvCell(r.deviceProActive),
          csvCell(r.consumedByDeviceId),
        ].join(','),
      ),
    ];

    const body = `\uFEFF${lines.join('\r\n')}\r\n`;
    const stamp = now.toISOString().slice(0, 10);
    const filename = `pro-license-keys-${stamp}.csv`;

    await writeAdminAudit(admin, 'pro_license.export_csv', {
      status,
      devicePro,
      rowCount: exportRows.length,
    });

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[admin/pro-licenses/export GET]', e);
    return new Response('Database error', { status: 503 });
  }
}
