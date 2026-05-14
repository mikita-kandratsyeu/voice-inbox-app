import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import { fetchWithAuth } from '@/shared/lib/api-auth';
import { toUserFacingFetchErrorFromUnknown } from '@/shared/lib/fetch/userFacingFetchError';
import { isNumber, isString } from '@/shared/lib/type-guards';

import type { AiUsage } from './aiApi';
import { headersForAiOperation } from './aiOperation';

type DigestApiBody = {
  payload: string;
  model: string;
  modelMode?: 'manual' | 'auto';
};

export type DigestAiResult = {
  markdown: string;
  highlights: string[];
  risks: string[];
  nextActions: string[];
  model?: string;
};

export type DigestApiResult =
  | { ok: true; result: DigestAiResult }
  | { ok: false; limitExceeded: true; usage: AiUsage }
  | { ok: false; limitExceeded?: false; error: string };

function parseUsage(raw: Record<string, unknown>): AiUsage {
  return {
    used: Number(raw.used) || 0,
    limit: Number(raw.limit) || 0,
    remaining: Number(raw.remaining) || 0,
    resetAt: String(raw.resetAt ?? ''),
    resetAtUtc: String(raw.resetAtUtc ?? ''),
    ...(isNumber(raw.bonusAmount) && raw.bonusAmount > 0 ? { bonusAmount: raw.bonusAmount } : {}),
  };
}

export async function generateDigest(body: DigestApiBody): Promise<DigestApiResult> {
  try {
    const response = await fetchWithAuth(`${getWebApiUrl()}/api/digest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headersForAiOperation('digest'),
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      const json = (await response.json()) as { usage?: Record<string, unknown> };
      return {
        ok: false,
        limitExceeded: true,
        usage: parseUsage(json.usage ?? {}),
      };
    }

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: text || `HTTP ${response.status}` };
    }

    const raw = (await response.json()) as Record<string, unknown>;
    const markdown = isString(raw.markdown) ? raw.markdown.trim() : '';
    if (!markdown) {
      return { ok: false, error: 'Invalid digest response' };
    }

    const readStringArray = (value: unknown): string[] =>
      Array.isArray(value)
        ? value
            .filter(isString)
            .map((item) => item.trim())
            .filter(Boolean)
        : [];

    return {
      ok: true,
      result: {
        markdown,
        highlights: readStringArray(raw.highlights),
        risks: readStringArray(raw.risks),
        nextActions: readStringArray(raw.nextActions),
        ...(isString(raw.model) && raw.model.trim() ? { model: raw.model.trim() } : {}),
      },
    };
  } catch (err) {
    return { ok: false, error: toUserFacingFetchErrorFromUnknown(err) };
  }
}
