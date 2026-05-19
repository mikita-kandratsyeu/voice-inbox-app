import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  InteractionManager,
  Keyboard,
  LayoutAnimation,
  Platform,
  Text,
  UIManager,
  View,
} from 'react-native';
import { TextInput } from 'react-native-gesture-handler';

import {
  DEFAULT_RECORDING_MARK_KIND,
  getRecordingMarkKindUi,
  RECORDING_MARK_PICKER_KINDS,
  type RecordingMarkKind,
  RecordingMarkKindCard,
} from '@/entities/record';
import { useColors } from '@/shared/config';
import { formatTime, hapticLight, hapticSuccess, IS_IOS } from '@/shared/lib';
import { AppBottomSheetModal, Button, useBottomSheetContentPadding } from '@/shared/ui';

const MARK_LABEL_MAX_CHARS = 280;
const MARK_SHEET_KEYBOARD_BOTTOM_PADDING = 24;

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
    const task = InteractionManager.runAfterInteractions(() => {
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
    hapticLight();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStep('pick');
    setLabel('');
    Keyboard.dismiss();
  }, []);

  const handleLabelSave = useCallback(() => {
    saveAndDismiss(pendingKind, label);
  }, [label, pendingKind, saveAndDismiss]);

  const timeSec = Math.max(0, Math.floor(snapshotOffsetMs / 1000));
  const pendingKindTitle = t(getRecordingMarkKindUi(pendingKind).recordA11yKey);

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
          paddingHorizontal: 24,
          paddingTop: 4,
          ...bottomPadding,
          gap: step === 'pick' ? 16 : 12,
        }}
      >
        {step === 'pick' ? (
          <>
            <View className="gap-1.5">
              <Text className="text-[22px] font-bold leading-7" style={{ color: c.text.primary }}>
                {t('record.markSheetTitle')}
              </Text>
              <Text className="text-[15px] leading-[22px]" style={{ color: c.text.secondary }}>
                {t('record.markAtTime', { time: formatTime(timeSec) })}
              </Text>
            </View>

            <View className="gap-3">
              <View className="flex-row gap-3">
                {RECORDING_MARK_PICKER_KINDS.slice(0, 2).map((kind) => (
                  <RecordingMarkKindCard
                    key={kind}
                    kind={kind}
                    color={c}
                    onPress={handleKindPress}
                    onLongPress={handleKindLongPress}
                  />
                ))}
              </View>
              <View className="flex-row gap-3">
                {RECORDING_MARK_PICKER_KINDS.slice(2).map((kind) => (
                  <RecordingMarkKindCard
                    key={kind}
                    kind={kind}
                    color={c}
                    onPress={handleKindPress}
                    onLongPress={handleKindLongPress}
                  />
                ))}
              </View>
            </View>

            <Text
              className="text-center text-[13px] leading-[18px]"
              style={{ color: c.text.muted }}
              accessibilityRole="text"
            >
              {t('record.markHoldForLabel')}
            </Text>
          </>
        ) : (
          <>
            <View className="gap-1">
              <Text className="text-lg font-bold" style={{ color: c.text.primary }}>
                {t('record.markLabelStepTitle')}
              </Text>
              <Text className="text-[14px] leading-5" style={{ color: c.text.secondary }}>
                {pendingKindTitle} · {t('record.markAtTime', { time: formatTime(timeSec) })}
              </Text>
            </View>

            <BottomSheetTextInput
              ref={labelInputRef}
              className="min-h-[96px] rounded-2xl border px-4 py-3.5 text-[16px]"
              style={{
                borderColor: c.border.default,
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

            <View className="mt-1 flex-row gap-3">
              <Button
                variant="secondary"
                label={t('common.goBack')}
                onPress={handleLabelBack}
                activeOpacity={0.8}
                className="min-w-0 flex-1"
                color={c}
                containerStyle={{
                  backgroundColor: c.background.tertiary,
                  borderRadius: 12,
                }}
                accessibilityLabel={t('common.goBack')}
              />
              <Button
                variant="primary"
                label={t('record.markSave')}
                onPress={handleLabelSave}
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
          </>
        )}
      </BottomSheetView>
    </AppBottomSheetModal>
  );
};
