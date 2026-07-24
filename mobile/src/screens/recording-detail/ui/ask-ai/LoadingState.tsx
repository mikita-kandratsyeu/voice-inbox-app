import { Sparkle } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import {
  type AiExecutionMode,
  isPrivateCustomServerMode,
  type PrivateAiProvider,
} from '@/entities/settings';
import type { AskAIHistoryItem } from '@/features/ask-ai';
import { AnswerTurnBlock, AskTurnQuestion } from '@/features/ask-chat/ui';
import type { Colors } from '@/shared/config';
import { ASK_AI_GENERATION_TIP_KEYS, ASK_AI_PRIVATE_TIP_KEYS } from '@/shared/lib/aiGenerationTips';

import { DetailTabProcessingView } from '../DetailTabProcessingView';
import { AskAiContextDisclosure } from './AskAiContextDisclosure';

type LoadingStateProps = {
  color: Colors;
  record: VoiceRecord;
  priorDepth: number;
  aiExecutionMode: AiExecutionMode;
  privateAiProvider: PrivateAiProvider;
  question: string | null;
  history: AskAIHistoryItem[];
  privateAskProgress: number;
  privateAskPhase: 'loading_model' | 'processing';
  onCopy: (text: string) => void;
  onShare: (text: string, title: string) => void;
  onCancel?: () => void;
  statusTitle?: string;
};

export const LoadingState = ({
  color,
  record,
  priorDepth,
  aiExecutionMode,
  privateAiProvider,
  question,
  history,
  privateAskProgress,
  privateAskPhase,
  onCopy,
  onShare,
  onCancel,
  statusTitle,
}: LoadingStateProps) => {
  const { t } = useTranslation();
  const isPrivate = aiExecutionMode === 'private_experimental';
  const isPrivateCustomServer = isPrivateCustomServerMode(aiExecutionMode, privateAiProvider);
  const pendingQuestion = question?.trim() ?? '';

  return (
    <View className="gap-4 pb-4">
      <AskAiContextDisclosure
        color={color}
        record={record}
        priorDepth={priorDepth}
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
      <View className="gap-4">
        {pendingQuestion ? <AskTurnQuestion color={color} question={pendingQuestion} /> : null}
        <DetailTabProcessingView
          progress={isPrivate ? privateAskProgress : 0}
          phase={isPrivate ? privateAskPhase : 'processing'}
          color={color}
          onCancel={onCancel}
          showProgress={isPrivate}
          tipKeys={isPrivate ? ASK_AI_PRIVATE_TIP_KEYS : ASK_AI_GENERATION_TIP_KEYS}
          statusTitle={statusTitle ?? t('recordingDetail.askProcessing')}
          leadingIcon={<Sparkle size={22} color={color.accent.primary} strokeWidth={2} />}
          context={
            isPrivateCustomServer ? 'private_remote' : isPrivate ? 'private_llm' : 'cloud_ai'
          }
        />
      </View>
    </View>
  );
};
