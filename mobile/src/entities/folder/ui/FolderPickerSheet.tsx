import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Check } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity } from 'react-native';

import { useColors } from '@/shared/config';
import { AppBottomSheetModal, useBottomSheetContentPadding } from '@/shared/ui';

import { FolderLucideIcon } from '../lib/folderLucideIcons';
import type { Folder } from '../model/types';

type FolderPickerSheetProps = {
  visible: boolean;
  title: string;
  folders: Folder[];
  currentFolderId?: string | null;
  onClose: () => void;
  onSelect: (folderId: string | null) => void;
};

export const FolderPickerSheet = ({
  visible,
  title,
  folders,
  currentFolderId,
  onClose,
  onSelect,
}: FolderPickerSheetProps) => {
  const showChecks = currentFolderId !== undefined;
  const { t } = useTranslation();
  const color = useColors();
  const contentPadding = useBottomSheetContentPadding(20);

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
            fontSize: 17,
            fontWeight: '600',
            color: color.text.primary,
            textAlign: 'center',
            marginBottom: 16,
            marginTop: 4,
          }}
        >
          {title}
        </Text>
        <TouchableOpacity
          onPress={pickInbox}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('folders.pickerInboxOnly')}
          accessibilityState={{ selected: showChecks && currentFolderId == null }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 14,
            paddingHorizontal: 14,
            borderRadius: 12,
            marginBottom: 8,
            backgroundColor: color.background.tertiary,
          }}
        >
          <Text
            style={{ flex: 1, fontSize: 16, color: color.text.primary, fontWeight: '500' }}
            numberOfLines={1}
          >
            {t('folders.pickerInboxOnly')}
          </Text>
          {showChecks && currentFolderId == null && (
            <Check size={20} color={color.accent.primary} strokeWidth={2.5} />
          )}
        </TouchableOpacity>
        {folders.map((folder) => {
          const selected = showChecks && currentFolderId === folder.id;
          return (
            <TouchableOpacity
              key={folder.id}
              onPress={() => pickFolder(folder.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={folder.name}
              accessibilityState={{ selected }}
              style={{
                alignItems: 'center',
                backgroundColor: color.background.tertiary,
                borderRadius: 12,
                flexDirection: 'row',
                gap: 10,
                marginBottom: 8,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <FolderLucideIcon
                iconId={folder.icon}
                size={22}
                color={folder.color}
                strokeWidth={2}
              />
              <Text
                style={{ flex: 1, fontSize: 16, color: color.text.primary, fontWeight: '500' }}
                numberOfLines={1}
              >
                {folder.name}
              </Text>
              {selected && <Check size={20} color={color.accent.primary} strokeWidth={2.5} />}
            </TouchableOpacity>
          );
        })}
      </BottomSheetScrollView>
    </AppBottomSheetModal>
  );
};
