import { AlertCircle, FileText, RefreshCw, Share, UsersRound } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { RecordingStatus } from '@/entities/record';
import { formatAiModelDisplayName, useSettingsStore } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { useAiModelName, useAiTabBannerDismiss, useNetworkStatus } from '@/shared/lib';
import type { SummaryTokenUsage } from '@/shared/lib/summaryMetaSubtitle';
import { AiTabErrorBanner, AiTabHintIcon, Button, TabEmptyState } from '@/shared/ui';

import { AiTabProcessing } from './AiTabProcessing';
import { MeetingTabInfoCallout, MeetingTabInfoCalloutText } from './MeetingTabInfoCallout';
import { SummaryReasoningDisclosure } from './SummaryReasoningDisclosure';

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
  /** Phase-2 speaker breakdown in progress; block full regenerate on summary. */
  speakerBreakdownProcessing?: boolean;
  isPrivateMode?: boolean;
  privateAiBatchProgress?: number;
  privateAiBatchPhase?: 'loading_model' | 'processing';
  privateAiBatchProgressLabel?: string;
  privateAiBatchStartedAt?: number;
  transcriptCharCount?: number;
  cloudMeetingDialogueExtra?: boolean;
  summaryReasoning?: string;
  summaryAiModel?: string;
  summaryTokenUsage?: SummaryTokenUsage;
  summaryGenerationMs?: number;
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
  speakerBreakdownProcessing = false,
  privateAiBatchPhase,
  privateAiBatchProgress,
  privateAiBatchProgressLabel,
  privateAiBatchStartedAt,
  transcriptCharCount,
  cloudMeetingDialogueExtra = false,
  showPrivateModeCta = false,
  status,
  summary,
  isPrivateMode = false,
  summaryReasoning,
  summaryAiModel,
  summaryTokenUsage,
  summaryGenerationMs,
}: SummaryTabProps) => {
  const { t } = useTranslation();
  const { showBanner, handleDismiss } = useAiTabBannerDismiss(status, onDismissError);
  const aiModelName = useAiModelName();
  const { isConnected } = useNetworkStatus();
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const showSummaryReasoningInNotes = useSettingsStore((s) => s.showSummaryReasoningInNotes);
  const disableByNetwork = isConnected === false && aiExecutionMode !== 'private_experimental';
  const regenerateDisabled = disableByNetwork || speakerBreakdownProcessing;

  const summaryModelLabel = useMemo(() => {
    const id = summaryAiModel?.trim();
    return id ? formatAiModelDisplayName(id) : '';
  }, [summaryAiModel]);

  const isSmartMode = aiExecutionMode === 'smart_hybrid';
  const showReasoningBlock =
    isSmartMode && showSummaryReasoningInNotes && Boolean(summaryReasoning?.trim());

  const errMessage = useMemo(() => {
    return errorMessage ?? (showPrivateModeCta ? t('recordingDetail.privateModeErrorHint') : '');
  }, [errorMessage, showPrivateModeCta, t]);

  if (status === 'processing') {
    return (
      <AiTabProcessing
        variant="summary"
        progress={privateAiBatchProgress ?? 0}
        progressLabel={privateAiBatchProgressLabel}
        phase={privateAiBatchPhase ?? (isPrivateMode ? 'loading_model' : 'processing')}
        color={color}
        onCancel={onCancelProcessing}
        isPrivateMode={isPrivateMode}
        processingStartedAtMs={privateAiBatchStartedAt}
        transcriptCharCount={transcriptCharCount}
        cloudMeetingDialogueExtra={cloudMeetingDialogueExtra && speakerBreakdownProcessing}
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
      {speakerBreakdownProcessing ? (
        <View
          className="rounded-xl border p-3"
          style={{
            borderColor: color.border.default,
            backgroundColor: color.background.tertiary,
          }}
        >
          <Text className="text-[13px] leading-5" style={{ color: color.text.secondary }}>
            {privateAiBatchProgressLabel?.trim() ||
              t('recordingDetail.regenerateSummaryWaitForSpeakers')}
          </Text>
        </View>
      ) : null}
      {isMeeting && (
        <MeetingTabInfoCallout
          color={color}
          icon={<UsersRound size={20} color={color.accent.primary} strokeWidth={2} />}
          title={t('recordingDetail.meetingSummaryTitle')}
        >
          <MeetingTabInfoCalloutText color={color}>
            {t('recordingDetail.meetingSummaryDescription')}
          </MeetingTabInfoCalloutText>
        </MeetingTabInfoCallout>
      )}
      <Text className="text-sm leading-6" style={{ color: color.text.primary }}>
        {summary}
      </Text>
      {showReasoningBlock && summaryReasoning ? (
        <SummaryReasoningDisclosure
          reasoning={summaryReasoning}
          color={color}
          modelLabel={summaryModelLabel || undefined}
          tokenUsage={summaryTokenUsage}
          generationDurationMs={summaryGenerationMs}
        />
      ) : null}
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
        disabled={regenerateDisabled}
        className="mt-1"
        accessibilityState={{ disabled: regenerateDisabled }}
      />
      {speakerBreakdownProcessing ? (
        <Text className="text-center text-xs leading-5" style={{ color: color.text.secondary }}>
          {t('recordingDetail.regenerateSummaryWaitForSpeakers')}
        </Text>
      ) : null}
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
