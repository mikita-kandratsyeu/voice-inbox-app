import { create } from 'zustand';

import type { TaskDeadlineSheetPayload } from '../lib/resolveTaskDeadlineSheetPayload';

type TaskDeadlineActionSheetState = {
  visible: boolean;
  payload: TaskDeadlineSheetPayload | null;
  show: (payload: TaskDeadlineSheetPayload) => void;
  hide: () => void;
};

export const useTaskDeadlineActionSheet = create<TaskDeadlineActionSheetState>((set) => ({
  visible: false,
  payload: null,
  show: (payload) => set({ visible: true, payload }),
  hide: () => set({ visible: false, payload: null }),
}));
