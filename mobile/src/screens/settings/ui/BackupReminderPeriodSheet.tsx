import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { BackupReminderPeriodDays } from '@/entities/settings';
import { SheetEnumPickerSheet } from '@/shared/ui';

const PERIOD_OPTIONS: BackupReminderPeriodDays[] = [7, 14, 30];

type BackupReminderPeriodSheetProps = {
  visible: boolean;
  selectedDays: BackupReminderPeriodDays;
  onSelect: (days: BackupReminderPeriodDays) => void;
  onClose: () => void;
};

export function BackupReminderPeriodSheet({
  visible,
  selectedDays,
  onSelect,
  onClose,
}: BackupReminderPeriodSheetProps) {
  const { t } = useTranslation();

  const options = useMemo(
    () =>
      PERIOD_OPTIONS.map((days) => ({
        value: days,
        label: t('settings.backupReminderPeriodValue', { count: days }),
      })),
    [t],
  );

  return (
    <SheetEnumPickerSheet
      visible={visible}
      title={t('settings.backupReminderPeriodPickerTitle')}
      subtitle={t('settings.backupReminderPeriodPickerMessage')}
      options={options}
      selected={selectedDays}
      onSelect={onSelect}
      onClose={onClose}
      footerLabel={t('common.cancel')}
    />
  );
}
