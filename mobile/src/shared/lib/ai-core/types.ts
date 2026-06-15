import type { MeetingSummaryTemplate } from '@/entities/record';
import type {
  AiOutputLanguage,
  LocalAiModelId,
  PrivateAiProvider,
  PrivateLocalLlmBudget,
  PrivateRemoteOutputBudget,
  SummaryStyle,
  TaskStrictness,
  UserSelectableAIModelId,
} from '@/entities/settings';
import type { AiProcessingResult, ServerMeetingDialogueStatus } from '@/shared/lib/ai-api';

import type { RecordingMarkForPrompt } from './recordingMarksForPrompt';

export type AiTaskIntent = 'summary_tasks' | 'ask';
export type AiProviderKind = 'cloud' | 'local' | 'private_remote';

export type AiLocalGenerationProgressEvent =
  | { kind: 'prepare_model_start' }
  | { kind: 'prepare_model_done' }
  | { kind: 'completion_token'; tokenIndex: number; nPredictBudget: number };

export type AiExecutionContext = {
  selectedAIModel: UserSelectableAIModelId;
  aiModelRoutingMode: 'manual' | 'auto';
  selectedLocalAiModel: LocalAiModelId;
  isLocalLlmModelDownloaded: boolean;
  summaryStyle: SummaryStyle;
  taskStrictness: TaskStrictness;
  aiOutputLanguage: AiOutputLanguage;
  aiExecutionMode: 'smart_hybrid' | 'private_experimental';
  privateLocalLlmBudget: PrivateLocalLlmBudget;
  privateRemoteOutputBudget: PrivateRemoteOutputBudget;
  privateRemotePreferJsonObject: boolean;
  privateCapabilityTier: 'full' | 'limited' | 'unavailable';
  privateAiProvider: PrivateAiProvider;
  privateRemoteBaseUrl: string;
  privateRemoteApiKey: string;
  privateRemoteModel: string;
  /** TTL (seconds) for cloud AI job payloads in API KV; used only in Smart (cloud) mode. */
  cloudMessageTtlSeconds: number;
};

/** Slim segment row for cloud AI (no tokens / ids). */
export type SummaryTaskTranscriptSegment = {
  startMs?: number;
  endMs?: number;
  text: string;
};

export type SummaryTaskRequest = {
  id: string;
  transcript: string;
  /** Sent to cloud for meeting pseudo-diarization pass (timed lines). */
  transcriptSegments?: SummaryTaskTranscriptSegment[];
  processingPreset?: 'meeting';
  meetingSummaryTemplate?: MeetingSummaryTemplate;
  /** Meeting preset without `meetingDialogueMarkdown` (second local pass fills it). */
  omitMeetingDialogue?: boolean;
  existingTaskTexts?: string[];
  taskExtractionHint?: string;
  /** User-placed recording pins (offset + optional label). */
  recordingMarks?: RecordingMarkForPrompt[];
  onLocalGenerationProgress?: (event: AiLocalGenerationProgressEvent) => void;
  /** Aborts cloud POST/poll when the user cancels (Smart mode). */
  abortSignal?: AbortSignal;
  /** Long meeting: poll until async `meeting_dialogue` job finishes (extra timeout). */
  expectAsyncMeetingDialogue?: boolean;
  /** Cloud only: summary/tasks applied while speaker breakdown still runs. */
  onCloudSummaryReady?: (result: AiProcessingResult) => void | Promise<void>;
};

export type AskPriorTurn = { question: string; answer: string };

export type AskAnswerKind = 'plain' | 'list' | 'tasks' | 'decisions';

export type AskEvidenceSource =
  | 'transcript'
  | 'summary'
  | 'tasks'
  | 'recording_mark'
  | 'prior_conversation'
  | 'linked_note';

export type AskEvidence = {
  quote: string;
  source?: AskEvidenceSource;
  offsetMs?: number | null;
  label?: string;
};

export type AskAnswerResult = {
  answer: string;
  answerKind?: AskAnswerKind;
  items?: string[];
  evidence?: AskEvidence[];
  /** Cautious inferences not literally stated in the note. */
  interpretations?: string[];
  suggestedFollowUps?: string[];
  model?: string;
};

export type AskLinkedNoteForPrompt = {
  title: string;
  summary?: string;
  tasks?: Array<{ text: string }>;
  transcriptExcerpt?: string;
};

export type AskRequest = {
  id: string;
  transcript: string;
  question: string;
  priorTurns?: AskPriorTurn[];
  summary?: string;
  tasks?: Array<{ text: string }>;
  linkedNotes?: AskLinkedNoteForPrompt[];
  recordingMarks?: RecordingMarkForPrompt[];
  onLocalGenerationProgress?: (event: AiLocalGenerationProgressEvent) => void;
  abortSignal?: AbortSignal;
};

export type AiOrchestratorSuccess<T> = {
  ok: true;
  provider: AiProviderKind;
  mode: 'smart_hybrid' | 'private_experimental';
  result: T;
  /** Set when cloud poll finishes (meeting speaker-breakdown phase). */
  meetingDialogueStatus?: ServerMeetingDialogueStatus;
};

export type AiOrchestratorFailure = {
  ok: false;
  provider: AiProviderKind;
  mode: 'smart_hybrid' | 'private_experimental';
  limitExceeded?: boolean;
  usage?: { used: number; limit: number; resetAt: string };
  error: string;
};

export type AiOrchestratorResult<T> = AiOrchestratorSuccess<T> | AiOrchestratorFailure;

export type SummaryTaskResult = AiOrchestratorResult<AiProcessingResult>;
export type AskTaskResult = AiOrchestratorResult<AskAnswerResult>;
