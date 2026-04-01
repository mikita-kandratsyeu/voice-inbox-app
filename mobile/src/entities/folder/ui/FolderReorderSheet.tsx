import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { GripVertical } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';
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
import type { Folder } from '../model/types';

type FolderReorderSheetProps = {
  visible: boolean;
  folders: Folder[];
  onClose: () => void;
  onReorder: (orderedIds: string[]) => void;
};

const LIST_MAX_HEIGHT = 360;

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

      return (
        <ScaleDecorator activeScale={1.02}>
          <Pressable
            onLongPress={drag}
            delayLongPress={350}
            accessibilityRole="button"
            accessibilityLabel={folder.name}
            accessibilityHint={t('folders.reorderRowA11y')}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: color.background.tertiary,
              borderRadius: 12,
              flexDirection: 'row',
              gap: 10,
              marginBottom: 8,
              opacity: isDragging ? 0.88 : pressed ? 0.92 : 1,
              paddingHorizontal: 14,
              paddingVertical: 12,
            })}
          >
            <View
              style={{
                justifyContent: 'center',
                opacity: 0.55,
              }}
              pointerEvents="none"
            >
              <GripVertical size={18} color={color.text.secondary} strokeWidth={2} />
            </View>
            {folder.icon ? (
              <View style={{ opacity: isDragging ? 0.9 : 1 }} pointerEvents="none">
                <FolderLucideIcon
                  iconId={folder.icon}
                  size={22}
                  color={folderHex}
                  strokeWidth={2}
                />
              </View>
            ) : null}
            <Text
              style={{
                flex: 1,
                fontSize: 16,
                fontWeight: '500',
                color: color.text.primary,
              }}
              numberOfLines={1}
              pointerEvents="none"
            >
              {folder.name}
            </Text>
          </Pressable>
        </ScaleDecorator>
      );
    },
    [color.background.tertiary, color.text.primary, color.text.secondary, isProActive, t],
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
            fontSize: 14,
            lineHeight: 20,
            color: color.text.secondary,
            textAlign: 'center',
            marginBottom: 16,
            paddingHorizontal: 4,
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
