import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import { i18n } from '@/shared/lib';
import { fetchWithAuth } from '@/shared/lib/api-auth';
import { ensureCloudAiThirdPartyConsent } from '@/shared/lib/cloud-ai-consent';

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
  existingFolders?: Array<{ name: string; icon?: string; color?: string }>;
  notes: NoteForOrganize[];
  /** Server clamps to 300–3600; omit for API default (1 hour). */
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
      result: {
        folders: Array<{ name: string; icon: string; color: string }>;
        assignments: Array<{ recordId: string; folderName: string }>;
      };
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
  | { ok: true; result: NonNullable<Extract<PollResponse, { status: 'done' }>['result']> }
  | { ok: false; error: string };

const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 120000;

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
      headers: { 'Content-Type': 'application/json' },
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
  return { ok: true, data };
}

export async function pollAutoOrganizeFolders(
  id: string,
  syncToken?: string,
): Promise<AutoOrganizePollResult> {
  const headers: Record<string, string> = {};
  if (syncToken) headers['x-upstash-sync-token'] = syncToken;

  const url = `${getWebApiUrl()}/api/folders/auto-organize/${id}`;
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    let response: Response;
    try {
      response = await fetchWithAuth(url, { headers });
    } catch {
      continue;
    }

    if (!response.ok) continue;
    const msg = (await response.json()) as PollResponse;
    if (msg.status === 'done') return { ok: true, result: msg.result };
    if (msg.status === 'error') return { ok: false, error: msg.error };
  }

  return { ok: false, error: 'Timeout waiting for AI result' };
}
