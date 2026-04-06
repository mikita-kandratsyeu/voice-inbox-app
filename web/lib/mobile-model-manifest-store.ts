import {
  MOBILE_MODEL_MANIFEST_APP_CONFIG_KEY,
  createDefaultMobileModelManifest,
  parseMobileModelManifestString,
  type MobileModelManifest,
} from '@/lib/mobile-model-manifest';
import { prisma } from '@/lib/prisma';

export async function getMobileModelManifestRow(): Promise<string | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  try {
    const row = await prisma.appConfig.findUnique({
      where: { key: MOBILE_MODEL_MANIFEST_APP_CONFIG_KEY },
    });
    return row?.value?.trim() ? row.value : null;
  } catch (e) {
    console.error('[mobile-model-manifest-store] read', e);
    return null;
  }
}

export async function upsertMobileModelManifestJson(json: string): Promise<void> {
  await prisma.appConfig.upsert({
    where: { key: MOBILE_MODEL_MANIFEST_APP_CONFIG_KEY },
    create: { key: MOBILE_MODEL_MANIFEST_APP_CONFIG_KEY, value: json },
    update: { value: json },
  });
}

export async function resolvePublishedMobileModelManifest(): Promise<{
  manifest: MobileModelManifest;
  source: 'database' | 'default';
}> {
  const raw = await getMobileModelManifestRow();
  if (raw) {
    const parsed = parseMobileModelManifestString(raw);
    if (parsed.ok) {
      return { manifest: parsed.manifest, source: 'database' };
    }
    console.error(
      '[mobile-model-manifest-store] invalid stored manifest, using default:',
      parsed.error,
    );
  }
  return { manifest: createDefaultMobileModelManifest(), source: 'default' };
}
