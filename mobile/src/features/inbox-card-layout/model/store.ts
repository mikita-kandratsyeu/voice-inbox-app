import { create } from 'zustand';

import { storage } from '@/shared/lib/async-storage/mmkv';

const STORAGE_KEY = 'inbox.cardLayout';

export type InboxCardLayout = 'compact' | 'expanded';

const readStoredLayout = (): InboxCardLayout => {
  const value = storage.getString(STORAGE_KEY);
  return value === 'expanded' ? 'expanded' : 'compact';
};

type InboxCardLayoutState = {
  layout: InboxCardLayout;
  setLayout: (layout: InboxCardLayout) => void;
  toggleLayout: () => void;
};

export const useInboxCardLayoutStore = create<InboxCardLayoutState>((set, get) => ({
  layout: readStoredLayout(),
  setLayout: (layout) => {
    storage.set(STORAGE_KEY, layout);
    set({ layout });
  },
  toggleLayout: () => {
    const next: InboxCardLayout = get().layout === 'compact' ? 'expanded' : 'compact';
    get().setLayout(next);
  },
}));
