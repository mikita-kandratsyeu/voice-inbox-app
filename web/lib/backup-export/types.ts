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
  priority?: 'high' | 'medium' | 'low';
  source?: 'manual' | 'ai';
};

export type ParsedRecord = {
  id: string;
  createdAt: string;
  title: string;
  transcript: string;
  translatedTranscript?: string;
  translationLanguage?: string | null;
  summary?: string;
  classification?: string | null;
  keyPhrases: string[];
  nextSteps: string[];
  folderId: string | null;
  audioPath?: string;
  duration: string;
  tags: string[];
  tasks: ParsedTask[];
  isPinned?: boolean;
  status?: string | null;
};

export type ParsedBackup = {
  /** Backup JSON `version` (currently only v3 is supported in the viewer). */
  backupFormatVersion: 3;
  exportedAt: string;
  folders: ParsedFolder[];
  records: ParsedRecord[];
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
