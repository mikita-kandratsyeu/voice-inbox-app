import { Sparkle } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import type { AiExecutionMode } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { ASK_AI_GENERATION_TIP_KEYS } from '@/shared/lib/aiGenerationTips';

import { DetailTabProcessingView } from '../DetailTabProcessingView';
import { AskAiContextDisclosure } from './AskAiContextDisclosure';

type LoadingStateProps = {
  color: Colors;
  record: VoiceRecord;
  priorDepth: number;
  aiExecutionMode: AiExecutionMode;
  onCancel?: () => void;
};

export const LoadingState = ({
  color,
  record,
  priorDepth,
  aiExecutionMode,
  onCancel,
}: LoadingStateProps) => {
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
      <View className="min-h-0 w-full flex-1 justify-center">
        <DetailTabProcessingView
          progress={0}
          phase="processing"
          color={color}
          onCancel={onCancel}
          showProgress={false}
          tipKeys={ASK_AI_GENERATION_TIP_KEYS}
          statusTitle={t('recordingDetail.askProcessing')}
          leadingIcon={<Sparkle size={22} color={color.accent.primary} strokeWidth={2} />}
          context="cloud_ai"
        />
      </View>
    </View>
  );
};
