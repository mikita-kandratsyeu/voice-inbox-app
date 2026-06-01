import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useColors } from '@/shared/config';
import { TASK_EXTRACTION_HINT_MAX_CHARS } from '@/shared/lib/ai-core/local-provider/localAiConstants';
import { AppBottomSheetModal, SheetFooterButtons, useBottomSheetContentPadding } from '@/shared/ui';

type SummaryRegenerateHintSheetProps = {
  visible: boolean;
  isMeeting?: boolean;
  onClose: () => void;
  onConfirm: (hint: string | undefined) => void;
};

export function SummaryRegenerateHintSheet({
  visible,
  isMeeting = false,
  onClose,
  onConfirm,
}: SummaryRegenerateHintSheetProps) {
  const { t } = useTranslation();
  const color = useColors();
  const contentPadding = useBottomSheetContentPadding(20);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [hintText, setHintText] = useState('');

  useEffect(() => {
    if (visible) setHintText('');
  }, [visible]);

  const presets = useMemo(() => {
    const items = [
      {
        label: t('recordingDetail.summaryRegeneratePresetShorterLabel'),
        hint: t('recordingDetail.summaryRegeneratePresetShorterHint'),
      },
      {
        label: t('recordingDetail.summaryRegeneratePresetBulletsLabel'),
        hint: t('recordingDetail.summaryRegeneratePresetBulletsHint'),
      },
      {
        label: t('recordingDetail.summaryRegeneratePresetDecisionsLabel'),
        hint: t('recordingDetail.summaryRegeneratePresetDecisionsHint'),
      },
    ];
    if (isMeeting) {
      items.push({
        label: t('recordingDetail.summaryRegeneratePresetMeetingLabel'),
        hint: t('recordingDetail.summaryRegeneratePresetMeetingHint'),
      });
    }
    return items;
  }, [isMeeting, t]);

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
    <AppBottomSheetModal ref={bottomSheetRef} visible={visible} onClose={onClose}>
      <BottomSheetView className="px-5 pt-1" style={contentPadding}>
        <View className="mb-3 justify-center">
          <Text
            className="px-14 text-center text-[17px] font-semibold"
            style={{ color: color.text.primary }}
          >
            {t('recordingDetail.summaryRegenerateSheetTitle')}
          </Text>
        </View>
        <Text
          className="mb-3 px-2 text-center text-[13px] leading-[18px]"
          style={{ color: color.text.secondary }}
        >
          {t('recordingDetail.summaryRegenerateSheetSubtitle')}
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
          placeholder={t('recordingDetail.summaryRegenerateHintPlaceholder')}
          placeholderTextColor={color.text.muted}
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={handleConfirm}
          accessibilityLabel={t('recordingDetail.summaryRegenerateHintA11y')}
          className="min-h-[100px] rounded-xl border px-3 py-3 text-[16px] leading-[22px]"
          style={{
            borderColor: color.border.default,
            color: color.text.primary,
            backgroundColor: color.background.secondary,
          }}
        />
        <Text className="mt-1.5 text-center text-[12px]" style={{ color: color.text.secondary }}>
          {t('recordingDetail.summaryRegenerateCharCount', {
            current: hintText.length,
            max: TASK_EXTRACTION_HINT_MAX_CHARS,
          })}
        </Text>
        <SheetFooterButtons
          color={color}
          primaryLabel={t('recordingDetail.regenerateSummary')}
          onPrimaryPress={handleConfirm}
        />
      </BottomSheetView>
    </AppBottomSheetModal>
  );
}
