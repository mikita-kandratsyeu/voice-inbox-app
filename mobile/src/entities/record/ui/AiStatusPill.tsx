import { AlertCircle, Layers, MicOff, RotateCcw } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { useColors } from '@/shared/config';

import type { MeetingDialogueLoadStatus, RecordingStatus } from '../model/types';

type AiStatusPillProps = {
  aiStatus: RecordingStatus;
  transcriptProgress?: number;
  transcriptProgressLabel?: string;
  transcriptProgressSegments?: { current: number; total: number };
  summaryStatus?: RecordingStatus;
  tasksStatus?: RecordingStatus;
  translationStatus?: RecordingStatus;
  askAiStatus?: RecordingStatus;
  meetingDialogueStatus?: MeetingDialogueLoadStatus;
  onPress: () => void;
};

const isAiProcessing = (s?: RecordingStatus) => s === 'processing';
const isAiError = (s?: RecordingStatus) => s === 'error';

const pillContainerStyle = { flexShrink: 1, maxWidth: '100%' as const };

export const AiStatusPill = ({
  aiStatus,
  transcriptProgressLabel,
  transcriptProgressSegments,
  summaryStatus,
  tasksStatus,
  translationStatus,
  askAiStatus,
  meetingDialogueStatus,
  onPress,
}: AiStatusPillProps) => {
  const { t } = useTranslation();
  const color = useColors();

  const meetingDialogueProcessing = meetingDialogueStatus === 'processing';
  const meetingDialogueFailed = meetingDialogueStatus === 'failed';

  const aiProcessing =
    isAiProcessing(summaryStatus) ||
    isAiProcessing(tasksStatus) ||
    isAiProcessing(translationStatus) ||
    isAiProcessing(askAiStatus) ||
    meetingDialogueProcessing;
  const aiError =
    isAiError(summaryStatus) ||
    isAiError(tasksStatus) ||
    isAiError(translationStatus) ||
    isAiError(askAiStatus) ||
    meetingDialogueFailed;

  const isTranscriptionInProgress =
    aiStatus === 'loading_model' || aiStatus === 'processing' || aiStatus === 'cancelling';

  const processingSpinner = (
    <ActivityIndicator
      size="small"
      color={color.status.processing.text}
      style={{ transform: [{ scale: 0.7 }] }}
    />
  );

  if (summaryStatus === 'queued' && !aiProcessing) {
    const queuedLabel = t('aiStatus.queued');
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={queuedLabel}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
        style={{ backgroundColor: color.status.processing.bg, ...pillContainerStyle }}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <Layers size={11} color={color.status.processing.text} strokeWidth={2.5} />
        <Text
          className="text-xs font-medium"
          style={{ color: color.status.processing.text, flexShrink: 1 }}
          numberOfLines={1}
        >
          {queuedLabel}
        </Text>
      </TouchableOpacity>
    );
  }

  if (aiStatus === 'done' && !aiProcessing && !aiError) {
    return null;
  }

  if (isTranscriptionInProgress) {
    const label =
      aiStatus === 'loading_model'
        ? t('aiStatus.loading_model')
        : aiStatus === 'cancelling'
          ? t('aiStatus.cancelling')
          : transcriptProgressSegments
            ? t('transcription.progressInbox', {
                current: transcriptProgressSegments.current,
                total: transcriptProgressSegments.total,
              })
            : (transcriptProgressLabel ?? t('aiStatus.processing'));
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
        style={{ backgroundColor: color.status.processing.bg, ...pillContainerStyle }}
        onPress={onPress}
        activeOpacity={0.75}
      >
        {processingSpinner}
        <Text
          className="text-xs font-medium"
          style={{ color: color.status.processing.text, flexShrink: 1 }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  if (aiStatus === 'paused' || aiStatus === 'resumable') {
    const label = t(`aiStatus.${aiStatus}`);
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
        style={{ backgroundColor: color.status.processing.bg, ...pillContainerStyle }}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <RotateCcw size={11} color={color.status.processing.text} strokeWidth={2.5} />
        <Text
          className="text-xs font-medium"
          style={{ color: color.status.processing.text, flexShrink: 1 }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  if (aiProcessing) {
    const aiLabel =
      meetingDialogueProcessing &&
      !isAiProcessing(summaryStatus) &&
      !isAiProcessing(tasksStatus) &&
      !isAiProcessing(translationStatus) &&
      !isAiProcessing(askAiStatus)
        ? t('aiStatus.speakerTurnsProcessing')
        : translationStatus === 'processing' &&
            !isAiProcessing(summaryStatus) &&
            !isAiProcessing(tasksStatus) &&
            !isAiProcessing(askAiStatus) &&
            !meetingDialogueProcessing
          ? t('recordingDetail.translating')
          : askAiStatus === 'processing' &&
              !isAiProcessing(summaryStatus) &&
              !isAiProcessing(tasksStatus) &&
              !isAiProcessing(translationStatus) &&
              !meetingDialogueProcessing
            ? t('aiStatus.askProcessing')
            : t('aiStatus.aiProcessing');
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={aiLabel}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
        style={{ backgroundColor: color.status.processing.bg, ...pillContainerStyle }}
        onPress={onPress}
        activeOpacity={0.75}
      >
        {processingSpinner}
        <Text
          className="text-xs font-medium"
          style={{ color: color.status.processing.text, flexShrink: 1 }}
          numberOfLines={1}
        >
          {aiLabel}
        </Text>
      </TouchableOpacity>
    );
  }

  if (aiStatus === 'error' || aiError) {
    const errLabel =
      meetingDialogueFailed &&
      !isAiError(summaryStatus) &&
      !isAiError(tasksStatus) &&
      !isAiError(translationStatus) &&
      !isAiError(askAiStatus)
        ? t('recordingDetail.meetingDialogueFailedTitle')
        : translationStatus === 'error' &&
            !isAiError(summaryStatus) &&
            !isAiError(tasksStatus) &&
            !isAiError(askAiStatus) &&
            !meetingDialogueFailed
          ? t('recordingDetail.translateErrorShort')
          : askAiStatus === 'error' &&
              !isAiError(summaryStatus) &&
              !isAiError(tasksStatus) &&
              !isAiError(translationStatus) &&
              !meetingDialogueFailed
            ? t('recordingDetail.askError')
            : t('common.error');
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={errLabel}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
        style={{ backgroundColor: color.status.error.bg, ...pillContainerStyle }}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <AlertCircle size={11} color={color.status.error.text} strokeWidth={2.5} />
        <Text
          className="text-xs font-medium"
          style={{ color: color.status.error.text, flexShrink: 1 }}
          numberOfLines={1}
        >
          {errLabel}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View
      className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
      style={{ backgroundColor: color.status.muted.bg, ...pillContainerStyle }}
    >
      <MicOff size={11} color={color.status.muted.text} strokeWidth={2.5} />
      <Text
        className="text-xs font-medium"
        style={{ color: color.status.muted.text, flexShrink: 1 }}
        numberOfLines={1}
      >
        {t('aiStatus.noTranscript')}
      </Text>
    </View>
  );
};
