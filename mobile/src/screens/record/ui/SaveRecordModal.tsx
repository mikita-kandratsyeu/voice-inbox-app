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
import { Platform, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { VoiceRecord } from '@/entities/record';
import { getColors } from '@/shared/config';
import { formatTime } from '@/shared/lib';
import { Button } from '@/shared/ui';

import { generateRecordId } from '../lib/generateRecordId';

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
}: SaveRecordModalProps) => {
  const { t } = useTranslation();
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const c = getColors(scheme);
  const insets = useSafeAreaInsets();

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const dismissReasonRef = useRef<DismissReason>('none');

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} pressBehavior="none" opacity={0.35} />
    ),
    [],
  );

  useEffect(() => {
    if (visible) {
      dismissReasonRef.current = 'none';
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
    const record: VoiceRecord = {
      id: generateRecordId(),
      title: title.trim() || t('record.newRecord'),
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
    dismissReasonRef.current = 'save';
    bottomSheetRef.current?.dismiss();
    onSaveComplete?.();
  }, [title, elapsed, elapsedMs, audioPath, t, onSave, onSaveComplete]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      enableDynamicSizing
      enablePanDownToClose={false}
      keyboardBehavior={Platform.OS === 'ios' ? 'interactive' : 'fillParent'}
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
          paddingBottom: Math.max(insets.bottom, 24),
          gap: 16,
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
          placeholder={t('record.titlePlaceholder')}
          placeholderTextColor={c.text.muted}
          value={title}
          onChangeText={onTitleChange}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />

        <Text className="-mt-1 text-[14px]" style={{ color: c.text.secondary }}>
          {t('record.duration', { time: formatTime(elapsed) })}
        </Text>

        <View className="mt-1 flex-row gap-3">
          <Button
            variant="secondary"
            label={t('common.cancel')}
            onPress={handleCancel}
            activeOpacity={0.8}
            fullWidth
            color={c}
            containerStyle={{
              backgroundColor: c.background.tertiary,
              borderRadius: 12,
            }}
          />
          <Button
            variant="primary"
            label={t('common.save')}
            onPress={handleSave}
            activeOpacity={0.85}
            fullWidth
            color={c}
            containerStyle={{
              backgroundColor: c.accent.primary,
              borderRadius: 12,
            }}
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};
