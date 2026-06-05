import { Copy, ShareIcon } from 'lucide-react-native';
import React, { useMemo } from 'react';
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

import type { VoiceRecord } from '@/entities/record';
import type { AiExecutionMode } from '@/entities/settings';
import { type AskAIHistoryItem } from '@/features/ask-ai';
import type { Colors } from '@/shared/config';
import { hapticSelection, IS_ANDROID } from '@/shared/lib';
import type { AskAnswerKind, AskEvidence } from '@/shared/lib/ai-core/types';

import { AskAiAnswerMarkdown } from './AskAiAnswerMarkdown';
import { AskAiContextDisclosure } from './AskAiContextDisclosure';
import { formatAskTurnForClipboard, formatAskTurnForShare } from './askAiFormat';
import { AskAiSuggestedQuestions } from './AskAiSuggestedQuestions';
import { buildFollowUpQuestions } from './askAiSuggestions';
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

type AnswerTurnBlockProps = {
  color: Colors;
  question: string;
  answer: string;
  answerKind?: AskAnswerKind;
  items?: string[];
  evidence?: AskEvidence[];
  suggestedFollowUps?: string[];
  recordTitle: string;
  showDivider: boolean;
  onCopy: (text: string) => void;
  onShare: (text: string, title: string) => void;
};

function formatEvidenceOffset(offsetMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(offsetMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

const AnswerEvidence = ({ color, evidence }: { color: Colors; evidence?: AskEvidence[] }) => {
  const { t } = useTranslation();
  if (!evidence?.length) return null;

  return (
    <View className="mt-1 gap-2">
      <Text className="text-xs font-semibold" style={{ color: color.text.secondary }}>
        {t('recordingDetail.askEvidenceTitle')}
      </Text>
      <View className="gap-2">
        {evidence.map((item, index) => {
          const meta = [
            item.label,
            typeof item.offsetMs === 'number' ? formatEvidenceOffset(item.offsetMs) : null,
          ].filter(Boolean);
          return (
            <View
              key={`${index}-${item.quote}`}
              className="gap-1 rounded-xl px-3 py-2"
              style={{
                backgroundColor: color.background.tertiary,
              }}
            >
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 10,
                  bottom: 10,
                  width: 3,
                  backgroundColor: color.accent.primary,
                }}
              />
              <Text className="text-[14px] leading-5" style={{ color: color.text.primary }}>
                {item.quote}
              </Text>
              {meta.length > 0 ? (
                <Text className="text-xs" style={{ color: color.text.secondary }}>
                  {meta.join(' · ')}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
};

export const AnswerTurnBlock = ({
  color,
  question,
  answer,
  answerKind,
  items,
  evidence,
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
      <AskTurnQuestion color={color} question={question} />
      <AskAiAnswerMarkdown color={color}>{answer}</AskAiAnswerMarkdown>
      <AnswerStructuredItems color={color} answerKind={answerKind} items={items} />
      <AnswerEvidence color={color} evidence={evidence} />
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

type AnswerContentProps = {
  color: Colors;
  record: VoiceRecord;
  history: AskAIHistoryItem[];
  question: string;
  answer: string;
  answerKind?: AskAnswerKind;
  items?: string[];
  evidence?: AskEvidence[];
  suggestedFollowUps?: string[];
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
  answerKind,
  items,
  evidence,
  suggestedFollowUps,
  aiExecutionMode,
  onCopy,
  onShare,
  onFollowUpQuestion,
}: AnswerContentProps) => {
  const { t } = useTranslation();
  const followUpQuestions = useMemo(() => {
    const modelFollowUps = suggestedFollowUps
      ?.map((prompt) => prompt.trim())
      .filter((prompt) => prompt.length > 0)
      .slice(0, 3)
      .map((prompt) => ({ label: prompt, prompt }));
    return modelFollowUps?.length ? modelFollowUps : buildFollowUpQuestions(t, record);
  }, [record, suggestedFollowUps, t]);

  const turns = useMemo(
    () => [
      ...history,
      {
        question,
        answer,
        ...(answerKind ? { answerKind } : {}),
        ...(items?.length ? { items } : {}),
        ...(evidence?.length ? { evidence } : {}),
        ...(suggestedFollowUps?.length ? { suggestedFollowUps } : {}),
      } satisfies AskAIHistoryItem,
    ],
    [answer, answerKind, evidence, history, items, question, suggestedFollowUps],
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
          answerKind={item.answerKind}
          items={item.items}
          evidence={item.evidence}
          suggestedFollowUps={item.suggestedFollowUps}
          recordTitle={record.title}
          showDivider={index < turns.length - 1}
          onCopy={onCopy}
          onShare={onShare}
        />
      ))}
      <AskAiSuggestedQuestions
        color={color}
        title={t('recordingDetail.nextSteps')}
        suggestions={followUpQuestions}
        onQuestionPress={onFollowUpQuestion}
      />
    </View>
  );
};
