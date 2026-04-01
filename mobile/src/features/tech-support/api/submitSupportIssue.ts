import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import { fetchWithAuth } from '@/shared/lib/api-auth';
import { isString } from '@/shared/lib/type-guards';

import type { SupportDiagnosticsPayload } from '../lib/collectSupportDiagnostics';

export type SubmitSupportIssueInput = {
  email: string;
  subject: string;
  message: string;
  appLogs: string;
  diagnostics: SupportDiagnosticsPayload;
};

export type SubmitSupportIssueResult =
  | { ok: true; id: string; reference: string }
  | { ok: false; error: string; status?: number };

export async function submitSupportIssue(
  input: SubmitSupportIssueInput,
): Promise<SubmitSupportIssueResult> {
  const base = getWebApiUrl().trim();
  if (!base) {
    return { ok: false, error: 'WEB_API_URL is not configured' };
  }

  const url = `${base.replace(/\/$/, '')}/api/support`;
  const body = {
    email: input.email.trim() || undefined,
    subject: input.subject.trim() || undefined,
    message: input.message.trim(),
    appLogs: input.appLogs.trim() || undefined,
    diagnostics: input.diagnostics,
  };

  try {
    const response = await fetchWithAuth(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data: { ok?: boolean; id?: string; reference?: string; error?: string } = {};
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

    if (data.ok && isString(data.id)) {
      const reference = isString(data.reference)
        ? data.reference
        : data.id.length >= 8
          ? data.id.slice(0, 8)
          : data.id;
      return { ok: true, id: data.id, reference };
    }

    return { ok: false, error: 'Unexpected response', status: response.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return { ok: false, error: msg };
  }
}
