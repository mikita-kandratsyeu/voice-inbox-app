import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GitBranch, History, RefreshCw, Unplug } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import type { SettingsStackParamList } from '@/app/navigation/types';
import { useColors } from '@/shared/config';
import { formatRelativeTime, useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { SCREEN_PADDING, ScreenHeader, SettingsRow, SettingsSection } from '@/shared/ui';

import { GITHUB_SYNC_DEFAULT_BRANCH } from '../lib/constants';
import type { GithubRepoSummary } from '../lib/githubApi';
import { useGithubSync } from '../model/useGithubSync';
import { GithubRepoPickerSheet } from './GithubRepoPickerSheet';
import { GithubSyncHistorySheet } from './GithubSyncHistorySheet';

export function GithubSyncScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { t, i18n } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();

  const {
    loadRepos,
    loadHistory,
    secrets,
    isSyncing,
    isRestoring,
    lastSyncedAt,
    repos,
    isLoadingRepos,
    history,
    isLoadingHistory,
    selectRepository,
    createAndSelectRepository,
    disconnect,
    syncNow,
    restoreVersion,
  } = useGithubSync();

  const [repoPickerVisible, setRepoPickerVisible] = useState(false);
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);

  const handleLoadRepos = useCallback(async () => {
    const result = await loadRepos();
    if (!result.ok && result.code === 'unauthorized') {
      setRepoPickerVisible(false);
      Alert.alert(t('common.error'), t('settings.githubSync.sessionExpired'));
      navigation.goBack();
    }
  }, [loadRepos, navigation, t]);

  const handleLoadHistory = useCallback(async () => {
    const result = await loadHistory();
    if (!result.ok && result.code === 'unauthorized') {
      setHistoryVisible(false);
      Alert.alert(t('common.error'), t('settings.githubSync.sessionExpired'));
      navigation.goBack();
    }
  }, [loadHistory, navigation, t]);

  const handleSelectRepo = useCallback(
    async (repo: GithubRepoSummary) => {
      await selectRepository(repo);
      setRepoPickerVisible(false);
    },
    [selectRepository],
  );

  const handleCreateRepo = useCallback(
    async (name: string) => {
      setIsCreatingRepo(true);
      try {
        await createAndSelectRepository(name);
        setRepoPickerVisible(false);
      } catch {
        Alert.alert(t('common.error'), t('settings.githubSync.createRepoFailed'));
      } finally {
        setIsCreatingRepo(false);
      }
    },
    [createAndSelectRepository, t],
  );

  const handleSync = useCallback(async () => {
    const result = await syncNow();
    if (!result.ok) {
      Alert.alert(t('common.error'), result.message ?? t('settings.githubSync.syncFailed'));
      return;
    }
    if (result.alreadyUpToDate) {
      Alert.alert(t('common.done'), t('settings.githubSync.alreadyUpToDate'));
      return;
    }
    Alert.alert(t('common.done'), t('settings.githubSync.syncSuccess'));
  }, [syncNow, t]);

  const handleRestore = useCallback(
    async (commitSha: string) => {
      const result = await restoreVersion(commitSha);
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
    [navigation, restoreVersion, t],
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
          onPress: () => {
            void disconnect();
            navigation.goBack();
          },
        },
      ],
    );
  }, [disconnect, navigation, t]);

  const repoLabel = secrets
    ? `${secrets.owner}/${secrets.repo}`
    : t('settings.githubSync.notConnected');

  const syncSubtitle =
    lastSyncedAt != null
      ? t('settings.githubSync.lastSynced', {
          time: formatRelativeTime(lastSyncedAt, i18n.language),
        })
      : t('settings.githubSync.neverSynced');

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader
        title={t('settings.githubSync.sectionTitle')}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PADDING,
          paddingTop: 16,
          paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
          alignSelf: 'center',
          width: '100%',
          maxWidth: contentMaxWidth ?? windowWidth,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="mb-4 text-[14px] leading-5"
          style={{ color: color.text.secondary }}
        >
          {t('settings.githubSync.plaintextWarning')}
        </Text>

        <SettingsSection title={t('settings.githubSync.connectedSectionTitle')}>
          <SettingsRow
            label={repoLabel}
            subtitle={t('settings.githubSync.repoBranch', {
              branch: secrets?.branch ?? GITHUB_SYNC_DEFAULT_BRANCH,
            })}
            leftIcon={<GitBranch size={20} color={color.accent.primary} strokeWidth={1.8} />}
            onPress={() => setRepoPickerVisible(true)}
            isFirst
          />
          <SettingsRow
            label={
              isSyncing ? t('settings.githubSync.syncing') : t('settings.githubSync.syncNow')
            }
            subtitle={syncSubtitle}
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
        </SettingsSection>
      </ScrollView>

      <GithubRepoPickerSheet
        visible={repoPickerVisible}
        color={color}
        repos={repos}
        loading={isLoadingRepos}
        creating={isCreatingRepo}
        onClose={() => setRepoPickerVisible(false)}
        onSelect={handleSelectRepo}
        onCreateRepo={handleCreateRepo}
        onLoadRepos={handleLoadRepos}
      />
      <GithubSyncHistorySheet
        visible={historyVisible}
        color={color}
        commits={history}
        loading={isLoadingHistory}
        restoring={isRestoring}
        onClose={() => setHistoryVisible(false)}
        onLoad={handleLoadHistory}
        onRestore={handleRestore}
      />
    </View>
  );
}
