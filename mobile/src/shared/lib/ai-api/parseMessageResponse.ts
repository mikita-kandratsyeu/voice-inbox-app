import { isString } from '@/shared/lib/type-guards';

import type { AiProcessingResult, AiTask, RecordClassification } from './aiApi';

export type ServerMeetingDialogueStatus = 'processing' | 'done' | 'failed' | 'skipped';

export type ParsedMessagePollState =
  | { kind: 'processing' }
  | { kind: 'error'; error: string }
  | {
      kind: 'done';
      result: AiProcessingResult;
      meetingDialogueStatus?: ServerMeetingDialogueStatus;
    };

function parseTokenUsage(raw: unknown): { prompt: number; completion: number } | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const row = raw as Record<string, unknown>;
  const prompt =
    typeof row.prompt === 'number' && row.prompt >= 0 ? Math.floor(row.prompt) : undefined;
  const completion =
    typeof row.completion === 'number' && row.completion >= 0
      ? Math.floor(row.completion)
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
  const msg = json as Record<string, unknown>;
  const status = msg.status;

  if (status === 'processing') {
    return { kind: 'processing' };
  }

  if (status === 'error') {
    const error = typeof msg.error === 'string' ? msg.error : 'Unknown error';
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

  const summary = typeof msg.summary === 'string' ? msg.summary : '';
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
      ...(typeof msg.classification === 'string'
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
