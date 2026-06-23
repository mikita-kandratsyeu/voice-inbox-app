import { GripVertical, Minus } from 'lucide-react-native';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
  ShadowDecorator,
} from 'react-native-draggable-flatlist';
import { Pressable } from 'react-native-gesture-handler';

import { useProEntitlement } from '@/features/pro-license';
import { useColors } from '@/shared/config';
import { hapticLight, hapticSelection, resolveDisplayFolderColor } from '@/shared/lib';
import { AppBottomSheetContent, AppBottomSheetModal } from '@/shared/ui';

import { FolderLucideIcon } from '../lib/folderLucideIcons';
import { useFolderStore } from '../model/store';
import type { Folder } from '../model/types';

const ROW_HEIGHT = 54;
const LIST_MAX_HEIGHT = 420;

type FolderReorderSheetProps = {
  visible: boolean;
  folders: Folder[];
  onClose: () => void;
  onReorder: (orderedIds: string[]) => void;
};

export const FolderReorderSheet = ({
  visible,
  folders,
  onClose,
  onReorder,
}: FolderReorderSheetProps) => {
  const { t } = useTranslation();
  const color = useColors();
  const { isProActive } = useProEntitlement();
  const deleteFolder = useFolderStore((s) => s.deleteFolder);

  const listHeight = useMemo(
    () => Math.min(Math.max(folders.length, 1) * ROW_HEIGHT, LIST_MAX_HEIGHT),
    [folders.length],
  );

  const confirmDeleteFolder = useCallback(
    (folder: Folder) => {
      hapticSelection();
      Alert.alert(t('folders.deleteTitle'), t('folders.deleteConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            void deleteFolder(folder.id);
          },
        },
      ]);
    },
    [deleteFolder, t],
  );

  const handleDragBegin = useCallback(() => {
    hapticLight();
  }, []);

  const handleDragEnd = useCallback(
    ({ data }: { data: Folder[] }) => {
      hapticSelection();
      onReorder(data.map((f) => f.id));
    },
    [onReorder],
  );

  const renderItem = useCallback(
    ({ item: folder, drag, isActive: isDragging, getIndex }: RenderItemParams<Folder>) => {
      const folderHex = resolveDisplayFolderColor(folder.color, isProActive);
      const rowIndex = getIndex();
      const isLast = rowIndex == null || rowIndex === folders.length - 1;

      return (
        <ShadowDecorator>
          <ScaleDecorator activeScale={1.02}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                minHeight: ROW_HEIGHT,
                backgroundColor: isDragging ? color.background.tertiary : color.background.card,
                borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                borderBottomColor: color.border.default,
                ...(isDragging
                  ? Platform.select({
                      ios: {
                        shadowColor: color.shadow.color,
                        shadowOpacity: color.shadow.opacity * 1.6,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 4 },
                      },
                      android: { elevation: 4 },
                      default: {},
                    })
                  : null),
              }}
            >
              <TouchableOpacity
                onPress={() => confirmDeleteFolder(folder)}
                accessibilityRole="button"
                accessibilityLabel={t('folders.reorderDeleteA11y', { name: folder.name })}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                style={{
                  marginLeft: 10,
                  width: 30,
                  height: 30,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 15,
                  backgroundColor: `${color.accent.delete}1a`,
                }}
              >
                <Minus size={15} color={color.accent.delete} strokeWidth={2.5} />
              </TouchableOpacity>

              <Pressable
                onLongPress={drag}
                delayLongPress={140}
                accessibilityRole="button"
                accessibilityLabel={folder.name}
                accessibilityHint={t('folders.reorderRowA11y')}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: ROW_HEIGHT,
                  paddingRight: 8,
                  paddingLeft: 8,
                  opacity: pressed && !isDragging ? 0.72 : 1,
                })}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 18,
                    backgroundColor: `${folderHex}1f`,
                  }}
                  pointerEvents="none"
                >
                  <FolderLucideIcon
                    iconId={folder.icon}
                    size={20}
                    color={folderHex}
                    strokeWidth={2}
                  />
                </View>
                <Text
                  style={{
                    flex: 1,
                    color: color.text.primary,
                    fontSize: 17,
                    fontWeight: isDragging ? '600' : '400',
                  }}
                  numberOfLines={1}
                  pointerEvents="none"
                >
                  {folder.name}
                </Text>
                <View
                  pointerEvents="none"
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    backgroundColor: isDragging
                      ? color.background.secondary
                      : color.background.tertiary,
                    paddingHorizontal: 6,
                    paddingVertical: 8,
                  }}
                >
                  <GripVertical size={18} color={color.text.muted} strokeWidth={2.2} />
                </View>
              </Pressable>
            </View>
          </ScaleDecorator>
        </ShadowDecorator>
      );
    },
    [
      color.accent.delete,
      color.background.card,
      color.background.secondary,
      color.background.tertiary,
      color.border.default,
      color.shadow.color,
      color.shadow.opacity,
      color.text.muted,
      color.text.primary,
      confirmDeleteFolder,
      folders.length,
      isProActive,
      t,
    ],
  );

  return (
    <AppBottomSheetModal
      visible={visible}
      onClose={onClose}
      enableDynamicSizing
      enableContentPanningGesture={false}
    >
      <AppBottomSheetContent style={{ flexGrow: 0 }} bottomPadding={12}>
        <View className="mb-2 justify-center">
          <Text
            className="px-14 text-center text-[17px] font-semibold"
            style={{ color: color.text.primary }}
          >
            {t('folders.reorderSheetTitle')}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.done')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="absolute bottom-0 right-0 top-0 justify-center"
          >
            <Text className="text-[17px] font-semibold" style={{ color: color.accent.primary }}>
              {t('common.done')}
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          className="mb-3 text-center text-[13px] leading-[18px]"
          style={{ color: color.text.secondary }}
        >
          {t('folders.reorderSheetHint')}
        </Text>

        <View
          style={{
            height: listHeight,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: color.border.default,
            backgroundColor: color.background.card,
            overflow: 'hidden',
          }}
        >
          <DraggableFlatList
            data={folders}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            onDragBegin={handleDragBegin}
            onDragEnd={handleDragEnd}
            scrollEventThrottle={16}
            activationDistance={8}
            style={{ flex: 1 }}
            containerStyle={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
          />
        </View>
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
};
