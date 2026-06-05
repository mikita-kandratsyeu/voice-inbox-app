import React from 'react';
import { useTranslation } from 'react-i18next';

import type { Colors } from '@/shared/config';
import { RecordVoiceIcon } from '@/shared/ui';

import { DetailTabProcessingView } from './DetailTabProcessingView';

type TranscriptProcessingProps = {
  progress: number;
  progressLabel?: string;
  phase: 'loading_model' | 'processing';
  color: Colors;
  onCancel?: () => void;
  statusTitle?: string;
  durationMs?: number;
  transcriptionSegments?: { current: number; total: number };
};

export const TranscriptProcessing = ({
  progress,
  progressLabel,
  phase,
  color,
  onCancel,
  statusTitle,
  durationMs,
  transcriptionSegments,
}: TranscriptProcessingProps) => {
  const { t } = useTranslation();

  return (
    <DetailTabProcessingView
      progress={progress}
      progressLabel={progressLabel}
      phase={phase}
      color={color}
      onCancel={onCancel}
      context="transcription"
      statusTitle={statusTitle}
      hintText={t('transcription.batteryHint')}
      leadingIcon={<RecordVoiceIcon size={22} color={color.accent.primary} strokeWidth={2.2} />}
      durationMs={durationMs}
      transcriptionSegments={transcriptionSegments}
    />
  );
};
