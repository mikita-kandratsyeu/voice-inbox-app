import { recordRepository } from '@/entities/record/model/repository';
import type { VoiceRecord } from '@/entities/record/model/types';
import type { InboxAskRetrievalScope } from '@/features/inbox-ask-retrieval';
import {
  filterInboxAskCorpusRecords,
  prepareInboxAskQueryEmbedding,
  retrieveNotesForInboxAsk,
} from '@/features/inbox-ask-retrieval';
import {
  buildSimilarityContext,
  rankSimilarRecords,
} from '@/features/related-notes/lib/computeRecordSimilarity';
import {
  type CorpusNoteForPrompt,
  type InboxAskToolCall,
  type InboxAskToolResult,
} from '@/shared/lib/ai-core/types';

import { isInboxAskToolName } from './inboxAskToolDefinitions';

const MAX_TOOL_QUERY_CHARS = 240;
const MAX_TOOL_NOTES = 6;
const MAX_NOTE_TRANSCRIPT_EXCERPT_CHARS = 900;
const MAX_NOTE_SUMMARY_CHARS = 700;
const MAX_TASKS = 30;
const MAX_TASK_TEXT_CHARS = 180;
const MAX_RELATED_NOTES = 6;

export type InboxAskToolExecutorContext = {
  records: VoiceRecord[];
  scope?: InboxAskRetrievalScope;
};

function getScopedRecords(context: InboxAskToolExecutorContext): VoiceRecord[] {
  return filterInboxAskCorpusRecords(context.records, context.scope) as VoiceRecord[];
}

function readStringArg(args: Record<string, unknown>, key: string, maxChars: number): string {
  const raw = args[key];
  if (typeof raw !== 'string') return '';
  return raw.replace(/\s+/g, ' ').trim().slice(0, maxChars);
}

function readBooleanArg(args: Record<string, unknown>, key: string): boolean {
  return args[key] === true;
}

function readPositiveIntArg(
  args: Record<string, unknown>,
  key: string,
  defaultValue: number,
  maxValue: number,
): number {
  const raw = args[key];
  const value = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isFinite(value) || value <= 0) return defaultValue;
  return Math.min(Math.floor(value), maxValue);
}

function compactText(value: string | null | undefined, maxChars: number): string | undefined {
  const text = value?.replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  return text.length <= maxChars ? text : `${text.slice(0, maxChars).trim()}...`;
}

function noteToCorpusNote(
  record: VoiceRecord,
  options?: { includeTranscript?: boolean; transcriptMaxChars?: number },
): CorpusNoteForPrompt {
  const tasks = (record.tasks ?? [])
    .filter((task) => !task.isDone)
    .slice(0, 5)
    .map((task) => ({ text: compactText(task.text, 72) ?? '' }))
    .filter((task) => task.text.length > 0);

  return {
    recordId: record.id,
    title: compactText(record.title, 160) ?? 'Untitled note',
    ...(compactText(record.summary, MAX_NOTE_SUMMARY_CHARS)
      ? { summary: compactText(record.summary, MAX_NOTE_SUMMARY_CHARS) }
      : {}),
    ...(record.keyPhrases?.length ? { keyPhrases: record.keyPhrases.slice(0, 8) } : {}),
    ...(tasks.length ? { tasks } : {}),
    ...(options?.includeTranscript
      ? {
          transcriptExcerpt: compactText(
            record.transcript,
            options.transcriptMaxChars ?? MAX_NOTE_TRANSCRIPT_EXCERPT_CHARS,
          ),
        }
      : {}),
    ...(record.createdAt ? { createdAt: record.createdAt } : {}),
  };
}

async function executeSearchNotesTool(
  call: InboxAskToolCall,
  context: InboxAskToolExecutorContext,
): Promise<InboxAskToolResult> {
  const query = readStringArg(call.arguments, 'query', MAX_TOOL_QUERY_CHARS);
  if (!query) {
    throw new Error('search_notes requires a non-empty query');
  }

  const queryEmbedding = await prepareInboxAskQueryEmbedding(query);
  const embeddingsById = await recordRepository.getEmbeddingsForActiveRecords();
  const retrieval = retrieveNotesForInboxAsk({
    question: query,
    records: context.records,
    embeddingsById,
    queryEmbedding,
    scope: context.scope,
  });
  const limit = readPositiveIntArg(call.arguments, 'limit', MAX_TOOL_NOTES, MAX_TOOL_NOTES);

  return {
    toolCallId: call.toolCallId,
    toolName: 'search_notes',
    round: call.round,
    result: {
      toolName: 'search_notes',
      query,
      notes: retrieval.notes.slice(0, limit),
      totalCorpusCount: retrieval.totalCorpusCount,
      droppedCount: retrieval.droppedCount,
      retrievalMode: retrieval.retrievalMode,
    },
  };
}

function executeGetNoteTool(
  call: InboxAskToolCall,
  context: InboxAskToolExecutorContext,
): InboxAskToolResult {
  const recordId = readStringArg(call.arguments, 'recordId', 120);
  const record = getScopedRecords(context).find((item) => item.id === recordId);
  const includeTranscript = readBooleanArg(call.arguments, 'includeTranscriptExcerpt');

  return {
    toolCallId: call.toolCallId,
    toolName: 'get_note',
    round: call.round,
    result: {
      toolName: 'get_note',
      note: record
        ? {
            ...noteToCorpusNote(record, { includeTranscript }),
            ...(record.tags?.length ? { tags: record.tags.slice(0, 12) } : {}),
            status: record.status,
          }
        : null,
    },
  };
}

function executeListTasksTool(
  call: InboxAskToolCall,
  context: InboxAskToolExecutorContext,
): InboxAskToolResult {
  const filterRaw = readStringArg(call.arguments, 'filter', 20);
  const filter = filterRaw === 'done' || filterRaw === 'all' ? filterRaw : 'open';
  const recordId = readStringArg(call.arguments, 'recordId', 120);
  const limit = readPositiveIntArg(call.arguments, 'limit', MAX_TASKS, MAX_TASKS);

  const tasks = getScopedRecords(context)
    .filter((record) => !recordId || record.id === recordId)
    .flatMap((record) =>
      (record.tasks ?? []).map((task) => ({
        recordId: record.id,
        title: compactText(record.title, 120) ?? 'Untitled note',
        text: compactText(task.text, MAX_TASK_TEXT_CHARS) ?? '',
        isDone: task.isDone,
        deadline: task.deadline ?? null,
        priority: task.priority,
      })),
    )
    .filter((task) => task.text.length > 0)
    .filter((task) => {
      if (filter === 'all') return true;
      return filter === 'done' ? task.isDone : !task.isDone;
    })
    .slice(0, limit);

  return {
    toolCallId: call.toolCallId,
    toolName: 'list_tasks',
    round: call.round,
    result: {
      toolName: 'list_tasks',
      tasks,
    },
  };
}

function executeRelatedNotesTool(
  call: InboxAskToolCall,
  context: InboxAskToolExecutorContext,
): InboxAskToolResult {
  const recordId = readStringArg(call.arguments, 'recordId', 120);
  const scopedRecords = getScopedRecords(context);
  const current = scopedRecords.find((item) => item.id === recordId);
  const limit = readPositiveIntArg(call.arguments, 'limit', MAX_RELATED_NOTES, MAX_RELATED_NOTES);
  const contextSimilarity = buildSimilarityContext(scopedRecords);
  const related = current
    ? rankSimilarRecords(current, scopedRecords, contextSimilarity, limit, 0.08)
    : [];

  return {
    toolCallId: call.toolCallId,
    toolName: 'get_related_notes',
    round: call.round,
    result: {
      toolName: 'get_related_notes',
      recordId,
      notes: related.map((record) => noteToCorpusNote(record, { includeTranscript: false })),
    },
  };
}

export async function executeInboxAskTool(
  call: InboxAskToolCall,
  context: InboxAskToolExecutorContext,
): Promise<InboxAskToolResult> {
  if (!isInboxAskToolName(call.toolName)) {
    throw new Error(`Unsupported inbox ask tool: ${String(call.toolName)}`);
  }

  switch (call.toolName) {
    case 'search_notes':
      return executeSearchNotesTool(call, context);
    case 'get_note':
      return executeGetNoteTool(call, context);
    case 'list_tasks':
      return executeListTasksTool(call, context);
    case 'get_related_notes':
      return executeRelatedNotesTool(call, context);
    default: {
      const _exhaustive: never = call.toolName;
      throw new Error(`Unsupported inbox ask tool: ${_exhaustive}`);
    }
  }
}
