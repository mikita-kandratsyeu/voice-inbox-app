import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Archive, Inbox, Pin } from 'lucide-react-native';
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
import { SettingsPlanStatusCard } from '@/screens/settings/ui/SettingsPlanStatusCard';
import { useColors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

import type { RootStackParamList } from '../types';
import {
  requestTabletInboxSidebarNav,
  requestTabletOpenCreateFolder,
  requestTabletOpenEditFolder,
} from './tabletInboxNavBridge';
import { useTabletInboxSidebarStore } from './tabletInboxSidebarStore';
import { TabletSidebarComposeRow } from './TabletSidebarComposeRow';
import {
  TabletSidebarFoldersScroll,
  TabletSidebarFoldersSection,
} from './TabletSidebarFoldersSection';
import { TabletSidebarFooter } from './TabletSidebarFooter';
import { TABLET_SIDEBAR_PAD, TABLET_SIDEBAR_WIDTH } from './tabletSidebarMetrics';
import { TabletSidebarNavIcon, TabletSidebarNavItem } from './TabletSidebarNavItem';
import { getTabletSidebarTheme } from './tabletSidebarTheme';
import { navigateMainTab, useTabletTabNavigationStore } from './tabletTabNavigation';
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
    pinned: pinnedCount,
    archived: archivedCount,
    folderCounts,
  } = useTabletSidebarNavCounts();

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
    hapticSelection();
    navigateMainTab('SettingsRoot');
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

  const inboxIconColor = color.accent.primary;
  const pinnedIconColor = color.accent.unpin;
  const archiveIconColor = color.accent.success;
  const mutedIcon = color.text.secondary;

  return (
    <View
      style={{
        width: TABLET_SIDEBAR_WIDTH,
        flexShrink: 0,
        alignSelf: 'stretch',
        backgroundColor: theme.panel,
        borderRightWidth: 1,
        borderRightColor: theme.border,
      }}
    >
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: TABLET_SIDEBAR_PAD,
          paddingBottom: 14,
          gap: 14,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <TabletSidebarComposeRow
          color={color}
          onRecord={handleNewRecording}
          onRecordLongPress={handleImportAudio}
          onTextNote={handleTextNote}
          isImporting={isImporting}
        />
      </View>

      <View
        style={{
          flex: 1,
          minHeight: 0,
          paddingHorizontal: TABLET_SIDEBAR_PAD,
        }}
      >
        <View
          style={{
            paddingTop: 16,
            paddingBottom: 8,
            gap: 8,
            opacity: navDimmed ? 0.62 : 1,
          }}
        >
          <TabletSidebarNavItem
            label={t('tabs.inbox')}
            isActive={inboxActive}
            color={color}
            theme={theme}
            appearance="primary"
            onPress={() => navigateToInbox({ kind: 'inbox' })}
            icon={
              <TabletSidebarNavIcon
                isActive={inboxActive}
                activeColor={inboxIconColor}
                inactiveColor={mutedIcon}
              >
                <Inbox />
              </TabletSidebarNavIcon>
            }
          />
          <TabletSidebarNavItem
            label={t('inbox.filters.pinned')}
            isActive={pinnedActive}
            color={color}
            theme={theme}
            appearance="secondary"
            badgeCount={pinnedCount}
            onPress={() => navigateToInbox({ kind: 'pinned' })}
            icon={
              <TabletSidebarNavIcon
                isActive={pinnedActive}
                activeColor={pinnedIconColor}
                inactiveColor={mutedIcon}
              >
                <Pin />
              </TabletSidebarNavIcon>
            }
          />
          <TabletSidebarNavItem
            label={t('inbox.filters.archived')}
            isActive={archivedActive}
            color={color}
            theme={theme}
            appearance="secondary"
            badgeCount={archivedCount}
            onPress={() => navigateToInbox({ kind: 'archived' })}
            icon={
              <TabletSidebarNavIcon
                isActive={archivedActive}
                activeColor={archiveIconColor}
                inactiveColor={mutedIcon}
              >
                <Archive />
              </TabletSidebarNavIcon>
            }
          />
        </View>

        <TabletSidebarFoldersScroll contentDimmed={navDimmed}>
          <TabletSidebarFoldersSection
            color={color}
            theme={theme}
            folders={folders}
            folderCounts={folderCounts}
            isProActive={isProActive}
            isPrivateMode={isPrivateMode}
            isSettingsTab={isSettingsTab}
            inboxSelection={inboxSelection}
            currentTab={currentTab}
            onNavigateToInbox={navigateToInbox}
            onOpenCreateFolder={openCreateFolder}
            onOpenEditFolder={(folderId) => {
              hapticSelection();
              if (currentTab !== 'Inbox') {
                navigateMainTab('Inbox');
              }
              requestTabletOpenEditFolder(folderId);
            }}
          />
        </TabletSidebarFoldersScroll>
      </View>

      <View
        style={{
          paddingHorizontal: TABLET_SIDEBAR_PAD,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 14),
          gap: 14,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: theme.panel,
        }}
      >
        {!isProActive ? (
          <SettingsPlanStatusCard
            color={color}
            monetizationMode={monetizationMode}
            layout="sidebar"
            onPress={() => openPlanPaywall()}
          />
        ) : null}

        <TabletSidebarFooter
          color={color}
          theme={theme}
          isSettingsActive={isSettingsTab}
          onOpenSettings={openSettings}
        />
      </View>
    </View>
  );
};
