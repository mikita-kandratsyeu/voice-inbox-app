import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import type { AiExecutionMode } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { CLOUD_AI_GENERATION_TIP_KEYS } from '@/shared/lib/aiGenerationTips';
import { AiTabLoadingState } from '@/shared/ui';

import { AskAiContextDisclosure } from './AskAiContextDisclosure';

type LoadingStateProps = {
  color: Colors;
  record: VoiceRecord;
  priorDepth: number;
  aiExecutionMode: AiExecutionMode;
  onCancel?: () => void;
};
export const LoadingState = ({
  color: _color,
  record,
  priorDepth,
  aiExecutionMode,
  onCancel,
}: LoadingStateProps) => {
  const { t } = useTranslation();
  return (
    <View className="w-full flex-1 gap-3 py-4">
      <AskAiContextDisclosure
        color={_color}
        record={record}
        priorDepth={priorDepth}
        aiExecutionMode={aiExecutionMode}
        containerClassName=""
      />
      <View className="min-h-0 w-full flex-1 justify-center">
        <AiTabLoadingState
          message={t('recordingDetail.askProcessing')}
          tipKeys={CLOUD_AI_GENERATION_TIP_KEYS}
          onCancel={onCancel}
        />
      </View>
    </View>
  );
};
