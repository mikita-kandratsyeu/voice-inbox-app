import { MenuView } from '@react-native-menu/menu';
import { Archive, ChevronDown, Folder, Inbox } from 'lucide-react-native';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity } from 'react-native';

import type { Folder as FolderModel } from '@/entities/folder';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { hapticSelection, inlineNativeMenuSection, type NativeMenuAction } from '@/shared/lib';
import { FrostedChromeSurface } from '@/shared/ui';

type InboxAskCorpusScopeChipMenuProps = {
  color: Colors;
  includeArchived: boolean;
  onIncludeArchivedChange: (includeArchived: boolean) => void;
  folderId: string | null;
  folders: FolderModel[];
  foldersEnabled: boolean;
  onFolderIdChange: (folderId: string | null) => void;
};

export function InboxAskCorpusScopeChipMenu({
  color,
  includeArchived,
  onIncludeArchivedChange,
  folderId,
  folders,
  foldersEnabled,
  onFolderIdChange,
}: InboxAskCorpusScopeChipMenuProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const isDark = theme === 'dark';
  const titleColor = color.text.primary;

  const activeFolder = useMemo(
    () => (folderId ? (folders.find((folder) => folder.id === folderId) ?? null) : null),
    [folderId, folders],
  );

  const chipLabel = activeFolder
    ? activeFolder.name
    : includeArchived
      ? t('inboxAsk.corpusScopeAllLabel')
      : t('inboxAsk.corpusScopeActiveLabel');

  const menuActions = useMemo<NativeMenuAction[]>(() => {
    const archiveActions: NativeMenuAction[] = [
      {
        id: 'corpus_all',
        title: t('inboxAsk.corpusScopeAllNotes'),
        titleColor,
        image: 'archivebox',
        imageColor: titleColor,
        state: includeArchived ? 'on' : 'off',
      },
      {
        id: 'corpus_active',
        title: t('inboxAsk.corpusScopeActiveNotes'),
        titleColor,
        image: 'tray',
        imageColor: titleColor,
        state: includeArchived ? 'off' : 'on',
      },
    ];

    const archiveSection = inlineNativeMenuSection(
      'inboxAskCorpusArchive',
      titleColor,
      archiveActions,
    );

    if (!foldersEnabled) {
      return [archiveSection];
    }

    const folderActions: NativeMenuAction[] = [
      ...[...folders].reverse().map((folder) => ({
        id: `folder_${folder.id}`,
        title: folder.name,
        titleColor,
        image: 'folder',
        imageColor: titleColor,
        state: folderId === folder.id ? ('on' as const) : ('off' as const),
      })),
      {
        id: 'folder_all',
        title: t('inboxAsk.corpusScopeAllFolders'),
        titleColor,
        image: 'tray.full',
        imageColor: titleColor,
        state: folderId === null ? 'on' : 'off',
      },
    ];

    const foldersSection = inlineNativeMenuSection(
      'inboxAskCorpusFolders',
      titleColor,
      folderActions,
      t('inboxAsk.corpusScopeFoldersSection'),
    );

    // Bottom-anchored UIMenu renders sections in reverse — folders last in array appears on top.
    return [foldersSection, archiveSection];
  }, [folderId, folders, foldersEnabled, includeArchived, t, titleColor]);

  const handleMenuAction = useCallback(
    (actionId: string) => {
      if (actionId === 'corpus_active') {
        onIncludeArchivedChange(false);
        return;
      }
      if (actionId === 'corpus_all') {
        onIncludeArchivedChange(true);
        return;
      }
      if (actionId === 'folder_all') {
        onFolderIdChange(null);
        return;
      }
      if (actionId.startsWith('folder_')) {
        onFolderIdChange(actionId.slice('folder_'.length));
      }
    },
    [onFolderIdChange, onIncludeArchivedChange],
  );

  const ScopeIcon = activeFolder ? Folder : includeArchived ? Archive : Inbox;

  const chipBody = (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={t('inboxAsk.corpusScopeChipA11y', { scope: chipLabel })}
      activeOpacity={0.75}
      className="max-w-full min-h-8 flex-row items-center gap-1 px-3 py-1.5"
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      <ScopeIcon size={14} color={color.icon.muted} strokeWidth={2.1} />
      <Text
        className="shrink text-[13px] font-semibold leading-[18px]"
        numberOfLines={1}
        style={{ color: color.text.primary }}
      >
        {chipLabel}
      </Text>
      <ChevronDown size={14} color={color.text.secondary} strokeWidth={2.2} />
    </TouchableOpacity>
  );

  return (
    <MenuView
      key={`inbox-ask-corpus-scope-${theme}-${includeArchived ? 'all' : 'active'}-${folderId ?? 'inbox'}`}
      themeVariant={isDark ? 'dark' : 'light'}
      onPressAction={({ nativeEvent }) => {
        hapticSelection();
        handleMenuAction(nativeEvent.event);
      }}
      actions={menuActions}
    >
      <FrostedChromeSurface
        color={color}
        borderRadius={9999}
        shadow="subtle"
        style={{ alignSelf: 'flex-start', maxWidth: '100%' }}
      >
        {chipBody}
      </FrostedChromeSurface>
    </MenuView>
  );
}
