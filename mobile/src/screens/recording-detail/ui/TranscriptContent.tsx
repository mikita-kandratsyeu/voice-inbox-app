import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { alertAiLimitExceeded } from '@/app/navigation/openPlanPaywall';
import type { RootStackParamList } from '@/app/navigation/types';
import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useTranscriptionBlockedForRecord } from '@/features/transcription/model/transcriptionConcurrency';
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
  onDiscardResume?: () => void;
  onCancelTranscription: () => void;
  isPrivateMode?: boolean;
};

export const TranscriptContent = ({
  record,
  color,
  currentPositionMs = 0,
  onTranscribe,
  onDiscardResume,
  onCancelTranscription,
  isPrivateMode = false,
}: TranscriptContentProps) => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { translate, clearTranslation, isTranslating, isTranscriptTooLongForTranslate } =
    useTranslate(record.id);

  const { recordFromStore, hydrateRecordDetails } = useRecordStore(
    useShallow((s) => ({
      recordFromStore: s.records.find((r) => r.id === record.id),
      hydrateRecordDetails: s.hydrateRecordDetails,
    })),
  );
  const r = recordFromStore ?? record;
  const registryInFlight = hasActiveTranscriptionJob(record.id);
  const transcriptionBlocked = useTranscriptionBlockedForRecord(record.id);

  useEffect(() => {
    if (!r.detailsHydrated) {
      void hydrateRecordDetails(record.id);
    }
  }, [hydrateRecordDetails, r.detailsHydrated, record.id]);

  const isTranscriptionUiActive =
    r.aiStatus === 'loading_model' ||
    r.aiStatus === 'cancelling' ||
    r.aiStatus === 'processing' ||
    (registryInFlight &&
      r.aiStatus !== 'done' &&
      r.aiStatus !== 'error' &&
      r.aiStatus !== 'paused' &&
      r.aiStatus !== 'resumable');

  const processingPhase: 'loading_model' | 'processing' =
    r.aiStatus === 'loading_model' ? 'loading_model' : 'processing';
  const isCancellingTranscription = r.aiStatus === 'cancelling';

  if (isTranscriptionUiActive) {
    return (
      <TranscriptProcessing
        progress={r.transcriptProgress ?? 0}
        progressLabel={r.transcriptProgressLabel}
        phase={processingPhase}
        color={color}
        onCancel={isCancellingTranscription ? undefined : onCancelTranscription}
        statusTitle={isCancellingTranscription ? t('aiStatus.cancelling') : undefined}
        durationMs={record.durationMs}
        transcriptionSegments={r.transcriptProgressSegments}
      />
    );
  }

  if (r.aiStatus === 'error') {
    return (
      <TranscriptError color={color} onRetry={onTranscribe} retryDisabled={transcriptionBlocked} />
    );
  }

  const isAiProcessing =
    r.summaryStatus === 'processing' ||
    r.tasksStatus === 'processing' ||
    r.meetingDialogueStatus === 'processing';
  const transcriptSegments =
    (r.transcriptSegments?.length ?? 0) > 0
      ? (r.transcriptSegments ?? [])
      : r.transcript.trim()
        ? [
            {
              id: `${r.id}-text`,
              startTime: '00:00',
              startMs: 0,
              endMs: r.durationMs ?? 0,
              text: r.transcript.trim(),
            },
          ]
        : [];

  const handleTranslate = async (targetLanguage: string) => {
    const result = await translate(targetLanguage);

    if (!result.ok) {
      if (result.error === 'limit') {
        alertAiLimitExceeded(t('recordingDetail.translateLimitReached'));
      } else {
        Alert.alert(t('common.error'), t('recordingDetail.translateError'));
      }

      return false;
    }

    return true;
  };

  const handleDeleteTranslation = () => {
    Alert.alert(
      t('recordingDetail.deleteTranslationTitle'),
      t('recordingDetail.deleteTranslationMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            void clearTranslation();
          },
        },
      ],
    );
  };

  return (
    <>
      <TranscriptTab
        recordId={r.id}
        segments={transcriptSegments}
        translatedTranscript={r.translatedTranscript}
        translationLanguage={r.translationLanguage}
        currentPositionMs={currentPositionMs}
        color={color}
        hasAudio={!!r.audioPath}
        onTranscribe={onTranscribe}
        onDiscardResume={onDiscardResume}
        isDiscardingResume={isCancellingTranscription}
        onEditTranscript={() => navigation.navigate('EditTranscript', { record: r })}
        onTranslate={isTranscriptTooLongForTranslate ? undefined : handleTranslate}
        onDeleteTranslation={handleDeleteTranslation}
        isTranslating={isTranslating}
        isAiProcessing={isAiProcessing}
        isPrivateMode={isPrivateMode}
        resumeAvailable={r.aiStatus === 'paused' || r.aiStatus === 'resumable'}
      />
    </>
  );
};
