import { create } from 'zustand';

import { MOCK_RECORDS } from './mock';
import { recordRepository } from './repository';
import type { VoiceRecord } from './types';

type RecordStore = {
  records: VoiceRecord[];
  isLoaded: boolean;
  load: () => void;
  addRecord: (record: VoiceRecord) => void;
  deleteRecord: (id: string) => void;
  togglePin: (id: string) => void;
  markAsRead: (id: string) => void;
};

export const useRecordStore = create<RecordStore>((set, get) => ({
  records: [],
  isLoaded: false,

  load: () => {
    let all = recordRepository.getAll();

    //FIXME: Do not forget remove it
    if (all.length === 0) {
      MOCK_RECORDS.forEach((r) => recordRepository.insert(r));
      all = recordRepository.getAll();
    }

    set({ records: all, isLoaded: true });
  },

  addRecord: (record) => {
    recordRepository.insert(record);
    set((s) => ({ records: [record, ...s.records] }));
  },

  deleteRecord: (id) => {
    recordRepository.remove(id);
    set((s) => ({ records: s.records.filter((r) => r.id !== id) }));
  },

  togglePin: (id) => {
    const rec = get().records.find((r) => r.id === id);
    if (!rec) return;
    const nextPinned = !rec.isPinned;
    recordRepository.togglePin(id, nextPinned);
    set((s) => ({
      records: s.records.map((r) => (r.id === id ? { ...r, isPinned: nextPinned } : r)),
    }));
  },

  markAsRead: (id) => {
    recordRepository.markAsRead(id);
    set((s) => ({
      records: s.records.map((r) => (r.id === id ? { ...r, status: 'read' } : r)),
    }));
  },
}));
