import { create } from 'zustand';

import type { PendingTaskFollowUp } from '../lib/types';

type PendingTaskFollowUpStore = {
  pending: PendingTaskFollowUp | null;
  setPending: (pending: PendingTaskFollowUp) => void;
  clearPending: () => void;
};

export const usePendingTaskFollowUpStore = create<PendingTaskFollowUpStore>((set) => ({
  pending: null,
  setPending: (pending) => set({ pending }),
  clearPending: () => set({ pending: null }),
}));

export function consumePendingTaskFollowUp(): PendingTaskFollowUp | null {
  const pending = usePendingTaskFollowUpStore.getState().pending;
  if (!pending) return null;
  usePendingTaskFollowUpStore.getState().clearPending();
  return pending;
}

export function peekPendingTaskFollowUp(): PendingTaskFollowUp | null {
  return usePendingTaskFollowUpStore.getState().pending;
}
