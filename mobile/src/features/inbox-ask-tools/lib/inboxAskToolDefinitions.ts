import {
  INBOX_ASK_TOOL_NAMES,
  type InboxAskToolCall,
  type InboxAskToolName,
} from '@/shared/lib/ai-core/types';

export const INBOX_ASK_MAX_TOOL_ROUNDS = 3;

const TOOL_NAME_SET = new Set<string>(INBOX_ASK_TOOL_NAMES);

export type InboxAskToolDefinition = {
  type: 'function';
  function: {
    name: InboxAskToolName;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export const INBOX_ASK_TOOL_DEFINITIONS: InboxAskToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_notes',
      description:
        'Search the user voice-note inbox by meaning and keywords. Returns compact note context only.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query, max 240 characters.' },
          limit: { type: 'integer', minimum: 1, maximum: 6 },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_note',
      description:
        'Open one note by recordId and return bounded text metadata. Does not return audio.',
      parameters: {
        type: 'object',
        properties: {
          recordId: { type: 'string' },
          includeTranscriptExcerpt: {
            type: 'boolean',
            description:
              'When true, include a short transcript excerpt, never the full transcript.',
          },
        },
        required: ['recordId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_tasks',
      description: 'List tasks extracted from notes, optionally scoped to one record.',
      parameters: {
        type: 'object',
        properties: {
          recordId: { type: 'string' },
          filter: { type: 'string', enum: ['open', 'done', 'all'] },
          limit: { type: 'integer', minimum: 1, maximum: 30 },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_related_notes',
      description:
        'Find notes related to a given recordId using local note relationships/similarity.',
      parameters: {
        type: 'object',
        properties: {
          recordId: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 6 },
        },
        required: ['recordId'],
        additionalProperties: false,
      },
    },
  },
];

export function isInboxAskToolName(value: unknown): value is InboxAskToolName {
  return typeof value === 'string' && TOOL_NAME_SET.has(value);
}

export function safeParseToolArguments(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw !== 'string') return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function extractFirstInboxAskToolCall(
  toolCalls: unknown[] | undefined,
  round: number,
): InboxAskToolCall | null {
  if (!toolCalls?.length) return null;

  for (const raw of toolCalls) {
    if (!raw || typeof raw !== 'object') continue;
    const obj = raw as Record<string, unknown>;
    const id = typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : '';
    const fn = obj.function && typeof obj.function === 'object' ? obj.function : null;
    const functionObj = fn as Record<string, unknown> | null;
    const name = typeof functionObj?.name === 'string' ? functionObj.name.trim() : '';
    if (!id || !isInboxAskToolName(name)) continue;

    return {
      toolCallId: id,
      toolName: name,
      arguments: safeParseToolArguments(functionObj?.arguments),
      round,
    };
  }

  return null;
}

export function isToolUnsupportedError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /tools?|tool_choice|tool_calls?|function calling|functions?/i.test(message);
}
