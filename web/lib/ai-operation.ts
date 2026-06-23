import { HEADER_AI_OPERATION } from '@/config/constants';

/**
 * Discriminator for mobile-initiated AI work (must stay in sync with the mobile client header).
 * Sent on every AI POST so the server can log, meter, or route by operation kind.
 */
export const AI_OPERATIONS = [
  'transcript_summarize',
  'transcript_ask',
  'inbox_ask',
  'digest',
  'translate',
  'folder_auto_organize',
  /** Internal QStash worker only (not sent from mobile headers). */
  'meeting_dialogue',
  'meeting_dialogue_retry',
] as const;

export type AiOperation = (typeof AI_OPERATIONS)[number];

const isAiOperation = (value: string): value is AiOperation =>
  (AI_OPERATIONS as readonly string[]).includes(value);

const MEETING_DIALOGUE_RETRY_PATH_RE = /^\/api\/messages\/[^/]+\/meeting-dialogue$/;

const PATH_DEFAULT: Record<string, AiOperation> = {
  '/api/messages': 'transcript_summarize',
  '/api/ask': 'transcript_ask',
  '/api/inbox-ask': 'inbox_ask',
  '/api/digest': 'digest',
  '/api/translate': 'translate',
  '/api/folders/auto-organize': 'folder_auto_organize',
};

const ALLOWED_BY_PATH: Record<string, ReadonlySet<AiOperation>> = {
  '/api/messages': new Set(['transcript_summarize']),
  '/api/ask': new Set(['transcript_ask']),
  '/api/inbox-ask': new Set(['inbox_ask']),
  '/api/digest': new Set(['digest']),
  '/api/translate': new Set(['translate']),
  '/api/folders/auto-organize': new Set(['folder_auto_organize']),
};

function normalizePathname(pathname: string): string {
  const t = pathname.trim();
  if (!t) return '';
  return t.endsWith('/') && t.length > 1 ? t.replace(/\/+$/, '') : t;
}

export type ResolveAiOperationResult =
  | { ok: true; operation: AiOperation }
  | { ok: false; error: string };

/**
 * Resolves the AI operation for a request: optional client header must match the route default.
 * If the header is omitted, the route default is used (backwards compatible).
 */
export function resolveAiOperation(request: Request, pathname: string): ResolveAiOperationResult {
  const path = normalizePathname(pathname);

  if (MEETING_DIALOGUE_RETRY_PATH_RE.test(path)) {
    const allowed = new Set<AiOperation>(['meeting_dialogue_retry']);
    const raw = request.headers.get(HEADER_AI_OPERATION)?.trim().toLowerCase() ?? '';
    if (!raw) {
      return { ok: true, operation: 'meeting_dialogue_retry' };
    }
    if (!isAiOperation(raw) || !allowed.has(raw)) {
      return {
        ok: false,
        error: `Invalid or mismatched ${HEADER_AI_OPERATION} header`,
      };
    }
    return { ok: true, operation: raw };
  }

  const defaultOp = PATH_DEFAULT[path];
  const allowed = ALLOWED_BY_PATH[path];

  if (!defaultOp || !allowed) {
    return { ok: false, error: 'AI operation is not configured for this path' };
  }

  const raw = request.headers.get(HEADER_AI_OPERATION)?.trim().toLowerCase() ?? '';
  if (!raw) {
    return { ok: true, operation: defaultOp };
  }

  if (!isAiOperation(raw)) {
    return {
      ok: false,
      error: `Invalid ${HEADER_AI_OPERATION} header`,
    };
  }

  if (!allowed.has(raw)) {
    return {
      ok: false,
      error: `${HEADER_AI_OPERATION} does not match this endpoint`,
    };
  }

  return { ok: true, operation: raw };
}

/** Structured log for observability (operation + non-PII metadata). */
export function logAiRequest(operation: AiOperation, meta: Record<string, unknown> = {}): void {
  console.info('[AI]', JSON.stringify({ operation, ...meta }));
}
