import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusBar, Text, useColorScheme, View } from 'react-native';
import KeepAwake from 'react-native-keep-awake';

import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { useTranscription } from '@/features/transcription';
import { getColors } from '@/shared/config';
import { Waveform } from '@/shared/ui';

import { useRecording } from '../model/useRecording';
import { RecordLimitBar } from './RecordLimitBar';
import { RecordScreenControls } from './RecordScreenControls';
import { RecordScreenHeader } from './RecordScreenHeader';
import { RecordTimer } from './RecordTimer';
import { SaveRecordModal } from './SaveRecordModal';

export const RecordScreen = () => {
  const { t } = useTranslation();
  const scheme = (useColorScheme() ?? 'dark') as 'light' | 'dark';
  const c = getColors(scheme);

  const navigation = useNavigation();
  const addRecord = useRecordStore((s) => s.addRecord);
  const autoTranscribeOnSave = useSettingsStore((s) => s.autoTranscribeOnSave);
  const { startTranscription } = useTranscription();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [title, setTitle] = useState('');

  const {
    state,
    elapsed,
    elapsedMs,
    meterLevel,
    audioPathRef,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  } = useRecording({
    onLimitReached: () => {
      setTitle('');
      setShowSaveModal(true);
    },
  });

  useFocusEffect(
    useCallback(() => {
      if (state === 'idle') {
        startRecording();
      }
    }, [state, startRecording]),
  );

  const handleClose = async () => {
    await stopRecording();
    navigation.goBack();
  };

  const handlePauseResume = () => {
    if (state === 'recording') {
      pauseRecording();
    } else if (state === 'paused') {
      resumeRecording();
    }
  };

  const handleDonePress = async () => {
    await pauseRecording();
    setTitle('');
    setShowSaveModal(true);
  };

  const handleSaveCancel = () => {
    setShowSaveModal(false);
    resumeRecording();
  };

  const handleSaveConfirm = async (record: VoiceRecord) => {
    await stopRecording();
    addRecord(record);
    if (autoTranscribeOnSave) {
      startTranscription(record);
    }
  };

  const handleSaveComplete = () => {
    setShowSaveModal(false);
    navigation.goBack();
  };

  return (
    <View className="flex-1" style={{ backgroundColor: c.accent.primary }}>
      {state === 'recording' && <KeepAwake />}
      <StatusBar barStyle="light-content" backgroundColor={c.accent.primary} />
      <RecordScreenHeader state={state} onClose={handleClose} />
      <View className="flex-1 items-center justify-center gap-9 px-6">
        <View className="items-center gap-3">
          <RecordTimer elapsedMs={elapsedMs} />
          <RecordLimitBar elapsedMs={elapsedMs} />
        </View>
        <View className="w-full px-2">
          <Waveform
            isAnimating={state === 'recording'}
            color="rgba(255,255,255,0.65)"
            meterLevel={state === 'recording' ? meterLevel : undefined}
          />
        </View>
        <View className="items-center gap-1" style={{ opacity: state === 'paused' ? 0 : 1 }}>
          <Text className="text-[16px] font-medium text-white/90">{t('record.offlineTitle')}</Text>
          <Text className="text-[14px] text-white/55">{t('record.offlineSubtitle')}</Text>
        </View>
      </View>

      <RecordScreenControls
        state={state}
        onPauseResume={handlePauseResume}
        onDonePress={handleDonePress}
      />

      <SaveRecordModal
        visible={showSaveModal}
        title={title}
        elapsed={elapsed}
        elapsedMs={elapsedMs}
        audioPath={audioPathRef.current}
        onTitleChange={setTitle}
        onCancel={handleSaveCancel}
        onSave={handleSaveConfirm}
        onSaveComplete={handleSaveComplete}
      />
    </View>
  );
};
