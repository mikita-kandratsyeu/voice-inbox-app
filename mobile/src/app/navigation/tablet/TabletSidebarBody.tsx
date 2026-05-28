import type { TFunction } from 'i18next';
import { Archive, Inbox, ListChecks, Pin } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';

import type { Folder } from '@/entities/folder';
import type { MonetizationMode } from '@/features/app-storefront';
import { SettingsPlanStatusCard } from '@/screens/settings/ui/SettingsPlanStatusCard';
import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

import type { TabletInboxSidebarTarget } from './tabletInboxNavBridge';
import { requestTabletOpenEditFolder } from './tabletInboxNavBridge';
import { TabletSidebarComposeRow } from './TabletSidebarComposeRow';
import {
  TabletSidebarFoldersExpandedHeader,
  TabletSidebarFoldersScroll,
  TabletSidebarFoldersSection,
} from './TabletSidebarFoldersSection';
import { TabletSidebarFooter } from './TabletSidebarFooter';
import { TabletSidebarNavIcon, TabletSidebarNavItem } from './TabletSidebarNavItem';
import type { TabletSidebarTheme } from './tabletSidebarTheme';
import { navigateMainTab } from './tabletTabNavigation';
import type { TabletSidebarAiProcessing } from './useTabletSidebarAiProcessing';
import type { TabletSidebarNavCounts } from './useTabletSidebarNavCounts';

export type TabletSidebarBodyProps = {
  horizontalPad: number;
  color: Colors;
  theme: TabletSidebarTheme;
  insets: EdgeInsets;
  t: TFunction;
  isSettingsTab: boolean;
  navDimmed: boolean;
  isImporting: boolean;
  isProActive: boolean;
  monetizationMode: MonetizationMode;
  folders: Folder[];
  folderCounts: TabletSidebarNavCounts['folderCounts'];
  isPrivateMode: boolean;
  currentTab: string;
  inboxSelection: { kind: 'folder'; folderId: string } | { kind: string; folderId?: string } | null;
  pinnedCount: number;
  archivedCount: number;
  openTasksCount: number;
  aiProcessing: TabletSidebarAiProcessing;
  inboxActive: boolean;
  pinnedActive: boolean;
  archivedActive: boolean;
  onOpenSettings: () => void;
  onOpenPlanPaywall: () => void;
  onRecord: () => void;
  onRecordLongPress: () => void;
  onTextNote: () => void;
  navigateToInbox: (target: TabletInboxSidebarTarget) => void;
  openAllTasks: () => void;
  openCreateFolder: () => void;
};

export function TabletSidebarBody({
  horizontalPad,
  color,
  theme,
  insets,
  t,
  isSettingsTab,
  navDimmed,
  isImporting,
  isProActive,
  monetizationMode,
  folders,
  folderCounts,
  isPrivateMode,
  currentTab,
  inboxSelection,
  pinnedCount,
  archivedCount,
  openTasksCount,
  aiProcessing,
  inboxActive,
  pinnedActive,
  archivedActive,
  onOpenSettings,
  onOpenPlanPaywall,
  onRecord,
  onRecordLongPress,
  onTextNote,
  navigateToInbox,
  openAllTasks,
  openCreateFolder,
}: TabletSidebarBodyProps) {
  const inboxIconColor = color.accent.primary;
  const pinnedIconColor = color.accent.unpin;
  const archiveIconColor = color.accent.success;
  const allTasksIconColor = color.accent.primary;
  const mutedIcon = color.text.secondary;

  const aiProcessingHint = t('aiStatus.aiProcessing');

  const inboxNav = (
    <TabletSidebarNavItem
      label={t('tabs.inbox')}
      isActive={inboxActive}
      color={color}
      theme={theme}
      appearance="primary"
      showProcessingIndicator={aiProcessing.inbox}
      accessibilityHint={aiProcessing.inbox ? aiProcessingHint : undefined}
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
  );

  const secondaryNav = (
    <>
      <TabletSidebarNavItem
        label={t('inbox.filters.pinned')}
        isActive={pinnedActive}
        color={color}
        theme={theme}
        appearance="secondary"
        badgeCount={pinnedCount}
        showProcessingIndicator={aiProcessing.pinned}
        accessibilityHint={aiProcessing.pinned ? aiProcessingHint : undefined}
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
        showProcessingIndicator={aiProcessing.archived}
        accessibilityHint={aiProcessing.archived ? aiProcessingHint : undefined}
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
      <TabletSidebarNavItem
        label={t('allTasks.title')}
        isActive={false}
        color={color}
        theme={theme}
        appearance="secondary"
        badgeCount={openTasksCount}
        onPress={openAllTasks}
        icon={
          <TabletSidebarNavIcon
            isActive={false}
            activeColor={allTasksIconColor}
            inactiveColor={mutedIcon}
          >
            <ListChecks />
          </TabletSidebarNavIcon>
        }
      />
    </>
  );

  const foldersBlock = (
    <TabletSidebarFoldersSection
      color={color}
      theme={theme}
      folders={folders}
      folderCounts={folderCounts}
      folderAiProcessing={aiProcessing.folderIds}
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
  );

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: horizontalPad,
          paddingBottom: 14,
          gap: 14,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <TabletSidebarComposeRow
          color={color}
          onRecord={onRecord}
          onRecordLongPress={onRecordLongPress}
          onTextNote={onTextNote}
          isImporting={isImporting}
        />
      </View>

      <View style={{ flex: 1, minHeight: 0, paddingHorizontal: horizontalPad }}>
        <View
          style={{
            paddingTop: 16,
            paddingBottom: 8,
            gap: 8,
            opacity: navDimmed ? 0.62 : 1,
          }}
        >
          {inboxNav}
          {secondaryNav}
        </View>

        {isPrivateMode ? (
          <View style={{ flexShrink: 0, opacity: navDimmed ? 0.62 : 1 }}>{foldersBlock}</View>
        ) : (
          <>
            <View style={{ flexShrink: 0, opacity: navDimmed ? 0.62 : 1 }}>
              <TabletSidebarFoldersExpandedHeader
                color={color}
                folders={folders}
                currentTab={currentTab}
                onOpenCreateFolder={openCreateFolder}
              />
            </View>

            <TabletSidebarFoldersScroll contentDimmed={navDimmed}>
              {foldersBlock}
            </TabletSidebarFoldersScroll>
          </>
        )}
      </View>

      <View
        style={{
          paddingHorizontal: horizontalPad,
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
            onPress={onOpenPlanPaywall}
          />
        ) : null}

        <TabletSidebarFooter
          color={color}
          theme={theme}
          isSettingsActive={isSettingsTab}
          onOpenSettings={onOpenSettings}
        />
      </View>
    </View>
  );
}
