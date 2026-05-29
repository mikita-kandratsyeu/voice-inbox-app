import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useColors } from '@/shared/config';
import { useRotatingI18nTip } from '@/shared/lib/aiGenerationTips';

import { AiProcessingCancelButton } from './AiProcessingCancelButton';

type AiTabLoadingStateProps = {
  message: string;
  tipKeys?: readonly string[];
  onCancel?: () => void;
};

export const AiTabLoadingState = ({ message, tipKeys, onCancel }: AiTabLoadingStateProps) => {
  const color = useColors();
  const rotatingTip = useRotatingI18nTip(tipKeys ?? []);

  return (
    <View className="w-full items-center gap-3 p-8">
      <ActivityIndicator color={color.accent.primary} />
      <Text className="text-sm text-center" style={{ color: color.text.secondary }}>
        {message}
      </Text>
      {tipKeys?.length ? (
        <View
          className="w-full max-w-full rounded-xl px-4 py-3"
          style={{ backgroundColor: color.background.tertiary }}
        >
          <Text
            className="text-[13px] leading-5 text-center"
            style={{ color: color.text.secondary }}
          >
            {rotatingTip}
          </Text>
        </View>
      ) : null}
      {onCancel ? (
        <AiProcessingCancelButton color={color} onPress={onCancel} className="mt-1" />
      ) : null}
    </View>
  );
};
