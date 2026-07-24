import { writeAdminAudit } from '@/lib/admin-audit';
import { getAdminSession } from '@/lib/admin-session';
import {
  getDefaultLandingSocialProof,
  getLandingSocialProofForAdmin,
  parseLandingSocialProofValue,
  revalidateLandingSocialProofCache,
  upsertLandingSocialProof,
} from '@/lib/landing-social-proof';
import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    const defaults = getDefaultLandingSocialProof();
    return NextResponse.json({
      ok: true,
      editable: false,
      hint: 'Set DATABASE_URL to persist landing social proof in AppConfig.',
      config: defaults,
      hasStoredCopy: false,
    });
  }

  try {
    const { config, hasStoredCopy } = await getLandingSocialProofForAdmin();
    return NextResponse.json({
      ok: true,
      editable: true,
      config,
      hasStoredCopy,
    });
  } catch (e) {
    console.error('[admin/landing-social-proof GET]', e);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 503 });
  }
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = parseLandingSocialProofValue(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  try {
    await upsertLandingSocialProof(parsed.config);
    revalidateLandingSocialProofCache();
  } catch (e) {
    console.error('[admin/landing-social-proof PUT]', e);
    return NextResponse.json({ ok: false, error: 'Failed to save' }, { status: 503 });
  }

  await writeAdminAudit(admin, 'landing_social_proof.update', {
    enabled: parsed.config.enabled,
    rating: parsed.config.rating,
    ratingsCount: parsed.config.ratingsCount,
    testimonialsEnabled: parsed.config.testimonialsEnabled,
    testimonialCount: parsed.config.testimonials.length,
  });

  return NextResponse.json({
    ok: true,
    config: parsed.config,
    hasStoredCopy: true,
  });
}
