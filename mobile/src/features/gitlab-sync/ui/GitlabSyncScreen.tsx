import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CalendarClock, Folder, GitBranch, History, RefreshCw, Unplug } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Switch, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import type { SettingsStackParamList } from '@/app/navigation/types';
import { getSettingsIconColor } from '@/screens/settings/lib/settingsIconColor';
import { useColors } from '@/shared/config';
import { formatRelativeTime, useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import {
  HeaderIconButton,
  SCREEN_PADDING,
  ScreenHeader,
  SettingsRow,
  SettingsSection,
} from '@/shared/ui';

import { GITLAB_SYNC_DEFAULT_BRANCH } from '../lib/constants';
import type { GitlabCommitSummary, GitlabRepoSummary } from '../lib/gitlabApi';
import type { GitlabSyncAutoIntervalHours } from '../lib/gitlabSyncState';
import { useGitlabSync } from '../model/useGitlabSync';
import { GitlabRepoPickerSheet } from './GitlabRepoPickerSheet';
import { GitlabSyncAutoIntervalSheet } from './GitlabSyncAutoIntervalSheet';
import { GitlabSyncBranchSheet } from './GitlabSyncBranchSheet';
import { gitlabSyncBranchA11yLabel, GitlabSyncBranchText } from './GitlabSyncBranchText';
import { GitlabSyncHistorySheet } from './GitlabSyncHistorySheet';

function autoIntervalLabelKey(hours: GitlabSyncAutoIntervalHours): string {
  return `settings.gitlabSync.autoInterval.h${hours}`;
}

export function GitlabSyncScreen() {
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
    gitlabLogin,
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
    pinnedRepoFullNames,
    togglePinnedRepo,
    disconnect,
    syncNow,
    restoreVersion,
    updateBranch,
    setAutoSyncEnabled,
    setAutoSyncIntervalHours,
  } = useGitlabSync();

  const [repoPickerVisible, setRepoPickerVisible] = useState(false);
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [branchSheetVisible, setBranchSheetVisible] = useState(false);
  const [intervalSheetVisible, setIntervalSheetVisible] = useState(false);
  const [isSavingBranch, setIsSavingBranch] = useState(false);
  const [deletingBranch, setDeletingBranch] = useState<string | null>(null);
  const [restoringSha, setRestoringSha] = useState<string | null>(null);

  const handleLoadRepos = useCallback(async () => {
    const result = await loadRepos();
    if (!result.ok && result.code === 'unauthorized') {
      setRepoPickerVisible(false);
      Alert.alert(t('common.error'), t('settings.gitlabSync.sessionExpired'));
      navigation.goBack();
    }
  }, [loadRepos, navigation, t]);

  const handleLoadHistory = useCallback(async () => {
    const result = await loadHistory();
    if (!result.ok && result.code === 'unauthorized') {
      setHistoryVisible(false);
      Alert.alert(t('common.error'), t('settings.gitlabSync.sessionExpired'));
      navigation.goBack();
    }
  }, [loadHistory, navigation, t]);

  const handleSelectRepo = useCallback(
    async (repo: GitlabRepoSummary) => {
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
        Alert.alert(t('common.error'), t('settings.gitlabSync.createRepoFailed'));
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
        Alert.alert(t('common.error'), t('settings.gitlabSync.sessionExpired'));
        navigation.goBack();
        return;
      }
      if (result.code === 'sync_timeout') {
        Alert.alert(t('common.error'), t('settings.gitlabSync.syncTimeout'));
        return;
      }
      if (result.code === 'ref_conflict') {
        Alert.alert(t('common.error'), t('settings.gitlabSync.syncRefConflict'));
        return;
      }
      Alert.alert(
        t('common.error'),
        'message' in result && result.message
          ? result.message
          : t('settings.gitlabSync.syncFailed'),
      );
      return;
    }
    if (result.alreadyUpToDate) {
      Alert.alert(t('common.done'), t('settings.gitlabSync.alreadyUpToDate'));
      return;
    }
    Alert.alert(t('common.done'), t('settings.gitlabSync.syncSuccess'));
  }, [navigation, syncNow, t]);

  const handleSaveBranch = useCallback(
    async (branchName: string) => {
      setIsSavingBranch(true);
      try {
        const result = await updateBranch(branchName);
        if (!result.ok) {
          if (result.code === 'invalid_branch') {
            Alert.alert(t('common.error'), t('settings.gitlabSync.branchInvalid'));
            return;
          }
          if (result.code === 'unauthorized') {
            setBranchSheetVisible(false);
            Alert.alert(t('common.error'), t('settings.gitlabSync.sessionExpired'));
            navigation.goBack();
            return;
          }
          Alert.alert(t('common.error'), t('settings.gitlabSync.branchCreateFailed'));
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
          Alert.alert(t('common.error'), t('settings.gitlabSync.sessionExpired'));
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
      Alert.alert(t('common.error'), t('settings.gitlabSync.sessionExpired'));
      navigation.goBack();
    }
  }, [loadBranches, navigation, t]);

  const handleRestoreCommit = useCallback(
    (commit: GitlabCommitSummary) => {
      Alert.alert(t('settings.gitlabSync.restoreTitle'), t('settings.gitlabSync.restoreMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.gitlabSync.restoreConfirm'),
          onPress: () => {
            void (async () => {
              setRestoringSha(commit.sha);
              try {
                const result = await restoreVersion(commit.sha);
                if (!isFocusedRef.current) {
                  return;
                }
                if (!result.ok) {
                  if (result.code === 'unauthorized') {
                    setHistoryVisible(false);
                    Alert.alert(t('common.error'), t('settings.gitlabSync.sessionExpired'));
                    navigation.goBack();
                    return;
                  }
                  Alert.alert(t('common.error'), t('settings.gitlabSync.restoreFailed'));
                  return;
                }
                setHistoryVisible(false);
                navigation.navigate('ImportRecords', {
                  records: result.importResult.records,
                  folders: result.importResult.folders,
                  legacyFolders: result.importResult.legacyFolders,
                  graphLayouts: result.importResult.graphLayouts,
                  remoteSyncAuxiliary: result.auxiliaryData,
                  gitlabRestore: {
                    commitSha: commit.sha,
                    exportedAt: result.exportedAt,
                  },
                });
              } finally {
                setRestoringSha(null);
              }
            })();
          },
        },
      ]);
    },
    [navigation, restoreVersion, t],
  );

  const handleDisconnect = useCallback(() => {
    Alert.alert(
      t('settings.gitlabSync.disconnectTitle'),
      t('settings.gitlabSync.disconnectMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.gitlabSync.disconnectConfirm'),
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
    : t('settings.gitlabSync.notConnected');

  const syncSubtitle =
    lastSyncedAt != null
      ? t('settings.gitlabSync.lastSynced', {
          time: formatRelativeTime(lastSyncedAt, i18n.language),
        })
      : t('settings.gitlabSync.neverSynced');

  const branchName = secrets?.branch ?? GITLAB_SYNC_DEFAULT_BRANCH;
  const connectedSubtitle = gitlabLogin
    ? t('settings.gitlabSync.connectedAs', { login: gitlabLogin })
    : t('settings.gitlabSync.connectedStatus');

  const infoTextStyle = {
    color: color.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  } as const;

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader
        title={t('settings.gitlabSync.sectionTitle')}
        onBack={() => navigation.goBack()}
        rightSlot={
          <HeaderIconButton
            iconOnly
            variant="icon"
            size="md"
            accessibilityLabel={t('settings.gitlabSync.disconnect')}
            icon={<Unplug size={18} color={color.status.error.text} strokeWidth={2.2} />}
            color={color}
            onPress={handleDisconnect}
          />
        }
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
          {t('settings.gitlabSync.plaintextWarning')}
        </Text>
        <Text className="mb-4 text-[14px] leading-5" style={{ color: color.text.secondary }}>
          {t('settings.gitlabSync.audioRestoreHint')}
        </Text>

        <SettingsSection title={t('settings.gitlabSync.connectedSectionTitle')}>
          <SettingsRow
            label={repoLabel}
            subtitle={connectedSubtitle}
            leftIcon={<Folder size={20} color={color.accent.models} strokeWidth={1.8} />}
            onPress={() => setRepoPickerVisible(true)}
            isFirst
          />
          <SettingsRow
            label={t('settings.gitlabSync.branchRow')}
            subtitle={
              <GitlabSyncBranchText
                i18nKey="settings.gitlabSync.repoBranch"
                branch={branchName}
                className="text-[13px] leading-[18px]"
                style={{ color: color.text.muted }}
              />
            }
            subtitleA11y={gitlabSyncBranchA11yLabel(
              t,
              'settings.gitlabSync.repoBranch',
              branchName,
            )}
            leftIcon={<GitBranch size={20} color={color.accent.transcript} strokeWidth={1.8} />}
            onPress={() => setBranchSheetVisible(true)}
          />
          <SettingsRow
            label={isSyncing ? t('settings.gitlabSync.syncing') : t('settings.gitlabSync.syncNow')}
            subtitle={syncSubtitle}
            leftIcon={
              <RefreshCw
                size={20}
                color={getSettingsIconColor(color, 'refreshCw')}
                strokeWidth={1.8}
              />
            }
            loading={isSyncing}
            onPress={isSyncing ? undefined : () => void handleSync()}
          />
          <SettingsRow
            label={t('settings.gitlabSync.history')}
            leftIcon={<History size={20} color={color.accent.cache} strokeWidth={1.8} />}
            onPress={() => setHistoryVisible(true)}
            isLast
          />
        </SettingsSection>

        <SettingsSection title={t('settings.gitlabSync.scheduleSectionTitle')}>
          <SettingsRow
            label={t('settings.gitlabSync.autoSync')}
            subtitle={t('settings.gitlabSync.autoSyncHint')}
            leftIcon={
              <CalendarClock
                size={20}
                color={getSettingsIconColor(color, 'calendarClock')}
                strokeWidth={1.8}
              />
            }
            rightSlot={
              <Switch
                value={autoSyncEnabled}
                onValueChange={setAutoSyncEnabled}
                accessibilityLabel={t('settings.gitlabSync.autoSync')}
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
              label={t('settings.gitlabSync.autoIntervalRow')}
              value={t(autoIntervalLabelKey(autoSyncIntervalHours))}
              onPress={() => setIntervalSheetVisible(true)}
              isLast
            />
          ) : null}
        </SettingsSection>

        <SettingsSection title={t('settings.gitlabSync.aboutSectionTitle')}>
          <View
            className="rounded-2xl px-4 py-3.5"
            style={{ backgroundColor: color.background.card }}
          >
            <Text style={infoTextStyle}>{t('settings.gitlabSync.scopeHint')}</Text>
            <Text style={[infoTextStyle, { marginTop: 12 }]}>
              {t('settings.gitlabSync.multiDeviceHint')}
            </Text>
          </View>
        </SettingsSection>
      </ScrollView>

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
      <GitlabSyncHistorySheet
        visible={historyVisible}
        color={color}
        commits={history}
        loading={isLoadingHistory}
        restoringSha={restoringSha}
        onClose={() => setHistoryVisible(false)}
        onLoad={handleLoadHistory}
        onRestore={handleRestoreCommit}
      />
      <GitlabSyncBranchSheet
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
      <GitlabSyncAutoIntervalSheet
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
