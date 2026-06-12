import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TFunction } from 'i18next';
import { HardDrive } from 'lucide-react-native';
import React from 'react';

import type { SettingsStackParamList } from '@/app/navigation/types';
import { SettingsGithubSyncRows } from '@/features/github-sync';
import { SettingsGitlabSyncRows } from '@/features/gitlab-sync';
import type { Colors } from '@/shared/config';
import { SettingsRow, SettingsSection } from '@/shared/ui';

type Props = {
  color: Colors;
  t: TFunction;
  recordsCount: number;
  navigation: NativeStackNavigationProp<SettingsStackParamList>;
};

export const SettingsBackupSection = ({ color, t, recordsCount, navigation }: Props) => (
  <SettingsSection title={t('settings.backupRestore')}>
    <SettingsRow
      label={t('settings.backupRestoreScreen.entryRow')}
      subtitle={t('settings.backupRestoreScreen.entryHint')}
      value={t('inbox.recordsCount', { count: recordsCount })}
      leftIcon={<HardDrive size={20} color={color.accent.primary} strokeWidth={1.8} />}
      onPress={() => navigation.navigate('BackupRestore')}
      isFirst
    />
    <SettingsGithubSyncRows color={color} t={t} />
    <SettingsGitlabSyncRows color={color} t={t} />
  </SettingsSection>
);
