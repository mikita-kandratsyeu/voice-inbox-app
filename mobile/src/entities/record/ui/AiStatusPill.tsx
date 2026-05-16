import { AlertCircle, MicOff } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { useColors } from '@/shared/config';

import type { RecordingStatus } from '../model/types';

type AiStatusPillProps = {
  aiStatus: RecordingStatus;
  transcriptProgress?: number;
  transcriptProgressLabel?: string;
  summaryStatus?: RecordingStatus;
  tasksStatus?: RecordingStatus;
  translationStatus?: RecordingStatus;
  askAiStatus?: RecordingStatus;
  onPress: () => void;
};

const isAiProcessing = (s?: RecordingStatus) => s === 'processing';
const isAiError = (s?: RecordingStatus) => s === 'error';

export const AiStatusPill = ({
  aiStatus,
  transcriptProgressLabel,
  summaryStatus,
  tasksStatus,
  translationStatus,
  askAiStatus,
  onPress,
}: AiStatusPillProps) => {
  const { t } = useTranslation();
  const color = useColors();

  const aiProcessing =
    isAiProcessing(summaryStatus) ||
    isAiProcessing(tasksStatus) ||
    isAiProcessing(translationStatus) ||
    isAiProcessing(askAiStatus);
  const aiError =
    isAiError(summaryStatus) ||
    isAiError(tasksStatus) ||
    isAiError(translationStatus) ||
    isAiError(askAiStatus);

  const isTranscriptionInProgress = aiStatus === 'loading_model' || aiStatus === 'processing';

  const processingSpinner = (
    <ActivityIndicator
      size="small"
      color={color.status.processing.text}
      style={{ transform: [{ scale: 0.7 }] }}
    />
  );

  if (aiStatus === 'done' && !aiProcessing && !aiError) {
    return null;
  }

  if (isTranscriptionInProgress) {
    const label =
      aiStatus === 'loading_model'
        ? t('aiStatus.loading_model')
        : (transcriptProgressLabel ?? t('aiStatus.processing'));
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
        style={{ backgroundColor: color.status.processing.bg }}
        onPress={onPress}
        activeOpacity={0.75}
      >
        {processingSpinner}
        <Text className="text-xs font-medium" style={{ color: color.status.processing.text }}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  if (aiProcessing) {
    const aiLabel =
      translationStatus === 'processing' &&
      summaryStatus !== 'processing' &&
      tasksStatus !== 'processing' &&
      askAiStatus !== 'processing'
        ? t('recordingDetail.translating')
        : askAiStatus === 'processing' &&
            summaryStatus !== 'processing' &&
            tasksStatus !== 'processing' &&
            translationStatus !== 'processing'
          ? t('aiStatus.askProcessing')
          : t('aiStatus.aiProcessing');
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={aiLabel}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
        style={{ backgroundColor: color.status.processing.bg }}
        onPress={onPress}
        activeOpacity={0.75}
      >
        {processingSpinner}
        <Text className="text-xs font-medium" style={{ color: color.status.processing.text }}>
          {aiLabel}
        </Text>
      </TouchableOpacity>
    );
  }

  if (aiStatus === 'error' || aiError) {
    const errLabel =
      translationStatus === 'error' &&
      summaryStatus !== 'error' &&
      tasksStatus !== 'error' &&
      askAiStatus !== 'error'
        ? t('recordingDetail.translateErrorShort')
        : askAiStatus === 'error' &&
            summaryStatus !== 'error' &&
            tasksStatus !== 'error' &&
            translationStatus !== 'error'
          ? t('recordingDetail.askError')
          : t('common.error');
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={errLabel}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
        style={{ backgroundColor: color.status.error.bg }}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <AlertCircle size={11} color={color.status.error.text} strokeWidth={2.5} />
        <Text className="text-xs font-medium" style={{ color: color.status.error.text }}>
          {errLabel}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View
      className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
      style={{ backgroundColor: color.status.muted.bg }}
    >
      <MicOff size={11} color={color.status.muted.text} strokeWidth={2.5} />
      <Text className="text-xs font-medium" style={{ color: color.status.muted.text }}>
        {t('aiStatus.noTranscript')}
      </Text>
    </View>
  );
};
