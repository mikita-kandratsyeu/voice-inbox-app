import { useCallback, useMemo, useState } from 'react';

import type { Folder } from '@/entities/folder';
import type {
  AutoOrganizeConsolidateResult,
  AutoOrganizeFolderMerge,
} from '@/entities/folder/lib/autoOrganizeTypes';

type UseAiOrganizeCleanupReviewParams = {
  result: AutoOrganizeConsolidateResult;
  getFolders: () => Folder[];
  getRecords: () => Array<{ id: string; folderId?: string | null }>;
  moveRecord: (recordId: string, folderId: string | null) => Promise<void>;
  updateFolder: (
    id: string,
    data: Partial<Pick<Folder, 'name' | 'color' | 'icon'>>,
  ) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
};

function folderIdByName(folders: Folder[], name: string): string | null {
  const key = name.trim().toLowerCase();
  const match = folders.find((f) => f.name.trim().toLowerCase() === key);
  return match?.id ?? null;
}

export function useAiOrganizeCleanupReview({
  result,
  getFolders,
  getRecords,
  moveRecord,
  updateFolder,
  deleteFolder,
}: UseAiOrganizeCleanupReviewParams) {
  const [selectedMergeKeys, setSelectedMergeKeys] = useState<Set<string>>(
    () => new Set(result.merges.map((m, idx) => `${idx}:${m.targetFolderName}`)),
  );
  const [selectedDeleteNames, setSelectedDeleteNames] = useState<Set<string>>(
    () => new Set(result.deleteEmptyFolderNames),
  );
  const [isApplying, setIsApplying] = useState(false);

  const mergeItems = useMemo(
    () =>
      result.merges.map((merge, index) => ({
        key: `${index}:${merge.targetFolderName}`,
        merge,
      })),
    [result.merges],
  );

  const toggleMerge = useCallback((key: string) => {
    setSelectedMergeKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleDelete = useCallback((name: string) => {
    setSelectedDeleteNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const apply = useCallback(async (): Promise<boolean> => {
    if (isApplying) return false;
    setIsApplying(true);

    try {
      const selectedMerges = mergeItems
        .filter((item) => selectedMergeKeys.has(item.key))
        .map((item) => item.merge);

      for (const merge of selectedMerges) {
        await applyMerge(merge, getFolders(), getRecords(), moveRecord, updateFolder, deleteFolder);
      }

      for (const name of selectedDeleteNames) {
        const folderId = folderIdByName(getFolders(), name);
        if (folderId) {
          await deleteFolder(folderId);
        }
      }

      return true;
    } catch {
      return false;
    } finally {
      setIsApplying(false);
    }
  }, [
    deleteFolder,
    getFolders,
    getRecords,
    isApplying,
    mergeItems,
    moveRecord,
    selectedDeleteNames,
    selectedMergeKeys,
    updateFolder,
  ]);

  return {
    mergeItems,
    deleteEmptyFolderNames: result.deleteEmptyFolderNames,
    selectedMergeKeys,
    selectedDeleteNames,
    toggleMerge,
    toggleDelete,
    isApplying,
    apply,
  };
}

async function applyMerge(
  merge: AutoOrganizeFolderMerge,
  folders: Folder[],
  records: Array<{ id: string; folderId?: string | null }>,
  moveRecord: (recordId: string, folderId: string | null) => Promise<void>,
  updateFolder: (
    id: string,
    data: Partial<Pick<Folder, 'name' | 'color' | 'icon'>>,
  ) => Promise<void>,
  deleteFolder: (id: string) => Promise<void>,
): Promise<void> {
  const sourceIds = merge.sourceFolderNames
    .map((name) => folderIdByName(folders, name))
    .filter((id): id is string => Boolean(id));

  if (sourceIds.length === 0) return;

  const targetId =
    folderIdByName(folders, merge.targetFolderName) ??
    sourceIds.find((id) => {
      const folder = folders.find((f) => f.id === id);
      return folder?.name.trim().toLowerCase() === merge.targetFolderName.trim().toLowerCase();
    }) ??
    sourceIds[0];

  const recordsToMove = records.filter(
    (r) => r.folderId && sourceIds.includes(r.folderId) && r.folderId !== targetId,
  );

  for (const record of recordsToMove) {
    await moveRecord(record.id, targetId);
  }

  await updateFolder(targetId, {
    name: merge.targetFolderName,
    icon: merge.targetIcon,
    color: merge.targetColor,
  });

  for (const sourceId of sourceIds) {
    if (sourceId === targetId) continue;
    await deleteFolder(sourceId);
  }
}
