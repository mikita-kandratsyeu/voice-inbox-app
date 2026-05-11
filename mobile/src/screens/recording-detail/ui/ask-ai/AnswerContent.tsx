import { Copy, ShareIcon } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import type { AiExecutionMode } from '@/entities/settings';
import { type AskAIHistoryItem } from '@/features/ask-ai';
import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

import { AskAiAnswerMarkdown } from './AskAiAnswerMarkdown';
import { AskAiContextDisclosure } from './AskAiContextDisclosure';
import { formatAskTurnForClipboard, formatAskTurnForShare } from './askAiFormat';
import { buildFollowUpQuestions } from './askAiSuggestions';

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
        <TouchableOpacity
          onPress={() => {
            hapticSelection();
            onCopy(clipboardText);
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('recordingDetail.askCopyThisTurn')}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          className="flex-row items-center gap-2 rounded-xl px-3 py-2"
          style={{ backgroundColor: color.background.tertiary }}
        >
          <Copy size={17} color={color.text.primary} strokeWidth={2} />
          <Text className="text-sm font-medium" style={{ color: color.text.primary }}>
            {t('recordingDetail.askCopy')}
          </Text>
        </TouchableOpacity>
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
          style={{ backgroundColor: color.background.tertiary }}
        >
          <ShareIcon size={17} color={color.text.primary} strokeWidth={2} />
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
