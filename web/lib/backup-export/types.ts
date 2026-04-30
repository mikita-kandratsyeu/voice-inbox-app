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
  exportedAt: string;
  folders: ParsedFolder[];
  records: ParsedRecord[];
  /** Directory prefix inside the zip (e.g. `export-123/`) so `audio/…` resolves correctly */
  zipRootPrefix: string;
  /** Read one file from the archive by normalized path (streaming; does not load the whole zip). */
  readFile: (normalizedPathInZip: string) => Promise<Uint8Array | null>;
  /** Close the underlying ZIP reader; safe to call more than once. */
  dispose: () => Promise<void>;
};
