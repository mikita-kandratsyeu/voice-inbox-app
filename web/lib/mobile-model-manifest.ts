export const MOBILE_MODEL_MANIFEST_APP_CONFIG_KEY = 'MOBILE_MODEL_MANIFEST_JSON';

export type MobileModelArtifactKind = 'whisper_weights' | 'whisper_coreml' | 'local_llm_weights';

export type MobileModelArtifactPlatform = 'ios' | 'android' | 'all';

export type MobileModelArtifact = {
  id: string;
  kind: MobileModelArtifactKind;
  url: string;
  active: boolean;
  version?: string;
  bytes?: number;
  sha256?: string | null;
  minAppVersion?: string | null;
  platform?: MobileModelArtifactPlatform;
};

export type MobileModelManifest = {
  manifestVersion: number;
  revision: string;
  artifacts: MobileModelArtifact[];
};

const WHISPER_Q5: Record<string, string> = {
  'whisper-tiny': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny-q5_1.bin',
  'whisper-base': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin',
  'whisper-small': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin',
  'whisper-medium': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
};

const WHISPER_FULL: Record<string, string> = {
  'whisper-tiny': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
  'whisper-base': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
  'whisper-small': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
  'whisper-medium': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
};

const WHISPER_COREML_ZIP: Record<string, string> = {
  'whisper-tiny': 'ggml-tiny-encoder.mlmodelc.zip',
  'whisper-base': 'ggml-base-encoder.mlmodelc.zip',
  'whisper-small': 'ggml-small-encoder.mlmodelc.zip',
  'whisper-medium': 'ggml-medium-encoder.mlmodelc.zip',
};

const WHISPER_SIZES_Q5_MB: Record<string, number> = {
  'whisper-tiny': 31,
  'whisper-base': 57,
  'whisper-small': 182,
  'whisper-medium': 1500,
};

const WHISPER_SIZES_FULL_MB: Record<string, number> = {
  'whisper-tiny': 75,
  'whisper-base': 145,
  'whisper-small': 466,
  'whisper-medium': 1500,
};

const LOCAL_LLM: Array<{
  id: string;
  url: string;
  sizeMb: number;
  version: string;
}> = [
  {
    id: 'local/llama-3.2-1b-q4_k_m',
    url: 'https://huggingface.co/QuantFactory/Vikhr-Llama-3.2-1B-Instruct-GGUF/resolve/main/Vikhr-Llama-3.2-1B-Instruct.Q4_K_M.gguf',
    sizeMb: 808,
    version: 'vikhr-q4_k_m',
  },
  {
    id: 'local/qwen3-1.7b-q4_k_m',
    url: 'https://huggingface.co/unsloth/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf',
    sizeMb: 1200,
    version: 'unsloth-q4_k_m',
  },
  {
    id: 'local/gemma-2-2b-it-q4_k_m',
    url: 'https://huggingface.co/codegood/gemma-2b-it-Q4_K_M-GGUF/resolve/main/gemma-2b-it.Q4_K_M.gguf',
    sizeMb: 1600,
    version: 'codegood-q4_k_m',
  },
];

function whisperWeightArtifacts(
  format: 'q5_1' | 'full',
  urls: Record<string, string>,
  sizesMb: Record<string, number>,
): MobileModelArtifact[] {
  const ids = Object.keys(urls);
  return ids.map((modelId) => ({
    id: `whisper:${modelId}:${format}:weights`,
    kind: 'whisper_weights' as const,
    url: urls[modelId]!,
    active: true,
    version: `${format}-hf-main`,
    bytes: Math.round(sizesMb[modelId]! * 1024 * 1024 * 0.98),
    sha256: null,
    minAppVersion: null,
    platform: 'all' as const,
  }));
}

function whisperCoreMlArtifacts(): MobileModelArtifact[] {
  const base = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/';
  return Object.entries(WHISPER_COREML_ZIP).map(([modelId, zipName]) => ({
    id: `whisper:${modelId}:coreml_encoder`,
    kind: 'whisper_coreml' as const,
    url: `${base}${zipName}`,
    active: true,
    version: 'coreml-zip-hf-main',
    sha256: null,
    minAppVersion: null,
    platform: 'ios' as const,
  }));
}

function localLlmArtifacts(): MobileModelArtifact[] {
  return LOCAL_LLM.map((row) => ({
    id: `local_llm:${row.id}:weights`,
    kind: 'local_llm_weights' as const,
    url: row.url,
    active: true,
    version: row.version,
    bytes: Math.round(row.sizeMb * 1024 * 1024),
    sha256: null,
    minAppVersion: null,
    platform: 'all' as const,
  }));
}

export function createDefaultMobileModelManifest(): MobileModelManifest {
  return {
    manifestVersion: 1,
    revision: new Date().toISOString().slice(0, 10),
    artifacts: [
      ...whisperWeightArtifacts('q5_1', WHISPER_Q5, WHISPER_SIZES_Q5_MB),
      ...whisperWeightArtifacts('full', WHISPER_FULL, WHISPER_SIZES_FULL_MB),
      ...whisperCoreMlArtifacts(),
      ...localLlmArtifacts(),
    ],
  };
}

export function stringifyMobileModelManifest(m: MobileModelManifest): string {
  return `${JSON.stringify(m, null, 2)}\n`;
}

const ARTIFACT_KINDS: Set<MobileModelArtifactKind> = new Set([
  'whisper_weights',
  'whisper_coreml',
  'local_llm_weights',
]);

const PLATFORMS: Set<MobileModelArtifactPlatform> = new Set(['ios', 'android', 'all']);

function isHttpsUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isHex64(s: string): boolean {
  return /^[a-f0-9]{64}$/i.test(s);
}

export type ParseManifestResult =
  | { ok: true; manifest: MobileModelManifest }
  | { ok: false; error: string };

/** Validate parsed JSON and return a normalized manifest (defaults for optional fields). */
export function parseMobileModelManifestJson(raw: unknown): ParseManifestResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Root must be a JSON object' };
  }
  const root = raw as Record<string, unknown>;
  const manifestVersion = root.manifestVersion;
  const revision = root.revision;
  const artifactsRaw = root.artifacts;

  if (
    typeof manifestVersion !== 'number' ||
    !Number.isInteger(manifestVersion) ||
    manifestVersion < 1
  ) {
    return { ok: false, error: 'manifestVersion must be an integer >= 1' };
  }
  if (typeof revision !== 'string' || revision.trim().length < 1 || revision.length > 128) {
    return { ok: false, error: 'revision must be a non-empty string (max 128 chars)' };
  }
  if (!Array.isArray(artifactsRaw)) {
    return { ok: false, error: 'artifacts must be an array' };
  }

  const seenIds = new Set<string>();
  const artifacts: MobileModelArtifact[] = [];

  for (let i = 0; i < artifactsRaw.length; i++) {
    const item = artifactsRaw[i];
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      return { ok: false, error: `artifacts[${i}] must be an object` };
    }
    const a = item as Record<string, unknown>;
    const id = a.id;
    const kind = a.kind;
    const url = a.url;
    const active = a.active;

    if (typeof id !== 'string' || id.trim().length < 1 || id.length > 256) {
      return { ok: false, error: `artifacts[${i}].id must be a non-empty string (max 256 chars)` };
    }
    if (seenIds.has(id)) {
      return { ok: false, error: `Duplicate artifact id: ${id}` };
    }
    seenIds.add(id);

    if (typeof kind !== 'string' || !ARTIFACT_KINDS.has(kind as MobileModelArtifactKind)) {
      return {
        ok: false,
        error: `artifacts[${i}].kind must be one of: whisper_weights, whisper_coreml, local_llm_weights`,
      };
    }

    if (typeof url !== 'string' || !isHttpsUrl(url)) {
      return { ok: false, error: `artifacts[${i}].url must be an https URL` };
    }
    if (typeof active !== 'boolean') {
      return { ok: false, error: `artifacts[${i}].active must be a boolean` };
    }

    const version = a.version;
    if (version !== undefined && version !== null && typeof version !== 'string') {
      return { ok: false, error: `artifacts[${i}].version must be a string if set` };
    }
    const bytes = a.bytes;
    if (bytes !== undefined && bytes !== null) {
      if (typeof bytes !== 'number' || !Number.isInteger(bytes) || bytes < 0) {
        return { ok: false, error: `artifacts[${i}].bytes must be a non-negative integer if set` };
      }
    }
    const sha256 = a.sha256;
    if (sha256 !== undefined && sha256 !== null) {
      if (typeof sha256 !== 'string' || !isHex64(sha256)) {
        return { ok: false, error: `artifacts[${i}].sha256 must be 64 hex chars if set` };
      }
    }
    const minAppVersion = a.minAppVersion;
    if (
      minAppVersion !== undefined &&
      minAppVersion !== null &&
      typeof minAppVersion !== 'string'
    ) {
      return { ok: false, error: `artifacts[${i}].minAppVersion must be a string if set` };
    }
    const platform = a.platform;
    if (platform !== undefined && platform !== null) {
      if (typeof platform !== 'string' || !PLATFORMS.has(platform as MobileModelArtifactPlatform)) {
        return {
          ok: false,
          error: `artifacts[${i}].platform must be ios, android, or all if set`,
        };
      }
    }

    const next: MobileModelArtifact = {
      id: id.trim(),
      kind: kind as MobileModelArtifactKind,
      url: url.trim(),
      active,
    };
    if (typeof version === 'string' && version.length > 0) next.version = version;
    if (typeof bytes === 'number') next.bytes = bytes;
    if (sha256 === null) next.sha256 = null;
    else if (typeof sha256 === 'string') next.sha256 = sha256;
    if (typeof minAppVersion === 'string') next.minAppVersion = minAppVersion;
    if (typeof platform === 'string') next.platform = platform as MobileModelArtifactPlatform;
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
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid JSON';
    return { ok: false, error: msg };
  }
  return parseMobileModelManifestJson(parsed);
}
