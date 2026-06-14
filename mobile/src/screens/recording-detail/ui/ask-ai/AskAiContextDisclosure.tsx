import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { ChevronRight, Cloud, Shield } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';
import { KeyboardController } from 'react-native-keyboard-controller';

import type { VoiceRecord } from '@/entities/record';
import type { AiExecutionMode } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import {
  SheetFooterButtons,
  useAppBottomSheetChrome,
  useBottomSheetContentPadding,
} from '@/shared/ui';

type AskAiContextDisclosureProps = {
  color: Colors;
  record: VoiceRecord;
  /** Completed Q&A pairs in this session included with the next ask (current turn counts when both parts exist). */
  priorDepth: number;
  aiExecutionMode: AiExecutionMode;
  containerClassName?: string;
  /** Optional note title — wraps row in one card with the title above (answer screen). */
  headline?: string;
};

export const AskAiContextDisclosure = ({
  color,
  record,
  priorDepth,
  aiExecutionMode,
  containerClassName = 'mt-1',
  headline,
}: AskAiContextDisclosureProps) => {
  const { t } = useTranslation();
  const contentPadding = useBottomSheetContentPadding(20);
  const sheetChrome = useAppBottomSheetChrome({ surface: 'card' });
  const sheetRef = useRef<BottomSheetModal>(null);

  const hasSummary = Boolean(record.summary?.trim());
  const hasTasks = Boolean(record.tasks?.some((task) => task.text?.trim()));
  const hasLinkedNotes = Boolean(record.linkedRecordIds?.length);
  const hasPrior = priorDepth > 0;
  const isPrivate = aiExecutionMode === 'private_experimental';

  const sourceLabels = useMemo(() => {
    const labels = [t('recordingDetail.askContextSourceTranscript')];
    if (hasSummary) labels.push(t('recordingDetail.askContextSourceSummary'));
    if (hasTasks) labels.push(t('recordingDetail.askContextSourceTasks'));
    if (hasLinkedNotes) labels.push(t('recordingDetail.askContextSourceLinkedNotes'));
    if (hasPrior) labels.push(t('recordingDetail.askContextSourceChat'));
    return labels;
  }, [hasLinkedNotes, hasPrior, hasSummary, hasTasks, t]);

  const sourcesLine = useMemo(() => sourceLabels.join(' · '), [sourceLabels]);
  const processingLine = isPrivate
    ? t('recordingDetail.askContextProcessingPrivate')
    : t('recordingDetail.askContextProcessingCloud');
  const a11yMeta = `${sourcesLine}. ${processingLine}`;

  const openSheet = useCallback(() => {
    KeyboardController.dismiss();
    requestAnimationFrame(() => {
      sheetRef.current?.present();
    });
  }, []);

  const closeSheet = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  const sheetBullets = useMemo(() => {
    const items: { key: string; text: string }[] = [
      { key: 'tr', text: t('recordingDetail.askContextBulletTranscript') },
    ];
    if (hasSummary) items.push({ key: 'sum', text: t('recordingDetail.askContextBulletSummary') });
    if (hasTasks) items.push({ key: 'tasks', text: t('recordingDetail.askContextBulletTasks') });
    if (hasLinkedNotes) {
      items.push({ key: 'linked', text: t('recordingDetail.askContextBulletLinkedNotes') });
    }
    if (hasPrior) items.push({ key: 'prior', text: t('recordingDetail.askContextBulletPrior') });
    items.push({ key: 'q', text: t('recordingDetail.askContextBulletQuestion') });
    return items;
  }, [hasLinkedNotes, hasPrior, hasSummary, hasTasks, t]);

  const footerText = isPrivate
    ? t('recordingDetail.askContextFooterPrivate')
    : t('recordingDetail.askContextFooterCloud');

  const metaRow = (
    <TouchableOpacity
      onPress={openSheet}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${a11yMeta}. ${t('recordingDetail.askContextLearnMoreA11y')}`}
      className="flex-row items-start gap-2"
      style={{
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: headline ? 10 : 12,
        backgroundColor: color.background.primary,
        borderWidth: 1,
        borderColor: color.border.default,
      }}
    >
      <View className="min-w-0 flex-1" style={{ gap: 8 }}>
        <Text
          className="text-[14px] font-medium leading-5"
          style={{ color: color.text.primary }}
          numberOfLines={3}
        >
          {sourcesLine}
        </Text>
        <View
          className="self-start flex-row items-center"
          style={{
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
            backgroundColor: color.background.tertiary,
          }}
        >
          {isPrivate ? (
            <Shield size={14} color={color.text.secondary} strokeWidth={2} />
          ) : (
            <Cloud size={14} color={color.text.secondary} strokeWidth={2} />
          )}
          <Text style={{ fontSize: 12, color: color.text.secondary }}>{processingLine}</Text>
        </View>
      </View>
      <View style={{ alignSelf: 'center' }}>
        <ChevronRight size={18} color={color.icon.muted} strokeWidth={2} />
      </View>
    </TouchableOpacity>
  );

  const sheet = (
    <BottomSheetModal ref={sheetRef} {...sheetChrome}>
      <BottomSheetView
        style={{
          paddingHorizontal: 20,
          ...contentPadding,
        }}
      >
        <Text
          className="text-[17px] font-semibold leading-6"
          style={{
            color: color.text.primary,
            fontSize: 20,
            fontWeight: '700',
            lineHeight: 28,
            marginTop: 4,
            textAlign: 'center',
          }}
        >
          {t('recordingDetail.askContextSheetTitle')}
        </Text>
        <Text
          style={{
            color: color.text.secondary,
            fontSize: 15,
            lineHeight: 22,
            marginBottom: 18,
            marginTop: 6,
            textAlign: 'center',
          }}
        >
          {t('recordingDetail.askContextSheetIntro')}
        </Text>
        <View className="gap-2">
          {sheetBullets.map((item) => (
            <View key={item.key} className="flex-row gap-2">
              <Text style={{ color: color.accent.primary, fontSize: 14, lineHeight: 22 }}>
                {'\u2022'}
              </Text>
              <Text
                className="flex-1 text-[14px] leading-[22px]"
                style={{ color: color.text.primary }}
              >
                {item.text}
              </Text>
            </View>
          ))}
        </View>
        <Text
          className="mt-3 text-[13px] leading-[19px]"
          style={{ color: color.text.secondary, marginBottom: 2 }}
        >
          {footerText}
        </Text>
        <SheetFooterButtons
          color={color}
          primaryLabel={t('common.gotIt')}
          onPrimaryPress={closeSheet}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );

  if (headline?.trim()) {
    return (
      <>
        <View
          className={`gap-3 rounded-2xl px-4 py-3 ${containerClassName}`}
          style={{
            backgroundColor: color.background.tertiary,
            borderWidth: 1,
            borderColor: color.border.default,
          }}
        >
          <Text
            className="text-base font-semibold leading-6"
            style={{ color: color.text.primary }}
            numberOfLines={2}
          >
            {headline.trim()}
          </Text>
          {metaRow}
        </View>
        {sheet}
      </>
    );
  }

  return (
    <>
      <View className={containerClassName}>{metaRow}</View>
      {sheet}
    </>
  );
};
