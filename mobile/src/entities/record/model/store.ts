import { create } from 'zustand';

import { folderRepository } from '@/entities/folder/model/repository';
import { NitroFS } from '@/shared/lib/fs';

import { recordRepository } from './repository';
import type {
  RecordClassification,
  RecordingStatus,
  RecordListItem,
  TaskItem,
  TranscriptSegment,
  VoiceRecord,
} from './types';

const AI_PERSIST_DEBOUNCE_MS = 750;
const aiPersistTimers = new Map<string, ReturnType<typeof setTimeout>>();

const flushPersistAiState = (id: string, aiStatus: RecordingStatus, transcriptProgress: number) => {
  void recordRepository.persistAiState(id, aiStatus, transcriptProgress).catch((err) => {
    if (__DEV__) console.warn('[recordStore] persistAiState failed', id, err);
  });
};

const schedulePersistAiState = (
  id: string,
  aiStatus: RecordingStatus,
  transcriptProgress: number,
  immediate: boolean,
) => {
  const prev = aiPersistTimers.get(id);
  if (prev) clearTimeout(prev);

  if (immediate) {
    aiPersistTimers.delete(id);
    flushPersistAiState(id, aiStatus, transcriptProgress);
    return;
  }

  const t = setTimeout(() => {
    aiPersistTimers.delete(id);
    flushPersistAiState(id, aiStatus, transcriptProgress);
  }, AI_PERSIST_DEBOUNCE_MS);
  aiPersistTimers.set(id, t);
};

const clearAiPersistDebounce = (id: string) => {
  const t = aiPersistTimers.get(id);
  if (t) clearTimeout(t);
  aiPersistTimers.delete(id);
};

const isActiveAiStatus = (status?: RecordingStatus): boolean =>
  status === 'loading_model' || status === 'processing';

const computeHasActiveAiJobs = (records: Array<VoiceRecord | RecordListItem>): boolean =>
  records.some((r) => isActiveAiStatus(r.aiStatus));

const updateRecord = (
  records: RecordListItem[],
  id: string,
  patch: Partial<RecordListItem>,
): RecordListItem[] => {
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) return records;
  const next = [...records];
  next[idx] = { ...next[idx], ...patch };
  return next;
};

type RecordStore = {
  records: RecordListItem[];
  hasActiveAiJobs: boolean;
  isLoaded: boolean;
  load: () => Promise<void>;
  hydrateRecordDetails: (id: string) => Promise<void>;
  addRecord: (record: VoiceRecord) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  archiveRecord: (id: string) => Promise<void>;
  unarchiveRecord: (id: string) => Promise<void>;
  updateAiStatus: (
    id: string,
    aiStatus: RecordingStatus,
    progress?: number,
    progressLabel?: string,
  ) => void;
  renameRecord: (id: string, title: string) => Promise<void>;
  updateTranscript: (
    id: string,
    transcript: string,
    segments: TranscriptSegment[],
  ) => Promise<void>;
  setSummaryStatus: (id: string, status: RecordingStatus) => void;
  setTasksStatus: (id: string, status: RecordingStatus) => void;
  setSummaryError: (id: string, error?: string) => void;
  setTasksError: (id: string, error?: string) => void;
  setPrivateAiBatchUi: (
    id: string,
    patch: {
      privateAiBatchProgress?: number;
      privateAiBatchPhase?: 'loading_model' | 'processing';
      privateAiBatchProgressLabel?: string;
    },
  ) => void;
  clearPrivateAiBatchUi: (id: string) => void;
  updateSummary: (id: string, summary: string) => Promise<void>;
  updateTasks: (id: string, tasks: TaskItem[]) => Promise<void>;
  updateTags: (id: string, tags: string[]) => Promise<void>;
  updateAiExtras: (
    id: string,
    data: {
      classification?: RecordClassification | null;
      keyPhrases?: string[];
      nextSteps?: string[];
    },
  ) => Promise<void>;
  updateTranslation: (
    id: string,
    translatedTranscript: string | null,
    translationLanguage: string | null,
  ) => Promise<void>;
  setTranslationStatus: (id: string, status: RecordingStatus) => void;
  toggleTask: (id: string, taskId: string) => Promise<void>;
  clearAudioPath: (id: string) => Promise<void>;
  setEmbedding: (id: string, embedding: number[] | null) => void;
  setRecordFolder: (id: string, folderId: string | null) => Promise<void>;
  detachRecordsFromDeletedFolder: (folderId: string) => void;
};

export const useRecordStore = create<RecordStore>((set, get) => ({
  records: [],
  hasActiveAiJobs: false,
  isLoaded: false,

  load: async () => {
    if (__DEV__) console.warn('[recordStore] load: refetching records from DB');
    const all = await recordRepository.getAllList();
    set({ records: all, hasActiveAiJobs: computeHasActiveAiJobs(all), isLoaded: true });
  },

  hydrateRecordDetails: async (id) => {
    const existing = get().records.find((r) => r.id === id);
    if (!existing || existing.detailsHydrated) return;

    const heavy = await recordRepository.getHeavyFields(id);
    set((s) => ({
      records: updateRecord(s.records, id, {
        transcriptSegments: heavy.transcriptSegments,
        embedding: heavy.embedding,
        detailsHydrated: true,
      }),
    }));
  },

  addRecord: async (record) => {
    await recordRepository.insert(record);
    const nextRecord: RecordListItem = {
      ...record,
      transcriptSegments: undefined,
      embedding: undefined,
      detailsHydrated: false,
    };
    set((s) => {
      const next = [nextRecord, ...s.records];
      return { records: next, hasActiveAiJobs: computeHasActiveAiJobs(next) };
    });
  },

  deleteRecord: async (id) => {
    const record = get().records.find((r) => r.id === id);
    if (record?.audioPath) {
      try {
        const exists = await NitroFS.exists(record.audioPath);
        if (exists) {
          await NitroFS.unlink(record.audioPath);
        }
      } catch (err) {
        if (__DEV__) console.warn('[store] Failed to delete audio file:', err);
      }
    }
    await recordRepository.remove(id);
    set((s) => {
      const next = s.records.filter((r) => r.id !== id);
      return { records: next, hasActiveAiJobs: computeHasActiveAiJobs(next) };
    });
  },

  togglePin: async (id) => {
    const rec = get().records.find((r) => r.id === id);
    if (!rec) return;
    const nextPinned = !rec.isPinned;
    await recordRepository.togglePin(id, nextPinned);
    set((s) => ({
      records: updateRecord(s.records, id, { isPinned: nextPinned }),
    }));
  },

  markAsRead: async (id) => {
    await recordRepository.markAsRead(id);
    set((s) => ({
      records: updateRecord(s.records, id, { status: 'read' }),
    }));
  },

  archiveRecord: async (id) => {
    set((s) => ({
      records: updateRecord(s.records, id, { status: 'archived', isPinned: false }),
    }));
    await recordRepository.archive(id);
  },

  unarchiveRecord: async (id) => {
    set((s) => ({
      records: updateRecord(s.records, id, { status: 'unread' }),
    }));
    await recordRepository.unarchive(id);
  },

  updateAiStatus: (id, aiStatus, progress, progressLabel) => {
    set((s) => {
      const existing = s.records.find((r) => r.id === id);
      if (!existing) return s;
      const patch: Partial<RecordListItem> = { aiStatus };
      if (progress !== undefined) patch.transcriptProgress = progress;
      if (progressLabel !== undefined) {
        patch.transcriptProgressLabel = progressLabel;
      } else if (aiStatus === 'idle' || aiStatus === 'done' || aiStatus === 'error') {
        patch.transcriptProgressLabel = undefined;
      }
      const next = updateRecord(s.records, id, patch);
      return { records: next, hasActiveAiJobs: computeHasActiveAiJobs(next) };
    });

    const updated = get().records.find((r) => r.id === id);
    if (!updated) {
      if (__DEV__) console.warn('[recordStore] updateAiStatus: record not in store', id);
      return;
    }

    const p = updated.transcriptProgress ?? 0;
    const terminal = aiStatus === 'idle' || aiStatus === 'error' || aiStatus === 'done';
    schedulePersistAiState(id, aiStatus, p, terminal);
  },

  renameRecord: async (id, title) => {
    await recordRepository.rename(id, title);
    set((s) => ({
      records: updateRecord(s.records, id, { title }),
    }));
  },

  updateTranscript: async (id, transcript, segments) => {
    clearAiPersistDebounce(id);
    await recordRepository.updateTranscript(id, transcript, segments);
    set((s) => {
      const next = updateRecord(s.records, id, {
        transcript,
        transcriptSegments: segments,
        detailsHydrated: true,
        aiStatus: 'done' as RecordingStatus,
        transcriptProgress: 100,
      });
      return { records: next, hasActiveAiJobs: computeHasActiveAiJobs(next) };
    });
  },

  setSummaryStatus: (id, summaryStatus) => {
    set((s) => ({
      records: updateRecord(s.records, id, { summaryStatus }),
    }));
  },

  setTasksStatus: (id, tasksStatus) => {
    set((s) => ({
      records: updateRecord(s.records, id, { tasksStatus }),
    }));
  },

  setSummaryError: (id, summaryError) => {
    set((s) => ({
      records: updateRecord(s.records, id, { summaryError }),
    }));
  },

  setTasksError: (id, tasksError) => {
    set((s) => ({
      records: updateRecord(s.records, id, { tasksError }),
    }));
  },

  setPrivateAiBatchUi: (id, patch) => {
    set((s) => ({
      records: updateRecord(s.records, id, patch),
    }));
  },

  clearPrivateAiBatchUi: (id) => {
    set((s) => ({
      records: updateRecord(s.records, id, {
        privateAiBatchProgress: undefined,
        privateAiBatchPhase: undefined,
        privateAiBatchProgressLabel: undefined,
      }),
    }));
  },

  updateSummary: async (id, summary) => {
    await recordRepository.updateSummary(id, summary);
    set((s) => ({
      records: updateRecord(s.records, id, {
        summary,
        summaryStatus: 'done',
        summaryError: undefined,
      }),
    }));
  },

  updateTasks: async (id, tasks) => {
    await recordRepository.updateTasks(id, tasks);
    set((s) => ({
      records: updateRecord(s.records, id, { tasks, tasksStatus: 'done', tasksError: undefined }),
    }));
  },

  updateTags: async (id, tags) => {
    await recordRepository.updateTags(id, tags);
    set((s) => ({
      records: updateRecord(s.records, id, { tags }),
    }));
  },

  updateAiExtras: async (id, data) => {
    await recordRepository.updateAiExtras(id, data);
    set((s) => {
      const patch: Partial<RecordListItem> = {};
      if (data.classification !== undefined)
        patch.classification = data.classification ?? undefined;
      if (data.keyPhrases !== undefined) patch.keyPhrases = data.keyPhrases;
      if (data.nextSteps !== undefined) patch.nextSteps = data.nextSteps;
      return { records: updateRecord(s.records, id, patch) };
    });
  },

  updateTranslation: async (id, translatedTranscript, translationLanguage) => {
    await recordRepository.updateTranslation(id, translatedTranscript, translationLanguage);
    set((s) => ({
      records: updateRecord(s.records, id, {
        translatedTranscript: translatedTranscript ?? undefined,
        translationLanguage: translationLanguage ?? undefined,
        translationStatus: translatedTranscript ? 'done' : 'idle',
      }),
    }));
  },

  setTranslationStatus: (id, translationStatus) => {
    set((s) => ({
      records: updateRecord(s.records, id, { translationStatus }),
    }));
  },

  toggleTask: async (id, taskId) => {
    const record = get().records.find((r) => r.id === id);
    if (!record?.tasks) return;
    const updatedTasks: TaskItem[] = record.tasks.map((t) =>
      t.id === taskId ? { ...t, isDone: !t.isDone } : t,
    );
    await recordRepository.updateTasks(id, updatedTasks);
    set((s) => ({
      records: updateRecord(s.records, id, { tasks: updatedTasks }),
    }));
  },

  clearAudioPath: async (id) => {
    await recordRepository.clearAudioPath(id);
    set((s) => ({
      records: updateRecord(s.records, id, { audioPath: undefined }),
    }));
  },

  setEmbedding: (id, embedding) => {
    set((s) => ({
      records: updateRecord(s.records, id, {
        embedding: embedding ?? undefined,
        detailsHydrated: true,
      }),
    }));
  },

  setRecordFolder: async (id, folderId) => {
    await folderRepository.updateRecordFolder(id, folderId);
    set((s) => ({
      records: updateRecord(s.records, id, { folderId }),
    }));
  },

  detachRecordsFromDeletedFolder: (folderId) => {
    set((s) => ({
      records: s.records.map((r) => (r.folderId === folderId ? { ...r, folderId: null } : r)),
    }));
  },
}));
