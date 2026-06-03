import React from 'react';

import type { VoiceRecord } from '@/entities/record';
import type { AiExecutionMode, PrivateAiProvider } from '@/entities/settings';
import type { AskAIHistoryItem } from '@/features/ask-ai';
import type { Colors } from '@/shared/config';

import { AnswerContent } from './AnswerContent';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';
import { NoTranscriptState } from './NoTranscriptState';
import { SessionRestoringSkeleton } from './SessionRestoringSkeleton';

type AskMainContentProps = {
  color: Colors;
  liveRecord: VoiceRecord;
  hasTranscript: boolean;
  isRestoringSession: boolean;
  isLoading: boolean;
  error: string | null;
  question: string | null;
  answer: string | null;
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
    return (
      <ErrorState
        color={color}
        onRetry={onRetry}
        showPrivateModeCta={aiExecutionMode === 'private_experimental'}
      />
    );
  }

  if (answer) {
    return (
      <AnswerContent
        color={color}
        record={liveRecord}
        history={history}
        question={question ?? ''}
        answer={answer}
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
