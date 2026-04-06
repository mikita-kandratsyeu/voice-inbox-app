import { writeAdminAudit } from '@/lib/admin-audit';
import { getAdminSession } from '@/lib/admin-session';
import {
  createDefaultMobileModelManifest,
  parseMobileModelManifestString,
  stringifyMobileModelManifest,
} from '@/lib/mobile-model-manifest';
import {
  getMobileModelManifestRow,
  upsertMobileModelManifestJson,
} from '@/lib/mobile-model-manifest-store';
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
      hint: 'Set DATABASE_URL to persist the manifest in AppConfig.',
      jsonText: stringifyMobileModelManifest(createDefaultMobileModelManifest()),
      hasStoredCopy: false,
    });
  }

  try {
    const stored = await getMobileModelManifestRow();
    if (stored) {
      return NextResponse.json({
        ok: true,
        editable: true,
        jsonText: stored,
        hasStoredCopy: true,
      });
    }
    return NextResponse.json({
      ok: true,
      editable: true,
      jsonText: stringifyMobileModelManifest(createDefaultMobileModelManifest()),
      hasStoredCopy: false,
      hint: 'No saved manifest yet — preview shows the generated default. Save to publish.',
    });
  } catch (e) {
    console.error('[admin/mobile-model-manifest GET]', e);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 503 });
  }
}

type PutBody = { json?: string };

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

  const jsonText = typeof body.json === 'string' ? body.json : '';
  if (!jsonText.trim()) {
    return NextResponse.json({ ok: false, error: 'Missing json string' }, { status: 400 });
  }

  const parsed = parseMobileModelManifestString(jsonText);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const normalized = stringifyMobileModelManifest(parsed.manifest);

  try {
    await upsertMobileModelManifestJson(normalized);
  } catch (e) {
    console.error('[admin/mobile-model-manifest PUT]', e);
    return NextResponse.json({ ok: false, error: 'Failed to save' }, { status: 503 });
  }

  await writeAdminAudit(admin, 'mobile_model_manifest.update', {
    revision: parsed.manifest.revision,
    artifactCount: parsed.manifest.artifacts.length,
  });

  return NextResponse.json({
    ok: true,
    jsonText: normalized,
    hasStoredCopy: true,
  });
}
