import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/app/navigation/types';
import { useFolderStore } from '@/entities/folder';
import type { TaskItem } from '@/entities/record';
import { useRecordStore } from '@/entities/record';

import { applyTaskCompletion, applyTaskReopen, patchTaskInList } from '../lib/applyTaskCompletion';
import { buildFollowUpNoteDraft } from '../lib/buildFollowUpNoteDraft';
import { usePendingTaskFollowUpStore } from './pendingTaskFollowUpStore';
import type { TaskCompletionTarget } from '../lib/types';

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
  const { t } = useTranslation();
  const records = useRecordStore((s) => s.records);
  const folders = useFolderStore((s) => s.folders);
  const updateTasks = useRecordStore((s) => s.updateTasks);
  const setPendingFollowUp = usePendingTaskFollowUpStore((s) => s.setPending);

  const [target, setTarget] = useState<TaskCompletionTarget | null>(null);

  const closeOutcomeSheet = useCallback(() => {
    setTarget(null);
  }, []);

  const persistTasks = useCallback(
    async (recordId: string, tasks: TaskItem[]) => {
      try {
        await updateTasks(recordId, tasks);
      } catch {
        onUpdateError?.();
      }
    },
    [onUpdateError, updateTasks],
  );

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
    (mode: 'voice' | 'text', outcomeText?: string | null) => {
      if (!target) return;

      const draft = buildFollowUpNoteDraft(target.record, target.task, {
        titlePrefix: t('taskOutcome.followUpTitlePrefix'),
        seedHeading: t('taskOutcome.followUpSeedHeading'),
      });

      setPendingFollowUp({
        sourceRecordId: target.recordId,
        taskId: target.task.id,
        outcomeText: outcomeText ?? null,
        draft,
        mode,
      });

      void completeTask({ outcomeText });

      setTarget(null);

      if (mode === 'voice') {
        navigation.navigate('RecordModal');
        return;
      }

      navigation.navigate('TextNoteModal');
    },
    [completeTask, navigation, setPendingFollowUp, t, target],
  );

  const startVoiceFollowUp = useCallback(
    (outcomeText?: string | null) => {
      startFollowUp('voice', outcomeText);
    },
    [startFollowUp],
  );

  const startTextFollowUp = useCallback(
    (outcomeText?: string | null) => {
      startFollowUp('text', outcomeText);
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
