import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GitBranch, History, RefreshCw, Unplug } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { githubSyncBranchA11yLabel, GithubSyncBranchText } from './GithubSyncBranchText';
import { GithubSyncHistorySheet } from './GithubSyncHistorySheet';

export function GithubSyncScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const isFocused = useIsFocused();
  const isFocusedRef = useRef(isFocused);

  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);
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
    lastSyncedAt,
    repos,
    isLoadingRepos,
    history,
    isLoadingHistory,
    selectRepository,
    createAndSelectRepository,
    disconnect,
    syncNow,
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
    if (!isFocusedRef.current) {
      return;
    }
    if (!result.ok) {
      if (result.code === 'sync_in_progress' || result.code === 'sync_cooldown') {
        return;
      }
      if (result.code === 'unauthorized') {
        Alert.alert(t('common.error'), t('settings.githubSync.sessionExpired'));
        navigation.goBack();
        return;
      }
      if (result.code === 'sync_timeout') {
        Alert.alert(t('common.error'), t('settings.githubSync.syncTimeout'));
        return;
      }
      if (result.code === 'ref_conflict') {
        Alert.alert(t('common.error'), t('settings.githubSync.syncRefConflict'));
        return;
      }
      Alert.alert(
        t('common.error'),
        'message' in result && result.message
          ? result.message
          : t('settings.githubSync.syncFailed'),
      );
      return;
    }
    if (result.alreadyUpToDate) {
      Alert.alert(t('common.done'), t('settings.githubSync.alreadyUpToDate'));
      return;
    }
    Alert.alert(t('common.done'), t('settings.githubSync.syncSuccess'));
  }, [navigation, syncNow, t]);

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

  const branchName = secrets?.branch ?? GITHUB_SYNC_DEFAULT_BRANCH;

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
        <Text className="mb-4 text-[14px] leading-5" style={{ color: color.text.secondary }}>
          {t('settings.githubSync.plaintextWarning')}
        </Text>

        <SettingsSection title={t('settings.githubSync.connectedSectionTitle')}>
          <SettingsRow
            label={repoLabel}
            subtitle={
              <GithubSyncBranchText
                i18nKey="settings.githubSync.repoBranch"
                branch={branchName}
                className="text-[13px] leading-[18px]"
                style={{ color: color.text.muted }}
              />
            }
            subtitleA11y={githubSyncBranchA11yLabel(
              t,
              'settings.githubSync.repoBranch',
              branchName,
            )}
            leftIcon={<GitBranch size={20} color={color.accent.primary} strokeWidth={1.8} />}
            onPress={() => setRepoPickerVisible(true)}
            isFirst
          />
          <SettingsRow
            label={isSyncing ? t('settings.githubSync.syncing') : t('settings.githubSync.syncNow')}
            subtitle={syncSubtitle}
            leftIcon={<RefreshCw size={20} color={color.accent.primary} strokeWidth={1.8} />}
            loading={isSyncing}
            onPress={isSyncing ? undefined : () => void handleSync()}
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
        onClose={() => setHistoryVisible(false)}
        onLoad={handleLoadHistory}
      />
    </View>
  );
}
