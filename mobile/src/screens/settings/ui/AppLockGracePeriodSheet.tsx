import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { APP_LOCK_GRACE_PERIOD_OPTIONS, type AppLockGracePeriodMs } from '@/entities/app-lock';
import { SheetEnumPickerSheet } from '@/shared/ui';

type AppLockGracePeriodSheetProps = {
  visible: boolean;
  selectedMs: AppLockGracePeriodMs;
  onSelect: (value: AppLockGracePeriodMs) => void;
  onClose: () => void;
};

export function AppLockGracePeriodSheet({
  visible,
  selectedMs,
  onSelect,
  onClose,
}: AppLockGracePeriodSheetProps) {
  const { t } = useTranslation();

  const options = useMemo(
    () =>
      APP_LOCK_GRACE_PERIOD_OPTIONS.map((value) => ({
        value,
        label: t(`appLock.requireLockOption.${value}`),
      })),
    [t],
  );

  return (
    <SheetEnumPickerSheet
      visible={visible}
      title={t('appLock.requireLockPickerTitle')}
      subtitle={t('appLock.requireLockPickerMessage')}
      options={options}
      selected={selectedMs}
      onSelect={onSelect}
      onClose={onClose}
      footerLabel={t('common.cancel')}
    />
  );
}
