import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/shared/config';
import { modalKeyboardBehavior } from '@/shared/lib/platform';
import { Button } from '@/shared/ui';

const TASK_TEXT_MAX_CHARS = 4000;

type TaskEditSheetProps = {
  visible: boolean;
  initialText: string;
  onClose: () => void;
  onSave: (text: string) => boolean;
  sheetTitleKey?: string;
  placeholderKey?: string;
};

export function TaskEditSheet({
  visible,
  initialText,
  onClose,
  onSave,
  sheetTitleKey = 'tasks.editTaskSheetTitle',
  placeholderKey = 'recordingDetail.addTaskPlaceholder',
}: TaskEditSheetProps) {
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (visible) {
      setDraft(initialText);
      const frame = requestAnimationFrame(() => {
        bottomSheetRef.current?.present();
      });
      return () => cancelAnimationFrame(frame);
    }
    bottomSheetRef.current?.dismiss();
    return undefined;
  }, [visible, initialText]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} pressBehavior="close" opacity={0.45} />
    ),
    [],
  );

  const handleSave = useCallback(() => {
    const trimmed = draft.split('\0').join('').trim();
    if (!trimmed) return;
    if (onSave(trimmed)) {
      bottomSheetRef.current?.dismiss();
    }
  }, [draft, onSave]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      enableDynamicSizing
      enablePanDownToClose
      enableOverDrag={false}
      keyboardBehavior={modalKeyboardBehavior}
      keyboardBlurBehavior="restore"
      enableBlurKeyboardOnGesture
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
      <BottomSheetView className="px-5 pt-1" style={{ paddingBottom: Math.max(insets.bottom, 20) }}>
        <View className="mb-6 justify-center">
          <Text
            className="px-14 text-center text-[17px] font-semibold"
            style={{ color: color.text.primary }}
          >
            {t(sheetTitleKey)}
          </Text>
        </View>
        <BottomSheetTextInput
          value={draft}
          onChangeText={(text) => setDraft(text.split('\0').join('').slice(0, TASK_TEXT_MAX_CHARS))}
          multiline
          textAlignVertical="top"
          placeholder={t(placeholderKey)}
          placeholderTextColor={color.text.muted}
          accessibilityLabel={t(sheetTitleKey)}
          className="min-h-[88px] rounded-xl border px-3 py-3 text-[16px] leading-[22px]"
          style={{
            borderColor: color.border.default,
            color: color.text.primary,
            backgroundColor: color.background.secondary,
          }}
        />
        <View className="mt-4 w-full">
          <Button
            variant="primary"
            size="lg"
            label={t('common.save')}
            color={color}
            onPress={handleSave}
            disabled={draft.trim().length === 0}
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
