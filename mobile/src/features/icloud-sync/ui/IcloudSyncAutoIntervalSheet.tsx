import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Colors } from '@/shared/config';
import { SheetEnumPickerSheet } from '@/shared/ui';

import {
  ICLOUD_SYNC_AUTO_INTERVAL_OPTIONS,
  type IcloudSyncAutoIntervalHours,
} from '../lib/icloudSyncState';

type Props = {
  visible: boolean;
  color: Colors;
  selectedHours: IcloudSyncAutoIntervalHours;
  onSelect: (hours: IcloudSyncAutoIntervalHours) => void;
  onClose: () => void;
};

export function IcloudSyncAutoIntervalSheet({ visible, selectedHours, onSelect, onClose }: Props) {
  const { t } = useTranslation();

  const options = useMemo(
    () =>
      ICLOUD_SYNC_AUTO_INTERVAL_OPTIONS.map((hours) => ({
        value: hours,
        label: t(`settings.icloudSync.autoInterval.h${hours}`),
      })),
    [t],
  );

  return (
    <SheetEnumPickerSheet
      visible={visible}
      title={t('settings.icloudSync.autoIntervalTitle')}
      subtitle={t('settings.icloudSync.autoIntervalSubtitle')}
      options={options}
      selected={selectedHours}
      onSelect={onSelect}
      onClose={onClose}
      footerLabel={t('common.close')}
    />
  );
}
