import { isNonNegativeFiniteNumber, isRecord, isString } from '@/shared/lib/type-guards';

import type { AiProcessingResult, AiTask, RecordClassification } from './aiApi';
import { parseServerPollHints } from './serverPollHints';

export type ServerMeetingDialogueStatus = 'processing' | 'done' | 'failed' | 'skipped';

export type ParsedMessagePollState =
  | {
      kind: 'processing';
      /** Optional server hint: recommended retry interval (ms) */
      retryAfterMs?: number;
      /** Optional server hint: estimated completion time (ms from now) */
      estimatedCompletionMs?: number;
      /** Optional server hint: progress percentage (0-100) */
      progress?: number;
    }
  | { kind: 'error'; error: string }
  | {
      kind: 'done';
      result: AiProcessingResult;
      meetingDialogueStatus?: ServerMeetingDialogueStatus;
    };

function parseTokenUsage(raw: unknown): { prompt: number; completion: number } | undefined {
  if (!isRecord(raw)) return undefined;
  const prompt = isNonNegativeFiniteNumber(raw.prompt) ? Math.floor(raw.prompt) : undefined;
  const completion = isNonNegativeFiniteNumber(raw.completion)
    ? Math.floor(raw.completion)
    : undefined;
  if (prompt == null || completion == null) return undefined;
  return { prompt, completion };
}

function readMeetingDialogueStatus(raw: unknown): ServerMeetingDialogueStatus | undefined {
  if (raw === 'processing' || raw === 'done' || raw === 'failed' || raw === 'skipped') {
    return raw;
  }
  return undefined;
}

/** Maps GET /api/messages/:id JSON to poll loop state. */
export function parseMessagePollState(json: unknown): ParsedMessagePollState {
  if (!isRecord(json)) {
    return { kind: 'processing' };
  }

  const msg = json;
  const status = msg.status;

  if (status === 'processing') {
    const hints = parseServerPollHints(msg);

    return {
      kind: 'processing',
      retryAfterMs: hints?.retryAfterMs,
      estimatedCompletionMs: hints?.estimatedCompletionMs,
      progress: hints?.progress,
    };
  }

  if (status === 'error') {
    const error = isString(msg.error) ? msg.error : 'Unknown error';
    return { kind: 'error', error };
  }

  if (status !== 'done') {
    return { kind: 'processing' };
  }

  const meetingDialogueStatus = readMeetingDialogueStatus(msg.meetingDialogueStatus);

  const suggested =
    isString(msg.suggestedTitle) && msg.suggestedTitle.trim()
      ? { suggestedTitle: msg.suggestedTitle.trim() }
      : {};
  const modelField = isString(msg.model) && msg.model.trim() ? { model: msg.model.trim() } : {};
  const modelLabelField =
    isString(msg.modelLabel) && msg.modelLabel.trim() ? { modelLabel: msg.modelLabel.trim() } : {};
  const mdRaw = msg.meetingDialogueMarkdown;
  const meetingMd =
    isString(mdRaw) && mdRaw.trim() ? { meetingDialogueMarkdown: mdRaw.trim() } : {};
  const reasoningRaw = msg.reasoning;
  const reasoningField =
    isString(reasoningRaw) && reasoningRaw.trim() ? { reasoning: reasoningRaw.trim() } : {};
  const tokenUsage = parseTokenUsage(msg.tokenUsage);
  const tokenUsageField = tokenUsage ? { tokenUsage } : {};

  const summary = isString(msg.summary) ? msg.summary : '';
  const tasks = Array.isArray(msg.tasks) ? (msg.tasks as AiTask[]) : [];
  const tags = Array.isArray(msg.tags) ? (msg.tags as string[]) : [];

  return {
    kind: 'done',
    meetingDialogueStatus,
    result: {
      summary,
      tasks,
      tags,
      ...suggested,
      ...modelField,
      ...modelLabelField,
      ...(isString(msg.classification)
        ? { classification: msg.classification as RecordClassification }
        : {}),
      ...(Array.isArray(msg.keyPhrases) ? { keyPhrases: msg.keyPhrases as string[] } : {}),
      ...(Array.isArray(msg.nextSteps) ? { nextSteps: msg.nextSteps as string[] } : {}),
      ...meetingMd,
      ...reasoningField,
      ...tokenUsageField,
    },
  };
}
