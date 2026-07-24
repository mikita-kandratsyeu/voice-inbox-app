import { isString } from '@/shared/lib/type-guards';

export type RecordStatus = 'unread' | 'read' | 'archived';

export type RecordClassification = 'personal' | 'work' | 'meeting' | 'idea' | 'other';

export type MeetingSummaryTemplate =
  | 'general'
  | 'standup'
  | 'sales_call'
  | 'one_on_one'
  | 'interview'
  | 'product_meeting'
  | 'lecture';

export type RecordingStatus =
  | 'idle'
  | 'loading_model'
  | 'processing'
  | 'queued'
  | 'paused'
  | 'resumable'
  | 'cancelling'
  | 'done'
  | 'error';

/** Speaker-breakdown tab lifecycle (cloud long meetings). */
export type MeetingDialogueLoadStatus = 'idle' | 'processing' | 'done' | 'failed';

export type WordToken = {
  text: string;
  startMs: number;
  endMs: number;
};

export type TranscriptSegment = {
  id: string;
  startTime: string;
  startMs?: number;
  endMs?: number;
  text: string;
  tokens?: WordToken[];
  /** On-device diarization speaker id (not a real person identity). */
  speakerId?: string;
  /** Detected language code for this segment, when available. */
  language?: string;
  /** True when overlapping speech was detected during diarization. */
  isOverlapping?: boolean;
};

export type TranscriptSpeaker = {
  id: string;
  label: string;
};

export type TaskSource = 'manual' | 'ai';

export type TaskItem = {
  id: string;
  text: string;
  isDone: boolean;
  deadline?: string | null;
  deadlineTime?: string | null;
  priority?: 'high' | 'medium' | 'low';
  source?: TaskSource;
  /** ISO timestamp when the task was marked done. */
  completedAt?: string | null;
  /** Short free-text outcome captured on completion. */
  outcomeText?: string | null;
  /** Follow-up note linked as the task result artifact. */
  outcomeRecordId?: string | null;
  /** Pinned in the All tasks screen. */
  isPinned?: boolean;
};

export const RECORDING_MARK_KINDS = [
  'moment',
  'important',
  'task',
  'quote',
  'decision',
  'question',
  'topic',
] as const;

export type RecordingMarkKind = (typeof RECORDING_MARK_KINDS)[number];

export function isRecordingMarkKind(value: unknown): value is RecordingMarkKind {
  return isString(value) && (RECORDING_MARK_KINDS as readonly string[]).includes(value);
}

/** Time-based bookmark created while recording (offset in the final audio). */
export type RecordingMark = {
  id: string;
  offsetMs: number;
  kind: RecordingMarkKind;
  /** User-visible caption; empty string means unnamed mark. */
  label: string;
};

export type VoiceRecord = {
  id: string;
  title: string;
  transcript: string;
  transcriptSegments?: TranscriptSegment[];
  /** Display labels for on-device diarized speakers (speakerId → label). */
  transcriptSpeakerLabels?: Record<string, string>;
  summary?: string;
  summaryStatus?: RecordingStatus;
  summaryError?: string;
  askAiStatus?: RecordingStatus;
  tasks?: TaskItem[];
  tasksStatus?: RecordingStatus;
  tasksError?: string;
  duration: string;
  durationMs?: number;
  createdAt: string;
  relativeTime?: string;
  status: RecordStatus;
  readAt?: string | null;
  aiStatus?: RecordingStatus;
  transcriptProgress?: number;
  transcriptProgressLabel?: string;
  /** Chunk counts while transcribing; inbox UI uses this for a shorter label than `transcriptProgressLabel`. */
  transcriptProgressSegments?: { current: number; total: number };
  privateAiBatchProgress?: number;
  privateAiBatchPhase?: 'loading_model' | 'processing';
  privateAiBatchProgressLabel?: string;
  /** Wall-clock start for summary/tasks batch UI (time-remaining estimate). */
  privateAiBatchStartedAt?: number;
  isPinned?: boolean;
  tags?: string[];
  recordingMarks?: RecordingMark[];
  classification?: RecordClassification;
  keyPhrases?: string[];
  nextSteps?: string[];
  meetingDialogue?: string;
  /** Maps normalized AI speaker label → user display name. */
  meetingSpeakerLabels?: Record<string, string>;
  meetingSummaryTemplate?: MeetingSummaryTemplate;
  /** Last cloud summarize Redis message id (for meeting-dialogue retry). */
  cloudAiJobId?: string;
  meetingDialogueStatus?: MeetingDialogueLoadStatus;
  meetingDialogueError?: string;
  /** OpenRouter reasoning trace from Smart summary (optional). */
  summaryReasoning?: string;
  /** Model id used for the last summary generation (OpenRouter or local). */
  summaryAiModel?: string;
  /** Server-provided display name for {@link summaryAiModel}. */
  summaryAiModelLabel?: string;
  /** Cloud routing mode used for the last summary (`auto` hides resolved model in UI). */
  summaryAiModelMode?: 'manual' | 'auto';
  summaryTokensPrompt?: number;
  summaryTokensCompletion?: number;
  /** Wall-clock ms for the last summary+tasks generation. */
  summaryGenerationMs?: number;
  translatedTranscript?: string;
  translationLanguage?: string;
  translationStatus?: RecordingStatus;
  audioPath?: string;
  embedding?: number[];
  folderId?: string | null;
  /** Explicit links to other notes (outgoing). */
  linkedRecordIds?: string[];
  /** Local publish metadata (public share link exists). */
  isPublicPublished?: boolean;
  publicShareExpiresAt?: string | null;
  detailsHydrated?: boolean;
};

export type RecordListItem = Omit<VoiceRecord, 'transcriptSegments' | 'embedding'> & {
  transcriptSegments?: TranscriptSegment[];
  embedding?: number[];
  detailsHydrated?: boolean;
};

export type RecordHeavyFields = {
  transcriptSegments: TranscriptSegment[];
  embedding?: number[];
};
