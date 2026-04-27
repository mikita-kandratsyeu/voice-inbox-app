import { MessageSquare } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

type NoTranscriptStateProps = { color: Colors };
export const NoTranscriptState = ({ color }: NoTranscriptStateProps) => {
  const { t } = useTranslation();
  return (
    <View className="w-full items-center gap-3 px-1 py-4">
      <View
        className="h-[56px] w-[56px] items-center justify-center rounded-full"
        style={{ backgroundColor: color.background.tertiary }}
      >
        <MessageSquare size={24} color={color.icon.muted} strokeWidth={1.8} />
      </View>
      <Text className="text-center text-base font-semibold" style={{ color: color.text.primary }}>
        {t('recordingDetail.noTranscriptForAi')}
      </Text>
      <Text className="text-center text-[15px] leading-6" style={{ color: color.text.secondary }}>
        {t('recordingDetail.noTranscriptForAiDesc')}
      </Text>
    </View>
  );
};
