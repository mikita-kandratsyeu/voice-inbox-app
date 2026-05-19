import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InteractionManager, Keyboard, Pressable, Text, View } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';

import {
  DEFAULT_RECORDING_MARK_KIND,
  getRecordingMarkKindAccentColors,
  getRecordingMarkKindUi,
  RECORDING_MARK_PICKER_KINDS,
  type RecordingMarkKind,
} from '@/entities/record';
import { useAppTheme, useColors } from '@/shared/config';
import {
  folderChipActiveForeground,
  formatTime,
  hapticLight,
  hapticSelection,
  hapticSuccess,
  IS_IOS,
  isDarkSurfaceColor,
} from '@/shared/lib';
import { AppBottomSheetModal, Button, useBottomSheetContentPadding } from '@/shared/ui';

const MARK_LABEL_MAX_CHARS = 280;
/** Extra space above the system keyboard so action buttons are not flush against it. */
const MARK_SHEET_KEYBOARD_BOTTOM_PADDING = 24;

type AddRecordingMarkSheetProps = {
  visible: boolean;
  /** Timestamp in the recording when the user opened the sheet (frozen). */
  snapshotOffsetMs: number;
  onClose: () => void;
  onSave: (kind: RecordingMarkKind, label: string) => void;
};

export const AddRecordingMarkSheet = ({
  visible,
  snapshotOffsetMs,
  onClose,
  onSave,
}: AddRecordingMarkSheetProps) => {
  const { t } = useTranslation();
  const c = useColors();
  const theme = useAppTheme();
  const surfaceDark = isDarkSurfaceColor(c);
  const contentPadding = useBottomSheetContentPadding(24);
  const [selectedKind, setSelectedKind] = useState<RecordingMarkKind>(DEFAULT_RECORDING_MARK_KIND);
  const [label, setLabel] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const labelInputRef = useRef<TextInput>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    savedRef.current = false;
    setSelectedKind(DEFAULT_RECORDING_MARK_KIND);
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
    onSave(selectedKind, label.trim().slice(0, MARK_LABEL_MAX_CHARS));
    bottomSheetRef.current?.dismiss();
  }, [label, onSave, selectedKind]);

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

        <View className="gap-2">
          <Text className="text-[13px] font-medium" style={{ color: c.text.secondary }}>
            {t('record.markKindPicker')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {RECORDING_MARK_PICKER_KINDS.map((kind) => {
              const { Icon, recordA11yKey } = getRecordingMarkKindUi(kind);
              const { accent, backgroundUnselected, borderUnselected } =
                getRecordingMarkKindAccentColors(kind, theme, surfaceDark);
              const selected = selectedKind === kind;
              const selectedFg = folderChipActiveForeground(c, accent);
              return (
                <Pressable
                  key={kind}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t(recordA11yKey)}
                  onPress={() => {
                    hapticSelection();
                    setSelectedKind(kind);
                  }}
                  className="min-w-[47%] flex-1 flex-row items-center gap-2.5 rounded-xl px-3 py-3"
                  style={{
                    borderWidth: 1,
                    borderColor: selected ? accent : borderUnselected,
                    backgroundColor: selected ? accent : backgroundUnselected,
                  }}
                >
                  <Icon size={18} color={selected ? selectedFg : accent} strokeWidth={2} />
                  <Text
                    className="flex-1 text-[14px] font-semibold leading-5"
                    style={{ color: selected ? selectedFg : c.text.primary }}
                    numberOfLines={2}
                  >
                    {t(recordA11yKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

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
