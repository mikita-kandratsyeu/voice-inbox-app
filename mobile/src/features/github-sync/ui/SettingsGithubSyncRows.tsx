import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TFunction } from 'i18next';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { GithubIcon } from './GithubIcon';
import { GithubRepoPickerSheet } from './GithubRepoPickerSheet';

type Props = {
  color: Colors;
  t: TFunction;
};

export function SettingsGithubSyncRows({ color, t }: Props) {
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
    connectGithub,
    cancelConnect,
    isSyncing,
    selectRepository,
    createAndSelectRepository,
    pinnedRepoFullNames,
    togglePinnedRepo,
    refreshSecrets,
  } = useGithubSync();

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
      Alert.alert(t('common.error'), t('settings.githubSync.sessionExpired'));
    }
  }, [loadRepos, t]);

  const handleConnect = useCallback(async () => {
    if (!isProActive) {
      setProSheetVisible(true);
      return;
    }
    if (!oauthConfigured) {
      Alert.alert(t('common.error'), t('settings.githubSync.oauthNotConfigured'));
      return;
    }
    const result = await connectGithub();
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
  }, [connectGithub, isProActive, oauthConfigured, t]);

  const handleSelectRepo = useCallback(
    async (repo: GithubRepoSummary) => {
      await selectRepository(repo);
      setRepoPickerVisible(false);
      navigation.navigate('GithubSync');
    },
    [navigation, selectRepository],
  );

  const handleCreateRepo = useCallback(
    async (name: string) => {
      setIsCreatingRepo(true);
      try {
        await createAndSelectRepository(name);
        setRepoPickerVisible(false);
        navigation.navigate('GithubSync');
      } catch {
        Alert.alert(t('common.error'), t('settings.githubSync.createRepoFailed'));
      } finally {
        setIsCreatingRepo(false);
      }
    },
    [createAndSelectRepository, navigation, t],
  );

  const syncSubtitle = isSyncing
    ? t('settings.githubSync.syncing')
    : lastSyncedAt != null
      ? t('settings.githubSync.lastSynced', {
          time: formatRelativeTime(lastSyncedAt, i18n.language),
        })
      : t('settings.githubSync.neverSynced');

  let rows: React.ReactNode;

  if (!isProActive) {
    rows = (
      <SettingsRow
        label={t('settings.githubSync.connect')}
        subtitle={t('settings.githubSync.connectHint')}
        leftIcon={<GithubIcon size={20} color={color.accent.primary} />}
        showProBadge
        onPress={handleLockedPress}
        isLast={false}
      />
    );
  } else if (!connected) {
    rows = (
      <SettingsRow
        label={
          isConnecting ? t('settings.githubSync.connecting') : t('settings.githubSync.connect')
        }
        subtitle={t('settings.githubSync.connectHint')}
        leftIcon={<GithubIcon size={20} color={color.accent.primary} />}
        loading={isConnecting}
        onPress={() => void handleConnect()}
        isLast={false}
      />
    );
  } else {
    const connectedLabel = secrets
      ? `${secrets.owner}/${secrets.repo}`
      : t('settings.githubSync.settingsRowTitle');

    rows = (
      <SettingsRow
        label={connectedLabel}
        subtitle={syncSubtitle}
        leftIcon={<GithubIcon size={20} color={color.accent.primary} />}
        loading={isSyncing}
        onPress={() => navigation.navigate('GithubSync')}
        isLast={false}
      />
    );
  }

  return (
    <>
      {rows}
      <GithubConnectSheet
        visible={connectChallenge != null}
        color={color}
        userCode={connectChallenge?.userCode ?? null}
        verificationUri={connectChallenge?.verificationUri ?? null}
        waiting={isConnecting}
        onClose={() => cancelConnect()}
        onCancel={() => cancelConnect()}
      />
      <GithubRepoPickerSheet
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
