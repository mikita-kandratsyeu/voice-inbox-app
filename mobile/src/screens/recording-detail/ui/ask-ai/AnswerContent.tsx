import { Check, Copy, ShareIcon } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { VoiceRecord } from '@/entities/record';
import type { AiExecutionMode } from '@/entities/settings';
import { type AskAIHistoryItem } from '@/features/ask-ai';
import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

import { AskAiAnswerMarkdown } from './AskAiAnswerMarkdown';
import { AskAiContextDisclosure } from './AskAiContextDisclosure';
import { formatAskTurnForClipboard, formatAskTurnForShare } from './askAiFormat';
import { buildFollowUpQuestions } from './askAiSuggestions';

type AskCopyTurnButtonProps = {
  color: Colors;
  clipboardText: string;
  onCopy: (text: string) => void;
};

const COPY_ICON_CROSSFADE_MS = 200;
const COPY_SUCCESS_HOLD_MS = 500;

/** Same min height as Share chip so the row stays visually aligned. */
const ASK_ACTION_CHIP_MIN_HEIGHT = 40;

const AskCopyTurnButton = ({ color, clipboardText, onCopy }: AskCopyTurnButtonProps) => {
  const { t } = useTranslation();
  const progress = useSharedValue(0);
  const copyLabel = t('recordingDetail.askCopy');
  const successLabel = t('recordingDetail.askCopySuccess');
  const ghostLabelForWidth = copyLabel.length >= successLabel.length ? copyLabel : successLabel;

  const copyIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 0.82]) }],
  }));

  const checkIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.55, 1]) }],
  }));

  const copyLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0]),
    transform: [{ translateY: interpolate(progress.value, [0, 1], [0, 3]) }],
  }));

  const checkLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    transform: [{ translateY: interpolate(progress.value, [0, 1], [4, 0]) }],
  }));

  const handlePress = () => {
    onCopy(clipboardText);
    progress.value = withSequence(
      withTiming(1, {
        duration: COPY_ICON_CROSSFADE_MS,
        easing: Easing.out(Easing.cubic),
      }),
      withDelay(
        COPY_SUCCESS_HOLD_MS,
        withTiming(0, {
          duration: COPY_ICON_CROSSFADE_MS,
          easing: Easing.in(Easing.cubic),
        }),
      ),
    );
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t('recordingDetail.askCopyThisTurn')}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      className="flex-row items-center gap-2 rounded-xl px-3 py-2"
      style={{ backgroundColor: color.background.tertiary, minHeight: ASK_ACTION_CHIP_MIN_HEIGHT }}
    >
      <View className="h-[17] w-[17] shrink-0 items-center justify-center">
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { alignItems: 'center', justifyContent: 'center' },
            copyIconStyle,
          ]}
        >
          <Copy size={17} color={color.text.primary} strokeWidth={2} />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { alignItems: 'center', justifyContent: 'center' },
            checkIconStyle,
          ]}
        >
          <Check size={17} color={color.accent.success} strokeWidth={2.6} />
        </Animated.View>
      </View>
      <View className="relative shrink justify-center">
        <Text
          className="text-sm font-medium"
          style={{ opacity: 0 }}
          numberOfLines={1}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {ghostLabelForWidth}
        </Text>
        <Animated.View
          style={[StyleSheet.absoluteFillObject, { justifyContent: 'center' }, copyLabelStyle]}
        >
          <Text
            className="text-sm font-medium"
            style={{ color: color.text.primary }}
            numberOfLines={1}
          >
            {copyLabel}
          </Text>
        </Animated.View>
        <Animated.View
          style={[StyleSheet.absoluteFillObject, { justifyContent: 'center' }, checkLabelStyle]}
        >
          <Text
            className="text-sm font-medium"
            style={{ color: color.accent.success }}
            numberOfLines={1}
          >
            {successLabel}
          </Text>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

type AnswerTurnBlockProps = {
  color: Colors;
  question: string;
  answer: string;
  recordTitle: string;
  showDivider: boolean;
  onCopy: (text: string) => void;
  onShare: (text: string, title: string) => void;
};

const AnswerTurnBlock = ({
  color,
  question,
  answer,
  recordTitle,
  showDivider,
  onCopy,
  onShare,
}: AnswerTurnBlockProps) => {
  const { t } = useTranslation();
  const clipboardText = formatAskTurnForClipboard(question, answer);
  const shareText = formatAskTurnForShare(question, answer, recordTitle);

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
      {question.trim() ? (
        <View className="gap-1">
          <Text className="text-sm font-semibold" style={{ color: color.text.secondary }}>
            {t('recordingDetail.ask')}
          </Text>
          <Text className="text-base leading-6" style={{ color: color.text.primary }}>
            {question}
          </Text>
        </View>
      ) : null}
      <AskAiAnswerMarkdown color={color}>{answer}</AskAiAnswerMarkdown>
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
          className="flex-row items-center gap-2 rounded-xl px-3 py-2"
          style={{
            backgroundColor: color.background.tertiary,
            minHeight: ASK_ACTION_CHIP_MIN_HEIGHT,
          }}
        >
          <View className="h-[17] w-[17] shrink-0 items-center justify-center">
            <ShareIcon size={17} color={color.text.primary} strokeWidth={2} />
          </View>
          <Text className="text-sm font-medium" style={{ color: color.text.primary }}>
            {t('recordingDetail.askShare')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

type AnswerContentProps = {
  color: Colors;
  record: VoiceRecord;
  history: AskAIHistoryItem[];
  question: string;
  answer: string;
  aiExecutionMode: AiExecutionMode;
  onCopy: (text: string) => void;
  onShare: (text: string, title: string) => void;
  onFollowUpQuestion: (question: string) => void;
};

export const AnswerContent = ({
  color,
  record,
  history,
  question,
  answer,
  aiExecutionMode,
  onCopy,
  onShare,
  onFollowUpQuestion,
}: AnswerContentProps) => {
  const { t } = useTranslation();
  const followUpQuestions = useMemo(() => buildFollowUpQuestions(t, record), [t, record]);

  const turns = useMemo(
    () => [...history, { question, answer } satisfies AskAIHistoryItem],
    [history, question, answer],
  );

  return (
    <View className="gap-4 pb-4">
      <View className="gap-3">
        <AskAiContextDisclosure
          color={color}
          record={record}
          priorDepth={history.length + (question.trim() && answer.trim() ? 1 : 0)}
          aiExecutionMode={aiExecutionMode}
          headline={record.title}
          containerClassName=""
        />
      </View>
      {turns.map((item, index) => (
        <AnswerTurnBlock
          key={`turn-${index}`}
          color={color}
          question={item.question}
          answer={item.answer}
          recordTitle={record.title}
          showDivider={index < turns.length - 1}
          onCopy={onCopy}
          onShare={onShare}
        />
      ))}
      <View className="gap-2">
        <Text className="text-sm font-semibold" style={{ color: color.text.secondary }}>
          {t('recordingDetail.nextSteps')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {followUpQuestions.map((followUpQuestion, index) => (
            <TouchableOpacity
              key={`followup-${index}`}
              onPress={() => {
                hapticSelection();
                onFollowUpQuestion(followUpQuestion);
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={followUpQuestion}
              className="rounded-xl px-3 py-2"
              style={{ backgroundColor: color.background.tertiary }}
            >
              <Text className="text-base leading-6" style={{ color: color.text.primary }}>
                {followUpQuestion}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};
