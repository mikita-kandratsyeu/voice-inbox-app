import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { VoiceRecord } from '@/entities/record';
import { getColors, useAppTheme } from '@/shared/config';
import { formatTime, hapticSuccess, modalKeyboardBehavior } from '@/shared/lib';
import { Button } from '@/shared/ui';

import { generateRecordId } from '../lib/generateRecordId';
import { getAutoTitle } from '../lib/getAutoTitle';

type SaveRecordModalProps = {
  visible: boolean;
  title: string;
  elapsed: number;
  elapsedMs: number;
  audioPath: string | null;
  onTitleChange: (text: string) => void;
  onCancel: () => void;
  onSave: (record: VoiceRecord) => Promise<void> | void;
  onSaveComplete?: () => void;
  allowResume?: boolean;
};

type DismissReason = 'none' | 'cancel' | 'save';

export const SaveRecordModal = ({
  visible,
  title,
  elapsed,
  elapsedMs,
  audioPath,
  onTitleChange,
  onCancel,
  onSave,
  onSaveComplete,
  allowResume = true,
}: SaveRecordModalProps) => {
  const { t } = useTranslation();
  const scheme = useAppTheme();
  const c = getColors(scheme);
  const insets = useSafeAreaInsets();

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const dismissReasonRef = useRef<DismissReason>('none');
  const autoTitleRef = useRef<string>('');

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} pressBehavior="none" opacity={0.35} />
    ),
    [],
  );

  useEffect(() => {
    if (visible) {
      dismissReasonRef.current = 'none';
      autoTitleRef.current = getAutoTitle();
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    if (dismissReasonRef.current !== 'save' && dismissReasonRef.current !== 'cancel') {
      onCancel();
    }
    dismissReasonRef.current = 'none';
  }, [onCancel]);

  const handleCancel = useCallback(() => {
    dismissReasonRef.current = 'cancel';
    onCancel();
    bottomSheetRef.current?.dismiss();
  }, [onCancel]);

  const handleSave = useCallback(async () => {
    const resolvedTitle = title.trim() || autoTitleRef.current || getAutoTitle();
    const record: VoiceRecord = {
      id: generateRecordId(),
      title: resolvedTitle,
      transcript: '',
      transcriptSegments: [],
      summary: '',
      tasks: [],
      duration: formatTime(elapsed),
      durationMs: Math.round(elapsedMs),
      createdAt: dayjs().toISOString(),
      status: 'unread',
      aiStatus: 'idle',
      transcriptProgress: 0,
      isPinned: false,
      tags: [],
      audioPath: audioPath?.startsWith('file://') ? audioPath.slice(7) : (audioPath ?? undefined),
    };

    await onSave(record);
    hapticSuccess();
    dismissReasonRef.current = 'save';
    bottomSheetRef.current?.dismiss();
    onSaveComplete?.();
  }, [title, elapsed, elapsedMs, audioPath, onSave, onSaveComplete]);

  const autoTitle = autoTitleRef.current || getAutoTitle();

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      enableDynamicSizing
      enablePanDownToClose={false}
      enableOverDrag={false}
      keyboardBehavior={modalKeyboardBehavior}
      keyboardBlurBehavior="restore"
      enableBlurKeyboardOnGesture
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      backgroundStyle={{ backgroundColor: c.background.card }}
      handleIndicatorStyle={{ backgroundColor: c.text.muted }}
    >
      <BottomSheetView
        style={{
          paddingHorizontal: 24,
          paddingTop: 4,
          paddingBottom: Math.max(insets.bottom, 24),
          gap: 12,
        }}
      >
        <Text className="text-lg font-bold" style={{ color: c.text.primary }}>
          {t('record.saveModalTitle')}
        </Text>

        <BottomSheetTextInput
          className="rounded-xl border-2 px-4 py-3 text-[16px]"
          style={{
            borderColor: c.accent.primary,
            color: c.text.primary,
            backgroundColor: c.background.tertiary,
          }}
          placeholder={autoTitle}
          placeholderTextColor={c.text.muted}
          value={title}
          onChangeText={onTitleChange}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSave}
          accessibilityLabel={t('record.saveModalTitle')}
          accessibilityHint={t('record.titleInputHint')}
        />

        <Text className="-mt-1 text-[13px]" style={{ color: c.text.secondary }}>
          {t('record.duration', { time: formatTime(elapsed) })}
        </Text>

        <View className="mt-1 flex-row gap-3">
          {allowResume && (
            <Button
              variant="secondary"
              label={t('record.continueRecording')}
              onPress={handleCancel}
              activeOpacity={0.8}
              className="min-w-0 flex-1"
              color={c}
              containerStyle={{
                backgroundColor: c.background.tertiary,
                borderRadius: 12,
              }}
              accessibilityLabel={t('record.continueRecording')}
              accessibilityHint={t('record.resume')}
            />
          )}
          <Button
            variant="primary"
            label={t('common.save')}
            onPress={handleSave}
            activeOpacity={0.85}
            className={allowResume ? 'min-w-0 flex-1' : 'w-full self-stretch'}
            color={c}
            containerStyle={{
              backgroundColor: c.accent.primary,
              borderRadius: 12,
            }}
            accessibilityLabel={t('common.save')}
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};
