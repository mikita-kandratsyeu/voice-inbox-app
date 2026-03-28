import { Mic } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type { Colors } from '@/shared/config';

import { DetailTabProcessingView } from './DetailTabProcessingView';

type TranscriptProcessingProps = {
  progress: number;
  progressLabel?: string;
  phase: 'loading_model' | 'processing';
  color: Colors;
  onCancel: () => void;
};

export const TranscriptProcessing = ({
  progress,
  progressLabel,
  phase,
  color,
  onCancel,
}: TranscriptProcessingProps) => {
  const { t } = useTranslation();

  return (
    <DetailTabProcessingView
      progress={progress}
      progressLabel={progressLabel}
      phase={phase}
      color={color}
      onCancel={onCancel}
      hintText={t('transcription.batteryHint')}
      leadingIcon={<Mic size={22} color={color.accent.primary} strokeWidth={2} />}
    />
  );
};
