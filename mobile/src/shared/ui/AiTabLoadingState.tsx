import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useColors } from '@/shared/config';

import { AiProcessingCancelButton } from './AiProcessingCancelButton';

type AiTabLoadingStateProps = {
  message: string;
  onCancel?: () => void;
};

export const AiTabLoadingState = ({ message, onCancel }: AiTabLoadingStateProps) => {
  const color = useColors();

  return (
    <View className="items-center gap-3 p-8">
      <ActivityIndicator color={color.accent.primary} />
      <Text className="text-sm text-center" style={{ color: color.text.secondary }}>
        {message}
      </Text>
      {onCancel ? (
        <AiProcessingCancelButton color={color} onPress={onCancel} className="mt-1" />
      ) : null}
    </View>
  );
};
