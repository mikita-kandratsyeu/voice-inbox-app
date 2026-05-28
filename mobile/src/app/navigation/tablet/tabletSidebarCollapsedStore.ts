import { create } from 'zustand';

import { storage } from '@/shared/lib/async-storage/mmkv';

const STORAGE_KEY = 'tablet.sidebar.collapsed';

type TabletSidebarCollapsedState = {
  isCollapsed: boolean;
  toggleCollapsed: () => void;
};

export const useTabletSidebarCollapsedStore = create<TabletSidebarCollapsedState>((set, get) => ({
  isCollapsed: storage.getBoolean(STORAGE_KEY) ?? false,
  toggleCollapsed: () => {
    const isCollapsed = !get().isCollapsed;
    storage.set(STORAGE_KEY, isCollapsed);
    set({ isCollapsed });
  },
}));
