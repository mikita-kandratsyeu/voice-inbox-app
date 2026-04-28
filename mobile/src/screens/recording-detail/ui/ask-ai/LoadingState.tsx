import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

type LoadingStateProps = { color: Colors };
export const LoadingState = ({ color }: LoadingStateProps) => {
  const { t } = useTranslation();
  return (
    <View className="w-full items-center gap-3 py-6">
      <ActivityIndicator color={color.accent.primary} size="large" />
      <Text className="text-[15px] leading-6" style={{ color: color.text.secondary }}>
        {t('recordingDetail.askProcessing')}
      </Text>
    </View>
  );
};
