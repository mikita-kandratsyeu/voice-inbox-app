import { ArrowDownUp, Folder, Plus } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { Folder as FolderEntity } from '@/entities/folder';
import { FolderLucideIcon } from '@/entities/folder/lib/folderLucideIcons';
import type { Colors } from '@/shared/config';
import { hapticSelection, resolveDisplayFolderColor } from '@/shared/lib';

import type { TabletInboxSidebarTarget } from './tabletInboxNavBridge';
import { requestTabletOpenReorderFolders } from './tabletInboxNavBridge';
import { TABLET_SIDEBAR_COLLAPSED_ITEM_SIZE } from './tabletSidebarMetrics';
import {
  TabletSidebarNavIcon,
  TabletSidebarNavItem,
  TabletSidebarSectionDivider,
  TabletSidebarSectionLabel,
} from './TabletSidebarNavItem';
import type { TabletSidebarTheme } from './tabletSidebarTheme';
import { navigateMainTab } from './tabletTabNavigation';
import type { TabletSidebarNavCounts } from './useTabletSidebarNavCounts';

function FolderSectionHeaderAction({
  onPress,
  accessibilityLabel,
  children,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

type TabletSidebarFoldersSectionProps = {
  color: Colors;
  theme: TabletSidebarTheme;
  collapsed?: boolean;
  folders: FolderEntity[];
  folderCounts: TabletSidebarNavCounts['folderCounts'];
  isProActive: boolean;
  isPrivateMode: boolean;
  isSettingsTab: boolean;
  inboxSelection: { kind: 'folder'; folderId: string } | { kind: string; folderId?: string } | null;
  currentTab: string;
  onNavigateToInbox: (target: Extract<TabletInboxSidebarTarget, { kind: 'folder' }>) => void;
  onOpenCreateFolder: () => void;
  onOpenEditFolder: (folderId: string) => void;
};

function CollapsedFolderAction({
  onPress,
  accessibilityLabel,
  children,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        width: TABLET_SIDEBAR_COLLAPSED_ITEM_SIZE,
        height: TABLET_SIDEBAR_COLLAPSED_ITEM_SIZE,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        backgroundColor: 'transparent',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

export function TabletSidebarFoldersSection({
  color,
  theme,
  collapsed = false,
  folders,
  folderCounts,
  isProActive,
  isPrivateMode,
  isSettingsTab,
  inboxSelection,
  currentTab,
  onNavigateToInbox,
  onOpenCreateFolder,
  onOpenEditFolder,
}: TabletSidebarFoldersSectionProps) {
  const { t } = useTranslation();

  const openPrivateModeSettings = () => {
    hapticSelection();
    navigateMainTab('SettingsRoot', { screen: 'PrivateAiMode' });
  };

  if (isPrivateMode) {
    return (
      <View style={{ paddingTop: 4, alignItems: collapsed ? 'center' : undefined }}>
        <TabletSidebarSectionDivider color={color} />
        {collapsed ? (
          <CollapsedFolderAction
            accessibilityLabel={t('tablet.sidebar.privateFoldersCta')}
            onPress={openPrivateModeSettings}
          >
            <Folder size={22} color={color.text.secondary} strokeWidth={2} />
          </CollapsedFolderAction>
        ) : (
          <Pressable
            onPress={openPrivateModeSettings}
            accessibilityRole="button"
            accessibilityLabel={t('tablet.sidebar.privateFoldersCta')}
            className="mt-3 rounded-[10px] px-3 py-3"
            style={({ pressed }) => ({
              backgroundColor: theme.surface,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ fontSize: 14, fontWeight: '500', color: color.text.primary }}>
              {t('tablet.sidebar.privateFoldersUnavailable')}
            </Text>
            <Text
              style={{ fontSize: 13, fontWeight: '500', color: color.accent.primary, marginTop: 6 }}
            >
              {t('tablet.sidebar.privateFoldersCta')}
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (collapsed) {
    return (
      <>
        <TabletSidebarSectionDivider color={color} />
        <View style={{ alignItems: 'center', gap: 8 }}>
          {folders.length >= 2 ? (
            <CollapsedFolderAction
              accessibilityLabel={t('folders.reorderOpenA11y')}
              onPress={() => {
                hapticSelection();
                if (currentTab !== 'Inbox') {
                  navigateMainTab('Inbox');
                }
                requestTabletOpenReorderFolders();
              }}
            >
              <ArrowDownUp size={20} color={color.text.secondary} strokeWidth={2.2} />
            </CollapsedFolderAction>
          ) : null}
          <CollapsedFolderAction
            accessibilityLabel={t('folders.create')}
            onPress={() => {
              hapticSelection();
              onOpenCreateFolder();
            }}
          >
            <Plus size={22} color={color.accent.primary} strokeWidth={2.4} />
          </CollapsedFolderAction>
        </View>
        {folders.map((folder) => {
          const folderHex = resolveDisplayFolderColor(folder.color, isProActive);
          const isActive =
            !isSettingsTab &&
            inboxSelection?.kind === 'folder' &&
            inboxSelection.folderId === folder.id;
          const folderCount = folderCounts.get(folder.id) ?? 0;

          return (
            <TabletSidebarNavItem
              key={folder.id}
              label={folder.name}
              isActive={isActive}
              color={color}
              theme={theme}
              appearance="folder"
              collapsed
              badgeCount={folderCount}
              accentHex={folderHex}
              accessibilityHint={t('tablet.sidebar.editFolderHint')}
              onPress={() => onNavigateToInbox({ kind: 'folder', folderId: folder.id })}
              onLongPress={() => {
                hapticSelection();
                if (currentTab !== 'Inbox') {
                  navigateMainTab('Inbox');
                }
                onOpenEditFolder(folder.id);
              }}
              icon={
                folder.icon ? (
                  <FolderLucideIcon
                    iconId={folder.icon}
                    size={21}
                    color={folderHex}
                    strokeWidth={2}
                  />
                ) : (
                  <TabletSidebarNavIcon
                    isActive={isActive}
                    activeColor={folderHex}
                    inactiveColor={color.text.secondary}
                  >
                    <Folder />
                  </TabletSidebarNavIcon>
                )
              }
            />
          );
        })}
      </>
    );
  }

  return (
    <>
      <TabletSidebarSectionDivider color={color} />
      <TabletSidebarSectionLabel
        label={t('tablet.sidebar.folders')}
        color={color}
        trailing={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {folders.length >= 2 ? (
              <FolderSectionHeaderAction
                accessibilityLabel={t('folders.reorderOpenA11y')}
                onPress={() => {
                  hapticSelection();
                  if (currentTab !== 'Inbox') {
                    navigateMainTab('Inbox');
                  }
                  requestTabletOpenReorderFolders();
                }}
              >
                <ArrowDownUp size={18} color={color.text.secondary} strokeWidth={2.2} />
              </FolderSectionHeaderAction>
            ) : null}
            <FolderSectionHeaderAction
              accessibilityLabel={t('folders.create')}
              onPress={() => {
                hapticSelection();
                onOpenCreateFolder();
              }}
            >
              <Plus size={20} color={color.accent.primary} strokeWidth={2.4} />
            </FolderSectionHeaderAction>
          </View>
        }
      />

      {folders.length === 0 ? (
        <Pressable
          onPress={() => {
            hapticSelection();
            if (currentTab !== 'Inbox') {
              navigateMainTab('Inbox');
            }
            onOpenCreateFolder();
          }}
          accessibilityRole="button"
          accessibilityLabel={t('tablet.sidebar.foldersEmpty')}
          className="rounded-[10px] px-3 py-3"
          style={({ pressed }) => ({
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border,
            borderStyle: 'dashed',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ fontSize: 14, fontWeight: '500', color: color.text.secondary }}>
            {t('tablet.sidebar.foldersEmpty')}
          </Text>
        </Pressable>
      ) : (
        folders.map((folder) => {
          const folderHex = resolveDisplayFolderColor(folder.color, isProActive);
          const isActive =
            !isSettingsTab &&
            inboxSelection?.kind === 'folder' &&
            inboxSelection.folderId === folder.id;
          const folderCount = folderCounts.get(folder.id) ?? 0;

          return (
            <TabletSidebarNavItem
              key={folder.id}
              label={folder.name}
              isActive={isActive}
              color={color}
              theme={theme}
              appearance="folder"
              badgeCount={folderCount}
              accentHex={folderHex}
              accessibilityHint={t('tablet.sidebar.editFolderHint')}
              onPress={() => onNavigateToInbox({ kind: 'folder', folderId: folder.id })}
              onLongPress={() => {
                hapticSelection();
                if (currentTab !== 'Inbox') {
                  navigateMainTab('Inbox');
                }
                onOpenEditFolder(folder.id);
              }}
              icon={
                folder.icon ? (
                  <FolderLucideIcon
                    iconId={folder.icon}
                    size={21}
                    color={folderHex}
                    strokeWidth={2}
                  />
                ) : (
                  <TabletSidebarNavIcon
                    isActive={isActive}
                    activeColor={folderHex}
                    inactiveColor={color.text.secondary}
                  >
                    <Folder />
                  </TabletSidebarNavIcon>
                )
              }
            />
          );
        })
      )}
    </>
  );
}

/** Scrollable folders block (filters stay pinned above). */
export function TabletSidebarFoldersScroll({
  children,
  contentDimmed,
  collapsed = false,
}: {
  children: React.ReactNode;
  contentDimmed: boolean;
  collapsed?: boolean;
}) {
  return (
    <ScrollView
      style={{ flex: 1, opacity: contentDimmed ? 0.62 : 1 }}
      contentContainerStyle={{
        paddingBottom: 8,
        alignItems: collapsed ? 'center' : 'stretch',
        gap: 8,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
