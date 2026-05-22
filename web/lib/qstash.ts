import { Receiver, Client } from '@upstash/qstash';

import { BASE_URL_OR_FALLBACK } from '@/config/constants';

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

export function getAiJobWorkerUrl(): string {
  const base = BASE_URL_OR_FALLBACK.replace(/\/$/, '');
  return `${base}/api/internal/ai/worker`;
}

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
