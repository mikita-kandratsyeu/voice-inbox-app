import type { TFunction } from 'i18next';
import { Download, LockKeyhole, UploadCloud } from 'lucide-react-native';
import React from 'react';
import { Switch } from 'react-native';

import { SettingsGithubSyncRows } from '@/features/github-sync';
import type { Colors } from '@/shared/config';
import { SettingsRow, SettingsSection } from '@/shared/ui';

type Props = {
  color: Colors;
  t: TFunction;
  language: string;
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
  language,
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
      leftIcon={<LockKeyhole size={20} color={color.accent.primary} strokeWidth={1.8} />}
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
      loading={isExporting}
      onPress={onExport}
    />
    <SettingsRow
      label={isImporting ? t('settings.importing') : t('settings.import')}
      leftIcon={<Download size={20} color={color.accent.primary} strokeWidth={1.8} />}
      loading={isImporting}
      onPress={onImport}
    />
    <SettingsGithubSyncRows color={color} t={t} language={language} />
  </SettingsSection>
);
