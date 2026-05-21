import { AlertCircle, FileText, RefreshCw, UsersRound } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { RecordingStatus } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { useAiModelName, useAiTabBannerDismiss, useNetworkStatus } from '@/shared/lib';
import { AiTabErrorBanner, AiTabHintIcon, Button, TabEmptyState } from '@/shared/ui';

import { parseMeetingDialogue, utteranceStripeColor } from '../lib/parseMeetingDialogue';
import { AiTabProcessing } from './AiTabProcessing';

type MeetingDialogueTabProps = {
  meetingDialogue?: string;
  hasTranscript: boolean;
  color: Colors;
  onGenerate: () => void;
  status: RecordingStatus;
  errorMessage?: string;
  onDismissError?: () => void;
  showPrivateModeCta?: boolean;
  onCancelProcessing?: () => void;
  isPrivateMode?: boolean;
  privateAiBatchProgress?: number;
  privateAiBatchPhase?: 'loading_model' | 'processing';
  privateAiBatchProgressLabel?: string;
};

export const MeetingDialogueTab = ({
  color,
  errorMessage,
  hasTranscript,
  meetingDialogue,
  onCancelProcessing,
  onDismissError,
  onGenerate,
  privateAiBatchPhase,
  privateAiBatchProgress,
  privateAiBatchProgressLabel,
  showPrivateModeCta = false,
  status,
  isPrivateMode = false,
}: MeetingDialogueTabProps) => {
  const { t } = useTranslation();
  const { showBanner, handleDismiss } = useAiTabBannerDismiss(status, onDismissError);
  const aiModelName = useAiModelName();
  const { isConnected } = useNetworkStatus();
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const disableByNetwork = isConnected === false && aiExecutionMode !== 'private_experimental';

  const errMessage = useMemo(() => {
    return errorMessage ?? (showPrivateModeCta ? t('recordingDetail.privateModeErrorHint') : '');
  }, [errorMessage, showPrivateModeCta, t]);

  const utterances = useMemo(() => parseMeetingDialogue(meetingDialogue ?? ''), [meetingDialogue]);

  if (status === 'processing') {
    return (
      <AiTabProcessing
        variant="meetingDialogue"
        progress={privateAiBatchProgress ?? 0}
        progressLabel={privateAiBatchProgressLabel}
        phase={privateAiBatchPhase ?? (isPrivateMode ? 'loading_model' : 'processing')}
        color={color}
        onCancel={onCancelProcessing}
        isPrivateMode={isPrivateMode}
      />
    );
  }

  if (status === 'error' && utterances.length === 0) {
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

  if (utterances.length === 0) {
    return (
      <View className="gap-3 p-4">
        <TabEmptyState
          icon={<UsersRound size={28} color={color.icon.muted} strokeWidth={1.8} />}
          title={t('recordingDetail.meetingDialogueTabEmptyTitle')}
          description={t('recordingDetail.meetingDialogueTabEmptyDesc')}
          buttonLabel={t('recordingDetail.generateSummary')}
          buttonIcon={<FileText size={18} color="#fff" strokeWidth={2} />}
          hint={aiModelName}
          hintIcon={<AiTabHintIcon />}
          disabled={disableByNetwork}
          onPress={onGenerate}
        />
      </View>
    );
  }

  return (
    <View className="gap-3.5 p-4">
      {showBanner && <AiTabErrorBanner message={errMessage} onDismiss={handleDismiss} />}
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
            {t('recordingDetail.meetingDialogueTabCalloutTitle')}
          </Text>
          <Text className="text-[13px] leading-5" style={{ color: color.text.secondary }}>
            {t('recordingDetail.meetingDialogueDisclaimer')}
          </Text>
        </View>
      </View>
      <View className="gap-3">
        {utterances.map((u, index) => {
          const stripe = utteranceStripeColor(color, u.colorSlot);
          const key = `${index}-${u.speakerLabel}-${u.body.slice(0, 24)}`;

          return (
            <View
              key={key}
              className="flex-row gap-3 rounded-xl border p-3"
              style={{
                borderColor: color.border.default,
                backgroundColor: color.background.tertiary,
              }}
            >
              <View
                className="mt-0.5 w-1 self-stretch rounded-full"
                style={{ backgroundColor: stripe, minHeight: 24 }}
              />
              <View className="min-w-0 flex-1 gap-1">
                {u.speakerLabel ? (
                  <Text
                    className="text-[15px] font-semibold"
                    style={{ color: color.text.primary }}
                    selectable
                  >
                    {u.speakerLabel}
                  </Text>
                ) : (
                  <Text
                    className="text-[13px] font-semibold"
                    style={{ color: color.text.secondary }}
                    selectable
                  >
                    {t('recordingDetail.meetingDialoguePreamble')}
                  </Text>
                )}
                <Text
                  className="text-sm leading-6"
                  style={{ color: color.text.primary }}
                  selectable
                >
                  {u.body}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
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
    </View>
  );
};
