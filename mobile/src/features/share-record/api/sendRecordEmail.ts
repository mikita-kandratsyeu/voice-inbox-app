import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import { i18n } from '@/shared/lib';
import { fetchWithAuth } from '@/shared/lib/api-auth';
import { toUserFacingFetchErrorFromUnknown } from '@/shared/lib/fetch/userFacingFetchError';
import { isString } from '@/shared/lib/type-guards';

/** Keep in sync with `web/app/api/share/email/route.ts` */
export const SHARE_EMAIL_MARKDOWN_MAX = 80_000;
export const SHARE_EMAIL_ZIP_MAX_BYTES = 10 * 1024 * 1024;

export type ShareEmailLocale = 'en' | 'ru';

export function resolveShareEmailLocale(): ShareEmailLocale {
  const lang = (i18n.language ?? 'en').split('-')[0]?.toLowerCase();
  return lang === 'ru' ? 'ru' : 'en';
}

export type SendRecordEmailInput = {
  to: string;
  subject: string;
  title: string;
  markdown: string;
  attachMarkdown?: boolean;
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
        locale: resolveShareEmailLocale(),
        ...(input.attachMarkdown === false ? { attachMarkdown: false } : {}),
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
    return { ok: false, error: toUserFacingFetchErrorFromUnknown(e) };
  }
}

export type SendShareEmailZipInput = {
  to: string;
  subject: string;
  title: string;
  bodyText: string;
  /** Local filesystem path to the .zip (with or without `file://`) */
  zipAbsolutePath: string;
  zipDisplayName: string;
};

/**
 * Multipart upload: same `/api/share/email` route with `Content-Type: multipart/form-data`.
 * Do not set `Content-Type` manually — the client must set the multipart boundary.
 */
export type SendShareEmailPdfInput = {
  to: string;
  subject: string;
  title: string;
  bodyText: string;
  /** Local filesystem path to the .pdf (with or without `file://`) */
  pdfAbsolutePath: string;
  pdfDisplayName: string;
};

export async function sendShareEmailPdfAttachment(
  input: SendShareEmailPdfInput,
): Promise<SendRecordEmailResult> {
  const base = getWebApiUrl().trim();
  if (!base) {
    return { ok: false, error: 'WEB_API_URL is not configured' };
  }

  const uri = input.pdfAbsolutePath.startsWith('file://')
    ? input.pdfAbsolutePath
    : `file://${input.pdfAbsolutePath}`;

  const form = new FormData();
  form.append('to', input.to.trim());
  form.append('subject', input.subject.trim());
  form.append('title', input.title.trim());
  form.append('bodyText', input.bodyText);
  form.append('locale', resolveShareEmailLocale());
  form.append('attachmentKind', 'pdf');
  form.append('pdfFileName', input.pdfDisplayName);
  form.append('file', {
    uri,
    type: 'application/pdf',
    name: input.pdfDisplayName,
  } as unknown as Blob);

  try {
    const response = await fetchWithAuth(`${base.replace(/\/$/, '')}/api/share/email`, {
      method: 'POST',
      body: form,
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
    return { ok: false, error: toUserFacingFetchErrorFromUnknown(e) };
  }
}

export async function sendShareEmailZipAttachment(
  input: SendShareEmailZipInput,
): Promise<SendRecordEmailResult> {
  const base = getWebApiUrl().trim();
  if (!base) {
    return { ok: false, error: 'WEB_API_URL is not configured' };
  }

  const uri = input.zipAbsolutePath.startsWith('file://')
    ? input.zipAbsolutePath
    : `file://${input.zipAbsolutePath}`;

  const form = new FormData();
  form.append('to', input.to.trim());
  form.append('subject', input.subject.trim());
  form.append('title', input.title.trim());
  form.append('bodyText', input.bodyText);
  form.append('locale', resolveShareEmailLocale());
  form.append('zipFileName', input.zipDisplayName);
  form.append('file', {
    uri,
    type: 'application/zip',
    name: input.zipDisplayName,
  } as unknown as Blob);

  try {
    const response = await fetchWithAuth(`${base.replace(/\/$/, '')}/api/share/email`, {
      method: 'POST',
      body: form,
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
    return { ok: false, error: toUserFacingFetchErrorFromUnknown(e) };
  }
}
