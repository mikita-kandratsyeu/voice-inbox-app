import { create } from 'zustand';

import type { InboxFilterStatus } from '@/features/inbox-filters';

type TabletInboxSidebarState = {
  filterStatus: InboxFilterStatus;
  setFilterStatus: (filterStatus: InboxFilterStatus) => void;
};

export const useTabletInboxSidebarStore = create<TabletInboxSidebarState>((set) => ({
  filterStatus: 'all',
  setFilterStatus: (filterStatus) => set({ filterStatus }),
}));
