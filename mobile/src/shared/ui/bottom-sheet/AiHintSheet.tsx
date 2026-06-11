import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { TASK_EXTRACTION_HINT_MAX_CHARS } from '@/shared/lib/ai-core/local-provider/localAiConstants';

import { AppBottomSheetContent } from './AppBottomSheetContent';
import { AppBottomSheetModal } from './AppBottomSheetModal';
import { SheetFooterButtons } from './SheetFooterButtons';
import { SheetHeader } from './SheetHeader';

export type AiHintPreset = {
  label: string;
  hint: string;
};

type AiHintSheetProps = {
  visible: boolean;
  color: Colors;
  title: string;
  subtitle: string;
  presets: AiHintPreset[];
  placeholder: string;
  hintA11y: string;
  charCountLabel: (current: number, max: number) => string;
  primaryLabel: string;
  onClose: () => void;
  onConfirm: (hint: string | undefined) => void;
};

export function AiHintSheet({
  visible,
  color,
  title,
  subtitle,
  presets,
  placeholder,
  hintA11y,
  charCountLabel,
  primaryLabel,
  onClose,
  onConfirm,
}: AiHintSheetProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [hintText, setHintText] = useState('');

  useEffect(() => {
    if (visible) setHintText('');
  }, [visible]);

  const appendPreset = (text: string) => {
    setHintText((prev) => {
      const trimmed = prev.trim();
      const next = trimmed.length > 0 ? `${trimmed}\n\n${text}` : text;

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
    <AppBottomSheetModal ref={bottomSheetRef} visible={visible} onClose={onClose}>
      <AppBottomSheetContent>
        <SheetHeader title={title} subtitle={subtitle} color={color} marginBottom={12} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
          <View className="flex-row flex-nowrap gap-2 px-1 py-0.5">
            {presets.map((preset) => (
              <Pressable
                key={preset.label}
                onPress={() => appendPreset(preset.hint)}
                accessibilityRole="button"
                accessibilityLabel={preset.label}
                className="rounded-full px-3 py-2"
                style={{ backgroundColor: color.background.tertiary }}
              >
                <Text className="text-[13px]" style={{ color: color.text.primary }}>
                  {preset.label}
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
          placeholder={placeholder}
          placeholderTextColor={color.text.muted}
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={handleConfirm}
          accessibilityLabel={hintA11y}
          className="min-h-[100px] rounded-xl border px-3 py-3 text-[16px] leading-[22px]"
          style={{
            borderColor: color.border.default,
            color: color.text.primary,
            backgroundColor: color.background.secondary,
          }}
        />
        <Text className="mt-1.5 text-center text-[12px]" style={{ color: color.text.secondary }}>
          {charCountLabel(hintText.length, TASK_EXTRACTION_HINT_MAX_CHARS)}
        </Text>
        <SheetFooterButtons
          color={color}
          primaryLabel={primaryLabel}
          onPrimaryPress={handleConfirm}
        />
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
