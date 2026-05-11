import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import type { AiExecutionMode } from '@/entities/settings';
import type { Colors } from '@/shared/config';

import { AskAiContextDisclosure } from './AskAiContextDisclosure';

type LoadingStateProps = {
  color: Colors;
  record: VoiceRecord;
  priorDepth: number;
  aiExecutionMode: AiExecutionMode;
};
export const LoadingState = ({ color, record, priorDepth, aiExecutionMode }: LoadingStateProps) => {
  const { t } = useTranslation();
  return (
    <View className="w-full flex-1 gap-3 py-4">
      <AskAiContextDisclosure
        color={color}
        record={record}
        priorDepth={priorDepth}
        aiExecutionMode={aiExecutionMode}
        containerClassName=""
      />
      <View className="min-h-0 w-full flex-1 items-center justify-center gap-3">
        <ActivityIndicator color={color.accent.primary} size="large" />
        <Text className="text-[15px] leading-6" style={{ color: color.text.secondary }}>
          {t('recordingDetail.askProcessing')}
        </Text>
      </View>
    </View>
  );
};
