import RNFS from 'react-native-fs';
import { create } from 'zustand';

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
  toggleTask: (id: string, taskId: string) => Promise<void>;
  clearAudioPath: (id: string) => Promise<void>;
  setEmbedding: (id: string, embedding: number[] | null) => void;
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
      records: s.records.map((r) =>
        r.id === id
          ? {
              ...r,
              transcriptSegments: heavy.transcriptSegments,
              embedding: heavy.embedding,
              detailsHydrated: true,
            }
          : r,
      ),
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
        const exists = await RNFS.exists(record.audioPath);
        if (exists) {
          await RNFS.unlink(record.audioPath);
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
      records: s.records.map((r) => (r.id === id ? { ...r, isPinned: nextPinned } : r)),
    }));
  },

  markAsRead: async (id) => {
    await recordRepository.markAsRead(id);
    set((s) => ({
      records: s.records.map((r) => (r.id === id ? { ...r, status: 'read' } : r)),
    }));
  },

  archiveRecord: async (id) => {
    set((s) => ({
      records: s.records.map((r) =>
        r.id === id ? { ...r, status: 'archived' as const, isPinned: false } : r,
      ),
    }));
    await recordRepository.archive(id);
  },

  unarchiveRecord: async (id) => {
    set((s) => ({
      records: s.records.map((r) => (r.id === id ? { ...r, status: 'unread' as const } : r)),
    }));
    await recordRepository.unarchive(id);
  },

  updateAiStatus: (id, aiStatus, progress, progressLabel) => {
    set((s) => {
      const next = s.records.map((r) =>
        r.id === id
          ? {
              ...r,
              aiStatus,
              transcriptProgress: progress ?? r.transcriptProgress,
              transcriptProgressLabel: progressLabel ?? r.transcriptProgressLabel,
            }
          : r,
      );
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
      records: s.records.map((r) => (r.id === id ? { ...r, title } : r)),
    }));
  },

  updateTranscript: async (id, transcript, segments) => {
    clearAiPersistDebounce(id);
    await recordRepository.updateTranscript(id, transcript, segments);
    set((s) => {
      const next = s.records.map((r) =>
        r.id === id
          ? {
              ...r,
              transcript,
              transcriptSegments: segments,
              detailsHydrated: true,
              aiStatus: 'done' as RecordingStatus,
              transcriptProgress: 100,
            }
          : r,
      );
      return { records: next, hasActiveAiJobs: computeHasActiveAiJobs(next) };
    });
  },

  setSummaryStatus: (id, summaryStatus) => {
    set((s) => ({
      records: s.records.map((r) => (r.id === id ? { ...r, summaryStatus } : r)),
    }));
  },

  setTasksStatus: (id, tasksStatus) => {
    set((s) => ({
      records: s.records.map((r) => (r.id === id ? { ...r, tasksStatus } : r)),
    }));
  },

  updateSummary: async (id, summary) => {
    await recordRepository.updateSummary(id, summary);
    set((s) => ({
      records: s.records.map((r) => (r.id === id ? { ...r, summary, summaryStatus: 'done' } : r)),
    }));
  },

  updateTasks: async (id, tasks) => {
    await recordRepository.updateTasks(id, tasks);
    set((s) => ({
      records: s.records.map((r) => (r.id === id ? { ...r, tasks, tasksStatus: 'done' } : r)),
    }));
  },

  updateTags: async (id, tags) => {
    await recordRepository.updateTags(id, tags);
    set((s) => ({
      records: s.records.map((r) => (r.id === id ? { ...r, tags } : r)),
    }));
  },

  updateAiExtras: async (id, data) => {
    await recordRepository.updateAiExtras(id, data);
    set((s) => ({
      records: s.records.map((r) =>
        r.id === id
          ? {
              ...r,
              ...(data.classification !== undefined && {
                classification: data.classification ?? undefined,
              }),
              ...(data.keyPhrases !== undefined && { keyPhrases: data.keyPhrases }),
              ...(data.nextSteps !== undefined && { nextSteps: data.nextSteps }),
            }
          : r,
      ),
    }));
  },

  updateTranslation: async (id, translatedTranscript, translationLanguage) => {
    await recordRepository.updateTranslation(id, translatedTranscript, translationLanguage);
    set((s) => ({
      records: s.records.map((r) =>
        r.id === id
          ? {
              ...r,
              translatedTranscript: translatedTranscript ?? undefined,
              translationLanguage: translationLanguage ?? undefined,
            }
          : r,
      ),
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
      records: s.records.map((r) => (r.id === id ? { ...r, tasks: updatedTasks } : r)),
    }));
  },

  clearAudioPath: async (id) => {
    await recordRepository.clearAudioPath(id);
    set((s) => ({
      records: s.records.map((r) => (r.id === id ? { ...r, audioPath: undefined } : r)),
    }));
  },

  setEmbedding: (id, embedding) => {
    set((s) => ({
      records: s.records.map((r) =>
        r.id === id ? { ...r, embedding: embedding ?? undefined, detailsHydrated: true } : r,
      ),
    }));
  },
}));
