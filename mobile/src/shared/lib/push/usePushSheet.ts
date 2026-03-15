import { create } from 'zustand';

export type PushSheetType = 'policy_update' | 'limit_exceeded';

type PushSheetState = {
  visible: boolean;
  message: string;
  type: PushSheetType;
  show: (message: string, options?: { type?: PushSheetType }) => void;
  hide: () => void;
};

export const usePushSheet = create<PushSheetState>((set) => ({
  visible: false,
  message: '',
  type: 'policy_update',
  show: (message: string, options?: { type?: PushSheetType }) =>
    set({
      visible: true,
      message,
      type: options?.type ?? 'policy_update',
    }),
  hide: () => set({ visible: false, message: '', type: 'policy_update' }),
}));
