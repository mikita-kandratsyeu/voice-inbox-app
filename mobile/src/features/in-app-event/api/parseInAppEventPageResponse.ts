import type { InAppEventPagePayload } from './types';

export type ParseInAppEventPageResult =
  | { ok: true; page: InAppEventPagePayload }
  | { ok: false; error: string };

export function parseInAppEventPageResponse(
  status: number,
  json: unknown,
): ParseInAppEventPageResult {
  if (status === 404) {
    return { ok: false, error: 'not_found' };
  }

  if (!json || typeof json !== 'object') {
    return { ok: false, error: 'invalid_response' };
  }

  const record = json as Record<string, unknown>;
  if (record.ok !== true) {
    const message = typeof record.error === 'string' ? record.error : 'request_failed';
    return { ok: false, error: message };
  }

  const eventId = typeof record.eventId === 'string' ? record.eventId.trim() : '';
  const locale = typeof record.locale === 'string' ? record.locale.trim() : '';
  const revision = typeof record.revision === 'number' ? record.revision : NaN;
  const documentHtml = typeof record.documentHtml === 'string' ? record.documentHtml : '';
  const ctaLabel =
    typeof record.ctaLabel === 'string' && record.ctaLabel.trim()
      ? record.ctaLabel.trim()
      : null;

  if (!eventId || !locale || !Number.isFinite(revision) || !documentHtml) {
    return { ok: false, error: 'invalid_payload' };
  }

  return {
    ok: true,
    page: { eventId, locale, revision, ctaLabel, documentHtml },
  };
}
