import { isRecord, isString } from '@/shared/lib/type-guards';

export type WebApiErrorBody = {
  error: string;
  code?: string;
};

export function tryParseWebApiErrorBody(message: string): WebApiErrorBody | null {
  const trimmed = message.trim();
  if (!trimmed.startsWith('{')) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!isRecord(parsed)) {
      return null;
    }

    const error = parsed.error;
    if (!isString(error) || !error.trim()) {
      return null;
    }

    const code = parsed.code;
    return {
      error: error.trim(),
      ...(isString(code) && code.trim() ? { code: code.trim() } : {}),
    };
  } catch {
    return null;
  }
}
