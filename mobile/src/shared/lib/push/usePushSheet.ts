import { create } from 'zustand';

type PushSheetState = {
  visible: boolean;
  message: string;
  show: (message: string) => void;
  hide: () => void;
};

export const usePushSheet = create<PushSheetState>((set) => ({
  visible: false,
  message: '',
  show: (message: string) => set({ visible: true, message }),
  hide: () => set({ visible: false, message: '' }),
}));
