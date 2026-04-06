import { DeviceInfoModule } from 'react-native-nitro-device-info';

import type {
  LocalAiModelId,
  WhisperModelId,
  WhisperModelWeightsFormat,
} from '@/entities/settings';
import { getLocalAiModelEntry } from '@/entities/settings/model/constants';
import { IS_IOS } from '@/shared/lib/platform';
import { isNumber } from '@/shared/lib/type-guards';
import { getWhisperCoreMlDownloadUrl, getWhisperModelDownloadUrl } from '@/shared/lib/whisper';

import { refreshModelManifest } from './refreshModelManifest';
import type { MobileModelArtifact, MobileModelManifest } from './types';
import { isAppVersionAtLeast } from './versionCompare';

function nativeAppVersion(): string {
  try {
    return String(DeviceInfoModule.version ?? '').trim();
  } catch {
    return '';
  }
}

function pickArtifact(
  manifest: MobileModelManifest | null,
  artifactId: string,
): MobileModelArtifact | null {
  if (!manifest) return null;
  const appVer = nativeAppVersion() || '0';
  for (const a of manifest.artifacts) {
    if (a.id !== artifactId || !a.active) {
      continue;
    }
    const p = a.platform ?? 'all';

    if (p === 'ios' && !IS_IOS) {
      continue;
    }

    if (p === 'android' && IS_IOS) {
      continue;
    }

    if (a.minAppVersion?.trim() && !isAppVersionAtLeast(appVer, a.minAppVersion.trim())) {
      continue;
    }

    if (!a.url.startsWith('https://')) {
      continue;
    }

    return a;
  }
  return null;
}

function artifactWithOptionalBytes(hit: MobileModelArtifact): {
  url: string;
  expectedBytes?: number;
} {
  return {
    url: hit.url,
    ...(isNumber(hit.bytes) ? { expectedBytes: hit.bytes } : {}),
  };
}

export function whisperWeightsArtifactId(
  modelId: WhisperModelId,
  format: WhisperModelWeightsFormat,
): string {
  return `whisper:${modelId}:${format}:weights`;
}

export function whisperCoreMlArtifactId(modelId: WhisperModelId): string {
  return `whisper:${modelId}:coreml_encoder`;
}

export function localLlmWeightsArtifactId(modelId: LocalAiModelId): string {
  return `local_llm:${modelId}:weights`;
}

export type ResolvedDownload = { url: string; expectedBytes?: number };

export async function resolveWhisperWeightsDownload(
  modelId: WhisperModelId,
  format: WhisperModelWeightsFormat,
): Promise<ResolvedDownload> {
  const manifest = await refreshModelManifest();
  const hit = pickArtifact(manifest, whisperWeightsArtifactId(modelId, format));

  if (hit) {
    return artifactWithOptionalBytes(hit);
  }

  return { url: getWhisperModelDownloadUrl(modelId, format) };
}

export async function resolveWhisperCoreMlDownload(
  modelId: WhisperModelId,
): Promise<ResolvedDownload> {
  const manifest = await refreshModelManifest();
  const hit = pickArtifact(manifest, whisperCoreMlArtifactId(modelId));

  if (hit) {
    return artifactWithOptionalBytes(hit);
  }

  return { url: getWhisperCoreMlDownloadUrl(modelId) };
}

export async function resolveLocalLlmWeightsDownload(
  modelId: LocalAiModelId,
): Promise<ResolvedDownload> {
  const entry = getLocalAiModelEntry(modelId);
  const fallbackUrl = entry?.downloadUrl ?? '';
  const manifest = await refreshModelManifest();
  const hit = pickArtifact(manifest, localLlmWeightsArtifactId(modelId));

  if (hit) {
    return artifactWithOptionalBytes(hit);
  }

  return { url: fallbackUrl };
}
