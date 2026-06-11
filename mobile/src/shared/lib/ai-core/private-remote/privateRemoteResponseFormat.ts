/** Structured output schemas for OpenAI-compatible `response_format: json_schema`. */

export type PrivateRemoteStructuredSchemaKind =
  | 'summary'
  | 'summary_with_meeting'
  | 'meeting_dialogue'
  | 'ask'
  | 'auto_organize'
  | 'auto_organize_consolidate'
  | 'auto_organize_archive'
  | 'digest'
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
    // Outlines / LM Studio require `type` to be a string (no JSON Schema unions).
    deadline: { type: 'string' },
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
  auto_organize_consolidate: {
    name: 'voice_inbox_auto_organize_consolidate',
    schema: {
      type: 'object',
      properties: {
        merges: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sourceFolderNames: { type: 'array', items: { type: 'string' } },
              targetFolderName: { type: 'string' },
              targetIcon: { type: 'string' },
              targetColor: { type: 'string' },
            },
            required: ['sourceFolderNames', 'targetFolderName', 'targetIcon', 'targetColor'],
            additionalProperties: true,
          },
        },
        deleteEmptyFolderNames: { type: 'array', items: { type: 'string' } },
      },
      required: ['merges', 'deleteEmptyFolderNames'],
      additionalProperties: true,
    },
  },
  auto_organize_archive: {
    name: 'voice_inbox_auto_organize_archive',
    schema: {
      type: 'object',
      properties: {
        archiveSuggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              recordId: { type: 'string' },
              reason: { type: 'string' },
            },
            required: ['recordId', 'reason'],
            additionalProperties: true,
          },
        },
      },
      required: ['archiveSuggestions'],
      additionalProperties: true,
    },
  },
  digest: {
    name: 'voice_inbox_digest',
    schema: {
      type: 'object',
      properties: {
        markdown: { type: 'string' },
        highlights: { type: 'array', items: { type: 'string' } },
        risks: { type: 'array', items: { type: 'string' } },
        nextActions: { type: 'array', items: { type: 'string' } },
      },
      required: ['markdown', 'highlights', 'risks', 'nextActions'],
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

export function resolveAutoOrganizeSchemaKind(
  mode: 'full' | 'assign_existing' | 'consolidate_folders' | 'suggest_archive',
): PrivateRemoteStructuredSchemaKind {
  if (mode === 'suggest_archive') return 'auto_organize_archive';
  if (mode === 'consolidate_folders') return 'auto_organize_consolidate';
  return 'auto_organize';
}

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
