import { isBoolean, isNumber, isRecord, isString } from '@/shared/lib/type-guards';

import type {
  MobileModelArtifact,
  MobileModelArtifactKind,
  MobileModelArtifactPlatform,
  MobileModelManifest,
} from './types';

const ARTIFACT_KINDS = new Set<MobileModelArtifactKind>([
  'whisper_weights',
  'whisper_coreml',
  'local_llm_weights',
]);

const PLATFORMS = new Set<MobileModelArtifactPlatform>(['ios', 'android', 'all']);

function isHttpsUrl(s: string): boolean {
  try {
    return new URL(s).protocol === 'https:';
  } catch {
    return false;
  }
}

export type ParseManifestResult =
  | { ok: true; manifest: MobileModelManifest }
  | { ok: false; error: string };

export function parseMobileModelManifestJson(raw: unknown): ParseManifestResult {
  if (!isRecord(raw)) {
    return { ok: false, error: 'Root must be a JSON object' };
  }

  const root = raw;
  const manifestVersion = root.manifestVersion;
  const revision = root.revision;
  const artifactsRaw = root.artifacts;

  if (!isNumber(manifestVersion) || !Number.isInteger(manifestVersion) || manifestVersion < 1) {
    return { ok: false, error: 'manifestVersion must be an integer >= 1' };
  }

  if (!isString(revision) || revision.trim().length < 1 || revision.length > 128) {
    return { ok: false, error: 'revision must be a non-empty string (max 128 chars)' };
  }

  if (!Array.isArray(artifactsRaw)) {
    return { ok: false, error: 'artifacts must be an array' };
  }

  const seenIds = new Set<string>();
  const artifacts: MobileModelArtifact[] = [];

  for (let i = 0; i < artifactsRaw.length; i++) {
    const item = artifactsRaw[i];

    if (!isRecord(item)) {
      return { ok: false, error: `artifacts[${i}] must be an object` };
    }

    const a = item;
    const id = a.id;
    const kind = a.kind;
    const url = a.url;
    const active = a.active;

    if (!isString(id) || id.trim().length < 1 || id.length > 256) {
      return { ok: false, error: `artifacts[${i}].id must be a non-empty string` };
    }
    if (seenIds.has(id)) {
      return { ok: false, error: `Duplicate artifact id: ${id}` };
    }
    seenIds.add(id);

    if (!isString(kind) || !ARTIFACT_KINDS.has(kind as MobileModelArtifactKind)) {
      return { ok: false, error: `artifacts[${i}].kind is invalid` };
    }

    if (!isString(url) || !isHttpsUrl(url)) {
      return { ok: false, error: `artifacts[${i}].url must be an https URL` };
    }

    if (!isBoolean(active)) {
      return { ok: false, error: `artifacts[${i}].active must be a boolean` };
    }

    const next: MobileModelArtifact = {
      id: id.trim(),
      kind: kind as MobileModelArtifactKind,
      url: url.trim(),
      active,
    };

    if (isString(a.version) && a.version.length > 0) next.version = a.version;
    if (isNumber(a.bytes) && Number.isInteger(a.bytes) && a.bytes >= 0) {
      next.bytes = a.bytes;
    }
    if (a.sha256 === null) next.sha256 = null;
    else if (isString(a.sha256) && /^[a-f0-9]{64}$/i.test(a.sha256)) {
      next.sha256 = a.sha256;
    }

    if (isString(a.minAppVersion)) next.minAppVersion = a.minAppVersion;

    if (isString(a.platform) && PLATFORMS.has(a.platform as MobileModelArtifactPlatform)) {
      next.platform = a.platform as MobileModelArtifactPlatform;
    }

    artifacts.push(next);
  }

  return {
    ok: true,
    manifest: {
      manifestVersion,
      revision: revision.trim(),
      artifacts,
    },
  };
}

export function parseMobileModelManifestString(jsonText: string): ParseManifestResult {
  try {
    return parseMobileModelManifestJson(JSON.parse(jsonText) as unknown);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid JSON';
    return { ok: false, error: msg };
  }
}
