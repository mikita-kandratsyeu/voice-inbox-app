import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/shared/config';
import { TASK_EXTRACTION_HINT_MAX_CHARS } from '@/shared/lib/ai-core/local-provider/localAiConstants';
import { modalKeyboardBehavior } from '@/shared/lib/platform';
import { Button } from '@/shared/ui';

type TaskReextractHintSheetProps = {
  onClose: () => void;
  onConfirm: (hint: string | undefined) => void;
  visible: boolean;
};

export function TaskReextractHintSheet({
  visible,
  onClose,
  onConfirm,
}: TaskReextractHintSheetProps) {
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [hintText, setHintText] = useState('');

  useEffect(() => {
    if (visible) {
      setHintText('');
      const frame = requestAnimationFrame(() => {
        bottomSheetRef.current?.present();
      });
      return () => cancelAnimationFrame(frame);
    }
    bottomSheetRef.current?.dismiss();
    return undefined;
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} pressBehavior="close" opacity={0.45} />
    ),
    [],
  );

  const presets = useMemo(
    () => [
      {
        label: t('recordingDetail.tasksReextractPresetSplitLabel'),
        hint: t('recordingDetail.tasksReextractPresetSplitHint'),
      },
      {
        label: t('recordingDetail.tasksReextractPresetBreakLargeLabel'),
        hint: t('recordingDetail.tasksReextractPresetBreakLargeHint'),
      },
      {
        label: t('recordingDetail.tasksReextractPresetMergeLabel'),
        hint: t('recordingDetail.tasksReextractPresetMergeHint'),
      },
      {
        label: t('recordingDetail.tasksReextractPresetShortenLabel'),
        hint: t('recordingDetail.tasksReextractPresetShortenHint'),
      },
    ],
    [t],
  );

  const appendPreset = (text: string) => {
    setHintText((prev) => {
      const p = prev.trim();
      const next = p.length > 0 ? `${p}\n\n${text}` : text;

      return next.length > TASK_EXTRACTION_HINT_MAX_CHARS
        ? next.slice(0, TASK_EXTRACTION_HINT_MAX_CHARS)
        : next;
    });
  };

  const handleConfirm = useCallback(() => {
    const trimmed = hintText.split('\0').join('').trim();
    onConfirm(trimmed.length > 0 ? trimmed : undefined);
    bottomSheetRef.current?.dismiss();
  }, [hintText, onConfirm]);

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
        <View className="mb-3 justify-center">
          <Text
            className="px-14 text-center text-[17px] font-semibold"
            style={{ color: color.text.primary }}
          >
            {t('recordingDetail.tasksReextractSheetTitle')}
          </Text>
        </View>
        <Text
          className="mb-3 px-2 text-center text-[13px] leading-[18px]"
          style={{ color: color.text.secondary }}
        >
          {t('recordingDetail.tasksReextractSheetSubtitle')}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
          <View className="flex-row flex-nowrap gap-2 px-1 py-0.5">
            {presets.map((p) => (
              <Pressable
                key={p.label}
                onPress={() => appendPreset(p.hint)}
                accessibilityRole="button"
                accessibilityLabel={p.label}
                className="rounded-full px-3 py-2"
                style={{ backgroundColor: color.background.tertiary }}
              >
                <Text className="text-[13px]" style={{ color: color.text.primary }}>
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <BottomSheetTextInput
          value={hintText}
          onChangeText={(text) =>
            setHintText(text.split('\0').join('').slice(0, TASK_EXTRACTION_HINT_MAX_CHARS))
          }
          multiline
          textAlignVertical="top"
          placeholder={t('recordingDetail.tasksReextractHintPlaceholder')}
          placeholderTextColor={color.text.muted}
          accessibilityLabel={t('recordingDetail.tasksReextractHintA11y')}
          className="min-h-[100px] rounded-xl border px-3 py-3 text-[16px] leading-[22px]"
          style={{
            borderColor: color.border.default,
            color: color.text.primary,
            backgroundColor: color.background.secondary,
          }}
        />
        <Text className="mt-1.5 text-center text-[12px]" style={{ color: color.text.secondary }}>
          {t('recordingDetail.tasksReextractCharCount', {
            current: hintText.length,
            max: TASK_EXTRACTION_HINT_MAX_CHARS,
          })}
        </Text>
        <View className="mt-4 w-full">
          <Button
            variant="primary"
            size="lg"
            label={t('recordingDetail.reextractTasks')}
            color={color}
            onPress={handleConfirm}
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
