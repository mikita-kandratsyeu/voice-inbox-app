import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';

import type { RootStackParamList } from '@/app/navigation/types';
import type { VoiceRecord } from '@/entities/record';
import { useTranslate } from '@/features/translate';
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
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { translate, isTranslating } = useTranslate(record.id);

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

  const handleTranslate = async (targetLanguage: string) => {
    const result = await translate(targetLanguage);

    if (!result.ok) {
      const message =
        result.error === 'limit'
          ? t('recordingDetail.translateLimitReached')
          : t('recordingDetail.translateError');

      Alert.alert(t('common.error'), message);

      return false;
    }

    return true;
  };

  return (
    <>
      {showStatusBadge && (
        <View className="px-4 pt-4">
          <AiStatusBadge aiStatus="done" />
        </View>
      )}
      <TranscriptTab
        segments={record.transcriptSegments ?? []}
        translatedTranscript={record.translatedTranscript}
        translationLanguage={record.translationLanguage}
        color={color}
        hasAudio={!!record.audioPath}
        onTranscribe={onTranscribe}
        onEditTranscript={() => navigation.navigate('EditTranscript', { record })}
        onTranslate={handleTranslate}
        isTranslating={isTranslating}
        isAiProcessing={isAiProcessing}
      />
    </>
  );
};
