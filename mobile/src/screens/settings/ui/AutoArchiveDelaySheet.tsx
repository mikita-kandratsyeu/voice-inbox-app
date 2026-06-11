import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { AutoArchiveAfterDays } from '@/entities/settings';
import { SheetEnumPickerSheet } from '@/shared/ui';

const DELAY_OPTIONS: AutoArchiveAfterDays[] = [1, 7, 14, 30];

type AutoArchiveDelaySheetProps = {
  visible: boolean;
  selectedDays: AutoArchiveAfterDays;
  onSelect: (days: AutoArchiveAfterDays) => void;
  onClose: () => void;
};

export function AutoArchiveDelaySheet({
  visible,
  selectedDays,
  onSelect,
  onClose,
}: AutoArchiveDelaySheetProps) {
  const { t } = useTranslation();

  const options = useMemo(
    () =>
      DELAY_OPTIONS.map((days) => ({
        value: days,
        label: t('settings.autoArchiveDelayValue', { count: days }),
      })),
    [t],
  );

  return (
    <SheetEnumPickerSheet
      visible={visible}
      title={t('settings.autoArchiveDelayPickerTitle')}
      subtitle={t('settings.autoArchiveDelayPickerMessage')}
      options={options}
      selected={selectedDays}
      onSelect={onSelect}
      onClose={onClose}
      footerLabel={t('common.cancel')}
    />
  );
}
