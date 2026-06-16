import type { ShareBriefTemplate } from '@/features/share-record';
import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import { fetchWithAuth } from '@/shared/lib/api-auth';
import { toUserFacingFetchErrorFromUnknown } from '@/shared/lib/fetch/userFacingFetchError';
import { isString } from '@/shared/lib/type-guards';

import type { PublishExpiryPreset } from '../model/types';

type PublishResponse = {
  ok?: boolean;
  active?: boolean;
  token?: unknown;
  url?: unknown;
  template?: unknown;
  contentHash?: unknown;
  expiresAt?: unknown;
  publishedAt?: unknown;
};

export type PublishRecordInput = {
  recordId: string;
  title: string;
  template: ShareBriefTemplate;
  markdown: string;
  expiresIn: PublishExpiryPreset;
};

export type PublishRecordResult =
  | {
      ok: true;
      active: true;
      token: string;
      url: string;
      template: ShareBriefTemplate;
      contentHash: string;
      expiresAt: string | null;
      publishedAt: string;
    }
  | { ok: false; error: string; status?: number };

function getBaseUrl(): string | null {
  const base = getWebApiUrl().trim();
  if (!base) return null;
  return base.replace(/\/$/, '');
}

function readJson(text: string): PublishResponse {
  if (!text) return {};
  try {
    return JSON.parse(text) as PublishResponse;
  } catch {
    return {};
  }
}

function normalizeTemplate(raw: unknown): ShareBriefTemplate | null {
  if (
    raw === 'noteBrief' ||
    raw === 'emailBrief' ||
    raw === 'meetingBrief' ||
    raw === 'meetingSpeakerTurns'
  ) {
    return raw;
  }
  return null;
}

export async function publishRecord(input: PublishRecordInput): Promise<PublishRecordResult> {
  const base = getBaseUrl();
  if (!base) return { ok: false, error: 'WEB_API_URL is not configured' };

  try {
    const response = await fetchWithAuth(`${base}/api/share/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const text = await response.text();
    const json = readJson(text);
    if (!response.ok) {
      return { ok: false, error: (json as { error?: string }).error ?? 'Publish failed', status: response.status };
    }
    const template = normalizeTemplate(json.template);
    if (
      json.ok !== true ||
      json.active !== true ||
      !isString(json.token) ||
      !isString(json.url) ||
      !template ||
      !isString(json.contentHash) ||
      !isString(json.publishedAt)
    ) {
      return { ok: false, error: 'Unexpected publish response' };
    }
    return {
      ok: true,
      active: true,
      token: json.token,
      url: json.url,
      template,
      contentHash: json.contentHash,
      expiresAt: isString(json.expiresAt) ? json.expiresAt : null,
      publishedAt: json.publishedAt,
    };
  } catch (e) {
    return { ok: false, error: toUserFacingFetchErrorFromUnknown(e) };
  }
}

export async function fetchPublishedRecordStatus(
  recordId: string,
): Promise<PublishRecordResult | { ok: true; active: false }> {
  const base = getBaseUrl();
  if (!base) return { ok: false, error: 'WEB_API_URL is not configured' };
  try {
    const response = await fetchWithAuth(
      `${base}/api/share/publish?recordId=${encodeURIComponent(recordId)}`,
      {
        method: 'GET',
      },
    );
    if (response.status === 404) return { ok: true, active: false };
    const text = await response.text();
    const json = readJson(text);
    if (!response.ok) {
      return { ok: false, error: (json as { error?: string }).error ?? 'Status check failed', status: response.status };
    }
    const template = normalizeTemplate(json.template);
    if (
      json.ok !== true ||
      json.active !== true ||
      !isString(json.token) ||
      !isString(json.url) ||
      !template ||
      !isString(json.contentHash) ||
      !isString(json.publishedAt)
    ) {
      return { ok: false, error: 'Unexpected status response' };
    }
    return {
      ok: true,
      active: true,
      token: json.token,
      url: json.url,
      template,
      contentHash: json.contentHash,
      expiresAt: isString(json.expiresAt) ? json.expiresAt : null,
      publishedAt: json.publishedAt,
    };
  } catch (e) {
    return { ok: false, error: toUserFacingFetchErrorFromUnknown(e) };
  }
}

export async function unpublishRecord(
  recordId: string,
): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  const base = getBaseUrl();
  if (!base) return { ok: false, error: 'WEB_API_URL is not configured' };

  try {
    const response = await fetchWithAuth(`${base}/api/share/publish`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId }),
    });
    const text = await response.text();
    if (!response.ok) {
      const json = readJson(text);
      return { ok: false, error: (json as { error?: string }).error ?? 'Unpublish failed', status: response.status };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toUserFacingFetchErrorFromUnknown(e) };
  }
}
