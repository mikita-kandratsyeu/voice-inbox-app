import type { TFunction } from 'i18next';
import { Download, UploadCloud } from 'lucide-react-native';
import React from 'react';

import type { Colors } from '@/shared/config';
import { SettingsRow, SettingsSection } from '@/shared/ui';

type Props = {
  color: Colors;
  t: TFunction;
  recordsCount: number;
  isExporting: boolean;
  isImporting: boolean;
  onExport: () => void;
  onImport: () => void;
};

export const SettingsBackupSection = ({
  color,
  t,
  recordsCount,
  isExporting,
  isImporting,
  onExport,
  onImport,
}: Props) => (
  <SettingsSection title={t('settings.backupRestore')}>
    <SettingsRow
      label={isExporting ? t('settings.exporting') : t('settings.export')}
      value={t('inbox.recordsCount', { count: recordsCount })}
      leftIcon={<UploadCloud size={20} color={color.accent.primary} strokeWidth={1.8} />}
      onPress={onExport}
      isFirst
    />
    <SettingsRow
      label={isImporting ? t('settings.importing') : t('settings.import')}
      leftIcon={<Download size={20} color={color.accent.primary} strokeWidth={1.8} />}
      onPress={onImport}
      isLast
    />
  </SettingsSection>
);
