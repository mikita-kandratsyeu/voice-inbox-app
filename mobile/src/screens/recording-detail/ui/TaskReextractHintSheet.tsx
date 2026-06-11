import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useColors } from '@/shared/config';
import { AiHintSheet } from '@/shared/ui';

type TaskReextractHintSheetProps = {
  onClose: () => void;
  onConfirm: (hint: string | undefined) => void;
  visible: boolean;
};

export function TaskReextractHintSheet({
  visible,
  onClose,
  onConfirm,
}: TaskReextractHintSheetProps) {
  const { t } = useTranslation();
  const color = useColors();

  const presets = useMemo(
    () => [
      {
        label: t('recordingDetail.tasksReextractPresetSplitLabel'),
        hint: t('recordingDetail.tasksReextractPresetSplitHint'),
      },
      {
        label: t('recordingDetail.tasksReextractPresetBreakLargeLabel'),
        hint: t('recordingDetail.tasksReextractPresetBreakLargeHint'),
      },
      {
        label: t('recordingDetail.tasksReextractPresetMergeLabel'),
        hint: t('recordingDetail.tasksReextractPresetMergeHint'),
      },
      {
        label: t('recordingDetail.tasksReextractPresetShortenLabel'),
        hint: t('recordingDetail.tasksReextractPresetShortenHint'),
      },
    ],
    [t],
  );

  return (
    <AiHintSheet
      visible={visible}
      color={color}
      title={t('recordingDetail.tasksReextractSheetTitle')}
      subtitle={t('recordingDetail.tasksReextractSheetSubtitle')}
      presets={presets}
      placeholder={t('recordingDetail.tasksReextractHintPlaceholder')}
      hintA11y={t('recordingDetail.tasksReextractHintA11y')}
      charCountLabel={(current, max) =>
        t('recordingDetail.tasksReextractCharCount', { current, max })
      }
      primaryLabel={t('recordingDetail.reextractTasks')}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
