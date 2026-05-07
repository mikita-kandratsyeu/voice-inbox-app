import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import { fetchWithAuth } from '@/shared/lib/api-auth';
import { isString } from '@/shared/lib/type-guards';

export type SendRecordEmailInput = {
  to: string;
  subject: string;
  title: string;
  markdown: string;
};

export type SendRecordEmailResult = { ok: true } | { ok: false; error: string; status?: number };

export async function sendRecordEmail(input: SendRecordEmailInput): Promise<SendRecordEmailResult> {
  const base = getWebApiUrl().trim();
  if (!base) {
    return { ok: false, error: 'WEB_API_URL is not configured' };
  }

  try {
    const response = await fetchWithAuth(`${base.replace(/\/$/, '')}/api/share/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: input.to.trim(),
        subject: input.subject.trim(),
        title: input.title.trim(),
        markdown: input.markdown,
      }),
    });

    const text = await response.text();
    let data: { ok?: boolean; error?: string } = {};
    try {
      data = text ? (JSON.parse(text) as typeof data) : {};
    } catch {
      return {
        ok: false,
        error: text || `Request failed (${response.status})`,
        status: response.status,
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        error: isString(data.error) ? data.error : `Request failed (${response.status})`,
        status: response.status,
      };
    }

    return data.ok ? { ok: true } : { ok: false, error: 'Unexpected response' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
