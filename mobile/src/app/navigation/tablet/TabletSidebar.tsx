import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { useFolderStore } from '@/entities/folder';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { getMonetizationMode } from '@/features/app-storefront';
import { useImportAudioFile } from '@/features/import-audio-file';
import { openPlanPaywall } from '@/features/plan-paywall';
import { useProEntitlement } from '@/features/pro-license';
import { hasAnyActiveTranscriptionJob } from '@/features/transcription/model/transcriptionJobRegistry';
import { useColors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

import type { RootStackParamList } from '../types';
import {
  requestTabletInboxSidebarNav,
  requestTabletOpenCreateFolder,
} from './tabletInboxNavBridge';
import { useTabletInboxSidebarStore } from './tabletInboxSidebarStore';
import { TabletSidebarBody } from './TabletSidebarBody';
import { TABLET_SIDEBAR_PAD, TABLET_SIDEBAR_WIDTH } from './tabletSidebarMetrics';
import { getTabletSidebarTheme } from './tabletSidebarTheme';
import {
  isOnSettingsRootScreen,
  navigateMainTab,
  navigateSettingsRoot,
  useTabletTabNavigationStore,
} from './tabletTabNavigation';
import { useTabletSidebarAiProcessing } from './useTabletSidebarAiProcessing';
import { useTabletSidebarNavCounts } from './useTabletSidebarNavCounts';

export const TabletSidebar = () => {
  const { t } = useTranslation();
  const color = useColors();
  const theme = getTabletSidebarTheme(color);
  const insets = useSafeAreaInsets();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const currentTab = useTabletTabNavigationStore((s) => s.activeTab);
  const { importAudioFile, isImporting } = useImportAudioFile();
  const { isProActive } = useProEntitlement();
  const monetizationMode = getMonetizationMode();
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const isPrivateMode = aiExecutionMode === 'private_experimental';
  const {
    inbox: inboxCount,
    unread: unreadCount,
    pinned: pinnedCount,
    archived: archivedCount,
    openTasks: openTasksCount,
    folderCounts,
  } = useTabletSidebarNavCounts();
  const aiProcessing = useTabletSidebarAiProcessing();

  const activeTranscriptionRecord = useRecordStore((s) =>
    s.records.find((r) => r.aiStatus === 'loading_model' || r.aiStatus === 'processing'),
  );

  const { folders, activeFolderId } = useFolderStore(
    useShallow((s) => ({
      folders: s.folders,
      activeFolderId: s.activeFolderId,
    })),
  );

  const filterStatus = useTabletInboxSidebarStore((s) => s.filterStatus);

  const isSettingsTab = currentTab === 'SettingsRoot';
  const navDimmed = isSettingsTab;

  const inboxSelection = useMemo(() => {
    if (isSettingsTab) return null;
    if (activeFolderId) return { kind: 'folder' as const, folderId: activeFolderId };
    if (filterStatus === 'pinned') return { kind: 'pinned' as const };
    if (filterStatus === 'archived') return { kind: 'archived' as const };
    return { kind: 'inbox' as const };
  }, [isSettingsTab, activeFolderId, filterStatus]);

  const navigateToInbox = useCallback(
    (target: Parameters<typeof requestTabletInboxSidebarNav>[0]) => {
      hapticSelection();
      if (currentTab !== 'Inbox') {
        navigateMainTab('Inbox');
      }
      requestTabletInboxSidebarNav(target);
    },
    [currentTab],
  );

  const openSettings = useCallback(() => {
    if (isOnSettingsRootScreen()) {
      return;
    }
    hapticSelection();
    navigateSettingsRoot();
  }, []);

  const openAllTasks = useCallback(() => {
    hapticSelection();
    if (currentTab !== 'Inbox') {
      navigateMainTab('Inbox');
    }
    rootNavigation.navigate('AllTasks');
  }, [currentTab, rootNavigation]);

  const openCreateFolder = useCallback(() => {
    if (currentTab !== 'Inbox') {
      navigateMainTab('Inbox');
    }
    requestTabletOpenCreateFolder();
  }, [currentTab]);

  const handleNewRecording = useCallback(() => {
    hapticSelection();
    if (hasAnyActiveTranscriptionJob()) {
      Alert.alert(
        t('record.blockedByTranscriptionTitle'),
        t('record.blockedByTranscriptionMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.open'),
            onPress: () => {
              if (activeTranscriptionRecord) {
                rootNavigation.navigate('RecordingDetail', { record: activeTranscriptionRecord });
              }
            },
          },
        ],
      );
      return;
    }
    rootNavigation.navigate('RecordModal');
  }, [activeTranscriptionRecord, rootNavigation, t]);

  const handleImportAudio = useCallback(() => {
    void importAudioFile();
  }, [importAudioFile]);

  const handleTextNote = useCallback(() => {
    hapticSelection();
    rootNavigation.navigate('TextNoteModal');
  }, [rootNavigation]);

  const inboxActive = !isSettingsTab && inboxSelection?.kind === 'inbox';
  const pinnedActive = !isSettingsTab && inboxSelection?.kind === 'pinned';
  const archivedActive = !isSettingsTab && inboxSelection?.kind === 'archived';

  return (
    <View
      style={{
        width: TABLET_SIDEBAR_WIDTH,
        flexShrink: 0,
        alignSelf: 'stretch',
        overflow: 'hidden',
        backgroundColor: theme.panel,
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 1,
          backgroundColor: theme.border,
          zIndex: 2,
        }}
      />
      <TabletSidebarBody
        color={color}
        theme={theme}
        insets={insets}
        t={t}
        isSettingsTab={isSettingsTab}
        navDimmed={navDimmed}
        isImporting={isImporting}
        isProActive={isProActive}
        monetizationMode={monetizationMode}
        folders={folders}
        folderCounts={folderCounts}
        isPrivateMode={isPrivateMode}
        currentTab={currentTab}
        inboxSelection={inboxSelection}
        inboxCount={inboxCount}
        hasUnread={unreadCount > 0}
        pinnedCount={pinnedCount}
        archivedCount={archivedCount}
        openTasksCount={openTasksCount}
        aiProcessing={aiProcessing}
        inboxActive={inboxActive}
        pinnedActive={pinnedActive}
        archivedActive={archivedActive}
        horizontalPad={TABLET_SIDEBAR_PAD}
        onOpenSettings={openSettings}
        onOpenPlanPaywall={openPlanPaywall}
        onRecord={handleNewRecording}
        onRecordLongPress={handleImportAudio}
        onTextNote={handleTextNote}
        navigateToInbox={navigateToInbox}
        openAllTasks={openAllTasks}
        openCreateFolder={openCreateFolder}
      />
    </View>
  );
};
