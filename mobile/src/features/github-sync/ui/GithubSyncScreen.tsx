import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CalendarClock, Folder, GitBranch, History, RefreshCw, Unplug } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Switch, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import type { SettingsStackParamList } from '@/app/navigation/types';
import { useColors } from '@/shared/config';
import { formatRelativeTime, useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { SCREEN_PADDING, ScreenHeader, SettingsRow, SettingsSection } from '@/shared/ui';

import { GITHUB_SYNC_DEFAULT_BRANCH } from '../lib/constants';
import type { GithubRepoSummary } from '../lib/githubApi';
import type { GithubSyncAutoIntervalHours } from '../lib/githubSyncState';
import { useGithubSync } from '../model/useGithubSync';
import { GithubRepoPickerSheet } from './GithubRepoPickerSheet';
import { GithubSyncAutoIntervalSheet } from './GithubSyncAutoIntervalSheet';
import { GithubSyncBranchSheet } from './GithubSyncBranchSheet';
import { githubSyncBranchA11yLabel, GithubSyncBranchText } from './GithubSyncBranchText';
import { GithubSyncHistorySheet } from './GithubSyncHistorySheet';

function autoIntervalLabelKey(hours: GithubSyncAutoIntervalHours): string {
  return `settings.githubSync.autoInterval.h${hours}`;
}

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
    githubLogin,
    isSyncing,
    lastSyncedAt,
    autoSyncEnabled,
    autoSyncIntervalHours,
    repos,
    isLoadingRepos,
    branches,
    repoDefaultBranch,
    isLoadingBranches,
    loadBranches,
    deleteBranch,
    history,
    isLoadingHistory,
    selectRepository,
    createAndSelectRepository,
    disconnect,
    syncNow,
    updateBranch,
    setAutoSyncEnabled,
    setAutoSyncIntervalHours,
  } = useGithubSync();

  const [repoPickerVisible, setRepoPickerVisible] = useState(false);
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [branchSheetVisible, setBranchSheetVisible] = useState(false);
  const [intervalSheetVisible, setIntervalSheetVisible] = useState(false);
  const [isSavingBranch, setIsSavingBranch] = useState(false);
  const [deletingBranch, setDeletingBranch] = useState<string | null>(null);

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

  const handleSaveBranch = useCallback(
    async (branchName: string) => {
      setIsSavingBranch(true);
      try {
        const result = await updateBranch(branchName);
        if (!result.ok) {
          if (result.code === 'invalid_branch') {
            Alert.alert(t('common.error'), t('settings.githubSync.branchInvalid'));
            return;
          }
          if (result.code === 'unauthorized') {
            setBranchSheetVisible(false);
            Alert.alert(t('common.error'), t('settings.githubSync.sessionExpired'));
            navigation.goBack();
            return;
          }
          Alert.alert(t('common.error'), t('settings.githubSync.branchCreateFailed'));
          return;
        }
        setBranchSheetVisible(false);
      } finally {
        setIsSavingBranch(false);
      }
    },
    [navigation, t, updateBranch],
  );

  const handleDeleteBranch = useCallback(
    async (branchName: string) => {
      setDeletingBranch(branchName);
      try {
        const result = await deleteBranch(branchName);
        if (!result.ok && result.code === 'unauthorized') {
          setBranchSheetVisible(false);
          Alert.alert(t('common.error'), t('settings.githubSync.sessionExpired'));
          navigation.goBack();
        }
        return result;
      } finally {
        setDeletingBranch(null);
      }
    },
    [deleteBranch, navigation, t],
  );

  const handleLoadBranches = useCallback(async () => {
    const result = await loadBranches();
    if (!result.ok && result.code === 'unauthorized') {
      setBranchSheetVisible(false);
      Alert.alert(t('common.error'), t('settings.githubSync.sessionExpired'));
      navigation.goBack();
    }
  }, [loadBranches, navigation, t]);

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
  const connectedSubtitle = githubLogin
    ? t('settings.githubSync.connectedAs', { login: githubLogin })
    : t('settings.githubSync.connectedStatus');

  const infoTextStyle = {
    color: color.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  } as const;

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
        <Text className="mb-4 text-[14px] leading-5" style={{ color: color.text.secondary }}>
          {t('settings.githubSync.audioRestoreHint')}
        </Text>

        <SettingsSection title={t('settings.githubSync.connectedSectionTitle')}>
          <SettingsRow
            label={repoLabel}
            subtitle={connectedSubtitle}
            leftIcon={<Folder size={20} color={color.accent.models} strokeWidth={1.8} />}
            onPress={() => setRepoPickerVisible(true)}
            isFirst
          />
          <SettingsRow
            label={t('settings.githubSync.branchRow')}
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
            leftIcon={<GitBranch size={20} color={color.accent.transcript} strokeWidth={1.8} />}
            onPress={() => setBranchSheetVisible(true)}
          />
          <SettingsRow
            label={isSyncing ? t('settings.githubSync.syncing') : t('settings.githubSync.syncNow')}
            subtitle={syncSubtitle}
            leftIcon={<RefreshCw size={20} color={color.accent.success} strokeWidth={1.8} />}
            loading={isSyncing}
            onPress={isSyncing ? undefined : () => void handleSync()}
          />
          <SettingsRow
            label={t('settings.githubSync.history')}
            leftIcon={<History size={20} color={color.accent.cache} strokeWidth={1.8} />}
            onPress={() => setHistoryVisible(true)}
          />
          <SettingsRow
            label={t('settings.githubSync.disconnect')}
            leftIcon={<Unplug size={20} color={color.status.error.text} strokeWidth={1.8} />}
            onPress={handleDisconnect}
            isLast
          />
        </SettingsSection>

        <SettingsSection title={t('settings.githubSync.scheduleSectionTitle')}>
          <SettingsRow
            label={t('settings.githubSync.autoSync')}
            subtitle={t('settings.githubSync.autoSyncHint')}
            leftIcon={<CalendarClock size={20} color={color.accent.primary} strokeWidth={1.8} />}
            rightSlot={
              <Switch
                value={autoSyncEnabled}
                onValueChange={setAutoSyncEnabled}
                accessibilityLabel={t('settings.githubSync.autoSync')}
                trackColor={{
                  false: color.background.tertiary,
                  true: color.accent.primary,
                }}
                thumbColor={color.icon.onAccent}
              />
            }
            showChevron={false}
            isFirst
            isLast={!autoSyncEnabled}
          />
          {autoSyncEnabled ? (
            <SettingsRow
              label={t('settings.githubSync.autoIntervalRow')}
              value={t(autoIntervalLabelKey(autoSyncIntervalHours))}
              onPress={() => setIntervalSheetVisible(true)}
              isLast
            />
          ) : null}
        </SettingsSection>

        <SettingsSection title={t('settings.githubSync.aboutSectionTitle')}>
          <View
            className="rounded-2xl px-4 py-3.5"
            style={{ backgroundColor: color.background.card }}
          >
            <Text style={infoTextStyle}>{t('settings.githubSync.scopeHint')}</Text>
            <Text style={[infoTextStyle, { marginTop: 12 }]}>
              {t('settings.githubSync.multiDeviceHint')}
            </Text>
          </View>
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
      <GithubSyncBranchSheet
        visible={branchSheetVisible}
        color={color}
        branch={branchName}
        defaultBranch={repoDefaultBranch}
        branches={branches}
        loading={isLoadingBranches}
        saving={isSavingBranch}
        deletingBranch={deletingBranch}
        onClose={() => setBranchSheetVisible(false)}
        onLoadBranches={handleLoadBranches}
        onSelect={handleSaveBranch}
        onSave={handleSaveBranch}
        onDelete={handleDeleteBranch}
      />
      <GithubSyncAutoIntervalSheet
        visible={intervalSheetVisible}
        color={color}
        selectedHours={autoSyncIntervalHours}
        onSelect={(hours) => {
          setAutoSyncIntervalHours(hours);
          setIntervalSheetVisible(false);
        }}
        onClose={() => setIntervalSheetVisible(false)}
      />
    </View>
  );
}
