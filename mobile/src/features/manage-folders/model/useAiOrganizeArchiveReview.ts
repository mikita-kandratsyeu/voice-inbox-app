import { useCallback, useMemo, useState } from 'react';

import type { AutoOrganizeArchiveResult } from '@/entities/folder/lib/autoOrganizeTypes';

type UseAiOrganizeArchiveReviewParams = {
  result: AutoOrganizeArchiveResult;
  archiveRecord: (id: string) => Promise<void>;
};

export function useAiOrganizeArchiveReview({
  result,
  archiveRecord,
}: UseAiOrganizeArchiveReviewParams) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(result.archiveSuggestions.map((s) => s.recordId)),
  );
  const [isApplying, setIsApplying] = useState(false);

  const suggestions = useMemo(() => result.archiveSuggestions, [result.archiveSuggestions]);

  const toggle = useCallback((recordId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
  }, []);

  const apply = useCallback(async (): Promise<boolean> => {
    if (isApplying) return false;
    setIsApplying(true);

    try {
      for (const recordId of selectedIds) {
        await archiveRecord(recordId);
      }
      return true;
    } catch {
      return false;
    } finally {
      setIsApplying(false);
    }
  }, [archiveRecord, isApplying, selectedIds]);

  return {
    suggestions,
    selectedIds,
    toggle,
    isApplying,
    apply,
  };
}
