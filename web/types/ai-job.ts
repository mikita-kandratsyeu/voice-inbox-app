import type { AiOperation } from '@/lib/ai-operation';
import type { MeetingDialogueTranscriptSegment } from '@/lib/meeting-dialogue-user-prompt';
import type { RecordingMarkForPrompt } from '@/lib/recording-marks-prompt';

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
  summary?: string;
  tasks?: { text: string }[];
  priorTurns?: { question: string; answer: string }[];
  clientUserAgent?: string | null;
  recordingMarks?: RecordingMarkForPrompt[];
};

export type AutoOrganizeJobPayload = {
  operation: 'folder_auto_organize';
  jobId: string;
  deviceId: string;
  messageTtlSeconds: number;
  notesPayload: string;
  clientUserAgent?: string | null;
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
  | AutoOrganizeJobPayload
  | MeetingDialogueJobPayload;
