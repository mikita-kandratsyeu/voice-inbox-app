import React from 'react';
import { View } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import type { AiExecutionMode } from '@/entities/settings';
import type { AskAIHistoryItem } from '@/features/ask-ai';
import type { Colors } from '@/shared/config';

import { AnswerTurnBlock } from './AnswerContent';
import { AskAiContextDisclosure } from './AskAiContextDisclosure';
import { AskTurnQuestion } from './AskTurnQuestion';
import { ErrorState } from './ErrorState';

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
          />
        </View>
      ) : (
        <ErrorState
          color={color}
          onRetry={onRetry}
          errorMessage={errorMessage}
          showPrivateModeCta={showPrivateModeCta}
        />
      )}
    </View>
  );
};
