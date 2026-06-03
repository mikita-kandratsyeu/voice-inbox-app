/** Structured output schemas for OpenAI-compatible `response_format: json_schema`. */

export type PrivateRemoteStructuredSchemaKind =
  | 'summary'
  | 'summary_with_meeting'
  | 'meeting_dialogue'
  | 'ask'
  | 'auto_organize'
  | 'generic';

const AUTO_ORGANIZE_FOLDER_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    icon: { type: 'string' },
    color: { type: 'string' },
  },
  required: ['name', 'icon', 'color'],
  additionalProperties: true,
} as const;

const AUTO_ORGANIZE_ASSIGNMENT_SCHEMA = {
  type: 'object',
  properties: {
    recordId: { type: 'string' },
    folderName: { type: 'string' },
  },
  required: ['recordId', 'folderName'],
  additionalProperties: true,
} as const;

const TASK_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    priority: { type: 'string', enum: ['high', 'medium', 'low'] },
    deadline: { type: ['string', 'null'] },
  },
  required: ['title', 'priority', 'deadline'],
  additionalProperties: true,
} as const;

const SUMMARY_BASE_PROPERTIES = {
  summary: { type: 'string' },
  suggestedTitle: { type: 'string' },
  tasks: { type: 'array', items: TASK_ITEM_SCHEMA },
  tags: { type: 'array', items: { type: 'string' } },
  classification: {
    type: 'string',
    enum: ['personal', 'work', 'meeting', 'idea', 'other'],
  },
  keyPhrases: { type: 'array', items: { type: 'string' } },
  nextSteps: { type: 'array', items: { type: 'string' } },
} as const;

const SCHEMAS: Record<
  PrivateRemoteStructuredSchemaKind,
  { name: string; schema: Record<string, unknown> }
> = {
  summary: {
    name: 'voice_inbox_summary',
    schema: {
      type: 'object',
      properties: SUMMARY_BASE_PROPERTIES,
      required: [
        'summary',
        'suggestedTitle',
        'tasks',
        'tags',
        'classification',
        'keyPhrases',
        'nextSteps',
      ],
      additionalProperties: true,
    },
  },
  summary_with_meeting: {
    name: 'voice_inbox_summary_meeting',
    schema: {
      type: 'object',
      properties: {
        ...SUMMARY_BASE_PROPERTIES,
        meetingDialogueMarkdown: { type: 'string' },
      },
      required: [
        'summary',
        'suggestedTitle',
        'tasks',
        'tags',
        'classification',
        'keyPhrases',
        'nextSteps',
        'meetingDialogueMarkdown',
      ],
      additionalProperties: true,
    },
  },
  meeting_dialogue: {
    name: 'voice_inbox_meeting_dialogue',
    schema: {
      type: 'object',
      properties: {
        meetingDialogueMarkdown: { type: 'string' },
      },
      required: ['meetingDialogueMarkdown'],
      additionalProperties: true,
    },
  },
  ask: {
    name: 'voice_inbox_ask',
    schema: {
      type: 'object',
      properties: {
        answer: { type: 'string' },
      },
      required: ['answer'],
      additionalProperties: true,
    },
  },
  auto_organize: {
    name: 'voice_inbox_auto_organize',
    schema: {
      type: 'object',
      properties: {
        folders: { type: 'array', items: AUTO_ORGANIZE_FOLDER_SCHEMA },
        assignments: { type: 'array', items: AUTO_ORGANIZE_ASSIGNMENT_SCHEMA },
      },
      required: ['folders', 'assignments'],
      additionalProperties: true,
    },
  },
  generic: {
    name: 'voice_inbox_json',
    schema: {
      type: 'object',
      additionalProperties: true,
    },
  },
};

export function buildPrivateRemoteJsonSchemaResponseFormat(
  kind: PrivateRemoteStructuredSchemaKind,
): Record<string, unknown> {
  const entry = SCHEMAS[kind];
  return {
    type: 'json_schema',
    json_schema: {
      name: entry.name,
      strict: false,
      schema: entry.schema,
    },
  };
}
