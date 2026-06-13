import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TFunction } from 'i18next';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import type { SettingsStackParamList } from '@/app/navigation/types';
import { openPlanPaywall } from '@/features/plan-paywall';
import { getSettingsIconColor } from '@/screens/settings/lib/settingsIconColor';
import { AutomationComingSoonSheet } from '@/screens/settings/ui/AutomationComingSoonSheet';
import type { Colors } from '@/shared/config';
import { formatRelativeTime } from '@/shared/lib';
import { SettingsRow } from '@/shared/ui';

import type { GitlabRepoSummary } from '../lib/gitlabApi';
import { useGitlabSync } from '../model/useGitlabSync';
import { GitlabConnectSheet } from './GitlabConnectSheet';
import { GitlabIcon } from './GitlabIcon';
import { GitlabRepoPickerSheet } from './GitlabRepoPickerSheet';

type Props = {
  color: Colors;
  t: TFunction;
};

export function SettingsGitlabSyncRows({ color, t }: Props) {
  const { i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const {
    loadRepos,
    isProActive,
    oauthConfigured,
    secrets,
    connected,
    isConnecting,
    connectChallenge,
    lastSyncedAt,
    repos,
    isLoadingRepos,
    connectGitlab,
    cancelConnect,
    isSyncing,
    selectRepository,
    createAndSelectRepository,
    pinnedRepoFullNames,
    togglePinnedRepo,
    refreshSecrets,
  } = useGitlabSync();

  useFocusEffect(
    useCallback(() => {
      void refreshSecrets();
    }, [refreshSecrets]),
  );

  const [repoPickerVisible, setRepoPickerVisible] = useState(false);
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);
  const [proSheetVisible, setProSheetVisible] = useState(false);

  const handleLockedPress = useCallback(() => {
    setProSheetVisible(true);
  }, []);

  const handleLoadRepos = useCallback(async () => {
    const result = await loadRepos();
    if (!result.ok && result.code === 'unauthorized') {
      setRepoPickerVisible(false);
      Alert.alert(t('common.error'), t('settings.gitlabSync.sessionExpired'));
    }
  }, [loadRepos, t]);

  const handleConnect = useCallback(async () => {
    if (!isProActive) {
      setProSheetVisible(true);
      return;
    }
    if (!oauthConfigured) {
      Alert.alert(t('common.error'), t('settings.gitlabSync.oauthNotConfigured'));
      return;
    }
    const result = await connectGitlab();
    if (!result.ok) {
      if (result.code === 'cancelled') {
        return;
      }
      if (result.code === 'access_denied') {
        Alert.alert(
          t('settings.gitlabSync.connectCancelledTitle'),
          t('settings.gitlabSync.connectCancelled'),
        );
        return;
      }
      Alert.alert(t('common.error'), t('settings.gitlabSync.connectFailed'));
      return;
    }
    setRepoPickerVisible(true);
  }, [connectGitlab, isProActive, oauthConfigured, t]);

  const handleSelectRepo = useCallback(
    async (repo: GitlabRepoSummary) => {
      await selectRepository(repo);
      setRepoPickerVisible(false);
      navigation.navigate('GitlabSync');
    },
    [navigation, selectRepository],
  );

  const handleCreateRepo = useCallback(
    async (name: string) => {
      setIsCreatingRepo(true);
      try {
        await createAndSelectRepository(name);
        setRepoPickerVisible(false);
        navigation.navigate('GitlabSync');
      } catch {
        Alert.alert(t('common.error'), t('settings.gitlabSync.createRepoFailed'));
      } finally {
        setIsCreatingRepo(false);
      }
    },
    [createAndSelectRepository, navigation, t],
  );

  const syncSubtitle = isSyncing
    ? t('settings.gitlabSync.syncing')
    : lastSyncedAt != null
      ? t('settings.gitlabSync.lastSynced', {
          time: formatRelativeTime(lastSyncedAt, i18n.language),
        })
      : t('settings.gitlabSync.neverSynced');

  let rows: React.ReactNode;

  if (!isProActive) {
    rows = (
      <SettingsRow
        label={t('settings.gitlabSync.connect')}
        subtitle={t('settings.gitlabSync.connectHint')}
        leftIcon={<GitlabIcon size={20} color={getSettingsIconColor(color, 'gitlab')} />}
        showProBadge
        onPress={handleLockedPress}
        isLast
      />
    );
  } else if (!connected) {
    rows = (
      <SettingsRow
        label={
          isConnecting ? t('settings.gitlabSync.connecting') : t('settings.gitlabSync.connect')
        }
        subtitle={t('settings.gitlabSync.connectHint')}
        leftIcon={<GitlabIcon size={20} color={getSettingsIconColor(color, 'gitlab')} />}
        loading={isConnecting}
        onPress={() => void handleConnect()}
        isLast
      />
    );
  } else {
    const connectedLabel = secrets
      ? `${secrets.owner}/${secrets.repo}`
      : t('settings.gitlabSync.settingsRowTitle');

    rows = (
      <SettingsRow
        label={connectedLabel}
        subtitle={syncSubtitle}
        leftIcon={<GitlabIcon size={20} color={getSettingsIconColor(color, 'gitlab')} />}
        loading={isSyncing}
        onPress={() => navigation.navigate('GitlabSync')}
        isLast
      />
    );
  }

  return (
    <>
      {rows}
      <GitlabConnectSheet
        visible={connectChallenge != null}
        color={color}
        userCode={connectChallenge?.userCode ?? null}
        verificationUri={connectChallenge?.verificationUri ?? null}
        waiting={isConnecting}
        onClose={() => cancelConnect()}
        onCancel={() => cancelConnect()}
      />
      <GitlabRepoPickerSheet
        visible={repoPickerVisible}
        color={color}
        repos={repos}
        loading={isLoadingRepos}
        creating={isCreatingRepo}
        currentRepoFullName={secrets ? `${secrets.owner}/${secrets.repo}` : null}
        pinnedRepoFullNames={pinnedRepoFullNames}
        onClose={() => setRepoPickerVisible(false)}
        onSelect={handleSelectRepo}
        onCreateRepo={handleCreateRepo}
        onLoadRepos={handleLoadRepos}
        onTogglePinnedRepo={togglePinnedRepo}
      />
      <AutomationComingSoonSheet
        visible={proSheetVisible}
        feature="gitlabSync"
        onUpgradePress={() => {
          setProSheetVisible(false);
          openPlanPaywall();
        }}
        onClose={() => setProSheetVisible(false)}
      />
    </>
  );
}
