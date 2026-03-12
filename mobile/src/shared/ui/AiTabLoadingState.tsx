import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

type AiTabLoadingStateProps = {
  message: string;
  color: Colors;
};

export const AiTabLoadingState = ({ message, color }: AiTabLoadingStateProps) => (
  <View className="items-center gap-3 p-8">
    <ActivityIndicator color={color.accent.primary} />
    <Text className="text-sm" style={{ color: color.text.secondary }}>
      {message}
    </Text>
  </View>
);
