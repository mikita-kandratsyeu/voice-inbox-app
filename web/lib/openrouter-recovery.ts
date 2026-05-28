import {
  OPENROUTER_GENERATION_RECOVERY_MAX_WAIT_MS,
  OPENROUTER_GENERATION_RECOVERY_POLL_INTERVAL_MS,
  OPENROUTER_PENDING_GENERATION_KEY_PREFIX,
  OPENROUTER_PENDING_GENERATION_TTL_SECONDS,
} from '@/config/constants';
import { redis } from '@/lib/redis';

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';
export const OPENROUTER_GENERATION_ID_HEADER = 'x-generation-id';

export type OpenRouterRecoveredCompletion = {
  content: string;
  message: Record<string, unknown>;
  raw: Record<string, unknown>;
};

function openRouterApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY?.trim() || undefined;
}

function pendingGenerationKey(jobId: string): string {
  return `${OPENROUTER_PENDING_GENERATION_KEY_PREFIX}${jobId}`;
}

export async function saveOpenRouterPendingGeneration(
  jobId: string,
  generationId: string,
  ttlSeconds: number = OPENROUTER_PENDING_GENERATION_TTL_SECONDS,
): Promise<void> {
  const id = generationId.trim();
  if (!jobId.trim() || !id) return;
  await redis.set(pendingGenerationKey(jobId), id, { ex: ttlSeconds });
}

export async function getOpenRouterPendingGeneration(jobId: string): Promise<string | null> {
  const raw = await redis.get(pendingGenerationKey(jobId));
  if (typeof raw !== 'string') return null;
  const id = raw.trim();
  return id || null;
}

export async function clearOpenRouterPendingGeneration(jobId: string): Promise<void> {
  await redis.del(pendingGenerationKey(jobId));
}

export function readOpenRouterGenerationId(headers: Headers): string | undefined {
  const fromHeader = headers.get(OPENROUTER_GENERATION_ID_HEADER) ?? headers.get('X-Generation-Id');
  const id = fromHeader?.trim();
  return id || undefined;
}

export function isOpenRouterRecoverableTransportError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const name = err.name;
  if (
    name === 'AbortError' ||
    name === 'TimeoutError' ||
    name === 'TypeError' ||
    name === 'FetchError'
  ) {
    return true;
  }
  const msg = err.message.toLowerCase();
  return (
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('terminated') ||
    msg.includes('aborted') ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('socket')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readStringField(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** Parses `GET /generation/content` output into assistant text + optional reasoning. */
export function parseGenerationContentOutput(output: unknown): {
  content: string;
  reasoning?: string;
} | null {
  if (typeof output === 'string') {
    const content = output.trim();
    return content ? { content } : null;
  }

  if (!output || typeof output !== 'object') return null;

  const row = output as Record<string, unknown>;

  const directContent = readStringField(row.content);
  if (directContent) {
    return {
      content: directContent,
      reasoning: readStringField(row.reasoning),
    };
  }

  const text = readStringField(row.text);
  if (text) {
    return { content: text, reasoning: readStringField(row.reasoning) };
  }

  const choices = row.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
    const choice = choices[0] as Record<string, unknown>;
    const message =
      choice.message && typeof choice.message === 'object'
        ? (choice.message as Record<string, unknown>)
        : null;
    if (message) {
      const content = readStringField(message.content);
      if (content) {
        return {
          content,
          reasoning: readStringField(message.reasoning),
        };
      }
    }
    const delta =
      choice.delta && typeof choice.delta === 'object'
        ? (choice.delta as Record<string, unknown>)
        : null;
    if (delta) {
      const content = readStringField(delta.content);
      if (content) {
        return { content, reasoning: readStringField(delta.reasoning) };
      }
    }
  }

  return null;
}

function buildRecoveredCompletion(
  generationId: string,
  model: string,
  parsed: { content: string; reasoning?: string },
): OpenRouterRecoveredCompletion {
  const message: Record<string, unknown> = {
    role: 'assistant',
    content: parsed.content,
    ...(parsed.reasoning ? { reasoning: parsed.reasoning } : {}),
  };

  const raw: Record<string, unknown> = {
    id: generationId,
    object: 'chat.completion',
    model,
    choices: [{ index: 0, message, finish_reason: 'stop' }],
    recovered: true,
  };

  return { content: parsed.content, message, raw };
}

export async function fetchOpenRouterGenerationContent(
  generationId: string,
): Promise<OpenRouterRecoveredCompletion | null> {
  const apiKey = openRouterApiKey();
  if (!apiKey) return null;

  const url = new URL(`${OPENROUTER_API_BASE}/generation/content`);
  url.searchParams.set('id', generationId);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `OpenRouter generation content failed (${response.status}): ${body.slice(0, 200)}`,
    );
  }

  const json = (await response.json()) as unknown;
  if (!json || typeof json !== 'object') return null;

  const data = (json as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return null;

  const output = (data as { output?: unknown }).output;
  const parsed = parseGenerationContentOutput(output);
  if (!parsed) return null;

  let model = 'unknown';
  try {
    const metaUrl = new URL(`${OPENROUTER_API_BASE}/generation`);
    metaUrl.searchParams.set('id', generationId);
    const metaRes = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (metaRes.ok) {
      const metaJson = (await metaRes.json()) as { data?: { model?: unknown } };
      if (typeof metaJson.data?.model === 'string' && metaJson.data.model.trim()) {
        model = metaJson.data.model.trim();
      }
    }
  } catch {
    // Optional metadata; content is enough to proceed.
  }

  return buildRecoveredCompletion(generationId, model, parsed);
}

export async function pollOpenRouterGenerationContent(
  generationId: string,
  options?: { maxWaitMs?: number; intervalMs?: number },
): Promise<OpenRouterRecoveredCompletion | null> {
  const maxWaitMs = options?.maxWaitMs ?? OPENROUTER_GENERATION_RECOVERY_MAX_WAIT_MS;
  const intervalMs = options?.intervalMs ?? OPENROUTER_GENERATION_RECOVERY_POLL_INTERVAL_MS;
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    try {
      const result = await fetchOpenRouterGenerationContent(generationId);
      if (result) return result;
    } catch (err) {
      console.warn('[OpenRouter recovery] poll error', {
        generationId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    await sleep(intervalMs);
  }

  return null;
}

export async function tryRecoverOpenRouterPendingGeneration(
  jobId: string,
  options?: { maxWaitMs?: number },
): Promise<OpenRouterRecoveredCompletion | null> {
  const generationId = await getOpenRouterPendingGeneration(jobId);
  if (!generationId) return null;

  console.info('[OpenRouter recovery] resuming pending generation', { jobId, generationId });

  const recovered = await pollOpenRouterGenerationContent(generationId, options);
  if (recovered) {
    await clearOpenRouterPendingGeneration(jobId);
    console.info('[OpenRouter recovery] recovered from pending generation', {
      jobId,
      generationId,
    });
  }

  return recovered;
}
