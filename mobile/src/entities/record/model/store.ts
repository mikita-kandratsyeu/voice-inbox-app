import RNFS from 'react-native-fs';
import { create } from 'zustand';

import { recordRepository } from './repository';
import type { RecordingStatus, TranscriptSegment, VoiceRecord } from './types';

type RecordStore = {
  records: VoiceRecord[];
  isLoaded: boolean;
  load: () => Promise<void>;
  addRecord: (record: VoiceRecord) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  updateAiStatus: (id: string, aiStatus: RecordingStatus, progress?: number) => void;
  updateTranscript: (
    id: string,
    transcript: string,
    segments: TranscriptSegment[],
  ) => Promise<void>;
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
        const exists = await RNFS.exists(record.audioPath);
        if (exists) {
          await RNFS.unlink(record.audioPath);
        }
      } catch (err) {
        console.warn('[store] Failed to delete audio file:', err);
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

  updateAiStatus: (id, aiStatus, progress) => {
    set((s) => ({
      records: s.records.map((r) =>
        r.id === id ? { ...r, aiStatus, transcriptProgress: progress ?? r.transcriptProgress } : r,
      ),
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
}));
