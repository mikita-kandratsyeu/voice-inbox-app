export type AiJobEnvelope = {
  jobId: string;
  operation: string;
  deviceId: string;
  messageTtlSeconds: number;
};

const AI_OPERATIONS = new Set<string>([
  'transcript_summarize',
  'transcript_ask',
  'inbox_ask',
  'general_ask',
  'digest',
  'translate',
  'folder_auto_organize',
  'meeting_dialogue',
]);

export function parseAiJobEnvelope(body: unknown): AiJobEnvelope | null {
  if (!body || typeof body !== 'object') return null;
  const row = body as Record<string, unknown>;
  const jobId = typeof row.jobId === 'string' ? row.jobId.trim() : '';
  const operation = typeof row.operation === 'string' ? row.operation.trim() : '';
  const deviceId = typeof row.deviceId === 'string' ? row.deviceId.trim() : '';
  const messageTtlSeconds =
    typeof row.messageTtlSeconds === 'number' && row.messageTtlSeconds > 0
      ? Math.floor(row.messageTtlSeconds)
      : 0;

  if (!jobId || !deviceId || !messageTtlSeconds) return null;
  if (!AI_OPERATIONS.has(operation)) return null;

  return {
    jobId,
    operation,
    deviceId,
    messageTtlSeconds,
  };
}

/**
 * QStash failure callback body (after primary destination retries exhausted).
 * @see https://upstash.com/docs/qstash/features/callbacks
 */
export function parseQStashFailureCallbackEnvelope(body: unknown): AiJobEnvelope | null {
  if (!body || typeof body !== 'object') return null;
  const row = body as Record<string, unknown>;
  const sourceBody = row.sourceBody;
  if (typeof sourceBody !== 'string' || !sourceBody.trim()) return null;

  let decoded: string;
  try {
    decoded = Buffer.from(sourceBody, 'base64').toString('utf8');
  } catch {
    return null;
  }

  try {
    return parseAiJobEnvelope(JSON.parse(decoded));
  } catch {
    return null;
  }
}

export function resolveEnvelopeFromBody(parsed: unknown): AiJobEnvelope | null {
  return parseAiJobEnvelope(parsed) ?? parseQStashFailureCallbackEnvelope(parsed);
}
