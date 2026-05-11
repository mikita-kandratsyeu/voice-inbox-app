import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import type { AiExecutionMode } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

import { AskAiContextDisclosure } from './AskAiContextDisclosure';
import { buildSuggestedQuestions } from './askAiSuggestions';

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
    <View className="gap-3 pb-1 pt-1">
      <AskAiContextDisclosure
        color={color}
        record={record}
        priorDepth={priorDepth}
        aiExecutionMode={aiExecutionMode}
        containerClassName=""
      />
      <Text className="text-xs font-semibold" style={{ color: color.text.secondary }}>
        {t('recordingDetail.askSuggestedSection')}
      </Text>
      <View className="gap-3">
        {suggestedQuestions.map((questionText, index) => (
          <TouchableOpacity
            key={`suggested-${index}`}
            onPress={() => {
              hapticSelection();
              onSuggestedQuestion(questionText);
            }}
            disabled={disabled || showOfflineState}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={questionText}
            accessibilityState={{ disabled: Boolean(disabled || showOfflineState) }}
            className="rounded-xl px-4 py-4"
            style={{ backgroundColor: color.background.tertiary }}
          >
            <Text
              className="text-[15px] font-normal leading-[22px]"
              style={{ color: color.text.primary }}
            >
              {questionText}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};
