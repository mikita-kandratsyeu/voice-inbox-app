import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Archive, Inbox, Pin, Plus } from 'lucide-react-native';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { useFolderStore } from '@/entities/folder';
import { FolderLucideIcon } from '@/entities/folder/lib/folderLucideIcons';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { getMonetizationMode } from '@/features/app-storefront';
import { useImportAudioFile } from '@/features/import-audio-file';
import { openPlanPaywall } from '@/features/plan-paywall';
import { useProEntitlement } from '@/features/pro-license';
import { hasAnyActiveTranscriptionJob } from '@/features/transcription/model/transcriptionJobRegistry';
import { SettingsPlanStatusCard } from '@/screens/settings/ui/SettingsPlanStatusCard';
import { useColors } from '@/shared/config';
import { hapticSelection, resolveDisplayFolderColor } from '@/shared/lib';

import type { BottomTabParamList, RootStackParamList } from '../types';
import {
  requestTabletInboxSidebarNav,
  requestTabletOpenCreateFolder,
  requestTabletOpenEditFolder,
} from './tabletInboxNavBridge';
import { useTabletInboxSidebarStore } from './tabletInboxSidebarStore';
import { TabletSidebarComposeRow } from './TabletSidebarComposeRow';
import { TabletSidebarFooter } from './TabletSidebarFooter';
import { TABLET_SIDEBAR_PAD, TABLET_SIDEBAR_WIDTH } from './tabletSidebarMetrics';
import {
  TabletSidebarNavIcon,
  TabletSidebarNavItem,
  TabletSidebarSectionLabel,
} from './TabletSidebarNavItem';
import { getTabletSidebarTheme } from './tabletSidebarTheme';

export const TabletSidebar = () => {
  const { t } = useTranslation();
  const color = useColors();
  const theme = getTabletSidebarTheme(color);
  const insets = useSafeAreaInsets();
  const tabNavigation = useNavigation<BottomTabNavigationProp<BottomTabParamList>>();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { importAudioFile, isImporting } = useImportAudioFile();
  const { isProActive } = useProEntitlement();
  const monetizationMode = getMonetizationMode();
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const isPrivateMode = aiExecutionMode === 'private_experimental';

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

  const tabIndex = tabNavigation.getState().index;
  const currentTab = tabNavigation.getState().routes[tabIndex]?.name ?? 'Inbox';
  const isSettingsTab = currentTab === 'SettingsRoot';

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
        tabNavigation.navigate('Inbox');
      }
      requestTabletInboxSidebarNav(target);
    },
    [currentTab, tabNavigation],
  );

  const openSettings = useCallback(() => {
    hapticSelection();
    tabNavigation.navigate('SettingsRoot');
  }, [tabNavigation]);

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
          onTextNote={handleTextNote}
          onImportAudio={handleImportAudio}
          importDisabled={isImporting}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: TABLET_SIDEBAR_PAD,
          paddingTop: 16,
          paddingBottom: 16,
          alignItems: 'stretch',
          gap: 8,
        }}
        showsVerticalScrollIndicator={false}
      >
        <TabletSidebarNavItem
          label={t('tabs.inbox')}
          isActive={inboxActive}
          color={color}
          theme={theme}
          onPress={() => navigateToInbox({ kind: 'inbox' })}
          icon={
            <TabletSidebarNavIcon
              isActive={inboxActive}
              activeColor={inboxIconColor}
              inactiveColor={inboxIconColor}
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
          onPress={() => navigateToInbox({ kind: 'pinned' })}
          icon={
            <TabletSidebarNavIcon
              isActive={pinnedActive}
              activeColor={pinnedIconColor}
              inactiveColor={pinnedIconColor}
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
          onPress={() => navigateToInbox({ kind: 'archived' })}
          icon={
            <TabletSidebarNavIcon
              isActive={archivedActive}
              activeColor={archiveIconColor}
              inactiveColor={archiveIconColor}
            >
              <Archive />
            </TabletSidebarNavIcon>
          }
        />

        {!isPrivateMode ? (
          <>
            <TabletSidebarSectionLabel
              label={t('tablet.sidebar.folders')}
              color={color}
              trailing={
                <Pressable
                  onPress={() => {
                    hapticSelection();
                    if (currentTab !== 'Inbox') {
                      tabNavigation.navigate('Inbox');
                    }
                    requestTabletOpenCreateFolder();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('folders.create')}
                  hitSlop={10}
                  style={({ pressed }) => ({
                    width: 28,
                    height: 28,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Plus size={20} color={color.accent.primary} strokeWidth={2.4} />
                </Pressable>
              }
            />
            {folders.map((folder) => {
              const folderHex = resolveDisplayFolderColor(folder.color, isProActive);
              const isActive =
                !isSettingsTab &&
                inboxSelection?.kind === 'folder' &&
                inboxSelection.folderId === folder.id;
              return (
                <TabletSidebarNavItem
                  key={folder.id}
                  label={folder.name}
                  isActive={isActive}
                  color={color}
                  theme={theme}
                  accentHex={folderHex}
                  onPress={() => navigateToInbox({ kind: 'folder', folderId: folder.id })}
                  onLongPress={() => {
                    hapticSelection();
                    if (currentTab !== 'Inbox') {
                      tabNavigation.navigate('Inbox');
                    }
                    requestTabletOpenEditFolder(folder.id);
                  }}
                  icon={
                    folder.icon ? (
                      <FolderLucideIcon
                        iconId={folder.icon}
                        size={21}
                        color={isActive ? folderHex : folderHex}
                        strokeWidth={2}
                      />
                    ) : (
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: folderHex,
                        }}
                      />
                    )
                  }
                />
              );
            })}
          </>
        ) : null}
      </ScrollView>

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
          isSettingsActive={isSettingsTab}
          onOpenSettings={openSettings}
        />
      </View>
    </View>
  );
};
