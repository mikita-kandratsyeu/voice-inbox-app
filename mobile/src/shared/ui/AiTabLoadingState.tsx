import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useColors } from '@/shared/config';

type AiTabLoadingStateProps = {
  message: string;
};

export const AiTabLoadingState = ({ message }: AiTabLoadingStateProps) => {
  const color = useColors();
  return (
    <View className="items-center gap-3 p-8">
      <ActivityIndicator color={color.accent.primary} />
      <Text className="text-sm" style={{ color: color.text.secondary }}>
        {message}
      </Text>
    </View>
  );
};
