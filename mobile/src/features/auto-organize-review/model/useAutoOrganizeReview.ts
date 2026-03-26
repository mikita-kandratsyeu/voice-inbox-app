import { useCallback, useMemo, useState } from 'react';

import type { Folder } from '@/entities/folder';
import { DEFAULT_FOLDER_BRAND_HEX } from '@/shared/lib';

type AutoOrganizeResult = {
  folders: Array<{ name: string; icon: string; color: string }>;
  assignments: Array<{ recordId: string; folderName: string }>;
};

export type ProposedFolderDraft = {
  tempId: string;
  name: string;
  icon: string;
  color: string;
};

export type AssignmentDraft = {
  recordId: string;
  destination:
    | { kind: 'inbox' }
    | { kind: 'existingFolder'; folderId: string }
    | { kind: 'proposedFolder'; tempId: string };
};

export type ReviewFolderItem =
  | { kind: 'existing'; folder: Folder }
  | { kind: 'proposed'; folder: ProposedFolderDraft };

type UseAutoOrganizeReviewParams = {
  result: AutoOrganizeResult;
  folders: Folder[];
  isProActive: boolean;
  createFolder: (name: string, color: string, icon: string) => Promise<Folder>;
  setRecordFolder: (recordId: string, folderId: string | null) => Promise<void> | void;
  onApplied: () => void;
};

function buildInitialProposedFolders(
  result: AutoOrganizeResult,
  isProActive: boolean,
): ProposedFolderDraft[] {
  return result.folders.map((f, idx) => {
    const normalized = f.name.trim().toLowerCase() || 'folder';
    return {
      tempId: `p-${idx}-${normalized}`,
      name: f.name.trim(),
      icon: f.icon,
      color: isProActive ? f.color : DEFAULT_FOLDER_BRAND_HEX,
    };
  });
}

function buildInitialAssignments(
  result: AutoOrganizeResult,
  folders: Folder[],
  proposedFolders: ProposedFolderDraft[],
): AssignmentDraft[] {
  const existingIdByLower = new Map<string, string>();
  for (const f of folders) {
    const key = f.name.trim().toLowerCase();
    if (!key) continue;
    existingIdByLower.set(key, f.id);
  }

  const proposedIdByLower = new Map<string, string>();
  for (const f of proposedFolders) {
    const key = f.name.trim().toLowerCase();
    if (!key) continue;
    if (!proposedIdByLower.has(key)) {
      proposedIdByLower.set(key, f.tempId);
    }
  }

  return result.assignments.map((a) => {
    const key = a.folderName.trim().toLowerCase();
    const existingId = existingIdByLower.get(key);
    if (existingId) {
      return {
        recordId: a.recordId,
        destination: { kind: 'existingFolder', folderId: existingId },
      };
    }

    const tempId = proposedIdByLower.get(key);
    return {
      recordId: a.recordId,
      destination: tempId ? { kind: 'proposedFolder', tempId } : { kind: 'inbox' },
    };
  });
}

export function useAutoOrganizeReview({
  result,
  folders,
  isProActive,
  createFolder,
  setRecordFolder,
  onApplied,
}: UseAutoOrganizeReviewParams) {
  const [proposedFolders, setProposedFolders] = useState<ProposedFolderDraft[]>(() =>
    buildInitialProposedFolders(result, isProActive),
  );
  const [assignments, setAssignments] = useState<AssignmentDraft[]>(() =>
    buildInitialAssignments(result, folders, buildInitialProposedFolders(result, isProActive)),
  );
  const [isApplying, setIsApplying] = useState(false);

  const proposedFolderNoteCountByTempId = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assignments) {
      if (a.destination.kind !== 'proposedFolder') continue;
      m.set(a.destination.tempId, (m.get(a.destination.tempId) ?? 0) + 1);
    }
    return m;
  }, [assignments]);

  const existingFolderNoteCountById = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assignments) {
      if (a.destination.kind !== 'existingFolder') continue;
      m.set(a.destination.folderId, (m.get(a.destination.folderId) ?? 0) + 1);
    }
    return m;
  }, [assignments]);

  const existingFolderIdByLowerName = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of folders) {
      const key = f.name.trim().toLowerCase();
      if (!key) continue;
      m.set(key, f.id);
    }
    return m;
  }, [folders]);

  const visibleProposedFolders = useMemo(
    () =>
      proposedFolders.filter((pf) => {
        const key = pf.name.trim().toLowerCase();
        if (!key) return true;
        return !existingFolderIdByLowerName.has(key);
      }),
    [existingFolderIdByLowerName, proposedFolders],
  );

  const reviewFolders = useMemo<ReviewFolderItem[]>(
    () => [
      ...folders.map((f) => ({ kind: 'existing' as const, folder: f })),
      ...visibleProposedFolders.map((f) => ({ kind: 'proposed' as const, folder: f })),
    ],
    [folders, visibleProposedFolders],
  );

  const setAssignmentDestination = useCallback(
    (recordId: string, destination: AssignmentDraft['destination']) => {
      setAssignments((prev) =>
        prev.map((a) => (a.recordId === recordId ? { ...a, destination } : a)),
      );
    },
    [],
  );

  const apply = useCallback(async () => {
    if (isApplying) return;
    setIsApplying(true);

    const existingById = new Map(folders.map((f) => [f.id, f]));
    const existingNameToId = new Map<string, string>();

    try {
      for (const f of folders) {
        const key = f.name.trim().toLowerCase();
        if (key) existingNameToId.set(key, f.id);
      }

      const createdIdByTemp = new Map<string, string>();

      for (const pf of proposedFolders) {
        const name = pf.name.trim();
        const key = name.toLowerCase();

        if (!key) continue;

        const existingId = existingNameToId.get(key);
        if (existingId) {
          createdIdByTemp.set(pf.tempId, existingId);
          continue;
        }

        const created = await createFolder(
          name,
          isProActive ? pf.color || DEFAULT_FOLDER_BRAND_HEX : DEFAULT_FOLDER_BRAND_HEX,
          pf.icon,
        );
        createdIdByTemp.set(pf.tempId, created.id);
        existingById.set(created.id, created);
        existingNameToId.set(key, created.id);
      }

      for (const a of assignments) {
        if (a.destination.kind === 'inbox') {
          await setRecordFolder(a.recordId, null);
          continue;
        }

        if (a.destination.kind === 'existingFolder') {
          if (existingById.has(a.destination.folderId)) {
            await setRecordFolder(a.recordId, a.destination.folderId);
          }
          continue;
        }

        const folderId = createdIdByTemp.get(a.destination.tempId);
        if (!folderId) continue;
        await setRecordFolder(a.recordId, folderId);
      }

      onApplied();
    } finally {
      setIsApplying(false);
    }
  }, [
    assignments,
    createFolder,
    folders,
    isApplying,
    isProActive,
    onApplied,
    proposedFolders,
    setRecordFolder,
  ]);

  return {
    assignments,
    setAssignments,
    proposedFolders,
    setProposedFolders,
    visibleProposedFolders,
    reviewFolders,
    proposedFolderNoteCountByTempId,
    existingFolderNoteCountById,
    isApplying,
    apply,
    setAssignmentDestination,
  };
}
