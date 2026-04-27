import { MessageSquare } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

import { buildSuggestedQuestions } from './askAiSuggestions';

type EmptyStateProps = {
  color: Colors;
  record: VoiceRecord;
  showOfflineState: boolean;
  onSuggestedQuestion: (question: string) => void;
  disabled?: boolean;
};
export const EmptyState = ({
  color,
  record,
  showOfflineState,
  onSuggestedQuestion,
  disabled,
}: EmptyStateProps) => {
  const { t } = useTranslation();
  const suggestedQuestions = useMemo(() => buildSuggestedQuestions(t, record), [t, record]);

  return (
    <View className="gap-3 pb-1 pt-1">
      <View className="flex-row items-center gap-3">
        <View
          className="h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: color.background.tertiary }}
        >
          <MessageSquare size={22} color={color.icon.muted} strokeWidth={1.8} />
        </View>
        <Text className="flex-1 text-[15px] leading-6" style={{ color: color.text.secondary }}>
          {t('recordingDetail.askEmptyDesc')}
        </Text>
      </View>
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
