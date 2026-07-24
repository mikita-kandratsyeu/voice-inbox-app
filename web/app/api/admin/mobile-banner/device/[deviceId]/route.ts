import { writeAdminAudit } from '@/lib/admin-audit';
import { getAdminSession } from '@/lib/admin-session';
import { validateDeviceId } from '@/lib/api';
import {
  deleteDeviceMobileBanner,
  getDeviceMobileBanner,
  upsertDeviceMobileBanner,
} from '@/lib/device-mobile-banner-store';
import {
  parseMobileBannerManifestJson,
  type MobileBannerConfig,
} from '@/lib/mobile-banner-manifest';
import { NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ deviceId: string }>;
};

type PutBody = {
  banner?: MobileBannerConfig | null;
};

export async function GET(_request: Request, { params }: RouteContext): Promise<NextResponse> {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { deviceId: rawDeviceId } = await params;
  const deviceIdError = validateDeviceId(decodeURIComponent(rawDeviceId));
  if (deviceIdError) {
    return NextResponse.json({ ok: false, error: deviceIdError }, { status: 400 });
  }
  const deviceId = decodeURIComponent(rawDeviceId).trim();

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({
      ok: true,
      editable: false,
      deviceId,
      banner: null,
      revision: 0,
      hasStoredCopy: false,
      hint: 'Set DATABASE_URL to persist per-device banners.',
    });
  }

  try {
    const record = await getDeviceMobileBanner(deviceId);
    return NextResponse.json({
      ok: true,
      editable: true,
      deviceId,
      banner: record?.banner ?? null,
      revision: record?.revision ?? 0,
      hasStoredCopy: record !== null,
      updatedAt: record?.updatedAt.toISOString() ?? null,
    });
  } catch (e) {
    console.error('[admin/mobile-banner/device GET]', e);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 503 });
  }
}

export async function PUT(request: Request, { params }: RouteContext): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'DATABASE_URL is not configured' },
      { status: 503 },
    );
  }

  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { deviceId: rawDeviceId } = await params;
  const deviceIdError = validateDeviceId(decodeURIComponent(rawDeviceId));
  if (deviceIdError) {
    return NextResponse.json({ ok: false, error: deviceIdError }, { status: 400 });
  }
  const deviceId = decodeURIComponent(rawDeviceId).trim();

  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  if (!('banner' in body)) {
    return NextResponse.json({ ok: false, error: 'banner is required' }, { status: 400 });
  }

  const parsed = parseMobileBannerManifestJson({
    schemaVersion: 2,
    revision: 0,
    banner: body.banner ?? null,
  });
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  try {
    const record = await upsertDeviceMobileBanner(deviceId, parsed.manifest.banner);

    await writeAdminAudit(admin, 'mobile_banner.device.update', {
      deviceId,
      revision: record?.revision ?? 0,
      bannerId: record?.banner.id ?? null,
      enabled: record?.banner.enabled ?? false,
    });

    return NextResponse.json({
      ok: true,
      deviceId,
      banner: record?.banner ?? null,
      revision: record?.revision ?? 0,
      hasStoredCopy: record !== null,
      updatedAt: record?.updatedAt.toISOString() ?? null,
    });
  } catch (e) {
    console.error('[admin/mobile-banner/device PUT]', e);
    return NextResponse.json({ ok: false, error: 'Failed to save' }, { status: 503 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'DATABASE_URL is not configured' },
      { status: 503 },
    );
  }

  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { deviceId: rawDeviceId } = await params;
  const deviceIdError = validateDeviceId(decodeURIComponent(rawDeviceId));
  if (deviceIdError) {
    return NextResponse.json({ ok: false, error: deviceIdError }, { status: 400 });
  }
  const deviceId = decodeURIComponent(rawDeviceId).trim();

  try {
    await deleteDeviceMobileBanner(deviceId);
    await writeAdminAudit(admin, 'mobile_banner.device.delete', { deviceId });
    return NextResponse.json({ ok: true, deviceId });
  } catch (e) {
    console.error('[admin/mobile-banner/device DELETE]', e);
    return NextResponse.json({ ok: false, error: 'Failed to delete' }, { status: 503 });
  }
}
