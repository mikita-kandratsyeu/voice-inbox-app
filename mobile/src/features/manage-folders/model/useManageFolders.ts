import { useCallback, useState } from 'react';

import type { Folder } from '@/entities/folder';
import { useFolderStore } from '@/entities/folder';

export const useManageFolders = () => {
  const folders = useFolderStore((s) => s.folders);
  const createFolder = useFolderStore((s) => s.createFolder);
  const updateFolder = useFolderStore((s) => s.updateFolder);
  const deleteFolder = useFolderStore((s) => s.deleteFolder);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

  const openCreateModal = useCallback(() => {
    setEditingFolder(null);
    setModalVisible(true);
  }, []);

  const openEditModal = useCallback((folder: Folder) => {
    setEditingFolder(folder);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingFolder(null);
  }, []);

  const handleSave = useCallback(
    async (name: string, color: string, icon: string) => {
      if (editingFolder) {
        await updateFolder(editingFolder.id, { name, color, icon });
      } else {
        await createFolder(name, color, icon);
      }
      closeModal();
    },
    [editingFolder, createFolder, updateFolder, closeModal],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteFolder(id);
      closeModal();
    },
    [deleteFolder, closeModal],
  );

  return {
    folders,
    modalVisible,
    editingFolder,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSave,
    handleDelete,
  };
};
