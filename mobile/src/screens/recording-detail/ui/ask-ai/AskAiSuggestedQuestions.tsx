import React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

import type { AskAiSuggestion } from './askAiSuggestions';

const CHIP_MIN_HEIGHT = 44;

type AskAiSuggestedQuestionsProps = {
  color: Colors;
  title: string;
  suggestions: AskAiSuggestion[];
  onQuestionPress: (prompt: string) => void;
  disabled?: boolean;
};

export const AskAiSuggestedQuestions = ({
  color,
  title,
  suggestions,
  onQuestionPress,
  disabled,
}: AskAiSuggestedQuestionsProps) => {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <View className="gap-3">
      <Text className="text-xs font-semibold" style={{ color: color.text.secondary }}>
        {title}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={`suggested-${index}`}
            onPress={() => {
              hapticSelection();
              onQuestionPress(suggestion.prompt);
            }}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={suggestion.prompt}
            accessibilityState={{ disabled: Boolean(disabled) }}
            className="max-w-full rounded-xl px-3"
            style={{
              minHeight: CHIP_MIN_HEIGHT,
              justifyContent: 'center',
              alignSelf: 'flex-start',
              backgroundColor: color.background.tertiary,
            }}
          >
            <Text
              className="text-[15px] font-normal leading-[22px]"
              style={{ color: color.text.primary }}
              {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
            >
              {suggestion.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};
