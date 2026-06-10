import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TFunction } from 'i18next';
import { GitBranch, History, RefreshCw, Unplug } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import type { SettingsStackParamList } from '@/app/navigation/types';
import { openPlanPaywall } from '@/features/plan-paywall';
import { AutomationComingSoonSheet } from '@/screens/settings/ui/AutomationComingSoonSheet';
import type { Colors } from '@/shared/config';
import { formatRelativeTime } from '@/shared/lib';
import { SettingsRow } from '@/shared/ui';

import type { GithubRepoSummary } from '../lib/githubApi';
import { useGithubSync } from '../model/useGithubSync';
import { GithubConnectSheet } from './GithubConnectSheet';
import { GithubRepoPickerSheet } from './GithubRepoPickerSheet';
import { GithubSyncHistorySheet } from './GithubSyncHistorySheet';

type Props = {
  color: Colors;
  t: TFunction;
  language: string;
};

export function SettingsGithubSyncRows({ color, t, language }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const github = useGithubSync();
  const [repoPickerVisible, setRepoPickerVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [proSheetVisible, setProSheetVisible] = useState(false);

  const handleLockedPress = useCallback(() => {
    setProSheetVisible(true);
  }, []);

  const handleConnect = useCallback(async () => {
    if (!github.isProActive) {
      setProSheetVisible(true);
      return;
    }
    if (!github.oauthConfigured) {
      Alert.alert(t('common.error'), t('settings.githubSync.oauthNotConfigured'));
      return;
    }
    const result = await github.connectGithub();
    if (!result.ok) {
      if (result.code === 'cancelled') {
        return;
      }
      if (result.code === 'access_denied') {
        Alert.alert(
          t('settings.githubSync.connectCancelledTitle'),
          t('settings.githubSync.connectCancelled'),
        );
        return;
      }
      Alert.alert(t('common.error'), t('settings.githubSync.connectFailed'));
      return;
    }
    setRepoPickerVisible(true);
  }, [github, t]);

  const handleSelectRepo = useCallback(
    async (repo: GithubRepoSummary) => {
      await github.selectRepository(repo);
      setRepoPickerVisible(false);
    },
    [github],
  );

  const handleCreateRepo = useCallback(
    async (name: string) => {
      try {
        await github.createAndSelectRepository(name);
        setRepoPickerVisible(false);
      } catch {
        Alert.alert(t('common.error'), t('settings.githubSync.createRepoFailed'));
      }
    },
    [github, t],
  );

  const handleSync = useCallback(async () => {
    if (!github.isProActive) {
      setProSheetVisible(true);
      return;
    }
    if (!github.connected) {
      void handleConnect();
      return;
    }
    const result = await github.syncNow();
    if (!result.ok) {
      Alert.alert(t('common.error'), result.message ?? t('settings.githubSync.syncFailed'));
      return;
    }
    if (result.alreadyUpToDate) {
      Alert.alert(t('common.done'), t('settings.githubSync.alreadyUpToDate'));
      return;
    }
    Alert.alert(t('common.done'), t('settings.githubSync.syncSuccess'));
  }, [github, handleConnect, t]);

  const handleRestore = useCallback(
    async (commitSha: string) => {
      const result = await github.restoreVersion(commitSha);
      if (!result.ok) {
        Alert.alert(t('common.error'), result.message ?? t('settings.githubSync.restoreFailed'));
        return;
      }
      setHistoryVisible(false);
      navigation.navigate('ImportRecords', {
        records: result.importResult.records,
        folders: result.importResult.folders,
        legacyFolders: result.importResult.legacyFolders,
        graphLayouts: result.importResult.graphLayouts,
      });
    },
    [github, navigation, t],
  );

  const handleDisconnect = useCallback(() => {
    Alert.alert(
      t('settings.githubSync.disconnectTitle'),
      t('settings.githubSync.disconnectMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.githubSync.disconnectConfirm'),
          style: 'destructive',
          onPress: () => void github.disconnect(),
        },
      ],
    );
  }, [github, t]);

  const repoLabel = github.secrets
    ? `${github.secrets.owner}/${github.secrets.repo}`
    : t('settings.githubSync.notConnected');

  const lastSyncedLabel =
    github.lastSyncedAt != null
      ? formatRelativeTime(github.lastSyncedAt, language)
      : t('settings.githubSync.neverSynced');

  let rows: React.ReactNode;

  if (!github.isProActive) {
    rows = (
      <SettingsRow
        label={t('settings.githubSync.connect')}
        subtitle={t('settings.githubSync.connectHint')}
        leftIcon={<GitBranch size={20} color={color.accent.primary} strokeWidth={1.8} />}
        showProBadge
        onPress={handleLockedPress}
        isLast
      />
    );
  } else if (!github.connected) {
    rows = (
      <SettingsRow
        label={
          github.isConnecting
            ? t('settings.githubSync.connecting')
            : t('settings.githubSync.connect')
        }
        subtitle={t('settings.githubSync.connectHint')}
        leftIcon={<GitBranch size={20} color={color.accent.primary} strokeWidth={1.8} />}
        onPress={github.isConnecting ? undefined : () => void handleConnect()}
        showChevron={!github.isConnecting}
        isLast
      />
    );
  } else {
    rows = (
      <>
        <SettingsRow
          label={repoLabel}
          subtitle={t('settings.githubSync.repoBranch', {
            branch: github.secrets?.branch ?? 'voice-inbox-ai',
          })}
          leftIcon={<GitBranch size={20} color={color.accent.primary} strokeWidth={1.8} />}
          onPress={() => setRepoPickerVisible(true)}
        />
        <SettingsRow
          label={
            github.isSyncing ? t('settings.githubSync.syncing') : t('settings.githubSync.syncNow')
          }
          subtitle={t('settings.githubSync.lastSynced', { time: lastSyncedLabel })}
          leftIcon={<RefreshCw size={20} color={color.accent.primary} strokeWidth={1.8} />}
          onPress={() => void handleSync()}
        />
        <SettingsRow
          label={t('settings.githubSync.history')}
          leftIcon={<History size={20} color={color.accent.primary} strokeWidth={1.8} />}
          onPress={() => setHistoryVisible(true)}
        />
        <SettingsRow
          label={t('settings.githubSync.disconnect')}
          leftIcon={<Unplug size={20} color={color.status.error.text} strokeWidth={1.8} />}
          onPress={handleDisconnect}
          isLast
        />
      </>
    );
  }

  return (
    <>
      {rows}
      <GithubConnectSheet
        visible={github.connectChallenge != null}
        color={color}
        userCode={github.connectChallenge?.userCode ?? null}
        verificationUri={github.connectChallenge?.verificationUri ?? null}
        waiting={github.isConnecting}
        onClose={() => github.cancelConnect()}
        onCancel={() => github.cancelConnect()}
      />
      <GithubRepoPickerSheet
        visible={repoPickerVisible}
        color={color}
        repos={github.repos}
        loading={github.isLoadingRepos}
        onClose={() => setRepoPickerVisible(false)}
        onSelect={handleSelectRepo}
        onCreateRepo={handleCreateRepo}
        onLoadRepos={() => void github.loadRepos()}
      />
      <GithubSyncHistorySheet
        visible={historyVisible}
        color={color}
        commits={github.history}
        loading={github.isLoadingHistory}
        restoring={github.isRestoring}
        onClose={() => setHistoryVisible(false)}
        onLoad={() => void github.loadHistory()}
        onRestore={handleRestore}
      />
      <AutomationComingSoonSheet
        visible={proSheetVisible}
        feature="githubSync"
        onUpgradePress={() => {
          setProSheetVisible(false);
          openPlanPaywall();
        }}
        onClose={() => setProSheetVisible(false)}
      />
    </>
  );
}
