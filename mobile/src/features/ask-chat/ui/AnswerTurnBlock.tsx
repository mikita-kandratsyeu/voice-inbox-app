import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { ChevronRight, Copy, FileText, Lightbulb, ShareIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { hapticSelection, IS_ANDROID } from '@/shared/lib';
import type { AskAnswerKind, AskEvidence } from '@/shared/lib/ai-core/types';
import { AppBottomSheetModal, useBottomSheetContentPadding } from '@/shared/ui';

import { AskAiAnswerMarkdown } from './AskAiAnswerMarkdown';
import { formatAskTurnForClipboard, formatAskTurnForShare } from './askAiFormat';
import { AskTurnQuestion } from './AskTurnQuestion';

type AskCopyTurnButtonProps = {
  color: Colors;
  clipboardText: string;
  onCopy: (text: string) => void;
};

const COPY_PRESS_IN_MS = 70;
const COPY_SPRING_DAMPING = 14;
const COPY_SPRING_STIFFNESS = 280;

/** Same min height as Share chip so the row stays visually aligned. */
const ASK_ACTION_CHIP_MIN_HEIGHT = 40;

const askActionChipTextProps = IS_ANDROID ? ({ includeFontPadding: false } as const) : {};

const AskCopyTurnButton = ({ color, clipboardText, onCopy }: AskCopyTurnButtonProps) => {
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  const chipAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    onCopy(clipboardText);
    scale.value = withSequence(
      withTiming(0.94, {
        duration: COPY_PRESS_IN_MS,
        easing: Easing.out(Easing.quad),
      }),
      withSpring(1, { damping: COPY_SPRING_DAMPING, stiffness: COPY_SPRING_STIFFNESS }),
    );
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t('recordingDetail.askCopyThisTurn')}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      className="flex-row items-center justify-center gap-2 rounded-xl px-3"
      style={{ backgroundColor: color.background.tertiary, minHeight: ASK_ACTION_CHIP_MIN_HEIGHT }}
    >
      <Animated.View className="flex-row items-center gap-2" style={chipAnimStyle}>
        <View className="h-[17] w-[17] shrink-0 items-center justify-center">
          <Copy size={17} color={color.text.primary} strokeWidth={2} />
        </View>
        <Text
          className="text-sm font-medium leading-5"
          style={{ color: color.text.primary }}
          numberOfLines={1}
          {...askActionChipTextProps}
        >
          {t('recordingDetail.askCopy')}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export type AnswerTurnBlockProps = {
  color: Colors;
  question: string;
  answer: string;
  answerKind?: AskAnswerKind;
  items?: string[];
  evidence?: AskEvidence[];
  interpretations?: string[];
  suggestedFollowUps?: string[];
  recordTitle: string;
  showDivider: boolean;
  onCopy: (text: string) => void;
  onShare: (text: string, title: string) => void;
  resolveEvidenceRecordId?: (item: AskEvidence) => string | undefined;
  onEvidenceNotePress?: (recordId: string) => void;
  modeBadgeLabel?: string;
};

function formatEvidenceOffset(offsetMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(offsetMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatEvidenceBadgeCount(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}

const AnswerStructuredItems = ({
  color,
  answerKind,
  items,
}: {
  color: Colors;
  answerKind?: AskAnswerKind;
  items?: string[];
}) => {
  const { t } = useTranslation();
  if (!items?.length) return null;

  const title =
    answerKind === 'tasks'
      ? t('recordingDetail.askStructuredTasks')
      : answerKind === 'decisions'
        ? t('recordingDetail.askStructuredDecisions')
        : t('recordingDetail.askStructuredItems');

  return (
    <View
      className="mt-1 gap-2 rounded-xl px-3 py-3"
      style={{ backgroundColor: color.background.tertiary }}
    >
      <Text className="text-xs font-semibold" style={{ color: color.text.secondary }}>
        {title}
      </Text>
      <View className="gap-2">
        {items.map((item, index) => (
          <View key={`${index}-${item}`} className="flex-row gap-2">
            <Text className="text-[15px] leading-[22px]" style={{ color: color.accent.primary }}>
              {index + 1}.
            </Text>
            <Text
              className="flex-1 text-[15px] leading-[22px]"
              style={{ color: color.text.primary }}
            >
              {item}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const AnswerInterpretations = ({
  color,
  interpretations,
}: {
  color: Colors;
  interpretations?: string[];
}) => {
  const { t } = useTranslation();
  if (!interpretations?.length) return null;

  return (
    <View
      className="mt-1 gap-2 rounded-xl px-3 py-3"
      style={{
        backgroundColor: color.background.tertiary,
        borderWidth: 1,
        borderColor: color.border.default,
        borderStyle: 'dashed',
      }}
    >
      <View className="flex-row items-start gap-2">
        <Lightbulb size={16} color={color.text.secondary} strokeWidth={2} />
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-xs font-semibold" style={{ color: color.text.secondary }}>
            {t('recordingDetail.askInterpretationsTitle')}
          </Text>
          <Text className="text-[12px] leading-[17px]" style={{ color: color.text.secondary }}>
            {t('recordingDetail.askInterpretationsSubtitle')}
          </Text>
        </View>
      </View>
      <View className="gap-2">
        {interpretations.map((item, index) => (
          <Text
            key={`${index}-${item}`}
            className="text-[15px] leading-[22px]"
            style={{ color: color.text.primary }}
          >
            {item}
          </Text>
        ))}
      </View>
    </View>
  );
};

type AnswerEvidenceProps = {
  color: Colors;
  evidence?: AskEvidence[];
  resolveEvidenceRecordId?: (item: AskEvidence) => string | undefined;
  onEvidenceNotePress?: (recordId: string) => void;
};

const AnswerEvidence = ({
  color,
  evidence,
  resolveEvidenceRecordId,
  onEvidenceNotePress,
}: AnswerEvidenceProps) => {
  const { t } = useTranslation();
  const [sheetVisible, setSheetVisible] = useState(false);
  const contentPadding = useBottomSheetContentPadding(20);
  if (!evidence?.length) return null;

  const openSheet = () => {
    hapticSelection();
    setSheetVisible(true);
  };

  const closeSheet = () => {
    setSheetVisible(false);
  };

  return (
    <View className="mt-1 gap-2">
      <TouchableOpacity
        onPress={openSheet}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={t('recordingDetail.askEvidenceToggleA11y', {
          count: evidence.length,
        })}
        className="flex-row items-center gap-3 rounded-2xl px-3 py-3"
        style={{
          backgroundColor: color.background.tertiary,
          borderWidth: 1,
          borderColor: color.border.default,
        }}
      >
        <View
          className="h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: color.background.primary }}
        >
          <FileText size={19} color={color.accent.primary} strokeWidth={2.1} />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className="text-[15px] font-semibold leading-5"
            style={{ color: color.text.primary }}
            numberOfLines={1}
          >
            {t('recordingDetail.askEvidenceTitle')}
          </Text>
          <Text
            className="text-[13px] leading-[18px]"
            style={{ color: color.text.secondary }}
            numberOfLines={1}
          >
            {t('recordingDetail.askEvidenceRowSubtitle', { count: evidence.length })}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View
            style={{
              minWidth: 22,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: color.background.card,
              borderWidth: 1,
              borderColor: color.border.default,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                fontVariant: ['tabular-nums'],
                color: color.text.secondary,
              }}
            >
              {formatEvidenceBadgeCount(evidence.length)}
            </Text>
          </View>
          <ChevronRight size={18} color={color.icon.muted} strokeWidth={2.2} />
        </View>
      </TouchableOpacity>
      <AppBottomSheetModal visible={sheetVisible} onClose={closeSheet}>
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            ...contentPadding,
          }}
        >
          <Text
            style={{
              color: color.text.primary,
              fontSize: 20,
              fontWeight: '700',
              lineHeight: 28,
              marginTop: 4,
              textAlign: 'center',
            }}
          >
            {t('recordingDetail.askEvidenceSheetTitle')}
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
            {t('recordingDetail.askEvidenceSheetSubtitle', { count: evidence.length })}
          </Text>
          <View
            style={{
              backgroundColor: color.background.card,
              borderColor: color.border.default,
              borderRadius: 16,
              borderWidth: 1,
              overflow: 'hidden',
            }}
          >
            {evidence.map((item, index) => {
              const meta = [
                item.label,
                typeof item.offsetMs === 'number' ? formatEvidenceOffset(item.offsetMs) : null,
              ].filter(Boolean);
              const recordId = resolveEvidenceRecordId?.(item);
              const canOpenNote = Boolean(recordId && onEvidenceNotePress);
              const rowStyle = {
                borderBottomWidth: index < evidence.length - 1 ? 1 : 0,
                borderBottomColor: color.border.default,
              };

              const rowContent = (
                <>
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: 16,
                      top: 14,
                      bottom: 14,
                      width: 3,
                      borderRadius: 999,
                      backgroundColor: color.accent.primary,
                    }}
                  />
                  <Text
                    className="text-[15px] leading-[22px]"
                    style={{ color: color.text.primary, paddingLeft: 12 }}
                  >
                    {item.quote}
                  </Text>
                  {meta.length > 0 ? (
                    <Text
                      className="text-[13px] leading-[18px]"
                      style={{ color: color.text.secondary, paddingLeft: 12 }}
                    >
                      {meta.join(' · ')}
                    </Text>
                  ) : null}
                  {canOpenNote ? (
                    <Text
                      className="text-[13px] font-medium leading-[18px]"
                      style={{ color: color.accent.primary, paddingLeft: 12, marginTop: 4 }}
                    >
                      {t('inboxAsk.evidenceOpenNote')}
                    </Text>
                  ) : null}
                </>
              );

              if (canOpenNote && recordId) {
                return (
                  <TouchableOpacity
                    key={`${index}-${item.quote}`}
                    className="gap-1 px-4 py-3"
                    style={rowStyle}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={t('inboxAsk.evidenceOpenNoteA11y', {
                      title: item.label ?? t('inboxAsk.evidenceOpenNote'),
                    })}
                    onPress={() => {
                      closeSheet();
                      onEvidenceNotePress?.(recordId);
                    }}
                  >
                    {rowContent}
                  </TouchableOpacity>
                );
              }

              return (
                <View key={`${index}-${item.quote}`} className="gap-1 px-4 py-3" style={rowStyle}>
                  {rowContent}
                </View>
              );
            })}
          </View>
        </BottomSheetScrollView>
      </AppBottomSheetModal>
    </View>
  );
};

export const AnswerTurnBlock = ({
  color,
  question,
  answer,
  answerKind,
  items,
  interpretations,
  evidence,
  recordTitle,
  showDivider,
  onCopy,
  onShare,
  resolveEvidenceRecordId,
  onEvidenceNotePress,
  modeBadgeLabel,
}: AnswerTurnBlockProps) => {
  const { t } = useTranslation();
  const clipboardText = formatAskTurnForClipboard(question, answer, {
    interpretations,
    interpretationsHeading: t('recordingDetail.askInterpretationsTitle'),
  });
  const shareText = formatAskTurnForShare(question, answer, recordTitle, {
    interpretations,
    interpretationsHeading: t('recordingDetail.askInterpretationsTitle'),
  });

  return (
    <View
      className="gap-2 pb-4"
      style={
        showDivider
          ? {
              marginBottom: 16,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: color.border.default,
            }
          : undefined
      }
    >
      <AskTurnQuestion color={color} question={question} />
      {modeBadgeLabel ? (
        <View
          className="self-start rounded-full px-2.5 py-1"
          style={{ backgroundColor: color.background.tertiary }}
        >
          <Text className="text-[12px] font-medium" style={{ color: color.text.secondary }}>
            {modeBadgeLabel}
          </Text>
        </View>
      ) : null}
      <AskAiAnswerMarkdown color={color}>{answer}</AskAiAnswerMarkdown>
      <AnswerStructuredItems color={color} answerKind={answerKind} items={items} />
      <AnswerInterpretations color={color} interpretations={interpretations} />
      <AnswerEvidence
        color={color}
        evidence={evidence}
        resolveEvidenceRecordId={resolveEvidenceRecordId}
        onEvidenceNotePress={onEvidenceNotePress}
      />
      <View className="mt-1 flex-row flex-wrap gap-2">
        <AskCopyTurnButton color={color} clipboardText={clipboardText} onCopy={onCopy} />
        <TouchableOpacity
          onPress={() => {
            hapticSelection();
            onShare(shareText, recordTitle);
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('recordingDetail.askShareThisTurn')}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          className="flex-row items-center justify-center gap-2 rounded-xl px-3"
          style={{
            backgroundColor: color.background.tertiary,
            minHeight: ASK_ACTION_CHIP_MIN_HEIGHT,
          }}
        >
          <View className="h-[17] w-[17] shrink-0 items-center justify-center">
            <ShareIcon size={17} color={color.text.primary} strokeWidth={2} />
          </View>
          <Text
            className="text-sm font-medium leading-5"
            style={{ color: color.text.primary }}
            {...askActionChipTextProps}
          >
            {t('recordingDetail.askShare')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
