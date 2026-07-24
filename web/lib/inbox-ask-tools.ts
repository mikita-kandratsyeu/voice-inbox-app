import type { CorpusNoteForPrompt } from '@/lib/corpus-notes-prompt';

export const INBOX_ASK_TOOL_NAMES = [
  'search_notes',
  'get_note',
  'list_tasks',
  'get_related_notes',
] as const;

export type InboxAskToolName = (typeof INBOX_ASK_TOOL_NAMES)[number];

export type InboxAskToolCallRequest = {
  toolCallId: string;
  toolName: InboxAskToolName;
  arguments: Record<string, unknown>;
  round: number;
  expiresAt: string;
};

export type InboxAskToolResultPayload =
  | {
      toolName: 'search_notes';
      query: string;
      notes: CorpusNoteForPrompt[];
      totalCorpusCount: number;
      droppedCount: number;
      retrievalMode: 'hybrid' | 'lexical';
    }
  | {
      toolName: 'get_note';
      note:
        | (CorpusNoteForPrompt & {
            tags?: string[];
            status?: string;
          })
        | null;
    }
  | {
      toolName: 'list_tasks';
      tasks: Array<{
        recordId: string;
        title: string;
        text: string;
        isDone: boolean;
        deadline?: string | null;
        priority?: 'high' | 'medium' | 'low';
      }>;
    }
  | {
      toolName: 'get_related_notes';
      recordId: string;
      notes: CorpusNoteForPrompt[];
    };

export type InboxAskToolResult = {
  toolCallId: string;
  toolName: InboxAskToolName;
  round: number;
  result: InboxAskToolResultPayload;
};

export type InboxAskToolStep = {
  toolCallId: string;
  toolName: InboxAskToolName;
  round: number;
  status: 'requested' | 'completed' | 'failed';
};

export const INBOX_ASK_MAX_TOOL_ROUNDS = 3;
export const INBOX_ASK_TOOL_CALL_TTL_MS = 2 * 60 * 1000;
export const INBOX_ASK_TOOL_RESULT_MAX_CHARS = 16_000;

const TOOL_NAME_SET = new Set<string>(INBOX_ASK_TOOL_NAMES);

export function isInboxAskToolName(value: unknown): value is InboxAskToolName {
  return typeof value === 'string' && TOOL_NAME_SET.has(value);
}

export type AiChatToolDefinition = {
  type: 'function';
  function: {
    name: InboxAskToolName;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export const INBOX_ASK_TOOL_DEFINITIONS: AiChatToolDefinition[] = [
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

export function validateInboxAskToolResult(result: InboxAskToolResult): boolean {
  if (!result.toolCallId.trim() || !isInboxAskToolName(result.toolName)) return false;
  if (result.round < 1 || result.round > INBOX_ASK_MAX_TOOL_ROUNDS) return false;
  if (result.result.toolName !== result.toolName) return false;
  return JSON.stringify(result.result).length <= INBOX_ASK_TOOL_RESULT_MAX_CHARS;
}

export function parseStoredInboxAskToolCall(value: unknown): InboxAskToolCallRequest | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const obj = value as Record<string, unknown>;
  const toolCallId = typeof obj.toolCallId === 'string' ? obj.toolCallId.trim() : '';
  const toolName = obj.toolName;
  const round = typeof obj.round === 'number' ? obj.round : NaN;
  const expiresAt = typeof obj.expiresAt === 'string' ? obj.expiresAt : '';
  if (!toolCallId || !isInboxAskToolName(toolName) || !Number.isFinite(round) || !expiresAt) {
    return undefined;
  }
  const args = obj.arguments;
  return {
    toolCallId,
    toolName,
    arguments:
      args && typeof args === 'object' && !Array.isArray(args)
        ? (args as Record<string, unknown>)
        : {},
    round,
    expiresAt,
  };
}
