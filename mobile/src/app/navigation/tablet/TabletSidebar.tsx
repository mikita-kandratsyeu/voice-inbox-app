import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { useFolderStore } from '@/entities/folder';
import { useRecordStore } from '@/entities/record';
import { areFoldersEnabledInAiMode, useSettingsStore } from '@/entities/settings';
import { openPlanPaywall } from '@/features/plan-paywall';
import { useProEntitlement } from '@/features/pro-license';
import { hasAnyActiveTranscriptionJob } from '@/features/transcription/model/transcriptionJobRegistry';
import { AutomationComingSoonSheet } from '@/screens/settings/ui/AutomationComingSoonSheet';
import { useColors } from '@/shared/config';
import { hapticSelection, selectPlatform } from '@/shared/lib';
import { FrostedChromeBackground } from '@/shared/ui';

import type { RootStackParamList } from '../types';
import {
  requestTabletInboxSidebarNav,
  requestTabletOpenCreateFolder,
} from './tabletInboxNavBridge';
import { useTabletInboxSidebarStore } from './tabletInboxSidebarStore';
import { TabletSidebarBody } from './TabletSidebarBody';
import {
  getTabletSidebarSlotWidth,
  TABLET_SIDEBAR_ANDROID_ELEVATION,
  TABLET_SIDEBAR_FLOAT_GAP,
  TABLET_SIDEBAR_FLOAT_MARGIN_BOTTOM,
  TABLET_SIDEBAR_FLOAT_MARGIN_LEFT,
  TABLET_SIDEBAR_FLOAT_MARGIN_TOP,
  TABLET_SIDEBAR_FLOAT_RADIUS,
  TABLET_SIDEBAR_IOS_SHADOW_OFFSET_Y,
  TABLET_SIDEBAR_IOS_SHADOW_RADIUS,
  TABLET_SIDEBAR_PAD,
  tabletSidebarShadowOpacity,
} from './tabletSidebarMetrics';
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
  const { isProActive } = useProEntitlement();
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const foldersEnabled = areFoldersEnabledInAiMode(aiExecutionMode, privateAiProvider);
  const {
    inbox: inboxCount,
    unread: unreadCount,
    pinned: pinnedCount,
    archived: archivedCount,
    openTasks: openTasksCount,
    notesGraphNodes: notesGraphNodeCount,
    folderCounts,
  } = useTabletSidebarNavCounts();
  const aiProcessing = useTabletSidebarAiProcessing();
  const [notesGraphProSheetVisible, setNotesGraphProSheetVisible] = useState(false);

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

  const openNotesGraph = useCallback(() => {
    if (!isProActive) {
      hapticSelection();
      setNotesGraphProSheetVisible(true);
      return;
    }
    rootNavigation.navigate('NotesGraph');
    hapticSelection();
  }, [isProActive, rootNavigation]);

  const handleCloseNotesGraphProSheet = useCallback(() => {
    setNotesGraphProSheetVisible(false);
  }, []);

  const handleNotesGraphProUpgrade = useCallback(() => {
    setNotesGraphProSheetVisible(false);
    openPlanPaywall();
  }, []);

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
        width: getTabletSidebarSlotWidth(),
        flexShrink: 0,
        paddingLeft: TABLET_SIDEBAR_FLOAT_MARGIN_LEFT,
        paddingRight: TABLET_SIDEBAR_FLOAT_GAP,
        paddingTop: insets.top + TABLET_SIDEBAR_FLOAT_MARGIN_TOP,
        paddingBottom: Math.max(insets.bottom, 8) + TABLET_SIDEBAR_FLOAT_MARGIN_BOTTOM,
      }}
    >
      <View style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            borderRadius: TABLET_SIDEBAR_FLOAT_RADIUS,
            backgroundColor: 'transparent',
            ...selectPlatform({
              ios: {
                shadowColor: color.shadow.color,
                shadowOffset: { width: 0, height: TABLET_SIDEBAR_IOS_SHADOW_OFFSET_Y },
                shadowOpacity: tabletSidebarShadowOpacity(color.shadow.opacity),
                shadowRadius: TABLET_SIDEBAR_IOS_SHADOW_RADIUS,
              },
              android: {
                elevation: TABLET_SIDEBAR_ANDROID_ELEVATION,
              },
              default: {},
            }),
          }}
        >
          <View
            style={{
              flex: 1,
              borderRadius: TABLET_SIDEBAR_FLOAT_RADIUS,
              overflow: 'hidden',
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFillObject, { overflow: 'hidden' }]}
            >
              <FrostedChromeBackground borderRadius={TABLET_SIDEBAR_FLOAT_RADIUS} />
            </View>
            <TabletSidebarBody
              color={color}
              theme={theme}
              t={t}
              isSettingsTab={isSettingsTab}
              navDimmed={navDimmed}
              isProActive={isProActive}
              folders={folders}
              folderCounts={folderCounts}
              foldersEnabled={foldersEnabled}
              currentTab={currentTab}
              inboxSelection={inboxSelection}
              inboxCount={inboxCount}
              hasUnread={unreadCount > 0}
              pinnedCount={pinnedCount}
              archivedCount={archivedCount}
              openTasksCount={openTasksCount}
              notesGraphNodeCount={notesGraphNodeCount}
              aiProcessing={aiProcessing}
              inboxActive={inboxActive}
              pinnedActive={pinnedActive}
              archivedActive={archivedActive}
              horizontalPad={TABLET_SIDEBAR_PAD}
              onOpenSettings={openSettings}
              onOpenPlanPaywall={openPlanPaywall}
              onRecord={handleNewRecording}
              onTextNote={handleTextNote}
              navigateToInbox={navigateToInbox}
              openAllTasks={openAllTasks}
              openNotesGraph={openNotesGraph}
              openCreateFolder={openCreateFolder}
            />
          </View>
        </View>
      </View>
      <AutomationComingSoonSheet
        visible={notesGraphProSheetVisible}
        feature="notesGraph"
        onClose={handleCloseNotesGraphProSheet}
        onUpgradePress={handleNotesGraphProUpgrade}
      />
    </View>
  );
};
