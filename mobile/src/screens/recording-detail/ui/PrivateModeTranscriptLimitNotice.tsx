import React from 'react';

import { useSettingsStore } from '@/entities/settings';
import type { Colors } from '@/shared/config';

import { PrivateTranscriptLimitBanner } from './PrivateTranscriptLimitBanner';

type PrivateModeTranscriptLimitNoticeProps = {
  color: Colors;
  transcriptCharCount?: number;
};

export function PrivateModeTranscriptLimitNotice({
  color,
  transcriptCharCount,
}: PrivateModeTranscriptLimitNoticeProps) {
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const privateCapabilityTier = useSettingsStore((s) => s.privateCapabilityTier);

  if (
    aiExecutionMode !== 'private_experimental' ||
    privateAiProvider !== 'local' ||
    transcriptCharCount == null
  ) {
    return null;
  }

  return (
    <PrivateTranscriptLimitBanner
      color={color}
      privateCapabilityTier={privateCapabilityTier}
      transcriptCharCount={transcriptCharCount}
    />
  );
}
