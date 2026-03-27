import { create } from 'zustand';

type RecordingDeeplinkStore = {
  requestShowSaveModal: boolean;
  setRequestShowSaveModal: (value: boolean) => void;
  pauseResumeRequestTick: number;
  requestPauseResumeToggle: () => void;
};

export const useRecordingDeeplinkStore = create<RecordingDeeplinkStore>((set) => ({
  requestShowSaveModal: false,
  setRequestShowSaveModal: (value) => set({ requestShowSaveModal: value }),
  pauseResumeRequestTick: 0,
  requestPauseResumeToggle: () =>
    set((state) => ({ pauseResumeRequestTick: state.pauseResumeRequestTick + 1 })),
}));
