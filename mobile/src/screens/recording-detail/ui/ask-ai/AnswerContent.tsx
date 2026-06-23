import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import type { AiExecutionMode } from '@/entities/settings';
import { type AskAIHistoryItem } from '@/features/ask-ai';
import {
  AnswerTurnBlock,
  AskAiSuggestedQuestions,
  buildFollowUpQuestions,
} from '@/features/ask-chat/ui';
import type { Colors } from '@/shared/config';
import type { AskAnswerKind, AskEvidence } from '@/shared/lib/ai-core/types';

import { AskAiContextDisclosure } from './AskAiContextDisclosure';

type AnswerContentProps = {
  color: Colors;
  record: VoiceRecord;
  history: AskAIHistoryItem[];
  question: string;
  answer: string;
  answerKind?: AskAnswerKind;
  items?: string[];
  evidence?: AskEvidence[];
  interpretations?: string[];
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
  interpretations,
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

  const turns = useMemo(() => {
    const completedTurns = [...history];
    if (question.trim() && answer.trim()) {
      completedTurns.push({
        question,
        answer,
        ...(answerKind ? { answerKind } : {}),
        ...(items?.length ? { items } : {}),
        ...(interpretations?.length ? { interpretations } : {}),
        ...(evidence?.length ? { evidence } : {}),
        ...(suggestedFollowUps?.length ? { suggestedFollowUps } : {}),
      } satisfies AskAIHistoryItem);
    }
    return completedTurns;
  }, [answer, answerKind, evidence, history, interpretations, items, question, suggestedFollowUps]);

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
          interpretations={item.interpretations}
          evidence={item.evidence}
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

export { AnswerTurnBlock } from '@/features/ask-chat/ui';
