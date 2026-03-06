import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import { Check, Mic, Pause, Play, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  PermissionsAndroid,
  Platform,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import AudioRecorderPlayer, { type RecordBackType } from 'react-native-audio-recorder-player';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { Button, Waveform } from '@/shared/ui';

const ACCENT_BLUE = '#3d7ef6';
const PAUSE_BTN_BG = 'rgba(255,255,255,0.18)';
const DONE_BTN_BG = '#ffffff';

type RecordingState = 'idle' | 'recording' | 'paused';

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const generateId = () => `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const HEADER_TITLE: Record<RecordingState, string> = {
  idle: 'Готово к записи',
  recording: 'Запись...',
  paused: 'Пауза',
};

const audioRecorderPlayer = AudioRecorderPlayer;

const requestMicPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Разрешение на запись',
          message: 'Приложению нужен доступ к микрофону для записи голоса.',
          buttonPositive: 'Разрешить',
          buttonNegative: 'Отмена',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  return true;
};

export const RecordScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const addRecord = useRecordStore((s) => s.addRecord);

  const [state, setState] = useState<RecordingState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [title, setTitle] = useState('');
  const [meterLevel, setMeterLevel] = useState<number | undefined>(undefined);

  const audioPathRef = useRef<string | null>(null);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 5,
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) {
          sheetTranslateY.setValue(dy);
        }
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 80 || vy > 0.5) {
          Animated.parallel([
            Animated.timing(overlayOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(sheetTranslateY, {
              toValue: 400,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setShowSaveModal(false);
          });
        } else {
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            speed: 20,
            bounciness: 4,
          }).start();
        }
      },
    }),
  ).current;

  const elapsedRef = useRef(0);

  const startRecording = useCallback(async () => {
    const hasPermission = await requestMicPermission();

    if (!hasPermission) {
      return;
    }

    try {
      audioRecorderPlayer.setSubscriptionDuration(0.1);

      const path = await audioRecorderPlayer.startRecorder(undefined, undefined, true);
      audioPathRef.current = path;

      audioRecorderPlayer.addRecordBackListener((e: RecordBackType) => {
        const secs = Math.floor(e.currentPosition / 1000);
        elapsedRef.current = secs;
        setElapsed(secs);

        if (e.currentMetering !== undefined) {
          setMeterLevel(e.currentMetering);
        }
      });

      setState('recording');
    } catch (err) {
      console.warn('[RecordScreen] startRecorder failed:', err);
    }
  }, []);

  const pauseRecording = useCallback(async () => {
    try {
      await audioRecorderPlayer.pauseRecorder();
      audioRecorderPlayer.removeRecordBackListener();

      setMeterLevel(undefined);
      setState('paused');
    } catch (err) {
      console.warn('[RecordScreen] pauseRecorder failed:', err);
    }
  }, []);

  const resumeRecording = useCallback(async () => {
    try {
      audioRecorderPlayer.setSubscriptionDuration(0.1);
      await audioRecorderPlayer.resumeRecorder();

      audioRecorderPlayer.addRecordBackListener((e: RecordBackType) => {
        const secs = Math.floor(e.currentPosition / 1000);
        elapsedRef.current = secs;
        setElapsed(secs);

        if (e.currentMetering !== undefined) {
          setMeterLevel(e.currentMetering);
        }
      });

      setState('recording');
    } catch (err) {
      console.warn('[RecordScreen] resumeRecorder failed:', err);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      audioRecorderPlayer.removeRecordBackListener();
      setMeterLevel(undefined);

      const result = await audioRecorderPlayer.stopRecorder();

      if (audioPathRef.current === null) {
        audioPathRef.current = result;
      }
      return audioPathRef.current;
    } catch (err) {
      console.warn('[RecordScreen] stopRecorder failed:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    return () => {
      audioRecorderPlayer.removeRecordBackListener();
      audioRecorderPlayer.stopRecorder().catch(() => {});
    };
  }, []);

  const handleMicPress = () => {
    startRecording();
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
    setState('paused');
    setTitle('');
    overlayOpacity.setValue(0);
    sheetTranslateY.setValue(300);
    setShowSaveModal(true);
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 18,
        bounciness: 4,
      }),
    ]).start();
  };

  const handleClose = async () => {
    await stopRecording();
    navigation.goBack();
  };

  const closeModal = (cb: () => void) => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 300,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSaveModal(false);
      cb();
    });
  };

  const handleSaveCancel = () => {
    closeModal(() => {
      resumeRecording();
    });
  };

  const handleSaveConfirm = () => {
    const record: VoiceRecord = {
      id: generateId(),
      title: title.trim() || 'Новая запись',
      transcript: '',
      transcriptSegments: [],
      summary: '',
      tasks: [],
      duration: formatTime(elapsed),
      createdAt: dayjs().toISOString(),
      status: 'unread',
      aiStatus: 'idle',
      transcriptProgress: 0,
      isPinned: false,
      tags: [],
      audioPath: audioPathRef.current ?? undefined,
    };

    addRecord(record);
    closeModal(() => navigation.goBack());
  };

  const topStyle = { paddingTop: Math.max(insets.top, 16) };
  const controlsPaddingBottom = { paddingBottom: Math.max(insets.bottom, 32) };

  return (
    <View className="flex-1" style={{ backgroundColor: ACCENT_BLUE }}>
      <StatusBar barStyle="light-content" backgroundColor={ACCENT_BLUE} />

      <View className="flex-row items-center justify-between px-5 pb-2" style={topStyle}>
        <Button
          iconOnly
          size="sm"
          icon={<X size={20} color="#ffffff" strokeWidth={2.5} />}
          onPress={handleClose}
          activeOpacity={0.7}
          containerStyle={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        />
        <Text className="text-base font-semibold tracking-wide text-white">
          {HEADER_TITLE[state]}
        </Text>
        <View className="w-9" />
      </View>
      <View className="flex-1 items-center justify-center gap-9 px-6">
        <Text className="text-[72px] font-light tracking-tight text-white">
          {formatTime(elapsed)}
        </Text>
        <View className="w-full px-2">
          <Waveform
            isAnimating={state === 'recording'}
            color="rgba(255,255,255,0.65)"
            meterLevel={state === 'recording' ? meterLevel : undefined}
          />
        </View>
        {state === 'idle' && (
          <View className="items-center gap-1">
            <Text className="text-[15px] font-medium text-white/90">Запись работает оффлайн</Text>
            <Text className="text-[13px] text-white/55">Транскрипция выполнится локально</Text>
          </View>
        )}
      </View>
      <View
        className="flex-row items-center justify-center gap-6 pt-4"
        style={controlsPaddingBottom}
      >
        {state === 'idle' ? (
          <TouchableOpacity
            onPress={handleMicPress}
            className="h-[72px] w-[72px] items-center justify-center rounded-full shadow-lg"
            style={{ backgroundColor: DONE_BTN_BG }}
            activeOpacity={0.85}
          >
            <Mic size={30} color={ACCENT_BLUE} strokeWidth={2} />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              onPress={handlePauseResume}
              className="h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: PAUSE_BTN_BG }}
              activeOpacity={0.8}
            >
              {state === 'paused' ? (
                <Play size={22} color="#ffffff" strokeWidth={2} />
              ) : (
                <Pause size={22} color="#ffffff" strokeWidth={2} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDonePress}
              className="h-[68px] w-[68px] items-center justify-center rounded-full shadow-lg"
              style={{ backgroundColor: DONE_BTN_BG }}
              activeOpacity={0.85}
            >
              <Check size={26} color={ACCENT_BLUE} strokeWidth={2.5} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <Modal
        visible={showSaveModal}
        transparent
        animationType="none"
        onRequestClose={handleSaveCancel}
        statusBarTranslucent
      >
        <Animated.View
          className="flex-1 justify-end"
          style={{ opacity: overlayOpacity, backgroundColor: 'rgba(0,0,0,0.35)' }}
        >
          <TouchableWithoutFeedback
            onPress={() => {
              Keyboard.dismiss();
              handleSaveCancel();
            }}
          >
            <View className="absolute inset-0" />
          </TouchableWithoutFeedback>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="w-full"
          >
            <Animated.View
              className="gap-4 rounded-t-3xl bg-white px-6"
              style={{
                paddingBottom: Math.max(insets.bottom, 24),
                transform: [{ translateY: sheetTranslateY }],
              }}
            >
              <View className="items-center pb-1 pt-3" {...panResponder.panHandlers}>
                <View className="h-1 w-9 rounded-full bg-gray-200" />
              </View>

              <Text className="text-lg font-bold text-gray-900">Сохранить запись</Text>
              <TextInput
                className="rounded-xl border-2 px-4 py-3 text-[15px]"
                style={{
                  borderColor: ACCENT_BLUE,
                  color: '#1a1a2e',
                  backgroundColor: '#f5f7ff',
                }}
                placeholder="Название записи"
                placeholderTextColor="#b0b8c8"
                value={title}
                onChangeText={setTitle}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveConfirm}
              />
              <Text className="-mt-1 text-[13px] text-gray-500">
                Длительность: {formatTime(elapsed)}
              </Text>
              <View className="mt-1 flex-row gap-3">
                <Button
                  variant="secondary"
                  label="Отмена"
                  onPress={handleSaveCancel}
                  activeOpacity={0.8}
                  fullWidth
                  containerStyle={{ backgroundColor: '#f3f4f6', borderRadius: 12 }}
                />
                <Button
                  variant="primary"
                  label="Сохранить"
                  onPress={handleSaveConfirm}
                  activeOpacity={0.85}
                  fullWidth
                  containerStyle={{ backgroundColor: ACCENT_BLUE, borderRadius: 12 }}
                />
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>
    </View>
  );
};
