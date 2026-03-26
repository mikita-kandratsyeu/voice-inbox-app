import { useCallback, useState } from 'react';

import { hapticLight, hapticMedium, hapticSelection } from '@/shared/lib';

export type BatchSelectState = {
  isSelectMode: boolean;
  selectedIds: Set<string>;
  enterSelectMode: (initialId?: string, options?: { haptic?: boolean }) => void;
  exitSelectMode: () => void;
  toggleItem: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
};

export const useBatchSelect = (): BatchSelectState => {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const enterSelectMode = useCallback((initialId?: string, options?: { haptic?: boolean }) => {
    const shouldHaptic = options?.haptic ?? true;
    if (shouldHaptic) hapticMedium();
    setIsSelectMode(true);
    if (initialId) {
      setSelectedIds(new Set([initialId]));
    }
  }, []);

  const exitSelectMode = useCallback(() => {
    hapticLight();
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleItem = useCallback((id: string) => {
    hapticSelection();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    hapticMedium();
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    hapticLight();
    setSelectedIds(new Set());
  }, []);

  return {
    isSelectMode,
    selectedIds,
    enterSelectMode,
    exitSelectMode,
    toggleItem,
    selectAll,
    clearSelection,
  };
};
