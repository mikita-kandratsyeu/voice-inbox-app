import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import type { AiExecutionMode } from '@/entities/settings';
import type { Colors } from '@/shared/config';

import { AskAiSuggestedQuestions, buildSuggestedQuestions } from '@/features/ask-chat/ui';

import { AskAiContextDisclosure } from './AskAiContextDisclosure';

type EmptyStateProps = {
  color: Colors;
  record: VoiceRecord;
  priorDepth: number;
  aiExecutionMode: AiExecutionMode;
  showOfflineState: boolean;
  onSuggestedQuestion: (question: string) => void;
  disabled?: boolean;
};
export const EmptyState = ({
  color,
  record,
  priorDepth,
  aiExecutionMode,
  showOfflineState,
  onSuggestedQuestion,
  disabled,
}: EmptyStateProps) => {
  const { t } = useTranslation();
  const suggestedQuestions = useMemo(() => buildSuggestedQuestions(t, record), [t, record]);

  return (
    <View className="gap-4 pb-1">
      <AskAiContextDisclosure
        color={color}
        record={record}
        priorDepth={priorDepth}
        aiExecutionMode={aiExecutionMode}
        containerClassName=""
      />
      <AskAiSuggestedQuestions
        color={color}
        title={t('recordingDetail.askSuggestedSection')}
        suggestions={suggestedQuestions}
        onQuestionPress={onSuggestedQuestion}
        disabled={disabled || showOfflineState}
      />
    </View>
  );
};
