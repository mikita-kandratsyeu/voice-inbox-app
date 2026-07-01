import { Receiver, Client } from '@upstash/qstash';

import { AI_JOB_QSTASH_RETRIES } from '@/config/constants';
import {
  getAiJobWorkerFallbackUrl,
  getAiJobWorkerPrimaryUrl,
  getAiJobWorkerUrl,
} from '@/lib/ai-job-publish-plan';

export function isQStashConfigured(): boolean {
  return Boolean(process.env.QSTASH_TOKEN?.trim());
}

export function shouldUseQStashTransport(): boolean {
  const transport = process.env.AI_JOB_TRANSPORT?.trim().toLowerCase();
  if (transport === 'after') return false;
  if (transport === 'qstash') return isQStashConfigured();
  return isQStashConfigured();
}

export function getQStashClient(): Client | null {
  const token = process.env.QSTASH_TOKEN?.trim();
  if (!token) return null;
  return new Client({
    token,
    ...(process.env.QSTASH_URL?.trim() ? { baseUrl: process.env.QSTASH_URL.trim() } : {}),
  });
}

function getQStashReceiver(): Receiver | null {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY?.trim();
  if (!currentSigningKey) return null;
  return new Receiver({
    currentSigningKey,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY?.trim() || undefined,
  });
}

export { getAiJobWorkerPrimaryUrl, getAiJobWorkerFallbackUrl, getAiJobWorkerUrl };

export async function verifyQStashRequest(request: Request, body: string): Promise<boolean> {
  const receiver = getQStashReceiver();
  if (!receiver) return false;

  const signature = request.headers.get('upstash-signature');
  if (!signature) return false;

  try {
    return await receiver.verify({ signature, body });
  } catch {
    return false;
  }
}

/** `Upstash-Retried` from QStash delivery (0 = first attempt). Undefined for `after()` fallback. */
export function parseUpstashRetried(request: Request): number | undefined {
  const raw = request.headers.get('upstash-retried') ?? request.headers.get('Upstash-Retried');
  if (raw == null || raw === '') return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** Last delivery when publish used `retries: AI_JOB_QSTASH_RETRIES` (retried 0..N inclusive). */
export function isLastQStashDelivery(retried: number | undefined): boolean {
  if (retried == null) return false;
  return retried >= AI_JOB_QSTASH_RETRIES;
}

export function getQStashStatus(): { ok: boolean; error?: string; transport?: string } {
  if (!isQStashConfigured()) {
    return { ok: false, error: 'QSTASH_TOKEN not set' };
  }
  if (!process.env.QSTASH_CURRENT_SIGNING_KEY?.trim()) {
    return { ok: false, error: 'QSTASH_CURRENT_SIGNING_KEY not set' };
  }
  return {
    ok: true,
    transport: shouldUseQStashTransport() ? 'qstash' : 'after',
  };
}
