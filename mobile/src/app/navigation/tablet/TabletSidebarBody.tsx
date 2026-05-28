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

import { CollapsedRailStack } from './CollapsedRailStack';
import type { TabletInboxSidebarTarget } from './tabletInboxNavBridge';
import { requestTabletOpenEditFolder } from './tabletInboxNavBridge';
import { TabletSidebarComposeRow } from './TabletSidebarComposeRow';
import {
  TabletSidebarFoldersExpandedHeader,
  TabletSidebarFoldersScroll,
  TabletSidebarFoldersSection,
} from './TabletSidebarFoldersSection';
import { TabletSidebarFooter } from './TabletSidebarFooter';
import { TABLET_SIDEBAR_COLLAPSED_STACK_GAP } from './tabletSidebarMetrics';
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

  const inboxNav = (
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
  );

  const secondaryNav = (
    <>
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
    </>
  );

  const foldersBlock = (
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
  );

  const showCollapsedFoldersDivider = collapsed && (isPrivateMode || folders.length > 0);

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: horizontalPad,
          paddingBottom: collapsed ? TABLET_SIDEBAR_COLLAPSED_STACK_GAP : 14,
          gap: collapsed ? TABLET_SIDEBAR_COLLAPSED_STACK_GAP : 14,
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
        {collapsed ? (
          <>
            <View
              style={{
                flexShrink: 0,
                opacity: navDimmed ? 0.62 : 1,
                paddingTop: TABLET_SIDEBAR_COLLAPSED_STACK_GAP,
              }}
            >
              <CollapsedRailStack>
                {inboxNav}
                <TabletSidebarSectionDivider color={color} align="stretch" compact />
                {secondaryNav}
              </CollapsedRailStack>
            </View>

            {showCollapsedFoldersDivider ? (
              <View
                style={{
                  flexShrink: 0,
                  paddingVertical: TABLET_SIDEBAR_COLLAPSED_STACK_GAP,
                  opacity: navDimmed ? 0.62 : 1,
                }}
              >
                <TabletSidebarSectionDivider color={color} align="stretch" compact />
              </View>
            ) : null}

            <TabletSidebarFoldersScroll
              contentDimmed={navDimmed}
              collapsed
              contentContainerStyle={{
                paddingTop: showCollapsedFoldersDivider ? 0 : TABLET_SIDEBAR_COLLAPSED_STACK_GAP,
              }}
            >
              {foldersBlock}
            </TabletSidebarFoldersScroll>
          </>
        ) : (
          <>
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

                <TabletSidebarFoldersScroll contentDimmed={navDimmed} collapsed={false}>
                  {foldersBlock}
                </TabletSidebarFoldersScroll>
              </>
            )}
          </>
        )}
      </View>

      <View
        style={{
          paddingHorizontal: horizontalPad,
          paddingTop: collapsed ? 8 : 12,
          paddingBottom: Math.max(insets.bottom, collapsed ? 10 : 14),
          gap: collapsed ? 8 : 14,
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
