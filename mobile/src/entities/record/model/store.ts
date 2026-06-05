import { create } from 'zustand';

import { folderRepository } from '@/entities/folder/model/repository';
import { loadAskAiInboxStatusesByRecordId } from '@/features/ask-ai/model/askAiSessionDb';
import { waitForDb } from '@/shared/lib';
import { NitroFS } from '@/shared/lib/fs';

import { isRecordAiOperating } from '../lib/isRecordAiOperating';
import { recordRepository } from './repository';
import type {
  MeetingDialogueLoadStatus,
  RecordClassification,
  RecordingMark,
  RecordingStatus,
  RecordListItem,
  TaskItem,
  TranscriptSegment,
  VoiceRecord,
} from './types';

const AI_PERSIST_DEBOUNCE_MS = 750;
const aiPersistTimers = new Map<string, ReturnType<typeof setTimeout>>();

const flushPersistAiState = (id: string, aiStatus: RecordingStatus, transcriptProgress: number) => {
  void waitForDb()
    .then(() => recordRepository.persistAiState(id, aiStatus, transcriptProgress))
    .catch((err) => {
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

const computeHasActiveAiJobs = (records: Array<VoiceRecord | RecordListItem>): boolean =>
  records.some(isRecordAiOperating);

const isTerminalAiStatus = (status: RecordingStatus): boolean =>
  status === 'idle' || status === 'done' || status === 'error' || status === 'resumable';

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

let recordListLoadInFlight: Promise<void> | null = null;
const recordDetailsHydrateById = new Map<string, Promise<void>>();

function scheduleTaskDeadlineNotificationSync(): void {
  void import('@/features/task-deadline-notifications')
    .then((mod) => mod.scheduleTaskDeadlineNotificationSync())
    .catch(() => {});
}

type RecordStore = {
  records: RecordListItem[];
  hasActiveAiJobs: boolean;
  isLoaded: boolean;
  load: () => Promise<void>;
  hydrateRecordDetails: (id: string) => Promise<void>;
  addRecord: (record: VoiceRecord) => Promise<void>;
  /** Soft-delete: record leaves inbox; audio stays on disk until purge. */
  moveRecordToTrash: (id: string) => Promise<void>;
  /** Restore a trashed record (from Trash screen). */
  restoreRecordFromTrash: (id: string) => Promise<void>;
  /** Permanently delete (unlink audio + DB). Used for trash expiry, Trash screen, wipe flows. */
  purgeRecordPermanently: (id: string) => Promise<void>;
  /** Permanently delete records whose trash retention has expired. */
  purgeExpiredTrashRecords: () => Promise<number>;
  togglePin: (id: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAsUnread: (id: string) => Promise<void>;
  archiveRecord: (id: string) => Promise<void>;
  unarchiveRecord: (id: string) => Promise<void>;
  updateAiStatus: (
    id: string,
    aiStatus: RecordingStatus,
    progress?: number,
    progressLabel?: string,
    transcriptionSegments?: { current: number; total: number } | null,
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
  setMeetingDialogueStatus: (id: string, status: MeetingDialogueLoadStatus) => void;
  setMeetingDialogueError: (id: string, error?: string) => void;
  setPrivateAiBatchUi: (
    id: string,
    patch: {
      privateAiBatchProgress?: number;
      privateAiBatchPhase?: 'loading_model' | 'processing';
      privateAiBatchProgressLabel?: string;
      privateAiBatchStartedAt?: number;
    },
  ) => void;
  clearPrivateAiBatchUi: (id: string) => void;
  updateSummary: (id: string, summary: string) => Promise<void>;
  updateTasks: (id: string, tasks: TaskItem[]) => Promise<void>;
  updateTags: (id: string, tags: string[]) => Promise<void>;
  updateRecordingMarks: (id: string, marks: RecordingMark[]) => Promise<void>;
  updateAiExtras: (
    id: string,
    data: {
      classification?: RecordClassification | null;
      keyPhrases?: string[];
      nextSteps?: string[];
      meetingDialogue?: string | null;
      meetingSpeakerLabels?: Record<string, string> | null;
      cloudAiJobId?: string | null;
      summaryReasoning?: string | null;
      summaryAiModel?: string | null;
      summaryAiModelLabel?: string | null;
      summaryTokensPrompt?: number | null;
      summaryTokensCompletion?: number | null;
      summaryGenerationMs?: number | null;
    },
  ) => Promise<void>;
  promoteNextStepToTask: (id: string, tasks: TaskItem[], nextSteps: string[]) => Promise<void>;
  updateTranslation: (
    id: string,
    translatedTranscript: string | null,
    translationLanguage: string | null,
  ) => Promise<void>;
  setTranslationStatus: (id: string, status: RecordingStatus) => void;
  setAskAiStatus: (id: string, status: RecordingStatus | undefined) => void;
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
    if (recordListLoadInFlight) {
      return recordListLoadInFlight;
    }
    recordListLoadInFlight = (async () => {
      try {
        if (__DEV__) console.warn('[recordStore] load: refetching records from DB');

        const all = await recordRepository.getAllList();
        const transcriptById = new Map(all.map((r) => [r.id, r.transcript]));
        const askAiById = await loadAskAiInboxStatusesByRecordId(transcriptById);
        const merged = all.map((r) => {
          const st = askAiById.get(r.id);
          if (!st) return r;
          return { ...r, askAiStatus: st };
        });

        set({
          records: merged,
          hasActiveAiJobs: computeHasActiveAiJobs(merged),
          isLoaded: true,
        });
        scheduleTaskDeadlineNotificationSync();
      } finally {
        recordListLoadInFlight = null;
      }
    })();
    return recordListLoadInFlight;
  },

  hydrateRecordDetails: async (id) => {
    const existing = get().records.find((r) => r.id === id);

    if (!existing || existing.detailsHydrated) return;

    const inFlight = recordDetailsHydrateById.get(id);

    if (inFlight) {
      return inFlight;
    }

    const promise = (async () => {
      try {
        const heavy = await recordRepository.getHeavyFields(id);
        set((s) => ({
          records: updateRecord(s.records, id, {
            transcriptSegments: heavy.transcriptSegments,
            embedding: heavy.embedding,
            detailsHydrated: true,
          }),
        }));
      } finally {
        recordDetailsHydrateById.delete(id);
      }
    })();

    recordDetailsHydrateById.set(id, promise);
    return promise;
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

  moveRecordToTrash: async (id) => {
    await recordRepository.moveToTrash(id);
    set((s) => {
      const next = s.records.filter((r) => r.id !== id);
      return { records: next, hasActiveAiJobs: computeHasActiveAiJobs(next) };
    });
    scheduleTaskDeadlineNotificationSync();
  },

  restoreRecordFromTrash: async (id) => {
    await recordRepository.restoreFromTrash(id);
    await get().load();
  },

  purgeRecordPermanently: async (id) => {
    const audioPath =
      get().records.find((r) => r.id === id)?.audioPath ??
      (await recordRepository.peekAudioPathById(id));
    if (audioPath) {
      try {
        const exists = await NitroFS.exists(audioPath);
        if (exists) {
          await NitroFS.unlink(audioPath);
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
    scheduleTaskDeadlineNotificationSync();
  },

  purgeExpiredTrashRecords: async () => {
    const ids = await recordRepository.listIdsReadyForPermanentPurge();
    if (ids.length === 0) return 0;
    for (const id of ids) {
      await get().purgeRecordPermanently(id);
    }
    return ids.length;
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
    const readAt = await recordRepository.markAsRead(id);
    set((s) => ({
      records: updateRecord(s.records, id, { status: 'read', readAt }),
    }));
  },

  markAsUnread: async (id) => {
    const record = get().records.find((r) => r.id === id);
    if (!record || record.status === 'archived') return;
    await recordRepository.markAsUnread(id);
    set((s) => ({
      records: updateRecord(s.records, id, { status: 'unread', readAt: null }),
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
      records: updateRecord(s.records, id, { status: 'unread', readAt: null }),
    }));
    await recordRepository.unarchive(id);
  },

  updateAiStatus: (id, aiStatus, progress, progressLabel, transcriptionSegments) => {
    set((s) => {
      const existing = s.records.find((r) => r.id === id);
      if (!existing) return s;
      const patch: Partial<RecordListItem> = { aiStatus };
      if (progress !== undefined) patch.transcriptProgress = progress;
      const terminal = isTerminalAiStatus(aiStatus);
      if (terminal) {
        patch.transcriptProgressLabel = undefined;
        patch.transcriptProgressSegments = undefined;
      } else {
        if (progressLabel !== undefined) {
          patch.transcriptProgressLabel = progressLabel;
        }
        if (transcriptionSegments !== undefined) {
          patch.transcriptProgressSegments =
            transcriptionSegments === null ? undefined : transcriptionSegments;
        }
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
    const terminal = isTerminalAiStatus(aiStatus);
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
    set((s) => {
      const next = updateRecord(s.records, id, { summaryStatus });
      return { records: next, hasActiveAiJobs: computeHasActiveAiJobs(next) };
    });
  },

  setTasksStatus: (id, tasksStatus) => {
    set((s) => {
      const next = updateRecord(s.records, id, { tasksStatus });
      return { records: next, hasActiveAiJobs: computeHasActiveAiJobs(next) };
    });
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

  setMeetingDialogueStatus: (id, meetingDialogueStatus) => {
    set((s) => {
      const next = updateRecord(s.records, id, { meetingDialogueStatus });
      return { records: next, hasActiveAiJobs: computeHasActiveAiJobs(next) };
    });
  },

  setMeetingDialogueError: (id, meetingDialogueError) => {
    set((s) => ({
      records: updateRecord(s.records, id, { meetingDialogueError }),
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
        privateAiBatchStartedAt: undefined,
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
    scheduleTaskDeadlineNotificationSync();
  },

  updateTags: async (id, tags) => {
    await recordRepository.updateTags(id, tags);
    set((s) => ({
      records: updateRecord(s.records, id, { tags }),
    }));
  },

  updateRecordingMarks: async (id, marks) => {
    await recordRepository.updateRecordingMarks(id, marks);
    set((s) => ({
      records: updateRecord(s.records, id, { recordingMarks: marks }),
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
      if (data.meetingDialogue !== undefined) {
        patch.meetingDialogue = data.meetingDialogue?.trim()
          ? data.meetingDialogue.trim()
          : undefined;
      }
      if (data.meetingSpeakerLabels !== undefined) {
        patch.meetingSpeakerLabels =
          data.meetingSpeakerLabels && Object.keys(data.meetingSpeakerLabels).length > 0
            ? data.meetingSpeakerLabels
            : undefined;
      }
      if (data.cloudAiJobId !== undefined) {
        patch.cloudAiJobId = data.cloudAiJobId?.trim() ? data.cloudAiJobId.trim() : undefined;
      }
      if (data.summaryReasoning !== undefined) {
        patch.summaryReasoning = data.summaryReasoning?.trim()
          ? data.summaryReasoning.trim()
          : undefined;
      }
      if (data.summaryAiModel !== undefined) {
        patch.summaryAiModel = data.summaryAiModel?.trim() ? data.summaryAiModel.trim() : undefined;
      }
      if (data.summaryAiModelLabel !== undefined) {
        patch.summaryAiModelLabel = data.summaryAiModelLabel?.trim()
          ? data.summaryAiModelLabel.trim()
          : undefined;
      }
      if (data.summaryTokensPrompt !== undefined) {
        patch.summaryTokensPrompt = data.summaryTokensPrompt ?? undefined;
      }
      if (data.summaryTokensCompletion !== undefined) {
        patch.summaryTokensCompletion = data.summaryTokensCompletion ?? undefined;
      }
      if (data.summaryGenerationMs !== undefined) {
        patch.summaryGenerationMs = data.summaryGenerationMs ?? undefined;
      }
      return { records: updateRecord(s.records, id, patch) };
    });
  },

  promoteNextStepToTask: async (id, tasks, nextSteps) => {
    await recordRepository.updateTasks(id, tasks);
    await recordRepository.updateAiExtras(id, { nextSteps });
    set((s) => ({
      records: updateRecord(s.records, id, {
        tasks,
        nextSteps,
        tasksStatus: 'done',
        tasksError: undefined,
      }),
    }));
    scheduleTaskDeadlineNotificationSync();
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
    set((s) => {
      const next = updateRecord(s.records, id, { translationStatus });
      return { records: next, hasActiveAiJobs: computeHasActiveAiJobs(next) };
    });
  },

  setAskAiStatus: (id, status) => {
    set((s) => {
      const askAiStatus = status === 'processing' || status === 'error' ? status : undefined;
      const next = updateRecord(s.records, id, { askAiStatus });
      return { records: next, hasActiveAiJobs: computeHasActiveAiJobs(next) };
    });
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
    scheduleTaskDeadlineNotificationSync();
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
