import { useCallback } from 'react';

import type { TaskItem } from '@/entities/record';
import { useRecordStore } from '@/entities/record';

type UseTaskPersistenceOptions = {
  onUpdateError?: () => void;
};

export function useTaskPersistence({ onUpdateError }: UseTaskPersistenceOptions = {}) {
  const updateTasks = useRecordStore((s) => s.updateTasks);

  const persistTasks = useCallback(
    async (recordId: string, tasks: TaskItem[]) => {
      try {
        await updateTasks(recordId, tasks);
        return true;
      } catch {
        onUpdateError?.();
        return false;
      }
    },
    [onUpdateError, updateTasks],
  );

  return { persistTasks };
}
