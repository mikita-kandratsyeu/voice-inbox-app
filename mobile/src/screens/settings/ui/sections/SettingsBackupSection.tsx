import type { TFunction } from 'i18next';
import { Download, Lock, UploadCloud } from 'lucide-react-native';
import React from 'react';
import { Switch, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { SettingsRow, SettingsSection } from '@/shared/ui';

type Props = {
  color: Colors;
  t: TFunction;
  recordsCount: number;
  encryptBackup: boolean;
  onEncryptBackupChange: (value: boolean) => void;
  isExporting: boolean;
  isImporting: boolean;
  onExport: () => void;
  onImport: () => void;
};

export const SettingsBackupSection = ({
  color,
  t,
  recordsCount,
  encryptBackup,
  onEncryptBackupChange,
  isExporting,
  isImporting,
  onExport,
  onImport,
}: Props) => (
  <SettingsSection title={t('settings.backupRestore')}>
    <SettingsRow
      label={t('settings.backupEncryption.toggleLabel')}
      subtitle={t('settings.backupEncryption.toggleHint')}
      leftIcon={<Lock size={20} color={color.accent.primary} strokeWidth={1.8} />}
      rightSlot={
        <Switch
          value={encryptBackup}
          onValueChange={onEncryptBackupChange}
          accessibilityLabel={t('settings.backupEncryption.toggleLabel')}
          trackColor={{
            false: color.background.tertiary,
            true: color.accent.primary,
          }}
          thumbColor={color.icon.onAccent}
        />
      }
      showChevron={false}
      isFirst
    />
    <SettingsRow
      label={isExporting ? t('settings.exporting') : t('settings.export')}
      value={t('inbox.recordsCount', { count: recordsCount })}
      leftIcon={<UploadCloud size={20} color={color.accent.primary} strokeWidth={1.8} />}
      onPress={onExport}
    />
    <SettingsRow
      label={isImporting ? t('settings.importing') : t('settings.import')}
      leftIcon={<Download size={20} color={color.accent.primary} strokeWidth={1.8} />}
      onPress={onImport}
      isLast
    />
  </SettingsSection>
);
