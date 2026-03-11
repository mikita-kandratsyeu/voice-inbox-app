import { AlertCircle, Cloud, FileText, RefreshCw, WifiOff } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';

import type { RecordingStatus } from '@/entities/record';
import { AI_MODELS, useSettingsStore } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { useNetworkStatus } from '@/shared/lib';
import { Button, TabEmptyState } from '@/shared/ui';

type SummaryTabProps = {
  summary: string;
  status: RecordingStatus;
  hasTranscript?: boolean;
  color: Colors;
  onGenerate: () => void;
};

export const SummaryTab = ({
  summary,
  status,
  hasTranscript = true,
  color,
  onGenerate,
}: SummaryTabProps) => {
  const { t } = useTranslation();
  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);
  const aiModelName = AI_MODELS.find((m) => m.id === selectedAIModel)?.name ?? selectedAIModel;
  const { isConnected } = useNetworkStatus();

  if (status === 'processing') {
    return (
      <View className="items-center gap-3 p-8">
        <ActivityIndicator color={color.accent.primary} />
        <Text className="text-sm" style={{ color: color.text.secondary }}>
          {t('recordingDetail.summaryProcessing')}
        </Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <TabEmptyState
        icon={<AlertCircle size={28} color={color.accent.delete} strokeWidth={1.8} />}
        title={t('recordingDetail.summaryError')}
        description=""
        buttonLabel={t('recordingDetail.summaryRetry')}
        buttonIcon={<RefreshCw size={18} color="#fff" strokeWidth={2} />}
        onPress={onGenerate}
        color={color}
      />
    );
  }

  if (!hasTranscript) {
    return (
      <TabEmptyState
        icon={<FileText size={28} color={color.icon.muted} strokeWidth={1.8} />}
        title={t('recordingDetail.noTranscriptForAi')}
        description={t('recordingDetail.noTranscriptForAiDesc')}
        color={color}
      />
    );
  }

  if (!summary) {
    const hintIcon =
      isConnected === false ? (
        <WifiOff size={14} color={color.accent.delete} strokeWidth={1.8} />
      ) : (
        <Cloud size={14} color={color.text.secondary} strokeWidth={1.8} />
      );

    return (
      <TabEmptyState
        icon={<FileText size={28} color={color.icon.muted} strokeWidth={1.8} />}
        title={t('recordingDetail.summaryNotCreated')}
        description={t('recordingDetail.summaryNotCreatedDesc')}
        buttonLabel={t('recordingDetail.generateSummary')}
        buttonIcon={<FileText size={18} color="#fff" strokeWidth={2} />}
        hint={aiModelName}
        hintIcon={hintIcon}
        disabled={isConnected === false}
        onPress={onGenerate}
        color={color}
      />
    );
  }

  return (
    <View className="gap-3.5 p-4">
      <Text className="text-sm leading-6" style={{ color: color.text.primary }}>
        {summary}
      </Text>
      <Button
        variant="secondary"
        size="lg"
        icon={<RefreshCw size={15} color={color.text.primary} strokeWidth={2} />}
        label={t('recordingDetail.regenerateSummary')}
        color={color}
        onPress={onGenerate}
        disabled={isConnected === false}
        className="mt-1"
      />
    </View>
  );
};
