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

import type { Colors } from '@/shared/config';
import { modalKeyboardBehavior } from '@/shared/lib';
import { TASK_EXTRACTION_HINT_MAX_CHARS } from '@/shared/lib/ai-core/local-provider/localAiConstants';
import { Button } from '@/shared/ui';

type TaskReextractHintSheetProps = {
  color: Colors;
  onClose: () => void;
  onConfirm: (hint: string | undefined) => void;
  visible: boolean;
};

export function TaskReextractHintSheet({
  visible,
  onClose,
  onConfirm,
  color,
}: TaskReextractHintSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [hintText, setHintText] = useState('');
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!visible) {
      bottomSheetRef.current?.dismiss();
      return;
    }

    setHintText('');
    bottomSheetRef.current?.present();
  }, [visible]);

  const handleSheetDismiss = useCallback(() => {
    onCloseRef.current();
  }, []);

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
        label: t('recordingDetail.tasksReextractPresetMergeLabel'),
        hint: t('recordingDetail.tasksReextractPresetMergeHint'),
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
      onDismiss={handleSheetDismiss}
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
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
      >
        <Text className="text-lg font-semibold" style={{ color: color.text.primary }}>
          {t('recordingDetail.tasksReextractSheetTitle')}
        </Text>
        <Text className="mt-2 text-sm leading-5" style={{ color: color.text.secondary }}>
          {t('recordingDetail.tasksReextractSheetSubtitle')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 12 }}
          contentContainerStyle={{
            flexDirection: 'row',
            flexWrap: 'nowrap',
            gap: 8,
            paddingVertical: 2,
          }}
        >
          {presets.map((p) => (
            <Pressable
              key={p.label}
              onPress={() => appendPreset(p.hint)}
              accessibilityRole="button"
              accessibilityLabel={p.label}
              style={{
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: color.background.tertiary,
              }}
            >
              <Text className="text-sm" style={{ color: color.text.primary }}>
                {p.label}
              </Text>
            </Pressable>
          ))}
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
          className="mt-3 min-h-[100px] rounded-xl border px-3 py-3 text-base leading-5"
          style={{
            borderColor: color.border.default,
            color: color.text.primary,
            backgroundColor: color.background.secondary,
          }}
        />
        <Text className="mt-1.5 text-xs" style={{ color: color.text.secondary }}>
          {t('recordingDetail.tasksReextractCharCount', {
            current: hintText.length,
            max: TASK_EXTRACTION_HINT_MAX_CHARS,
          })}
        </Text>
        <View className="mt-5 flex-row flex-wrap items-center justify-end gap-3">
          <Button
            variant="ghost"
            label={t('common.cancel')}
            color={color}
            onPress={() => bottomSheetRef.current?.dismiss()}
          />
          <Button
            variant="primary"
            label={t('recordingDetail.reextractTasks')}
            color={color}
            onPress={handleConfirm}
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
