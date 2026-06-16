import { create } from 'zustand';

type PublishedNoteInboxSyncState = {
  revision: number;
};

export const usePublishedNoteInboxSyncStore = create<PublishedNoteInboxSyncState>(() => ({
  revision: 0,
}));

/** Bumps inbox published-map revision so list chips reload from SQLite. */
export function notifyPublishedNoteInboxChanged(): void {
  usePublishedNoteInboxSyncStore.setState((state) => ({ revision: state.revision + 1 }));
}
