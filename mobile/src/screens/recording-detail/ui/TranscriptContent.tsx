import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { View } from 'react-native';

import type { RootStackParamList } from '@/app/navigation/types';
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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

  const isAiProcessing =
    record.summaryStatus === 'processing' || record.tasksStatus === 'processing';

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
        hasAudio={!!record.audioPath}
        onTranscribe={onTranscribe}
        onEditTranscript={() => navigation.navigate('EditTranscript', { record })}
        isAiProcessing={isAiProcessing}
      />
    </>
  );
};
