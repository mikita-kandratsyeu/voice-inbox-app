import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import { fetchWithAuth } from '@/shared/lib/api-auth';
import { isString } from '@/shared/lib/type-guards';

export type AiProcessingOptions = {
  summaryStyle?: 'brief' | 'standard' | 'detailed';
  taskStrictness?: 'strict' | 'balanced' | 'soft';
  outputLanguage?: 'same' | 'ru' | 'en';
};

type AiApiRequestBody = {
  id: string;
  transcript: string;
  model: string;
  systemPrompt?: string;
  options?: AiProcessingOptions;
};

type AiApiSuccessResponse = {
  id: string;
  status: 'processing';
  syncToken?: string;
};

type AiApiLimitResponse = {
  error: string;
  usage: {
    used: number;
    limit: number;
    resetAt: string;
  };
};

export type AiApiResult =
  | { ok: true; data: AiApiSuccessResponse }
  | { ok: false; limitExceeded: true; usage: AiApiLimitResponse['usage'] }
  | { ok: false; limitExceeded?: false; error: string };

export type AiTask = {
  title: string;
  priority: 'high' | 'medium' | 'low';
  deadline: string | null;
};

export type RecordClassification = 'personal' | 'work' | 'meeting' | 'idea' | 'other';

export type AiProcessingResult = {
  summary: string;
  suggestedTitle?: string;
  tasks: AiTask[];
  tags: string[];
  classification?: RecordClassification;
  keyPhrases?: string[];
  nextSteps?: string[];
};

export type AiMessageResult =
  | { ok: true; result: AiProcessingResult }
  | { ok: false; error: string };

const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 120_000;

type MessageResponse =
  | { id: string; status: 'processing' }
  | {
      id: string;
      status: 'done';
      summary: string;
      suggestedTitle?: string;
      tasks: AiTask[];
      tags: string[];
      classification?: RecordClassification;
      keyPhrases?: string[];
      nextSteps?: string[];
    }
  | { id: string; status: 'error'; error: string };

export async function postAiMessage(body: AiApiRequestBody): Promise<AiApiResult> {
  const url = `${getWebApiUrl()}/api/messages`;

  let response: Response;
  try {
    response = await fetchWithAuth(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Network error';
    if (__DEV__) console.warn('[AI] postAiMessage: fetch failed', { error: errorMsg, url });
    return { ok: false, error: errorMsg };
  }

  if (response.status === 429) {
    const json = (await response.json()) as AiApiLimitResponse;
    if (__DEV__) console.warn('[AI] postAiMessage: limit exceeded', json.usage);
    return { ok: false, limitExceeded: true, usage: json.usage };
  }

  if (!response.ok) {
    const text = await response.text();
    if (__DEV__)
      console.warn('[AI] postAiMessage: HTTP error', { status: response.status, body: text });
    return { ok: false, error: text || `HTTP ${response.status}` };
  }

  const data = (await response.json()) as AiApiSuccessResponse;

  return { ok: true, data };
}

export type AiUsage = {
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
  resetAtUtc: string;
  /** From API (admin-configurable bonus size); omit on older servers. */
  bonusAmount?: number;
};

function parseAiUsagePayload(raw: Record<string, unknown>): AiUsage {
  const bonusAmountRaw = raw.bonusAmount;
  const bonusAmount =
    typeof bonusAmountRaw === 'number' && bonusAmountRaw > 0
      ? bonusAmountRaw
      : typeof bonusAmountRaw === 'string' && /^\d+$/.test(bonusAmountRaw)
        ? Math.max(1, parseInt(bonusAmountRaw, 10))
        : undefined;

  return {
    used: Number(raw.used) || 0,
    limit: Number(raw.limit) || 0,
    remaining: Number(raw.remaining) || 0,
    resetAt: String(raw.resetAt ?? ''),
    resetAtUtc: String(raw.resetAtUtc ?? ''),
    ...(bonusAmount != null ? { bonusAmount } : {}),
  };
}

export async function getAiUsage(): Promise<AiUsage | null> {
  try {
    const response = await fetchWithAuth(`${getWebApiUrl()}/api/ai-usage`, { method: 'GET' });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    return parseAiUsagePayload(data);
  } catch {
    return null;
  }
}

export type ClaimAiBonusResult =
  | { ok: true; usage: AiUsage; cooldownSeconds: number }
  | { ok: false; error: string; cooldown?: boolean; retryAfterSeconds?: number };

export async function claimAiBonus(): Promise<ClaimAiBonusResult> {
  try {
    const response = await fetchWithAuth(`${getWebApiUrl()}/api/ai-usage/bonus`, {
      method: 'POST',
    });

    if (response.status === 429) {
      const raw = response.headers.get('Retry-After');
      const parsed = raw ? parseInt(raw, 10) : NaN;
      const retryAfterSeconds = Number.isFinite(parsed) && parsed > 0 ? parsed : 900;
      return {
        ok: false,
        error: 'Bonus claim is on cooldown',
        cooldown: true,
        retryAfterSeconds,
      };
    }

    if (!response.ok) {
      const text = await response.text();
      try {
        const parsed = JSON.parse(text) as { error?: string };
        if (isString(parsed.error) && parsed.error) {
          return { ok: false, error: parsed.error };
        }
      } catch {
        if (__DEV__) console.warn('[AI] claimAiBonus: JSON parse error', { text });
      }
      return { ok: false, error: text || `HTTP ${response.status}` };
    }

    const raw = (await response.json()) as Record<string, unknown>;
    const usage = parseAiUsagePayload(raw);
    const cooldownSeconds =
      typeof raw.bonusCooldownSeconds === 'number' && raw.bonusCooldownSeconds > 0
        ? raw.bonusCooldownSeconds
        : 900;
    return { ok: true, usage, cooldownSeconds };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { ok: false, error: message };
  }
}

export type ProLicenseStatus = {
  active: boolean;
  expiresAt: string | null;
  weeklyLimitFree: number;
  weeklyLimitPro: number;
};

export async function fetchProLicenseStatus(): Promise<ProLicenseStatus | null> {
  try {
    const response = await fetchWithAuth(`${getWebApiUrl()}/api/pro-license/status`, {
      method: 'GET',
    });
    if (!response.ok) {
      return null;
    }
    const raw = (await response.json()) as Record<string, unknown>;
    const active = Boolean(raw.active);
    const expiresAt =
      typeof raw.expiresAt === 'string' && raw.expiresAt.trim() ? raw.expiresAt.trim() : null;
    const weeklyLimitFree =
      typeof raw.weeklyLimitFree === 'number' && raw.weeklyLimitFree > 0 ? raw.weeklyLimitFree : 20;
    const weeklyLimitPro =
      typeof raw.weeklyLimitPro === 'number' && raw.weeklyLimitPro > 0 ? raw.weeklyLimitPro : 75;
    return { active, expiresAt, weeklyLimitFree, weeklyLimitPro };
  } catch {
    return null;
  }
}

export type ProLicenseRedeemErrorCode =
  | 'invalid_key'
  | 'used_elsewhere'
  | 'server_error'
  | 'rate_limit'
  | 'activation_failed'
  | 'invalid_response'
  | 'network';

export type RedeemProLicenseResult =
  | { ok: true; expiresAt: string }
  | { ok: false; error: string; code?: ProLicenseRedeemErrorCode; status?: number };

function parseRedeemErrorCode(raw: unknown): ProLicenseRedeemErrorCode | undefined {
  if (
    raw === 'invalid_key' ||
    raw === 'used_elsewhere' ||
    raw === 'server_error' ||
    raw === 'rate_limit'
  ) {
    return raw;
  }
  return undefined;
}

export async function redeemProLicenseKey(key: string): Promise<RedeemProLicenseResult> {
  try {
    const response = await fetchWithAuth(`${getWebApiUrl()}/api/pro-license/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    const raw = (await response.json()) as { error?: string; code?: unknown; expiresAt?: string };
    if (!response.ok) {
      const serverCode = parseRedeemErrorCode(raw.code);
      const code: ProLicenseRedeemErrorCode =
        serverCode ??
        (response.status === 429 ? 'rate_limit' : undefined) ??
        (response.status >= 500 ? 'server_error' : undefined) ??
        'activation_failed';
      return {
        ok: false,
        error: typeof raw.error === 'string' && raw.error.trim() ? raw.error : 'Activation failed',
        code,
        status: response.status,
      };
    }
    const expiresAt =
      typeof raw.expiresAt === 'string' && raw.expiresAt.trim() ? raw.expiresAt.trim() : '';
    if (!expiresAt) {
      return { ok: false, error: 'Invalid server response', code: 'invalid_response' };
    }
    return { ok: true, expiresAt };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { ok: false, error: message, code: 'network' };
  }
}

export async function pollAiMessage(id: string, syncToken?: string): Promise<AiMessageResult> {
  const headers: Record<string, string> = {};
  if (syncToken) {
    headers['x-upstash-sync-token'] = syncToken;
  }

  const url = `${getWebApiUrl()}/api/messages/${id}`;
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    let response: Response;
    try {
      response = await fetchWithAuth(url, { headers });
    } catch (err) {
      if (__DEV__) console.warn('[AI] pollAiMessage: fetch failed', { id, error: String(err) });
      continue;
    }

    if (!response.ok) {
      const text = await response.text();
      if (__DEV__)
        console.warn('[AI] pollAiMessage: HTTP error', { id, status: response.status, body: text });
      continue;
    }

    const msg = (await response.json()) as MessageResponse;

    if (msg.status === 'done') {
      return {
        ok: true,
        result: {
          summary: msg.summary,
          tasks: msg.tasks,
          tags: msg.tags ?? [],
          ...('suggestedTitle' in msg &&
          isString((msg as { suggestedTitle?: string }).suggestedTitle) &&
          (msg as { suggestedTitle: string }).suggestedTitle.trim()
            ? { suggestedTitle: (msg as { suggestedTitle: string }).suggestedTitle.trim() }
            : {}),
          ...(msg.classification && { classification: msg.classification }),
          ...(msg.keyPhrases && { keyPhrases: msg.keyPhrases }),
          ...(msg.nextSteps && { nextSteps: msg.nextSteps }),
        },
      };
    }

    if (msg.status === 'error') {
      if (__DEV__) console.warn('[AI] pollAiMessage: server error', { id, error: msg.error });
      return { ok: false, error: msg.error };
    }
  }

  if (__DEV__) console.warn('[AI] pollAiMessage: timeout', { id });
  return { ok: false, error: 'Timeout waiting for AI result' };
}
