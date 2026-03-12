import NitroFS from 'react-native-nitro-fs';
import { create } from 'zustand';

import { recordRepository } from './repository';
import type { RecordingStatus, TaskItem, TranscriptSegment, VoiceRecord } from './types';

type RecordStore = {
  records: VoiceRecord[];
  isLoaded: boolean;
  load: () => Promise<void>;
  addRecord: (record: VoiceRecord) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
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
  toggleTask: (id: string, taskId: string) => Promise<void>;
  clearAudioPath: (id: string) => Promise<void>;
};

export const useRecordStore = create<RecordStore>((set, get) => ({
  records: [],
  isLoaded: false,

  load: async () => {
    const all = await recordRepository.getAll();
    set({ records: all, isLoaded: true });
  },

  addRecord: async (record) => {
    await recordRepository.insert(record);
    set((s) => ({ records: [record, ...s.records] }));
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
    set((s) => ({ records: s.records.filter((r) => r.id !== id) }));
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

  updateAiStatus: (id, aiStatus, progress, progressLabel) => {
    set((s) => ({
      records: s.records.map((r) =>
        r.id === id
          ? {
              ...r,
              aiStatus,
              transcriptProgress: progress ?? r.transcriptProgress,
              transcriptProgressLabel:
                progress === 0 ? undefined : (progressLabel ?? r.transcriptProgressLabel),
            }
          : r,
      ),
    }));
  },

  renameRecord: async (id, title) => {
    await recordRepository.rename(id, title);
    set((s) => ({
      records: s.records.map((r) => (r.id === id ? { ...r, title } : r)),
    }));
  },

  updateTranscript: async (id, transcript, segments) => {
    await recordRepository.updateTranscript(id, transcript, segments);
    set((s) => ({
      records: s.records.map((r) =>
        r.id === id
          ? {
              ...r,
              transcript,
              transcriptSegments: segments,
              aiStatus: 'done',
              transcriptProgress: 100,
            }
          : r,
      ),
    }));
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
}));
