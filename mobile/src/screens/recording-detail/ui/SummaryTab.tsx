import { AlertCircle, FileText, RefreshCw, Share, Sparkles, UsersRound } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { RecordingStatus } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { useAiModelName, useAiTabBannerDismiss, useNetworkStatus } from '@/shared/lib';
import {
  AiTabErrorBanner,
  AiTabHintIcon,
  AiTabLoadingState,
  Button,
  TabEmptyState,
} from '@/shared/ui';

import { DetailTabProcessingView } from './DetailTabProcessingView';

type SummaryTabProps = {
  summary: string;
  keyPhrases?: string[];
  status: RecordingStatus;
  errorMessage?: string;
  hasTranscript?: boolean;
  color: Colors;
  onGenerate: () => void;
  isMeeting?: boolean;
  onShareMeetingBrief?: () => void;
  onDismissError?: () => void;
  showPrivateModeCta?: boolean;
  onSwitchToSmartMode?: () => void;
  onCancelProcessing?: () => void;
  usePrivateProcessingPanel?: boolean;
  privateAiBatchProgress?: number;
  privateAiBatchPhase?: 'loading_model' | 'processing';
  privateAiBatchProgressLabel?: string;
};

export const SummaryTab = ({
  color,
  errorMessage,
  hasTranscript = true,
  keyPhrases = [],
  isMeeting = false,
  onDismissError,
  onGenerate,
  onShareMeetingBrief,
  onCancelProcessing,
  privateAiBatchPhase,
  privateAiBatchProgress,
  privateAiBatchProgressLabel,
  showPrivateModeCta = false,
  status,
  summary,
  usePrivateProcessingPanel = false,
}: SummaryTabProps) => {
  const { t } = useTranslation();
  const { showBanner, handleDismiss } = useAiTabBannerDismiss(status, onDismissError);
  const aiModelName = useAiModelName();
  const { isConnected } = useNetworkStatus();
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const disableByNetwork = isConnected === false && aiExecutionMode !== 'private_experimental';

  const errMessage = useMemo(() => {
    return errorMessage ?? (showPrivateModeCta ? t('recordingDetail.privateModeErrorHint') : '');
  }, [errorMessage, showPrivateModeCta, t]);

  if (status === 'processing') {
    if (usePrivateProcessingPanel && onCancelProcessing) {
      return (
        <DetailTabProcessingView
          progress={privateAiBatchProgress ?? 0}
          progressLabel={privateAiBatchProgressLabel}
          phase={privateAiBatchPhase ?? 'loading_model'}
          color={color}
          onCancel={onCancelProcessing}
          context="private_llm"
          hintText={t('privateAi.batteryHint')}
          leadingIcon={<Sparkles size={22} color={color.accent.primary} strokeWidth={2} />}
        />
      );
    }

    return (
      <AiTabLoadingState
        message={t('recordingDetail.summaryProcessing')}
        onCancel={onCancelProcessing}
      />
    );
  }

  if (status === 'error' && !summary) {
    return (
      <View className="gap-3 p-4">
        <TabEmptyState
          icon={<AlertCircle size={28} color={color.accent.delete} strokeWidth={1.8} />}
          title={t('recordingDetail.summaryError')}
          description={errMessage}
          buttonLabel={t('recordingDetail.summaryRetry')}
          buttonIcon={<RefreshCw size={18} color="#fff" strokeWidth={2} />}
          onPress={onGenerate}
        />
      </View>
    );
  }

  if (!hasTranscript) {
    return (
      <TabEmptyState
        icon={<FileText size={28} color={color.icon.muted} strokeWidth={1.8} />}
        title={t('recordingDetail.noTranscriptForAi')}
        description={t('recordingDetail.noTranscriptForAiDesc')}
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
        hintIcon={<AiTabHintIcon />}
        disabled={disableByNetwork}
        onPress={onGenerate}
      />
    );
  }

  return (
    <View className="gap-3.5 p-4">
      {showBanner && <AiTabErrorBanner message={errMessage} onDismiss={handleDismiss} />}
      {isMeeting && (
        <View
          className="flex-row gap-3 rounded-xl border p-3"
          style={{
            borderColor: color.border.default,
            backgroundColor: color.background.tertiary,
          }}
        >
          <UsersRound
            size={20}
            color={color.accent.primary}
            strokeWidth={2}
            style={{ marginTop: 2 }}
          />
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-[15px] font-semibold" style={{ color: color.text.primary }}>
              {t('recordingDetail.meetingSummaryTitle')}
            </Text>
            <Text className="text-[13px] leading-5" style={{ color: color.text.secondary }}>
              {t('recordingDetail.meetingSummaryDescription')}
            </Text>
          </View>
        </View>
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
        disabled={disableByNetwork}
        className="mt-1"
        accessibilityState={{ disabled: disableByNetwork }}
      />
      {isMeeting && onShareMeetingBrief && (
        <Button
          variant="primary"
          size="lg"
          icon={<Share size={15} color="#fff" strokeWidth={2} />}
          label={t('recordingDetail.shareMeetingBrief')}
          color={color}
          onPress={onShareMeetingBrief}
        />
      )}
    </View>
  );
};
