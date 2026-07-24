import { getAdminSession } from '@/lib/admin-session';
import { listDeviceMobileBanners } from '@/lib/device-mobile-banner-store';
import { NextResponse } from 'next/server';

export async function GET(request: Request): Promise<NextResponse> {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({
      ok: true,
      editable: false,
      items: [],
      hint: 'Set DATABASE_URL to persist per-device banners.',
    });
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get('limit') ?? '100');
  const limit = Number.isFinite(limitRaw) ? limitRaw : 100;

  try {
    const items = await listDeviceMobileBanners(limit);
    return NextResponse.json({
      ok: true,
      editable: true,
      items: items.map((item) => ({
        deviceId: item.deviceId,
        revision: item.revision,
        bannerId: item.banner.id,
        enabled: item.banner.enabled,
        titleEn: item.banner.locales.en.title,
        updatedAt: item.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error('[admin/mobile-banner/devices GET]', e);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 503 });
  }
}
