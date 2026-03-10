import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { PanResponder, StatusBar, Text, View } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { formatTimeWithMs } from '@/shared/lib';
import { Waveform } from '@/shared/ui';

import { ACCENT_BLUE } from '../config';
import { useRecording } from '../model/useRecording';
import { RecordScreenControls } from './RecordScreenControls';
import { RecordScreenHeader } from './RecordScreenHeader';
import { SaveRecordModal } from './SaveRecordModal';

export const RecordScreen = () => {
  const navigation = useNavigation();
  const addRecord = useRecordStore((s) => s.addRecord);
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
  } = useRecording();

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
    await stopRecording();

    setTitle('');
    setShowSaveModal(true);
  };

  const handleSaveCancel = () => {
    setShowSaveModal(false);
    resumeRecording();
  };

  const handleSaveConfirm = (record: VoiceRecord) => {
    addRecord(record);
  };

  const handleSaveComplete = () => {
    setShowSaveModal(false);
    navigation.goBack();
  };

  const swipeDownResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 5,
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 80 || vy > 0.5) {
          handleClose();
        }
      },
    }),
  ).current;

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: ACCENT_BLUE }}
      {...swipeDownResponder.panHandlers}
    >
      <StatusBar barStyle="light-content" backgroundColor={ACCENT_BLUE} />

      <RecordScreenHeader state={state} onClose={handleClose} />

      <View className="flex-1 items-center justify-center gap-9 px-6">
        <View className="flex-row items-baseline">
          <Text className="text-[72px] font-light tracking-tight text-white">
            {formatTimeWithMs(elapsedMs).main}
          </Text>
          <Text className="ml-0.5 text-[36px] font-light tracking-tight text-white/85">
            {formatTimeWithMs(elapsedMs).ms}
          </Text>
        </View>
        <View className="w-full px-2">
          <Waveform
            isAnimating={state === 'recording'}
            color="rgba(255,255,255,0.65)"
            meterLevel={state === 'recording' ? meterLevel : undefined}
          />
        </View>
        {(state === 'idle' || state === 'recording') && (
          <View className="items-center gap-1">
            <Text className="text-[16px] font-medium text-white/90">Запись работает оффлайн</Text>
            <Text className="text-[14px] text-white/55">Транскрипция выполнится локально</Text>
          </View>
        )}
      </View>

      <RecordScreenControls
        state={state}
        onMicPress={startRecording}
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
