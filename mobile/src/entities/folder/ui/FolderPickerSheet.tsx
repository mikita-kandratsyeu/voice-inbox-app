import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useAppTheme, useColors } from '@/shared/config';
import { resolveFolderColorForCurrentScheme } from '@/shared/lib';
import { AppBottomSheetModal, useBottomSheetContentPadding } from '@/shared/ui';

import type { Folder } from '../model/types';
import { FolderPickerRow } from './FolderPickerRow';

type FolderPickerSheetProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  folders: Folder[];
  currentFolderId?: string | null;
  onClose: () => void;
  onSelect: (folderId: string | null) => void;
};

export const FolderPickerSheet = ({
  visible,
  title,
  subtitle,
  folders,
  currentFolderId,
  onClose,
  onSelect,
}: FolderPickerSheetProps) => {
  const showChecks = currentFolderId !== undefined;
  const { t } = useTranslation();
  const color = useColors();
  const scheme = useAppTheme();
  const contentPadding = useBottomSheetContentPadding(20);

  const sortedFolders = useMemo(
    () => [...folders].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [folders],
  );

  const pickInbox = useCallback(() => {
    onSelect(null);
    onClose();
  }, [onSelect, onClose]);

  const pickFolder = useCallback(
    (folderId: string) => {
      onSelect(folderId);
      onClose();
    },
    [onSelect, onClose],
  );

  const rowCount = 1 + sortedFolders.length;

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          ...contentPadding,
        }}
      >
        <Text
          style={{
            color: color.text.primary,
            fontSize: 17,
            fontWeight: '600',
            marginBottom: subtitle ? 4 : 16,
            marginTop: 4,
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              color: color.text.secondary,
              fontSize: 14,
              lineHeight: 20,
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            {subtitle}
          </Text>
        ) : null}
        <View
          style={{
            backgroundColor: color.background.card,
            borderColor: color.border.default,
            borderRadius: 12,
            borderWidth: 1,
            overflow: 'hidden',
          }}
        >
          <FolderPickerRow
            label={t('folders.pickerInboxOnly')}
            subtitle={t('tabs.inbox')}
            color={color}
            inbox
            selected={showChecks && currentFolderId == null}
            showSelectionCheck={showChecks}
            isLast={rowCount === 1}
            onPress={pickInbox}
          />
          {sortedFolders.map((folder, index) => {
            const tintHex = resolveFolderColorForCurrentScheme(folder.color, scheme);
            const selected = showChecks && currentFolderId === folder.id;
            return (
              <FolderPickerRow
                key={folder.id}
                label={folder.name}
                color={color}
                iconId={folder.icon}
                tintHex={tintHex}
                selected={selected}
                showSelectionCheck={showChecks}
                isLast={index === sortedFolders.length - 1}
                onPress={() => pickFolder(folder.id)}
              />
            );
          })}
        </View>
      </BottomSheetScrollView>
    </AppBottomSheetModal>
  );
};
