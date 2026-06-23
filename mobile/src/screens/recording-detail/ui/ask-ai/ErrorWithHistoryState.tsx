import React from 'react';
import { View } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import type { AiExecutionMode } from '@/entities/settings';
import type { AskAIHistoryItem } from '@/features/ask-ai';
import { AnswerTurnBlock, AskTurnQuestion, ErrorState } from '@/features/ask-chat/ui';
import type { Colors } from '@/shared/config';

import { AskAiContextDisclosure } from './AskAiContextDisclosure';

type ErrorWithHistoryStateProps = {
  color: Colors;
  record: VoiceRecord;
  history: AskAIHistoryItem[];
  question: string | null;
  errorMessage: string | null;
  aiExecutionMode: AiExecutionMode;
  onRetry: () => void;
  onCopy: (text: string) => void;
  onShare: (text: string, title: string) => void;
  showPrivateModeCta?: boolean;
  errorTitleKey?: string;
  errorRetryLabelKey?: string;
  errorFallbackHintKey?: string;
};

export const ErrorWithHistoryState = ({
  color,
  record,
  history,
  question,
  errorMessage,
  aiExecutionMode,
  onRetry,
  onCopy,
  onShare,
  showPrivateModeCta = false,
  errorTitleKey,
  errorRetryLabelKey,
  errorFallbackHintKey,
}: ErrorWithHistoryStateProps) => {
  const failedQuestion = question?.trim() ?? '';

  return (
    <View className="gap-4 pb-4">
      <AskAiContextDisclosure
        color={color}
        record={record}
        priorDepth={history.length}
        aiExecutionMode={aiExecutionMode}
        headline={history.length > 0 ? record.title : undefined}
        containerClassName=""
      />
      {history.map((item, index) => (
        <AnswerTurnBlock
          key={`ask-history-${index}`}
          color={color}
          question={item.question}
          answer={item.answer}
          answerKind={item.answerKind}
          items={item.items}
          interpretations={item.interpretations}
          evidence={item.evidence}
          recordTitle={record.title}
          showDivider={index < history.length - 1}
          onCopy={onCopy}
          onShare={onShare}
        />
      ))}
      {failedQuestion ? (
        <View className="gap-4">
          <AskTurnQuestion color={color} question={failedQuestion} />
          <ErrorState
            color={color}
            onRetry={onRetry}
            errorMessage={errorMessage}
            showPrivateModeCta={showPrivateModeCta}
            titleKey={errorTitleKey}
            retryLabelKey={errorRetryLabelKey}
            fallbackHintKey={errorFallbackHintKey}
          />
        </View>
      ) : (
        <ErrorState
          color={color}
          onRetry={onRetry}
          errorMessage={errorMessage}
          showPrivateModeCta={showPrivateModeCta}
          titleKey={errorTitleKey}
          retryLabelKey={errorRetryLabelKey}
          fallbackHintKey={errorFallbackHintKey}
        />
      )}
    </View>
  );
};
