import { AlertCircle, RefreshCw } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import type { AiExecutionMode } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { Button } from '@/shared/ui';

import { AskAiContextDisclosure } from './AskAiContextDisclosure';

type ErrorStateProps = {
  color: Colors;
  record: VoiceRecord;
  priorDepth: number;
  aiExecutionMode: AiExecutionMode;
  onRetry: () => void;
  showPrivateModeCta?: boolean;
};
export const ErrorState = ({
  color,
  record,
  priorDepth,
  aiExecutionMode,
  onRetry,
  showPrivateModeCta = false,
}: ErrorStateProps) => {
  const { t } = useTranslation();
  return (
    <View className="w-full items-center gap-4 px-1 py-4">
      <AlertCircle size={40} color={color.accent.delete} strokeWidth={1.8} />
      <Text className="text-center text-base font-semibold" style={{ color: color.text.primary }}>
        {t('recordingDetail.askError')}
      </Text>
      <Text className="text-center text-[15px] leading-6" style={{ color: color.text.secondary }}>
        {showPrivateModeCta
          ? t('recordingDetail.privateModeErrorHint')
          : t('recordingDetail.askErrorContinueHint')}
      </Text>
      <View className="w-full">
        <AskAiContextDisclosure
          color={color}
          record={record}
          priorDepth={priorDepth}
          aiExecutionMode={aiExecutionMode}
          containerClassName=""
        />
      </View>
      <Button
        variant="primary"
        size="lg"
        icon={<RefreshCw size={18} color="#fff" strokeWidth={2} />}
        label={t('recordingDetail.summaryRetry')}
        color={color}
        onPress={onRetry}
        containerStyle={{ flex: 1, minWidth: 0 }}
      />
    </View>
  );
};
