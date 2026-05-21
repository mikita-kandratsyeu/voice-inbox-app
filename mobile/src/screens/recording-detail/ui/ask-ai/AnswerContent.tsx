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
import { hapticSelection } from '@/shared/lib';

import { AskAiAnswerMarkdown } from './AskAiAnswerMarkdown';
import { AskAiContextDisclosure } from './AskAiContextDisclosure';
import { formatAskTurnForClipboard, formatAskTurnForShare } from './askAiFormat';
import { AskAiSuggestedQuestions } from './AskAiSuggestedQuestions';
import { buildFollowUpQuestions } from './askAiSuggestions';

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
      className="rounded-xl px-3 py-2"
      style={{ backgroundColor: color.background.tertiary, minHeight: ASK_ACTION_CHIP_MIN_HEIGHT }}
    >
      <Animated.View className="flex-row items-center gap-2" style={chipAnimStyle}>
        <View className="h-[17] w-[17] shrink-0 items-center justify-center">
          <Copy size={17} color={color.text.primary} strokeWidth={2} />
        </View>
        <Text
          className="text-sm font-medium"
          style={{ color: color.text.primary }}
          numberOfLines={1}
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
      <AskAiSuggestedQuestions
        color={color}
        title={t('recordingDetail.nextSteps')}
        suggestions={followUpQuestions}
        onQuestionPress={onFollowUpQuestion}
      />
    </View>
  );
};
