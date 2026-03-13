import { AlertCircle, FileText, RefreshCw } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { RecordingStatus } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { useAiModelName, useAiTabBannerDismiss, useNetworkStatus } from '@/shared/lib';
import {
  AiTabErrorBanner,
  AiTabHintIcon,
  AiTabLoadingState,
  Button,
  TabEmptyState,
} from '@/shared/ui';

type SummaryTabProps = {
  summary: string;
  keyPhrases?: string[];
  status: RecordingStatus;
  hasTranscript?: boolean;
  color: Colors;
  onGenerate: () => void;
  onDismissError?: () => void;
};

export const SummaryTab = ({
  summary,
  keyPhrases = [],
  status,
  hasTranscript = true,
  color,
  onGenerate,
  onDismissError,
}: SummaryTabProps) => {
  const { t } = useTranslation();
  const { showBanner, handleDismiss } = useAiTabBannerDismiss(status, onDismissError);
  const aiModelName = useAiModelName();
  const { isConnected } = useNetworkStatus();

  if (status === 'processing') {
    return <AiTabLoadingState message={t('recordingDetail.summaryProcessing')} color={color} />;
  }

  if (status === 'error' && !summary) {
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
    return (
      <TabEmptyState
        icon={<FileText size={28} color={color.icon.muted} strokeWidth={1.8} />}
        title={t('recordingDetail.summaryNotCreated')}
        description={t('recordingDetail.summaryNotCreatedDesc')}
        buttonLabel={t('recordingDetail.generateSummary')}
        buttonIcon={<FileText size={18} color="#fff" strokeWidth={2} />}
        hint={aiModelName}
        hintIcon={<AiTabHintIcon color={color} />}
        disabled={isConnected === false}
        onPress={onGenerate}
        color={color}
      />
    );
  }

  return (
    <View className="gap-3.5 p-4">
      {showBanner && (
        <AiTabErrorBanner
          message={t('recordingDetail.summaryErrorBanner')}
          color={color}
          onDismiss={handleDismiss}
        />
      )}
      <Text className="text-sm leading-6" style={{ color: color.text.primary }}>
        {summary}
      </Text>
      {keyPhrases.length > 0 && (
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase" style={{ color: color.text.secondary }}>
            {t('recordingDetail.keyPhrases')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {keyPhrases.map((phrase) => (
              <View
                key={phrase}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: color.background.tertiary,
                }}
              >
                <Text className="text-sm" style={{ color: color.text.primary }}>
                  {phrase}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
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
