import dayjs from 'dayjs';
import { create } from 'zustand';

import { useRecordStore } from '@/entities/record';

import { folderRepository } from './repository';
import type { Folder } from './types';

let folderListLoadInFlight: Promise<void> | null = null;

type FolderStore = {
  folders: Folder[];
  activeFolderId: string | null;
  isLoaded: boolean;
  load: () => Promise<void>;
  setActiveFolder: (id: string | null) => void;
  createFolder: (name: string, color: string, icon: string) => Promise<Folder>;
  updateFolder: (
    id: string,
    data: Partial<Pick<Folder, 'name' | 'color' | 'icon'>>,
  ) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  reorderFolders: (orderedIds: string[]) => Promise<void>;
  moveRecord: (recordId: string, folderId: string | null) => Promise<void>;
};

export const useFolderStore = create<FolderStore>((set, get) => ({
  folders: [],
  activeFolderId: null,
  isLoaded: false,

  load: async () => {
    if (folderListLoadInFlight) {
      return folderListLoadInFlight;
    }

    folderListLoadInFlight = (async () => {
      try {
        const folders = await folderRepository.getAll();
        set({ folders, isLoaded: true });
      } finally {
        folderListLoadInFlight = null;
      }
    })();

    return folderListLoadInFlight;
  },

  setActiveFolder: (id) => {
    set({ activeFolderId: id });
  },

  createFolder: async (name, color, icon) => {
    const folder: Folder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name,
      color,
      icon,
      sortOrder: get().folders.length,
      createdAt: dayjs().toISOString(),
    };
    await folderRepository.insert(folder);
    set((s) => ({ folders: [...s.folders, folder] }));
    return folder;
  },

  updateFolder: async (id, data) => {
    await folderRepository.update(id, data);
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? { ...f, ...data } : f)),
    }));
  },

  deleteFolder: async (id) => {
    await folderRepository.remove(id);
    useRecordStore.getState().detachRecordsFromDeletedFolder(id);
    set((s) => ({
      folders: s.folders.filter((f) => f.id !== id),
      activeFolderId: s.activeFolderId === id ? null : s.activeFolderId,
    }));
  },

  reorderFolders: async (orderedIds) => {
    const updates = orderedIds.map((id, idx) => folderRepository.update(id, { sortOrder: idx }));
    await Promise.all(updates);
    set((s) => {
      const byId = new Map(s.folders.map((f) => [f.id, f]));
      const reordered = orderedIds
        .map((id, idx) => {
          const f = byId.get(id);
          return f ? { ...f, sortOrder: idx } : null;
        })
        .filter(Boolean) as Folder[];
      return { folders: reordered };
    });
  },

  moveRecord: async (recordId, folderId) => {
    await folderRepository.updateRecordFolder(recordId, folderId);
  },
}));
