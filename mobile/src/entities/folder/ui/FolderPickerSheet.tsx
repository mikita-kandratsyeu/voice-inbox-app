import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Check } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/shared/config';
import { modalKeyboardBehavior } from '@/shared/lib/platform';

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
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (visible) {
      const frame = requestAnimationFrame(() => {
        ref.current?.present();
      });
      return () => cancelAnimationFrame(frame);
    }
    ref.current?.dismiss();
    return undefined;
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} pressBehavior="close" opacity={0.45} />
    ),
    [],
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

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      enablePanDownToClose
      enableOverDrag={false}
      keyboardBehavior={modalKeyboardBehavior}
      keyboardBlurBehavior="restore"
      backdropComponent={renderBackdrop}
      onDismiss={onClose}
      backgroundStyle={{
        backgroundColor: color.background.primary,
        borderTopWidth: 1,
        borderTopColor: color.border.default,
      }}
      handleIndicatorStyle={{
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: color.icon.muted,
      }}
    >
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, 20),
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
          {showChecks && currentFolderId == null ? (
            <Check size={20} color={color.accent.primary} strokeWidth={2.5} />
          ) : null}
        </TouchableOpacity>

        {folders.map((folder) => {
          const selected = showChecks && currentFolderId === folder.id;
          return (
            <TouchableOpacity
              key={folder.id}
              onPress={() => pickFolder(folder.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 12,
                marginBottom: 8,
                backgroundColor: color.background.tertiary,
                gap: 10,
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
              {selected ? <Check size={20} color={color.accent.primary} strokeWidth={2.5} /> : null}
            </TouchableOpacity>
          );
        })}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
};
