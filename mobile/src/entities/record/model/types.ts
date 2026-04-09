export type RecordStatus = 'unread' | 'read' | 'archived';

export type RecordClassification = 'personal' | 'work' | 'meeting' | 'idea' | 'other';

export type RecordingStatus = 'idle' | 'loading_model' | 'processing' | 'done' | 'error';

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
  priority?: 'high' | 'medium' | 'low';
  source?: TaskSource;
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
  privateAiBatchProgress?: number;
  privateAiBatchPhase?: 'loading_model' | 'processing';
  privateAiBatchProgressLabel?: string;
  isPinned?: boolean;
  tags?: string[];
  classification?: RecordClassification;
  keyPhrases?: string[];
  nextSteps?: string[];
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
