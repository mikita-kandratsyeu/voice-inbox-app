import type { TFunction } from 'i18next';
import { Sparkles } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import type { AiExecutionMode } from '@/entities/settings';
import type { AskAIHistoryItem } from '@/features/ask-ai';
import type { Colors } from '@/shared/config';

import { DetailTabProcessingView } from '../DetailTabProcessingView';
import { AnswerContent } from './AnswerContent';
import { AskAiContextDisclosure } from './AskAiContextDisclosure';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';
import { NoTranscriptState } from './NoTranscriptState';
import { SessionRestoringSkeleton } from './SessionRestoringSkeleton';

type AskMainContentProps = {
  t: TFunction;
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
  disableByNetwork: boolean;
  onRetry: () => void;
  onCopy: (text: string) => void;
  onShare: (text: string, title: string) => void;
  onFollowUp: (q: string) => void;
};

export const AskMainContent = ({
  t,
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
  disableByNetwork,
  onRetry,
  onCopy,
  onShare,
  onFollowUp,
}: AskMainContentProps) => {
  if (!hasTranscript) return <NoTranscriptState color={color} />;
  if (isRestoringSession) return <SessionRestoringSkeleton color={color} />;

  if (isLoading) {
    if (aiExecutionMode === 'private_experimental') {
      return (
        <View className="w-full flex-1 gap-3 py-4">
          <AskAiContextDisclosure
            color={color}
            record={liveRecord}
            priorDepth={history.length}
            aiExecutionMode={aiExecutionMode}
            containerClassName=""
          />
          <View className="min-h-0 w-full flex-1 justify-center">
            <DetailTabProcessingView
              progress={privateAskProgress}
              phase={privateAskPhase}
              color={color}
              hintText={t('privateAi.batteryHint')}
              leadingIcon={<Sparkles size={22} color={color.accent.primary} strokeWidth={2} />}
              context="private_llm"
            />
          </View>
        </View>
      );
    }
    return (
      <LoadingState
        color={color}
        record={liveRecord}
        priorDepth={history.length}
        aiExecutionMode={aiExecutionMode}
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
