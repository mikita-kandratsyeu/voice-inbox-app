import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import type { RootStackParamList } from '@/app/navigation/types';
import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { hasActiveTranscriptionJob } from '@/features/transcription/model/transcriptionJobRegistry';
import { useTranslate } from '@/features/translate';
import type { Colors } from '@/shared/config';

import { TranscriptError } from './TranscriptError';
import { TranscriptProcessing } from './TranscriptProcessing';
import { TranscriptTab } from './TranscriptTab';

type TranscriptContentProps = {
  record: VoiceRecord;
  color: Colors;
  currentPositionMs?: number;
  onTranscribe: () => void;
  onCancelTranscription: () => void;
  isPrivateMode?: boolean;
};

export const TranscriptContent = ({
  record,
  color,
  currentPositionMs = 0,
  onTranscribe,
  onCancelTranscription,
  isPrivateMode = false,
}: TranscriptContentProps) => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { translate, isTranslating } = useTranslate(record.id);

  const { recordFromStore, hydrateRecordDetails } = useRecordStore(
    useShallow((s) => ({
      recordFromStore: s.records.find((r) => r.id === record.id),
      hydrateRecordDetails: s.hydrateRecordDetails,
    })),
  );
  const r = recordFromStore ?? record;
  const registryInFlight = hasActiveTranscriptionJob(record.id);

  useEffect(() => {
    if (!r.detailsHydrated) {
      void hydrateRecordDetails(record.id);
    }
  }, [hydrateRecordDetails, r.detailsHydrated, record.id]);

  const isTranscriptionUiActive =
    r.aiStatus === 'loading_model' ||
    r.aiStatus === 'processing' ||
    (registryInFlight && r.aiStatus !== 'done' && r.aiStatus !== 'error');

  const processingPhase: 'loading_model' | 'processing' =
    r.aiStatus === 'loading_model' ? 'loading_model' : 'processing';

  if (isTranscriptionUiActive) {
    return (
      <TranscriptProcessing
        progress={r.transcriptProgress ?? 0}
        progressLabel={r.transcriptProgressLabel}
        phase={processingPhase}
        color={color}
        onCancel={onCancelTranscription}
      />
    );
  }

  if (r.aiStatus === 'error') {
    return <TranscriptError color={color} onRetry={onTranscribe} />;
  }

  const isAiProcessing = r.summaryStatus === 'processing' || r.tasksStatus === 'processing';

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
      <TranscriptTab
        recordId={r.id}
        segments={r.transcriptSegments ?? []}
        translatedTranscript={r.translatedTranscript}
        translationLanguage={r.translationLanguage}
        currentPositionMs={currentPositionMs}
        color={color}
        hasAudio={!!r.audioPath}
        onTranscribe={onTranscribe}
        onEditTranscript={() => navigation.navigate('EditTranscript', { record: r })}
        onTranslate={handleTranslate}
        isTranslating={isTranslating}
        isAiProcessing={isAiProcessing}
        isPrivateMode={isPrivateMode}
      />
    </>
  );
};
