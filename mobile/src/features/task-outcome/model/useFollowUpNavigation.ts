import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { RootStackParamList } from '@/app/navigation/types';
import type { TaskItem, VoiceRecord } from '@/entities/record';

import { buildFollowUpNoteDraft } from '../lib/buildFollowUpNoteDraft';
import { usePendingTaskFollowUpStore } from './pendingTaskFollowUpStore';

type UseFollowUpNavigationOptions = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  onTaskCompleted?: (taskId: string, outcomeText?: string | null) => Promise<void>;
};

export function useFollowUpNavigation({
  navigation,
  onTaskCompleted,
}: UseFollowUpNavigationOptions) {
  const { t } = useTranslation();
  const setPendingFollowUp = usePendingTaskFollowUpStore((s) => s.setPending);

  const startFollowUp = useCallback(
    async (
      mode: 'voice' | 'text',
      recordId: string,
      record: VoiceRecord,
      task: TaskItem,
      outcomeText?: string | null,
    ) => {
      const draft = buildFollowUpNoteDraft(record, task, {
        titlePrefix: t('taskOutcome.followUpTitlePrefix'),
        seedHeading: t('taskOutcome.followUpSeedHeading'),
      });

      setPendingFollowUp({
        sourceRecordId: recordId,
        taskId: task.id,
        outcomeText: outcomeText ?? null,
        draft,
        mode,
      });

      await onTaskCompleted?.(task.id, outcomeText);

      if (mode === 'voice') {
        navigation.navigate('RecordModal');
      } else {
        navigation.navigate('TextNoteModal');
      }
    },
    [navigation, onTaskCompleted, setPendingFollowUp, t],
  );

  return { startFollowUp };
}
