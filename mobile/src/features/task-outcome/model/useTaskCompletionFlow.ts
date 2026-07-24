import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';

import type { RootStackParamList } from '@/app/navigation/types';
import { useFolderStore } from '@/entities/folder';
import type { TaskItem } from '@/entities/record';
import { useRecordStore } from '@/entities/record';

import { applyTaskCompletion, applyTaskReopen, patchTaskInList } from '../lib/applyTaskCompletion';
import type { TaskCompletionTarget } from '../lib/types';
import { useFollowUpNavigation } from './useFollowUpNavigation';
import { useTaskPersistence } from './useTaskPersistence';

type UseTaskCompletionFlowOptions = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  onUpdateError?: () => void;
  onTaskCompleted?: (taskId: string) => void;
};

export function useTaskCompletionFlow({
  navigation,
  onUpdateError,
  onTaskCompleted,
}: UseTaskCompletionFlowOptions) {
  const records = useRecordStore((s) => s.records);
  const folders = useFolderStore((s) => s.folders);

  const [target, setTarget] = useState<TaskCompletionTarget | null>(null);

  const { persistTasks } = useTaskPersistence({ onUpdateError });
  const { startFollowUp: navigateToFollowUp } = useFollowUpNavigation({
    navigation,
    onTaskCompleted: async (taskId, _outcomeText) => {
      onTaskCompleted?.(taskId);
      setTarget(null);
    },
  });

  const closeOutcomeSheet = useCallback(() => {
    setTarget(null);
  }, []);

  const requestTaskToggle = useCallback(
    (recordId: string, task: TaskItem) => {
      const record = records.find((item) => item.id === recordId);
      if (!record) return;

      if (task.isDone) {
        const nextTasks = patchTaskInList(record.tasks ?? [], task.id, applyTaskReopen);
        void persistTasks(recordId, nextTasks);
        return;
      }

      setTarget({ recordId, record, task });
    },
    [persistTasks, records],
  );

  const completeTask = useCallback(
    async (input?: { outcomeText?: string | null; outcomeRecordId?: string | null }) => {
      if (!target) return;

      const prevTasks = target.record.tasks ?? [];
      const nextTasks = patchTaskInList(prevTasks, target.task.id, (task) =>
        applyTaskCompletion(task, input),
      );

      await persistTasks(target.recordId, nextTasks);
      onTaskCompleted?.(target.task.id);
      setTarget(null);
    },
    [onTaskCompleted, persistTasks, target],
  );

  const completeAndSkip = useCallback(() => {
    void completeTask();
  }, [completeTask]);

  const completeWithOutcome = useCallback(
    (outcomeText?: string | null) => {
      void completeTask({ outcomeText });
    },
    [completeTask],
  );

  const startFollowUp = useCallback(
    async (mode: 'voice' | 'text', outcomeText?: string | null) => {
      if (!target) return;

      await completeTask({ outcomeText });

      await navigateToFollowUp(mode, target.recordId, target.record, target.task, outcomeText);
    },
    [completeTask, navigateToFollowUp, target],
  );

  const startVoiceFollowUp = useCallback(
    (outcomeText?: string | null) => {
      void startFollowUp('voice', outcomeText);
    },
    [startFollowUp],
  );

  const startTextFollowUp = useCallback(
    (outcomeText?: string | null) => {
      void startFollowUp('text', outcomeText);
    },
    [startFollowUp],
  );

  const linkedNoteContext = useMemo(() => {
    if (!target) return undefined;
    const folder = target.record.folderId
      ? (folders.find((item) => item.id === target.record.folderId) ?? null)
      : null;
    return {
      title: target.record.title,
      folder,
      folderId: target.record.folderId,
      classification: target.record.classification,
    };
  }, [folders, target]);

  return {
    outcomeTarget: target,
    linkedNoteContext,
    requestTaskToggle,
    closeOutcomeSheet,
    completeWithOutcome,
    completeAndSkip,
    startVoiceFollowUp,
    startTextFollowUp,
  };
}
