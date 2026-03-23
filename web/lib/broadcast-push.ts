import type { PushPayload } from '@/lib/firebase-push';
import { PUSH_LOCALES, normalizePushLocale, type PushLocale } from '@/lib/push-messages';
import { sendPushNotification } from '@/lib/push';
import { getAllDeviceIdsWithPushTokens, getPushTokenWithLocale } from '@/lib/push-tokens';

const VALID_TYPES: PushPayload['type'][] = [
  'ai_complete',
  'policy_update',
  'limit_warning',
  'limit_exceeded',
];

const CONCURRENCY = 20;

export const MAX_BROADCAST_MESSAGE_CHARS = 3500;

export type BroadcastLocaleContent = {
  title?: string;
  body?: string;
  message?: string;
};

export type BroadcastInput = {
  type?: string;
  /** Legacy single-locale fields; used if i18n does not fill a slot (after EN fallback). */
  title?: string;
  body?: string;
  message?: string;
  /** Per-device locale is matched here; missing fields fall back to English, then legacy. */
  i18n?: Partial<Record<PushLocale, BroadcastLocaleContent>>;
};

export type BroadcastResult = {
  ok: true;
  sent: number;
  failed: number;
  total: number;
};

function trimField(s: unknown): string | undefined {
  if (typeof s !== 'string') return undefined;
  const t = s.trim();
  return t.length ? t : undefined;
}

function parseLocaleBlock(raw: unknown): BroadcastLocaleContent | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const title = trimField(o.title);
  const body = trimField(o.body);
  const message = trimField(o.message);
  if (!title && !body && !message) return undefined;
  return { title, body, message };
}

/** Parse broadcast fields from JSON (admin or mobile API). */
export function parseLooseBroadcastBody(body: {
  type?: unknown;
  title?: unknown;
  body?: unknown;
  message?: unknown;
  i18n?: unknown;
}): BroadcastInput {
  let i18n: BroadcastInput['i18n'];
  const i18nRaw = body.i18n;
  if (i18nRaw && typeof i18nRaw === 'object') {
    const acc: NonNullable<BroadcastInput['i18n']> = {};
    for (const loc of PUSH_LOCALES) {
      const block = parseLocaleBlock((i18nRaw as Record<string, unknown>)[loc]);
      if (block) acc[loc] = block;
    }
    if (Object.keys(acc).length) i18n = acc;
  }
  return {
    type: typeof body.type === 'string' ? body.type : undefined,
    title: trimField(body.title),
    body: trimField(body.body),
    message: trimField(body.message),
    i18n,
  };
}

export function normalizeBroadcastType(input: BroadcastInput): PushPayload['type'] {
  return typeof input.type === 'string' && VALID_TYPES.includes(input.type as PushPayload['type'])
    ? (input.type as PushPayload['type'])
    : 'policy_update';
}

/**
 * Pick title/body/message for a device's locale: device language → English i18n → legacy fields.
 */
export function resolveBroadcastStrings(
  input: BroadcastInput,
  deviceLocale: string | null | undefined,
): { title?: string; body?: string; message?: string } {
  const loc = normalizePushLocale(deviceLocale);
  const legacy = {
    title: input.title,
    body: input.body,
    message: input.message,
  };
  const primary = input.i18n?.[loc];
  const enFallback = loc !== 'en' ? input.i18n?.en : undefined;
  return {
    title: trimField(primary?.title) ?? trimField(enFallback?.title) ?? legacy.title,
    body: trimField(primary?.body) ?? trimField(enFallback?.body) ?? legacy.body,
    message: trimField(primary?.message) ?? trimField(enFallback?.message) ?? legacy.message,
  };
}

export function buildPayloadForDevice(
  input: BroadcastInput,
  deviceLocale: string | null,
): PushPayload {
  const type = normalizeBroadcastType(input);
  const { title, body, message } = resolveBroadcastStrings(input, deviceLocale);
  return { type, title, body, message };
}

/** Payload as sent to a device with English locale (preview / history default). */
export function parseBroadcastBody(input: BroadcastInput): PushPayload {
  return buildPayloadForDevice(input, 'en');
}

function collectMessages(input: BroadcastInput): string[] {
  const out: string[] = [];
  if (input.message) out.push(input.message);
  if (input.i18n) {
    for (const loc of PUSH_LOCALES) {
      const m = input.i18n[loc]?.message;
      if (m) out.push(m);
    }
  }
  return out;
}

/** Returns an error message if any message field exceeds the limit. */
export function validateBroadcastMessageLengths(input: BroadcastInput): string | null {
  for (const m of collectMessages(input)) {
    if (m.length > MAX_BROADCAST_MESSAGE_CHARS) {
      return `message exceeds ${MAX_BROADCAST_MESSAGE_CHARS} characters`;
    }
  }
  return null;
}

export async function runBroadcast(body: BroadcastInput): Promise<BroadcastResult> {
  const deviceIds = await getAllDeviceIdsWithPushTokens();
  const total = deviceIds.length;

  if (total === 0) {
    return { ok: true, sent: 0, failed: 0, total: 0 };
  }

  const sendOne = async (deviceId: string): Promise<boolean> => {
    const data = await getPushTokenWithLocale(deviceId);
    if (!data) return false;
    const payload = buildPayloadForDevice(body, data.locale);
    return sendPushNotification(data.token, payload, data.locale);
  };

  const results: boolean[] = [];
  for (let i = 0; i < deviceIds.length; i += CONCURRENCY) {
    const batch = deviceIds.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(sendOne));
    results.push(...batchResults);
  }

  const sent = results.filter(Boolean).length;
  const failed = total - sent;
  return { ok: true, sent, failed, total };
}
