import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

type AskTurnQuestionProps = {
  color: Colors;
  question: string;
};

export const AskTurnQuestion = ({ color, question }: AskTurnQuestionProps) => {
  const { t } = useTranslation();

  if (!question.trim()) return null;

  return (
    <View className="gap-1">
      <Text className="text-sm font-semibold" style={{ color: color.text.secondary }}>
        {t('recordingDetail.ask')}
      </Text>
      <Text className="text-base leading-6" style={{ color: color.text.primary }}>
        {question}
      </Text>
    </View>
  );
};
