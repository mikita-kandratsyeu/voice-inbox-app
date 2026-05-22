import React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

import type { AskAiSuggestion } from './askAiSuggestions';

/** Spacing between section title and chips, and between chips (kept equal). */
const SECTION_GAP = 12;
const CHIP_PADDING_X = 12;
const CHIP_PADDING_Y = 10;

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
    <View style={{ gap: SECTION_GAP }}>
      <Text className="text-xs font-semibold" style={{ color: color.text.secondary }}>
        {title}
      </Text>
      <View style={{ gap: SECTION_GAP }}>
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
            style={{
              alignSelf: 'flex-start',
              maxWidth: '100%',
              paddingHorizontal: CHIP_PADDING_X,
              paddingVertical: CHIP_PADDING_Y,
              borderRadius: 12,
              backgroundColor: color.background.tertiary,
            }}
          >
            <Text
              className="text-[15px] font-normal leading-[22px]"
              style={{ color: color.text.primary }}
              numberOfLines={4}
              ellipsizeMode="tail"
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
