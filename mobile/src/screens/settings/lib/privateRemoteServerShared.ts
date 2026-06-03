export const PRIVATE_QUICK_TEMPLATES = [
  {
    id: 'ollama',
    baseUrl: 'http://127.0.0.1:11434',
    model: 'qwen2.5:7b-instruct',
  },
  {
    id: 'lm_studio',
    baseUrl: 'http://127.0.0.1:1234',
    model: 'openai/gpt-oss-20b',
  },
  {
    id: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-5.5',
  },
  {
    id: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-v4-pro',
  },
  {
    id: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'google/gemini-3.1-flash-lite',
  },
  {
    id: 'google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-3.5-flash',
  },
] as const;

export const PRIVATE_REMOTE_PROFILES_EXPORT_VERSION = 1 as const;

export type ExportableRemoteProfile = {
  name: string;
  baseUrl: string;
  model: string;
};

export type PrivateRemoteProfilesExportPayload = {
  version: typeof PRIVATE_REMOTE_PROFILES_EXPORT_VERSION;
  exportedAt: string;
  profiles: ExportableRemoteProfile[];
};

export function toFsPath(uri: string): string {
  return uri.startsWith('file://') ? uri.slice(7) : uri;
}

export function validatePrivateBaseUrl(baseUrl: string): string | null {
  const trimmed = baseUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'invalid_protocol';
    }
    if (!parsed.hostname.trim()) {
      return 'missing_host';
    }
    return null;
  } catch {
    return 'invalid_format';
  }
}
