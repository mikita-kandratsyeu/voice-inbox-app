import type {
  AutoOrganizeMode,
  AutoOrganizeRunResult,
  AutoOrganizeTemplate,
} from '@/entities/folder/lib/autoOrganizeTypes';
import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import { i18n } from '@/shared/lib';
import { requestAiUsageRefresh } from '@/shared/lib/aiUsageRefresh';
import { fetchWithAuth } from '@/shared/lib/api-auth';
import { WEB_API_POLL_FETCH_TIMEOUT_MS } from '@/shared/lib/api-auth/constants';
import { ensureCloudAiThirdPartyConsent } from '@/shared/lib/cloud-ai-consent';

import { headersForAiOperation } from './aiOperation';
import { AI_POLL_TIMEOUT_MS } from './constants';

type NoteForOrganize = {
  id: string;
  title?: string;
  transcript?: string;
  summary?: string;
  tags?: string[];
  classification?: string;
  tasks?: Array<{ text: string }>;
};

type RequestBody = {
  id: string;
  appLanguage?: string;
  mode: AutoOrganizeMode;
  template: AutoOrganizeTemplate;
  existingFolders?: Array<{
    name: string;
    icon?: string;
    color?: string;
    noteCount?: number;
  }>;
  notes: NoteForOrganize[];
  messageTtlSeconds?: number;
};

type PostResponse = { id: string; status: 'processing'; syncToken?: string };
type LimitResponse = {
  error: string;
  reason?: 'weekly_generation_limit' | 'auto_organize_free_limit';
  usage: { used: number; limit: number; resetAt: string };
};

type PollResponse =
  | { id: string; status: 'processing' }
  | {
      id: string;
      status: 'done';
      mode?: AutoOrganizeMode;
      result: AutoOrganizeRunResult['data'];
    }
  | { id: string; status: 'error'; error: string };

export type AutoOrganizeApiResult =
  | { ok: true; data: PostResponse }
  | {
      ok: false;
      limitExceeded: true;
      reason?: LimitResponse['reason'];
      usage: LimitResponse['usage'];
    }
  | { ok: false; limitExceeded?: false; error: string };

export type AutoOrganizePollResult =
  | { ok: true; result: AutoOrganizeRunResult }
  | { ok: false; error: string };

const POLL_INTERVAL_MS = 4000;

export async function postAutoOrganizeFolders(body: RequestBody): Promise<AutoOrganizeApiResult> {
  const consentOk = await ensureCloudAiThirdPartyConsent();

  if (!consentOk) {
    return { ok: false, error: i18n.t('cloudAiConsent.declinedHint') };
  }

  const url = `${getWebApiUrl()}/api/folders/auto-organize`;
  let response: Response;
  try {
    response = await fetchWithAuth(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headersForAiOperation('folder_auto_organize'),
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }

  if (response.status === 429) {
    const json = (await response.json()) as LimitResponse;
    return { ok: false, limitExceeded: true, reason: json.reason, usage: json.usage };
  }
  if (!response.ok) {
    const text = await response.text();
    return { ok: false, error: text || `HTTP ${response.status}` };
  }

  const data = (await response.json()) as PostResponse;
  requestAiUsageRefresh();
  return { ok: true, data };
}

export async function pollAutoOrganizeFolders(
  id: string,
  expected: { mode: AutoOrganizeMode; template: AutoOrganizeTemplate },
  syncToken?: string,
  options?: { isCancelled?: () => boolean },
): Promise<AutoOrganizePollResult> {
  const headers: Record<string, string> = {};
  if (syncToken) headers['x-upstash-sync-token'] = syncToken;

  const url = `${getWebApiUrl()}/api/folders/auto-organize/${id}`;
  const deadline = Date.now() + AI_POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (options?.isCancelled?.()) {
      return { ok: false, error: 'cancelled' };
    }
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    if (options?.isCancelled?.()) {
      return { ok: false, error: 'cancelled' };
    }
    let response: Response;
    try {
      response = await fetchWithAuth(url, {
        headers,
        timeoutMs: WEB_API_POLL_FETCH_TIMEOUT_MS,
      });
    } catch {
      continue;
    }

    if (!response.ok) continue;
    const msg = (await response.json()) as PollResponse;
    if (msg.status === 'done') {
      requestAiUsageRefresh();
      const mode = msg.mode ?? expected.mode;
      if (mode === 'full' || mode === 'assign_existing') {
        const data = msg.result as Extract<AutoOrganizeRunResult, { mode: 'full' }>['data'];
        return {
          ok: true,
          result: { mode, template: expected.template, data },
        };
      }
      if (mode === 'consolidate_folders') {
        return {
          ok: true,
          result: {
            mode,
            data: msg.result as Extract<
              AutoOrganizeRunResult,
              { mode: 'consolidate_folders' }
            >['data'],
          },
        };
      }
      return {
        ok: true,
        result: {
          mode: 'suggest_archive',
          data: msg.result as Extract<AutoOrganizeRunResult, { mode: 'suggest_archive' }>['data'],
        },
      };
    }
    if (msg.status === 'error') {
      requestAiUsageRefresh();
      return { ok: false, error: msg.error };
    }
  }

  requestAiUsageRefresh();
  return { ok: false, error: 'Timeout waiting for AI result' };
}
