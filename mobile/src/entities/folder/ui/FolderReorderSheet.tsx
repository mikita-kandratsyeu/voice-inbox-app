import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Minus } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { Pressable } from 'react-native-gesture-handler';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProEntitlement } from '@/features/pro-license';
import { useColors } from '@/shared/config';
import { resolveDisplayFolderColor } from '@/shared/lib';
import { modalKeyboardBehavior } from '@/shared/lib/platform';

import { FolderLucideIcon } from '../lib/folderLucideIcons';
import { useFolderStore } from '../model/store';
import type { Folder } from '../model/types';

type FolderReorderSheetProps = {
  visible: boolean;
  folders: Folder[];
  onClose: () => void;
  onReorder: (orderedIds: string[]) => void;
};

const LIST_MAX_HEIGHT = 360;

const ICON_CIRCLE = 40;
const DELETE_CIRCLE = 22;

function ReorderDragHandle({ lineColor }: { lineColor: string }) {
  return (
    <View style={styles.dragHandleWrap}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.dragHandleLine, { backgroundColor: lineColor }]} />
      ))}
    </View>
  );
}

export const FolderReorderSheet = ({
  visible,
  folders,
  onClose,
  onReorder,
}: FolderReorderSheetProps) => {
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const { isProActive } = useProEntitlement();
  const deleteFolder = useFolderStore((s) => s.deleteFolder);
  const ref = useRef<BottomSheetModal>(null);

  const confirmDeleteFolder = useCallback(
    (folder: Folder) => {
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

  const handleDragEnd = useCallback(
    ({ data }: { data: Folder[] }) => {
      ReactNativeHapticFeedback.trigger('impactLight');
      onReorder(data.map((f) => f.id));
    },
    [onReorder],
  );

  const renderItem = useCallback(
    ({ item: folder, drag, isActive: isDragging }: RenderItemParams<Folder>) => {
      const folderHex = resolveDisplayFolderColor(folder.color, isProActive);
      const handleColor = color.text.muted;

      return (
        <ScaleDecorator activeScale={1.01}>
          <View
            style={[
              styles.row,
              {
                backgroundColor: color.background.primary,
                borderBottomColor: color.border.default,
                opacity: isDragging ? 0.92 : 1,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => confirmDeleteFolder(folder)}
              accessibilityRole="button"
              accessibilityLabel={t('folders.reorderDeleteA11y', { name: folder.name })}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
              style={[
                styles.deleteBtn,
                {
                  backgroundColor: color.accent.delete,
                },
              ]}
            >
              <Minus size={16} color={color.icon.onAccent} strokeWidth={2.5} />
            </TouchableOpacity>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: color.background.tertiary,
                },
              ]}
              pointerEvents="none"
            >
              <FolderLucideIcon iconId={folder.icon} size={22} color={folderHex} strokeWidth={2} />
            </View>
            <Text
              style={[styles.rowTitle, { color: color.text.primary }]}
              numberOfLines={1}
              pointerEvents="none"
            >
              {folder.name}
            </Text>
            <Pressable
              onLongPress={drag}
              delayLongPress={350}
              accessibilityRole="button"
              accessibilityLabel={folder.name}
              accessibilityHint={t('folders.reorderRowA11y')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ReorderDragHandle lineColor={handleColor} />
            </Pressable>
          </View>
        </ScaleDecorator>
      );
    },
    [
      color.accent.delete,
      color.icon.onAccent,
      color.background.primary,
      color.background.tertiary,
      color.border.default,
      color.text.primary,
      color.text.muted,
      confirmDeleteFolder,
      isProActive,
      t,
    ],
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={['52%']}
      enablePanDownToClose
      enableContentPanningGesture={false}
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
      <BottomSheetView
        style={{
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: Math.max(insets.bottom, 20),
        }}
      >
        <View style={{ marginBottom: 12, justifyContent: 'center' }}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: color.text.primary,
              textAlign: 'center',
              paddingHorizontal: 56,
            }}
          >
            {t('folders.reorderSheetTitle')}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.done')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '600', color: color.accent.primary }}>
              {t('common.done')}
            </Text>
          </TouchableOpacity>
        </View>
        <Text
          style={{
            fontSize: 13,
            lineHeight: 18,
            color: color.text.secondary,
            textAlign: 'center',
            marginBottom: 12,
            paddingHorizontal: 8,
          }}
        >
          {t('folders.reorderSheetHint')}
        </Text>
        <View style={{ height: LIST_MAX_HEIGHT }}>
          <DraggableFlatList
            data={folders}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            onDragEnd={handleDragEnd}
            scrollEventThrottle={16}
            activationDistance={12}
            style={{ flex: 1 }}
            containerStyle={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 4 }}
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    minHeight: 52,
    paddingVertical: 8,
    paddingRight: 4,
  },
  deleteBtn: {
    alignItems: 'center',
    borderRadius: DELETE_CIRCLE / 2,
    height: DELETE_CIRCLE,
    justifyContent: 'center',
    width: DELETE_CIRCLE,
    marginLeft: 14,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: ICON_CIRCLE / 2,
    height: ICON_CIRCLE,
    justifyContent: 'center',
    width: ICON_CIRCLE,
  },
  rowTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '400',
  },
  dragHandleWrap: {
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dragHandleLine: {
    borderRadius: 1,
    height: 2,
    width: 18,
  },
});
