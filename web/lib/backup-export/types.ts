export type ParsedFolder = {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  sortOrder?: number | null;
  createdAt?: string | null;
};

export type ParsedTask = {
  id: string;
  text: string;
  isDone: boolean;
  deadline?: string | null;
  deadlineTime?: string | null;
  priority?: 'high' | 'medium' | 'low';
  source?: 'manual' | 'ai';
};

/** Bookmark created while recording (offset in the final audio). */
export type ParsedRecordingMark = {
  id: string;
  offsetMs: number;
  label: string;
};

export type ParsedTranscriptSegment = {
  id: string;
  startTime?: string;
  startMs?: number;
  endMs?: number;
  text?: string;
  speakerId?: string | null;
  language?: string | null;
};

export type ParsedGraphLayout = {
  id: string;
  layoutKey: string;
  versionNumber: number;
  createdAt: string;
  payload: string;
  name?: string;
};

export type MeetingSummaryTemplate =
  | 'general'
  | 'standup'
  | 'sales_call'
  | 'one_on_one'
  | 'interview'
  | 'product_meeting'
  | 'lecture';

export type ParsedRecord = {
  id: string;
  createdAt: string;
  title: string;
  transcript: string;
  transcriptSegments?: ParsedTranscriptSegment[];
  translatedTranscript?: string;
  translationLanguage?: string | null;
  summary?: string;
  classification?: string | null;
  keyPhrases: string[];
  nextSteps: string[];
  /** Pseudo-diarization / speaker turns (markdown). */
  meetingDialogue?: string;
  meetingSpeakerLabels?: Record<string, string> | null;
  meetingSummaryTemplate?: MeetingSummaryTemplate | null;
  recordingMarks?: ParsedRecordingMark[];
  durationMs?: number;
  folderId: string | null;
  audioPath?: string;
  duration: string;
  tags: string[];
  tasks: ParsedTask[];
  isPinned?: boolean;
  status?: string | null;
  language?: string | null;
  linkedRecordIds?: string[];
};

export type ParsedBackup = {
  /** Backup JSON `version` (v3 or v4). */
  backupFormatVersion: 3 | 4;
  exportedAt: string;
  folders: ParsedFolder[];
  records: ParsedRecord[];
  graphLayouts?: ParsedGraphLayout[];
  /** Present when some folders or records were skipped as invalid but the rest loaded. */
  parseWarnings?: {
    droppedFolderCount: number;
    droppedRecordCount: number;
  };
  /** Directory prefix inside the zip (e.g. `export-123/`) so `audio/…` resolves correctly */
  zipRootPrefix: string;
  /** Read one file from the archive by normalized path (streaming; does not load the whole zip). */
  readFile: (normalizedPathInZip: string) => Promise<Uint8Array | null>;
  /** Close the underlying ZIP reader; safe to call more than once. */
  dispose: () => Promise<void>;
};
