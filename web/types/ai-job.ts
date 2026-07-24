import type { AiOperation } from '@/lib/ai-operation';
import type { AiModelMode } from '@/lib/ai-model-router';
import type { MeetingDialogueTranscriptSegment } from '@/lib/meeting-dialogue-user-prompt';
import type { RecordingMarkForPrompt } from '@/lib/recording-marks-prompt';
import type { AskLinkedNoteForPrompt } from '@/lib/linked-notes-prompt';
import type {
  InboxAskToolCallRequest,
  InboxAskToolResult,
  InboxAskToolStep,
} from '@/lib/inbox-ask-tools';
import type { AutoOrganizeMode, AutoOrganizeTemplate } from '@/lib/auto-organize-types';

export type AiChatToolMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: unknown[] }
  | { role: 'tool'; content: string; tool_call_id: string };

export type MeetingDialogueAuxPayload = {
  transcriptSegments?: MeetingDialogueTranscriptSegment[];
  taskExtractionHint?: string;
};

/** Small message sent via QStash; full input lives in Redis `job-payload:{id}`. */
export type AiJobEnvelope = {
  jobId: string;
  operation: AiOperation;
  deviceId: string;
  messageTtlSeconds: number;
};

export type SummarizeJobPayload = {
  operation: 'transcript_summarize';
  jobId: string;
  deviceId: string;
  messageTtlSeconds: number;
  transcript: string;
  model: string;
  modelMode?: AiModelMode;
  systemPrompt: string;
  clientUserAgent?: string | null;
  pseudoDiarizationEligible: boolean;
  meetingDialogueSystemPrompt?: string;
  meetingDialogueAux?: MeetingDialogueAuxPayload;
  /** Weekly AI generations reserved for this summarize chain. */
  chargedUsageUnits?: number;
};

export type AskJobPayload = {
  operation: 'transcript_ask';
  jobId: string;
  deviceId: string;
  messageTtlSeconds: number;
  transcript: string;
  question: string;
  model: string;
  modelMode?: AiModelMode;
  summary?: string;
  tasks?: { text: string }[];
  priorTurns?: { question: string; answer: string }[];
  clientUserAgent?: string | null;
  recordingMarks?: RecordingMarkForPrompt[];
  linkedNotes?: AskLinkedNoteForPrompt[];
};

export type InboxAskJobPayload = {
  operation: 'inbox_ask';
  jobId: string;
  deviceId: string;
  messageTtlSeconds: number;
  corpusNotes: import('@/lib/corpus-notes-prompt').CorpusNoteForPrompt[];
  question: string;
  model: string;
  modelMode?: AiModelMode;
  priorTurns?: { question: string; answer: string }[];
  clientUserAgent?: string | null;
  toolRound?: number;
  pendingToolCall?: InboxAskToolCallRequest;
  toolResults?: InboxAskToolResult[];
  toolSteps?: InboxAskToolStep[];
  toolMessages?: AiChatToolMessage[];
};

export type GeneralAskJobPayload = {
  operation: 'general_ask';
  jobId: string;
  deviceId: string;
  messageTtlSeconds: number;
  question: string;
  model: string;
  modelMode?: AiModelMode;
  priorTurns?: { question: string; answer: string }[];
  clientUserAgent?: string | null;
};

export type AutoOrganizeJobPayload = {
  operation: 'folder_auto_organize';
  jobId: string;
  deviceId: string;
  messageTtlSeconds: number;
  notesPayload: string;
  clientUserAgent?: string | null;
  mode: AutoOrganizeMode;
  template: AutoOrganizeTemplate;
  /** Weekly AI credits reserved for this auto-organize run. */
  chargedUsageUnits?: number;
};

/** Second QStash worker: pseudo-diarization after main summarize `done`. */
export type MeetingDialogueJobPayload = {
  operation: 'meeting_dialogue';
  jobId: string;
  deviceId: string;
  messageTtlSeconds: number;
  transcript: string;
  model: string;
  meetingDialogueSystemPrompt: string;
  meetingDialogueAux?: MeetingDialogueAuxPayload;
  phase1: {
    suggestedTitle: string;
    keyPhrases?: string[];
    summary: string;
  };
  clientUserAgent?: string | null;
  /** Unique per user-initiated retry (QStash deduplication). */
  retryNonce?: string;
};

export type AiJobPayload =
  | SummarizeJobPayload
  | AskJobPayload
  | InboxAskJobPayload
  | GeneralAskJobPayload
  | AutoOrganizeJobPayload
  | MeetingDialogueJobPayload;
