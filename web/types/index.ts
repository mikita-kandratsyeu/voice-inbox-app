import type {
  AutoOrganizeArchiveResult,
  AutoOrganizeConsolidateResult,
  AutoOrganizeFoldersResult,
  AutoOrganizeMode,
} from '@/lib/auto-organize-types';

import type { AiModelMode } from '@/lib/ai-model-router';
import type { InboxAskToolCallRequest, InboxAskToolStep } from '@/lib/inbox-ask-tools';

export type MessageStatus = 'processing' | 'needs_tool' | 'done' | 'error';

/** Async meeting-dialogue pass (Pro meeting notes); set when `status` is already `done`. */
export type MeetingDialogueStatus = 'processing' | 'done' | 'failed' | 'skipped';

export type RecordClassification = 'personal' | 'work' | 'meeting' | 'idea' | 'other';

export type AiResult = {
  summary: string;
  suggestedTitle: string;
  tasks: Array<{
    title: string;
    priority: 'high' | 'medium' | 'low';
    deadline: string | null;
    deadlineTime?: string | null;
  }>;
  tags: string[];
  classification?: RecordClassification;
  keyPhrases?: string[];
  nextSteps?: string[];
  /** Pro + meeting pseudo-diarization; plain text, optional. */
  meetingDialogueMarkdown?: string;
  /** OpenRouter reasoning trace (Smart summary job); optional. */
  reasoning?: string;
  /** Tokens charged for this summary job (main + optional meeting pass). */
  tokenUsage?: { prompt: number; completion: number };
};

/**
 * Adaptive polling hints for mobile client optimization.
 * Helps client adjust polling intervals based on job progress.
 */
export type PollingHints = {
  /** Current progress percentage (0-100) */
  progress?: number;
  /** Recommended next poll interval in milliseconds */
  retryAfterMs?: number;
  /** Estimated milliseconds until completion */
  estimatedCompletionMs?: number;
};

export type Message =
  | {
      id: string;
      status: 'processing';
      model?: string;
      modelLabel?: string;
      modelMode?: AiModelMode;
      /** Adaptive polling hints for client optimization */
      progress?: number;
      retryAfterMs?: number;
      estimatedCompletionMs?: number;
    }
  | {
      id: string;
      status: 'done';
      model?: string;
      modelLabel?: string;
      modelMode?: AiModelMode;
      summary: string;
      suggestedTitle: string;
      tasks: AiResult['tasks'];
      tags: string[];
      classification?: RecordClassification;
      keyPhrases?: string[];
      nextSteps?: string[];
      meetingDialogueMarkdown?: string;
      meetingDialogueStatus?: MeetingDialogueStatus;
      reasoning?: string;
      tokenUsage?: { prompt: number; completion: number };
    }
  | {
      id: string;
      status: 'error';
      error: string;
      model?: string;
      modelLabel?: string;
      modelMode?: AiModelMode;
    };

export type AskMessage =
  | {
      id: string;
      status: 'processing';
      model?: string;
      modelLabel?: string;
      modelMode?: AiModelMode;
      /** Adaptive polling hints for client optimization */
      progress?: number;
      retryAfterMs?: number;
      estimatedCompletionMs?: number;
    }
  | {
      id: string;
      status: 'needs_tool';
      model?: string;
      modelLabel?: string;
      modelMode?: AiModelMode;
      toolCall: InboxAskToolCallRequest;
      toolSteps?: InboxAskToolStep[];
    }
  | {
      id: string;
      status: 'done';
      model?: string;
      modelLabel?: string;
      modelMode?: AiModelMode;
      answer: string;
      answerKind?: 'plain' | 'list' | 'tasks' | 'decisions';
      items?: string[];
      suggestedFollowUps?: string[];
      interpretations?: string[];
      toolSteps?: InboxAskToolStep[];
      evidence?: Array<{
        quote: string;
        source?:
          | 'transcript'
          | 'summary'
          | 'tasks'
          | 'recording_mark'
          | 'prior_conversation'
          | 'linked_note';
        offsetMs?: number | null;
        label?: string;
      }>;
    }
  | {
      id: string;
      status: 'error';
      error: string;
      model?: string;
      modelLabel?: string;
      modelMode?: AiModelMode;
    };

export type {
  AutoOrganizeArchiveResult,
  AutoOrganizeConsolidateResult,
  AutoOrganizeFoldersResult,
  AutoOrganizeMode,
  AutoOrganizeTemplate,
} from '@/lib/auto-organize-types';

export type AutoOrganizeResult =
  | AutoOrganizeFoldersResult
  | AutoOrganizeConsolidateResult
  | AutoOrganizeArchiveResult;

export type AutoOrganizeMessage =
  | {
      id: string;
      status: 'processing';
      /** Adaptive polling hints for client optimization */
      progress?: number;
      retryAfterMs?: number;
      estimatedCompletionMs?: number;
    }
  | { id: string; status: 'done'; result: AutoOrganizeResult; mode: AutoOrganizeMode }
  | { id: string; status: 'error'; error: string };
