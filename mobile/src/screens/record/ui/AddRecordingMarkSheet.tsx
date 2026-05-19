import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InteractionManager, Keyboard, Text, View } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';

import { useColors } from '@/shared/config';
import { formatTime, hapticLight, hapticSuccess, IS_IOS } from '@/shared/lib';
import { AppBottomSheetModal, Button, useBottomSheetContentPadding } from '@/shared/ui';

const MARK_LABEL_MAX_CHARS = 280;
/** Extra space above the system keyboard so action buttons are not flush against it. */
const MARK_SHEET_KEYBOARD_BOTTOM_PADDING = 24;

type AddRecordingMarkSheetProps = {
  visible: boolean;
  /** Timestamp in the recording when the user opened the sheet (frozen). */
  snapshotOffsetMs: number;
  onClose: () => void;
  /** Called with trimmed label (may be empty). */
  onSave: (label: string) => void;
};

export const AddRecordingMarkSheet = ({
  visible,
  snapshotOffsetMs,
  onClose,
  onSave,
}: AddRecordingMarkSheetProps) => {
  const { t } = useTranslation();
  const c = useColors();
  const contentPadding = useBottomSheetContentPadding(24);
  const [label, setLabel] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const labelInputRef = useRef<TextInput>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    savedRef.current = false;
    setLabel('');
    const task = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        labelInputRef.current?.focus();
      });
    });
    return () => task.cancel();
  }, [visible]);

  useEffect(() => {
    const showEvent = IS_IOS ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = IS_IOS ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const handleDismiss = useCallback(() => {
    if (!savedRef.current) {
      onClose();
    }
    savedRef.current = false;
  }, [onClose]);

  const handleCancel = useCallback(() => {
    hapticLight();
    bottomSheetRef.current?.dismiss();
    onClose();
  }, [onClose]);

  const handleSave = useCallback(() => {
    savedRef.current = true;
    hapticSuccess();
    onSave(label.trim().slice(0, MARK_LABEL_MAX_CHARS));
    bottomSheetRef.current?.dismiss();
  }, [label, onSave]);

  const timeSec = Math.max(0, Math.floor(snapshotOffsetMs / 1000));

  return (
    <AppBottomSheetModal
      ref={bottomSheetRef}
      visible={visible}
      onClose={handleDismiss}
      surface="card"
      backdrop="subtle"
    >
      <BottomSheetView
        style={{
          paddingHorizontal: 24,
          paddingTop: 4,
          ...(keyboardVisible
            ? { paddingBottom: MARK_SHEET_KEYBOARD_BOTTOM_PADDING }
            : contentPadding),
          gap: 12,
        }}
      >
        <Text className="text-lg font-bold" style={{ color: c.text.primary }}>
          {t('record.markSheetTitle')}
        </Text>
        <Text className="text-[14px] leading-5" style={{ color: c.text.secondary }}>
          {t('record.markAtTime', { time: formatTime(timeSec) })}
        </Text>
        <BottomSheetTextInput
          ref={labelInputRef}
          className="rounded-xl border-2 px-4 py-3 text-[16px]"
          style={{
            borderColor: c.accent.primary,
            color: c.text.primary,
            backgroundColor: c.background.tertiary,
          }}
          placeholder={t('record.markLabelPlaceholder')}
          placeholderTextColor={c.text.muted}
          value={label}
          onChangeText={(text) => setLabel(text.slice(0, MARK_LABEL_MAX_CHARS))}
          multiline
          maxLength={MARK_LABEL_MAX_CHARS}
          autoFocus
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={handleSave}
          accessibilityLabel={t('record.markLabelPlaceholder')}
        />
        <View className="mt-1 flex-row gap-3">
          <Button
            variant="secondary"
            label={t('common.cancel')}
            onPress={handleCancel}
            activeOpacity={0.8}
            className="min-w-0 flex-1"
            color={c}
            containerStyle={{
              backgroundColor: c.background.tertiary,
              borderRadius: 12,
            }}
            accessibilityLabel={t('common.cancel')}
          />
          <Button
            variant="primary"
            label={t('record.markSave')}
            onPress={handleSave}
            activeOpacity={0.85}
            className="min-w-0 flex-1"
            color={c}
            containerStyle={{
              backgroundColor: c.accent.primary,
              borderRadius: 12,
            }}
            accessibilityLabel={t('record.markSave')}
          />
        </View>
      </BottomSheetView>
    </AppBottomSheetModal>
  );
};
