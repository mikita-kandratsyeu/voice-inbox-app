import React from 'react';

import type { VoiceRecord } from '@/entities/record';
import type { AiExecutionMode, PrivateAiProvider } from '@/entities/settings';
import type { AskAIHistoryItem } from '@/features/ask-ai';
import { ErrorState, SessionRestoringSkeleton } from '@/features/ask-chat/ui';
import type { Colors } from '@/shared/config';
import type { AskAnswerKind, AskEvidence } from '@/shared/lib/ai-core/types';

import { AnswerContent } from './AnswerContent';
import { EmptyState } from './EmptyState';
import { ErrorWithHistoryState } from './ErrorWithHistoryState';
import { LoadingState } from './LoadingState';
import { NoTranscriptState } from './NoTranscriptState';

type AskMainContentProps = {
  color: Colors;
  liveRecord: VoiceRecord;
  hasTranscript: boolean;
  isRestoringSession: boolean;
  isLoading: boolean;
  error: string | null;
  question: string | null;
  answer: string | null;
  answerKind?: AskAnswerKind;
  items?: string[];
  evidence?: AskEvidence[];
  interpretations?: string[];
  suggestedFollowUps?: string[];
  history: AskAIHistoryItem[];
  privateAskProgress: number;
  privateAskPhase: 'loading_model' | 'processing';
  aiExecutionMode: AiExecutionMode;
  privateAiProvider: PrivateAiProvider;
  disableByNetwork: boolean;
  onRetry: () => void;
  onCopy: (text: string) => void;
  onShare: (text: string, title: string) => void;
  onFollowUp: (q: string) => void;
  onCancelAsk?: () => void;
};

export const AskMainContent = ({
  color,
  liveRecord,
  hasTranscript,
  isRestoringSession,
  isLoading,
  error,
  question,
  answer,
  answerKind,
  items,
  evidence,
  interpretations,
  suggestedFollowUps,
  history,
  privateAskProgress,
  privateAskPhase,
  aiExecutionMode,
  privateAiProvider,
  disableByNetwork,
  onRetry,
  onCopy,
  onShare,
  onFollowUp,
  onCancelAsk,
}: AskMainContentProps) => {
  if (!hasTranscript) return <NoTranscriptState color={color} />;
  if (isRestoringSession) return <SessionRestoringSkeleton color={color} />;

  if (isLoading) {
    return (
      <LoadingState
        color={color}
        record={liveRecord}
        priorDepth={history.length}
        aiExecutionMode={aiExecutionMode}
        privateAiProvider={privateAiProvider}
        question={question}
        history={history}
        privateAskProgress={privateAskProgress}
        privateAskPhase={privateAskPhase}
        onCopy={onCopy}
        onShare={onShare}
        onCancel={onCancelAsk}
      />
    );
  }

  if (error && !answer) {
    const showAskHistoryWithError = history.length > 0 || Boolean(question?.trim());
    if (showAskHistoryWithError) {
      return (
        <ErrorWithHistoryState
          color={color}
          record={liveRecord}
          history={history}
          question={question}
          errorMessage={error}
          aiExecutionMode={aiExecutionMode}
          onRetry={onRetry}
          onCopy={onCopy}
          onShare={onShare}
          showPrivateModeCta={aiExecutionMode === 'private_experimental'}
        />
      );
    }
    return (
      <ErrorState
        color={color}
        onRetry={onRetry}
        errorMessage={error}
        showPrivateModeCta={aiExecutionMode === 'private_experimental'}
      />
    );
  }

  if (answer || history.length > 0) {
    return (
      <AnswerContent
        color={color}
        record={liveRecord}
        history={history}
        question={question ?? ''}
        answer={answer ?? ''}
        answerKind={answerKind}
        items={items}
        evidence={evidence}
        interpretations={interpretations}
        suggestedFollowUps={suggestedFollowUps}
        aiExecutionMode={aiExecutionMode}
        onCopy={onCopy}
        onShare={onShare}
        onFollowUpQuestion={onFollowUp}
      />
    );
  }

  return (
    <EmptyState
      color={color}
      record={liveRecord}
      priorDepth={history.length}
      aiExecutionMode={aiExecutionMode}
      showOfflineState={disableByNetwork}
      onSuggestedQuestion={onFollowUp}
      disabled={isLoading}
    />
  );
};
