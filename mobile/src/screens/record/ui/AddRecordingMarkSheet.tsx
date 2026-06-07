import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Keyboard,
  LayoutAnimation,
  Platform,
  Pressable,
  Text,
  UIManager,
  View,
} from 'react-native';
import { TextInput } from 'react-native-gesture-handler';

import {
  DEFAULT_RECORDING_MARK_KIND,
  getRecordingMarkKindAccentColors,
  getRecordingMarkKindUi,
  RECORDING_MARK_PICKER_KINDS,
  type RecordingMarkKind,
  RecordingMarkKindCard,
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
import runAfterInteractions from '@/shared/lib/runAfterInteractions';
import { AppBottomSheetModal, SheetFooterButtons, useBottomSheetContentPadding } from '@/shared/ui';

const MARK_LABEL_MAX_CHARS = 280;
const MARK_SHEET_KEYBOARD_BOTTOM_PADDING = 24;

const MARK_PICKER_ROWS: RecordingMarkKind[][] = [
  RECORDING_MARK_PICKER_KINDS.slice(0, 3),
  RECORDING_MARK_PICKER_KINDS.slice(3, 6),
];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SheetStep = 'pick' | 'label';

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
  const [step, setStep] = useState<SheetStep>('pick');
  const [pendingKind, setPendingKind] = useState<RecordingMarkKind>(DEFAULT_RECORDING_MARK_KIND);
  const [label, setLabel] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const labelInputRef = useRef<TextInput>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    savedRef.current = false;
    setStep('pick');
    setPendingKind(DEFAULT_RECORDING_MARK_KIND);
    setLabel('');
  }, [visible]);

  useEffect(() => {
    if (!visible || step !== 'label') return;
    const task = runAfterInteractions(() => {
      requestAnimationFrame(() => {
        labelInputRef.current?.focus();
      });
    });
    return () => task.cancel();
  }, [visible, step]);

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

  const saveAndDismiss = useCallback(
    (kind: RecordingMarkKind, labelText: string) => {
      savedRef.current = true;
      hapticSuccess();
      onSave(kind, labelText.trim().slice(0, MARK_LABEL_MAX_CHARS));
      bottomSheetRef.current?.dismiss();
    },
    [onSave],
  );

  const goToLabelStep = useCallback((kind: RecordingMarkKind) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPendingKind(kind);
    setLabel('');
    setStep('label');
  }, []);

  const handleKindPress = useCallback(
    (kind: RecordingMarkKind) => {
      saveAndDismiss(kind, '');
    },
    [saveAndDismiss],
  );

  const handleKindLongPress = useCallback(
    (kind: RecordingMarkKind) => {
      hapticLight();
      goToLabelStep(kind);
    },
    [goToLabelStep],
  );

  const handleLabelBack = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStep('pick');
    setLabel('');
    Keyboard.dismiss();
  }, []);

  const handleLabelSave = useCallback(() => {
    saveAndDismiss(pendingKind, label);
  }, [label, pendingKind, saveAndDismiss]);

  const timeSec = Math.max(0, Math.floor(snapshotOffsetMs / 1000));

  const bottomPadding =
    step === 'label' && keyboardVisible
      ? { paddingBottom: MARK_SHEET_KEYBOARD_BOTTOM_PADDING }
      : contentPadding;

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
          paddingHorizontal: 20,
          paddingTop: 4,
          ...bottomPadding,
          gap: step === 'pick' ? 20 : 16,
        }}
      >
        {step === 'pick' ? (
          <>
            <View className="gap-1">
              <Text className="text-xl font-semibold leading-7" style={{ color: c.text.primary }}>
                {t('record.markSheetTitle')}
              </Text>
              <Text className="text-[15px] leading-[21px]" style={{ color: c.text.secondary }}>
                {t('record.markAtTime', { time: formatTime(timeSec) })}
              </Text>
            </View>

            <View className="gap-2">
              {MARK_PICKER_ROWS.map((row, rowIndex) => (
                <View key={rowIndex} className="flex-row items-stretch gap-2">
                  {row.map((kind) => (
                    <View key={kind} className="min-w-0 flex-1">
                      <RecordingMarkKindCard
                        kind={kind}
                        color={c}
                        onPress={handleKindPress}
                        onLongPress={handleKindLongPress}
                      />
                    </View>
                  ))}
                </View>
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('record.markAddLabelLink')}
              onPress={() => goToLabelStep(DEFAULT_RECORDING_MARK_KIND)}
              className="self-center py-1"
              hitSlop={8}
            >
              <Text className="text-[15px] font-medium" style={{ color: c.accent.primary }}>
                {t('record.markAddLabelLink')}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <View className="gap-1">
              <Text className="text-xl font-semibold" style={{ color: c.text.primary }}>
                {t('record.markLabelStepTitle')}
              </Text>
              <Text className="text-[15px] leading-[21px]" style={{ color: c.text.secondary }}>
                {t('record.markAtTime', { time: formatTime(timeSec) })}
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {RECORDING_MARK_PICKER_KINDS.map((kind) => {
                const { recordA11yKey } = getRecordingMarkKindUi(kind);
                const { accent } = getRecordingMarkKindAccentColors(kind, theme, surfaceDark);
                const selected = pendingKind === kind;
                const selectedFg = folderChipActiveForeground(c, accent);
                return (
                  <Pressable
                    key={kind}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={t(recordA11yKey)}
                    onPress={() => {
                      hapticSelection();
                      setPendingKind(kind);
                    }}
                    className="min-h-[36px] items-center justify-center rounded-xl px-3 py-2"
                    style={{
                      backgroundColor: selected ? accent : c.background.tertiary,
                    }}
                  >
                    <Text
                      className="text-center text-[13px] font-semibold"
                      style={{ color: selected ? selectedFg : c.text.primary }}
                    >
                      {t(recordA11yKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <BottomSheetTextInput
              ref={labelInputRef}
              className="min-h-[88px] rounded-2xl px-4 py-3.5 text-[16px]"
              style={{
                color: c.text.primary,
                backgroundColor: c.background.tertiary,
                textAlignVertical: 'top',
              }}
              placeholder={t('record.markLabelPlaceholder')}
              placeholderTextColor={c.text.muted}
              value={label}
              onChangeText={(text) => setLabel(text.slice(0, MARK_LABEL_MAX_CHARS))}
              multiline
              maxLength={MARK_LABEL_MAX_CHARS}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={handleLabelSave}
              accessibilityLabel={t('record.markLabelPlaceholder')}
            />

            <SheetFooterButtons
              className="w-full"
              color={c}
              primaryLabel={t('record.markSave')}
              onPrimaryPress={handleLabelSave}
              secondaryLabel={t('common.goBack')}
              onSecondaryPress={handleLabelBack}
            />
          </>
        )}
      </BottomSheetView>
    </AppBottomSheetModal>
  );
};
