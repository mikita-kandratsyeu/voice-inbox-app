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
