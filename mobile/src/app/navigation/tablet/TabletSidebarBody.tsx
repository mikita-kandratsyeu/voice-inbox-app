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
  TabletSidebarFoldersScroll,
  TabletSidebarFoldersSection,
} from './TabletSidebarFoldersSection';
import { TabletSidebarFooter } from './TabletSidebarFooter';
import {
  TabletSidebarNavIcon,
  TabletSidebarNavItem,
  TabletSidebarSectionDivider,
} from './TabletSidebarNavItem';
import type { TabletSidebarTheme } from './tabletSidebarTheme';
import { navigateMainTab } from './tabletTabNavigation';
import type { TabletSidebarNavCounts } from './useTabletSidebarNavCounts';

export type TabletSidebarBodyProps = {
  collapsed: boolean;
  horizontalPad: number;
  color: Colors;
  theme: TabletSidebarTheme;
  insets: EdgeInsets;
  t: TFunction;
  isCollapsedToggle: boolean;
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
  inboxActive: boolean;
  pinnedActive: boolean;
  archivedActive: boolean;
  onToggleCollapsed: () => void;
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
  collapsed,
  horizontalPad,
  color,
  theme,
  insets,
  t,
  isCollapsedToggle,
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
  inboxActive,
  pinnedActive,
  archivedActive,
  onToggleCollapsed,
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
          collapsed={collapsed}
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
            alignItems: collapsed ? 'center' : 'stretch',
          }}
        >
          <TabletSidebarNavItem
            label={t('tabs.inbox')}
            isActive={inboxActive}
            color={color}
            theme={theme}
            appearance="primary"
            collapsed={collapsed}
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
          {collapsed ? <TabletSidebarSectionDivider color={color} align="stretch" /> : null}
          <TabletSidebarNavItem
            label={t('inbox.filters.pinned')}
            isActive={pinnedActive}
            color={color}
            theme={theme}
            appearance="secondary"
            collapsed={collapsed}
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
            collapsed={collapsed}
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
          <TabletSidebarNavItem
            label={t('allTasks.title')}
            isActive={false}
            color={color}
            theme={theme}
            appearance="secondary"
            collapsed={collapsed}
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
        </View>

        <TabletSidebarFoldersScroll contentDimmed={navDimmed} collapsed={collapsed}>
          <TabletSidebarFoldersSection
            color={color}
            theme={theme}
            collapsed={collapsed}
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
          paddingHorizontal: horizontalPad,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 14),
          gap: 14,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: theme.panel,
        }}
      >
        {!isProActive && !collapsed ? (
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
          isCollapsed={isCollapsedToggle}
          onOpenSettings={onOpenSettings}
          onToggleCollapsed={onToggleCollapsed}
        />
      </View>
    </View>
  );
}
