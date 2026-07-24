import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Colors } from '@/shared/config';
import { SheetEnumPickerSheet } from '@/shared/ui';

import {
  GITHUB_SYNC_AUTO_INTERVAL_OPTIONS,
  type GithubSyncAutoIntervalHours,
} from '../lib/githubSyncState';

type Props = {
  visible: boolean;
  color: Colors;
  selectedHours: GithubSyncAutoIntervalHours;
  onSelect: (hours: GithubSyncAutoIntervalHours) => void;
  onClose: () => void;
};

export function GithubSyncAutoIntervalSheet({ visible, selectedHours, onSelect, onClose }: Props) {
  const { t } = useTranslation();

  const options = useMemo(
    () =>
      GITHUB_SYNC_AUTO_INTERVAL_OPTIONS.map((hours) => ({
        value: hours,
        label: t(`settings.githubSync.autoInterval.h${hours}`),
      })),
    [t],
  );

  return (
    <SheetEnumPickerSheet
      visible={visible}
      title={t('settings.githubSync.autoIntervalTitle')}
      subtitle={t('settings.githubSync.autoIntervalSubtitle')}
      options={options}
      selected={selectedHours}
      onSelect={onSelect}
      onClose={onClose}
      footerLabel={t('common.close')}
    />
  );
}
