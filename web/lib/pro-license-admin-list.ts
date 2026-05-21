import type { Prisma } from '@/generated/prisma/client';

import { prisma } from '@/lib/prisma';
import { computeNominalGrantEndUtc } from '@/lib/pro-license-expiry-math';

export type ProLicenseStatusFilter = 'all' | 'unused' | 'redeemed';
export type ProLicenseDeviceProFilter = 'any' | 'active' | 'inactive';

const PRO_LICENSE_LIST_PAGE_MIN = 1;
const PRO_LICENSE_LIST_PAGE_SIZE_MIN = 10;
const PRO_LICENSE_LIST_PAGE_SIZE_MAX = 120;
const PRO_LICENSE_LIST_PAGE_SIZE_DEFAULT = 50;

function clampInt(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n) || Number.isNaN(n)) return fallback;
  const t = Math.trunc(n);
  return Math.min(max, Math.max(min, t));
}

const rowSelect = {
  id: true,
  durationMonths: true,
  durationDays: true,
  createdAt: true,
  issuedToEmail: true,
  adminNotes: true,
  consumedAt: true,
  consumedByDeviceId: true,
} as const;

export type ProLicenseKeyRow = Prisma.ProLicenseKeyGetPayload<{ select: typeof rowSelect }>;

export type ProLicenseAdminItem = {
  id: string;
  durationMonths: number;
  durationDays: number | null;
  createdAt: string;
  issuedToEmail: string | null;
  adminNotes: string | null;
  consumed: boolean;
  consumedAt: string | null;
  nominalGrantEndsAt: string | null;
  deviceProExpiresAt: string | null;
  deviceProActive: boolean;
  devicePrefix: string | null;
};

export function parseProLicenseListQuery(searchParams: URLSearchParams): {
  status: ProLicenseStatusFilter;
  devicePro: ProLicenseDeviceProFilter;
  page: number;
  pageSize: number;
} {
  const s = searchParams.get('status') ?? 'all';
  const d = searchParams.get('devicePro') ?? 'any';
  const status: ProLicenseStatusFilter = ['unused', 'redeemed', 'all'].includes(s)
    ? (s as ProLicenseStatusFilter)
    : 'all';
  const devicePro: ProLicenseDeviceProFilter = ['active', 'inactive', 'any'].includes(d)
    ? (d as ProLicenseDeviceProFilter)
    : 'any';
  const page = clampInt(Number(searchParams.get('page')), PRO_LICENSE_LIST_PAGE_MIN, 1_000_000, 1);
  const pageSize = clampInt(
    Number(searchParams.get('pageSize')),
    PRO_LICENSE_LIST_PAGE_SIZE_MIN,
    PRO_LICENSE_LIST_PAGE_SIZE_MAX,
    PRO_LICENSE_LIST_PAGE_SIZE_DEFAULT,
  );
  return { status, devicePro, page, pageSize };
}

/** Prisma filter for list / export (stats are always global, not filtered). */
export function proLicenseAdminWhere(
  status: ProLicenseStatusFilter,
  devicePro: ProLicenseDeviceProFilter,
  activeDeviceIds: string[],
): Prisma.ProLicenseKeyWhereInput {
  const hasActive = activeDeviceIds.length > 0;

  if (status === 'unused') {
    return { consumedAt: null };
  }

  if (status === 'redeemed') {
    const base: Prisma.ProLicenseKeyWhereInput = { consumedAt: { not: null } };
    if (devicePro === 'any') return base;
    if (devicePro === 'active') {
      return hasActive
        ? { ...base, consumedByDeviceId: { in: activeDeviceIds } }
        : { ...base, id: { in: [] } };
    }
    if (!hasActive) return base;
    return {
      ...base,
      OR: [{ consumedByDeviceId: null }, { consumedByDeviceId: { notIn: activeDeviceIds } }],
    };
  }

  // status === 'all'
  if (devicePro === 'any') return {};

  if (devicePro === 'active') {
    if (!hasActive) return { id: { in: [] } };
    return {
      OR: [{ consumedAt: null }, { consumedByDeviceId: { in: activeDeviceIds } }],
    };
  }

  // devicePro === 'inactive'
  if (!hasActive) return {};
  return {
    OR: [
      { consumedAt: null },
      {
        consumedAt: { not: null },
        OR: [{ consumedByDeviceId: null }, { consumedByDeviceId: { notIn: activeDeviceIds } }],
      },
    ],
  };
}

export async function countProLicenseKeys(where: Prisma.ProLicenseKeyWhereInput): Promise<number> {
  return prisma.proLicenseKey.count({ where });
}

export async function fetchActiveProDeviceIds(now: Date): Promise<string[]> {
  const rows = await prisma.deviceProEntitlement.findMany({
    where: { expiresAt: { gt: now } },
    select: { deviceId: true },
  });
  return rows.map((r) => r.deviceId);
}

export async function fetchProLicenseGlobalStats(now: Date): Promise<{
  totalKeys: number;
  unusedKeys: number;
  redeemedKeys: number;
  redeemedLast7Days: number;
  redeemedLast30Days: number;
  devicesWithActivePro: number;
}> {
  const sevenAgo = new Date(now.getTime() - 7 * 86_400_000);
  const thirtyAgo = new Date(now.getTime() - 30 * 86_400_000);

  const [totalKeys, unusedKeys, redeemedKeys, redeemed7d, redeemed30d, devicesWithActivePro] =
    await Promise.all([
      prisma.proLicenseKey.count(),
      prisma.proLicenseKey.count({ where: { consumedAt: null } }),
      prisma.proLicenseKey.count({ where: { consumedAt: { not: null } } }),
      prisma.proLicenseKey.count({ where: { consumedAt: { gte: sevenAgo } } }),
      prisma.proLicenseKey.count({ where: { consumedAt: { gte: thirtyAgo } } }),
      prisma.deviceProEntitlement.count({ where: { expiresAt: { gt: now } } }),
    ]);

  return {
    totalKeys,
    unusedKeys,
    redeemedKeys,
    redeemedLast7Days: redeemed7d,
    redeemedLast30Days: redeemed30d,
    devicesWithActivePro,
  };
}

export async function queryProLicenseRows(params: {
  where: Prisma.ProLicenseKeyWhereInput;
  take: number;
  skip?: number;
}): Promise<ProLicenseKeyRow[]> {
  return prisma.proLicenseKey.findMany({
    where: params.where,
    orderBy: { createdAt: 'desc' },
    skip: params.skip ?? 0,
    take: params.take,
    select: rowSelect,
  });
}

export type ProLicenseAdminExportRow = ProLicenseAdminItem & {
  consumedByDeviceId: string | null;
};

export function enrichProLicenseRowsForExport(
  rows: ProLicenseKeyRow[],
  now: Date,
  entitlementByDevice: Map<string, Date>,
): ProLicenseAdminExportRow[] {
  const base = enrichProLicenseRows(rows, now, entitlementByDevice);
  return base.map((item, i) => ({
    ...item,
    consumedByDeviceId: rows[i]!.consumedByDeviceId,
  }));
}

export function enrichProLicenseRows(
  rows: ProLicenseKeyRow[],
  now: Date,
  entitlementByDevice: Map<string, Date>,
): ProLicenseAdminItem[] {
  return rows.map((r) => {
    const consumedAt = r.consumedAt;
    const nominalEnd =
      consumedAt != null
        ? computeNominalGrantEndUtc(consumedAt, r.durationMonths, r.durationDays)
        : null;
    const devId = r.consumedByDeviceId;
    const deviceExpiresAt = devId ? entitlementByDevice.get(devId) : undefined;
    const deviceProActive = deviceExpiresAt != null && deviceExpiresAt.getTime() > now.getTime();

    return {
      id: r.id,
      durationMonths: r.durationMonths,
      durationDays: r.durationDays,
      createdAt: r.createdAt.toISOString(),
      issuedToEmail: r.issuedToEmail,
      adminNotes: r.adminNotes,
      consumed: r.consumedAt != null,
      consumedAt: r.consumedAt?.toISOString() ?? null,
      nominalGrantEndsAt: nominalEnd?.toISOString() ?? null,
      deviceProExpiresAt: deviceExpiresAt?.toISOString() ?? null,
      deviceProActive,
      devicePrefix:
        r.consumedByDeviceId && r.consumedByDeviceId.length > 8
          ? `${r.consumedByDeviceId.slice(0, 6)}…`
          : r.consumedByDeviceId,
    };
  });
}

export async function buildEntitlementMapForRows(
  rows: ProLicenseKeyRow[],
): Promise<Map<string, Date>> {
  const deviceIds = [
    ...new Set(
      rows
        .map((r) => r.consumedByDeviceId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ];
  if (deviceIds.length === 0) return new Map();
  const entitlements = await prisma.deviceProEntitlement.findMany({
    where: { deviceId: { in: deviceIds } },
    select: { deviceId: true, expiresAt: true },
  });
  return new Map(entitlements.map((e) => [e.deviceId, e.expiresAt]));
}
