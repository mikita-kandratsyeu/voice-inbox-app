import React from 'react';
import { View } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import type { Colors } from '@/shared/config';

import { AiStatusBadge } from './AiStatusBadge';
import { TranscriptError } from './TranscriptError';
import { TranscriptProcessing } from './TranscriptProcessing';
import { TranscriptTab } from './TranscriptTab';

type TranscriptContentProps = {
  record: VoiceRecord;
  color: Colors;
  onTranscribe: () => void;
  onCancelTranscription: () => void;
};

export const TranscriptContent = ({
  record,
  color,
  onTranscribe,
  onCancelTranscription,
}: TranscriptContentProps) => {
  if (record.aiStatus === 'processing') {
    return (
      <TranscriptProcessing
        progress={record.transcriptProgress ?? 0}
        progressLabel={record.transcriptProgressLabel}
        color={color}
        onCancel={onCancelTranscription}
      />
    );
  }

  if (record.aiStatus === 'error') {
    return <TranscriptError onRetry={onTranscribe} />;
  }

  const showStatusBadge =
    record.aiStatus === 'done' && (record.transcriptSegments ?? []).length > 0;

  return (
    <>
      {showStatusBadge && (
        <View className="px-4 pt-4">
          <AiStatusBadge aiStatus="done" />
        </View>
      )}
      <TranscriptTab
        segments={record.transcriptSegments ?? []}
        color={color}
        onTranscribe={onTranscribe}
      />
    </>
  );
};
