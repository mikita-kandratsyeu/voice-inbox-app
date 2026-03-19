import { create } from 'zustand';

type RecordingDeeplinkStore = {
  requestShowSaveModal: boolean;
  setRequestShowSaveModal: (value: boolean) => void;
};

export const useRecordingDeeplinkStore = create<RecordingDeeplinkStore>((set) => ({
  requestShowSaveModal: false,
  setRequestShowSaveModal: (value) => set({ requestShowSaveModal: value }),
}));
