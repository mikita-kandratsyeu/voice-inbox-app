import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Colors } from '@/shared/config';
import { SheetEnumPickerSheet } from '@/shared/ui';

import {
  GITLAB_SYNC_AUTO_INTERVAL_OPTIONS,
  type GitlabSyncAutoIntervalHours,
} from '../lib/gitlabSyncState';

type Props = {
  visible: boolean;
  color: Colors;
  selectedHours: GitlabSyncAutoIntervalHours;
  onSelect: (hours: GitlabSyncAutoIntervalHours) => void;
  onClose: () => void;
};

export function GitlabSyncAutoIntervalSheet({ visible, selectedHours, onSelect, onClose }: Props) {
  const { t } = useTranslation();

  const options = useMemo(
    () =>
      GITLAB_SYNC_AUTO_INTERVAL_OPTIONS.map((hours) => ({
        value: hours,
        label: t(`settings.gitlabSync.autoInterval.h${hours}`),
      })),
    [t],
  );

  return (
    <SheetEnumPickerSheet
      visible={visible}
      title={t('settings.gitlabSync.autoIntervalTitle')}
      subtitle={t('settings.gitlabSync.autoIntervalSubtitle')}
      options={options}
      selected={selectedHours}
      onSelect={onSelect}
      onClose={onClose}
      footerLabel={t('common.close')}
    />
  );
}
