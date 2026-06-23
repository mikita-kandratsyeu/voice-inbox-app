import { writeAdminAudit } from '@/lib/admin-audit';
import { getAdminSession } from '@/lib/admin-session';
import {
  bannersEqual,
  createDefaultMobileBannerManifest,
  parseMobileBannerManifestJson,
  stringifyMobileBannerManifest,
  type MobileBannerConfig,
  type MobileBannerManifest,
} from '@/lib/mobile-banner-manifest';
import {
  getMobileBannerManifestForAdmin,
  upsertMobileBannerManifestJson,
} from '@/lib/mobile-banner-manifest-store';
import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({
      ok: true,
      editable: false,
      hint: 'Set DATABASE_URL to persist the mobile banner in AppConfig.',
      manifest: createDefaultMobileBannerManifest(),
      hasStoredCopy: false,
    });
  }

  try {
    const { manifest, hasStoredCopy } = await getMobileBannerManifestForAdmin();
    return NextResponse.json({
      ok: true,
      editable: true,
      manifest,
      hasStoredCopy,
      hint: hasStoredCopy
        ? undefined
        : 'No saved banner yet — the public API returns an empty default until you save.',
    });
  } catch (e) {
    console.error('[admin/mobile-banner GET]', e);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 503 });
  }
}

type PutBody = {
  manifest?: MobileBannerManifest;
  banner?: MobileBannerConfig | null;
};

function nextRevision(
  current: MobileBannerManifest,
  nextBanner: MobileBannerConfig | null,
): number {
  if (bannersEqual(current.banner, nextBanner)) {
    return current.revision;
  }
  return current.revision + 1;
}

export async function PUT(request: Request): Promise<NextResponse> {
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

  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { manifest: current } = await getMobileBannerManifestForAdmin();
  const candidate = {
    schemaVersion: 2 as const,
    revision: current.revision,
    banner:
      body.manifest !== undefined
        ? body.manifest.banner
        : body.banner !== undefined
          ? body.banner
          : current.banner,
  };

  const parsed = parseMobileBannerManifestJson(candidate);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const nextManifest: MobileBannerManifest = {
    ...parsed.manifest,
    revision: nextRevision(current, parsed.manifest.banner),
  };

  const normalized = stringifyMobileBannerManifest(nextManifest);

  try {
    await upsertMobileBannerManifestJson(normalized);
  } catch (e) {
    console.error('[admin/mobile-banner PUT]', e);
    return NextResponse.json({ ok: false, error: 'Failed to save' }, { status: 503 });
  }

  await writeAdminAudit(admin, 'mobile_banner.update', {
    revision: nextManifest.revision,
    bannerId: nextManifest.banner?.id ?? null,
    enabled: nextManifest.banner?.enabled ?? false,
  });

  return NextResponse.json({
    ok: true,
    manifest: nextManifest,
    hasStoredCopy: true,
  });
}
