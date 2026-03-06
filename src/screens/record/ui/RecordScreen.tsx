import { useNavigation } from '@react-navigation/native';
import { Check, Mic, Pause, Play, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { Waveform } from '@/shared/ui';

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

export const RecordScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const addRecord = useRecordStore((s) => s.addRecord);

  const [state, setState] = useState<RecordingState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [title, setTitle] = useState('');

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 5,
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) sheetTranslateY.setValue(dy);
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

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  const handleMicPress = () => {
    startTimer();
    setState('recording');
  };

  const handlePauseResume = () => {
    if (state === 'recording') {
      stopTimer();
      setState('paused');
    } else if (state === 'paused') {
      startTimer();
      setState('recording');
    }
  };

  const handleDonePress = () => {
    stopTimer();
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

  const handleClose = () => {
    stopTimer();
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
      startTimer();
      setState('recording');
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
      createdAt: new Date().toISOString(),
      status: 'unread',
      aiStatus: 'idle',
      transcriptProgress: 0,
      isPinned: false,
      tags: [],
    };

    addRecord(record);
    closeModal(() => navigation.goBack());
  };

  const topStyle = { paddingTop: Math.max(insets.top, 16) };
  const controlsStyle = [styles.controls, { paddingBottom: Math.max(insets.bottom, 32) }];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={ACCENT_BLUE} />

      <View style={[styles.top, topStyle]}>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
          <X size={20} color="#ffffff" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{HEADER_TITLE[state]}</Text>
        <View style={styles.topRight} />
      </View>

      <View style={styles.body}>
        <Text style={styles.timer}>{formatTime(elapsed)}</Text>

        <View style={styles.waveformWrapper}>
          <Waveform isAnimating={state === 'recording'} color="rgba(255,255,255,0.65)" />
        </View>

        {state === 'idle' && (
          <View style={styles.hint}>
            <Text style={styles.hintTitle}>Запись работает оффлайн</Text>
            <Text style={styles.hintSubtitle}>Транскрипция выполнится локально</Text>
          </View>
        )}
      </View>

      <View style={controlsStyle}>
        {state === 'idle' ? (
          <TouchableOpacity onPress={handleMicPress} style={styles.micBtn} activeOpacity={0.85}>
            <Mic size={30} color={ACCENT_BLUE} strokeWidth={2} />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              onPress={handlePauseResume}
              style={styles.pauseBtn}
              activeOpacity={0.8}
            >
              {state === 'paused' ? (
                <Play size={22} color="#ffffff" strokeWidth={2} />
              ) : (
                <Pause size={22} color="#ffffff" strokeWidth={2} />
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleDonePress} style={styles.doneBtn} activeOpacity={0.85}>
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
        <Animated.View style={[styles.modalOverlay, { opacity: overlayOpacity }]}>
          <TouchableWithoutFeedback
            onPress={() => {
              Keyboard.dismiss();
              handleSaveCancel();
            }}
          >
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKav}
          >
            <Animated.View
              style={[
                styles.modalSheet,
                {
                  paddingBottom: Math.max(insets.bottom, 24),
                  transform: [{ translateY: sheetTranslateY }],
                },
              ]}
            >
              <View style={styles.modalHandleRow} {...panResponder.panHandlers}>
                <View style={styles.modalHandle} />
              </View>

              <Text style={styles.modalTitle}>Сохранить запись</Text>

              <TextInput
                style={styles.input}
                placeholder="Название записи"
                placeholderTextColor="#b0b8c8"
                value={title}
                onChangeText={setTitle}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveConfirm}
              />

              <Text style={styles.durationLabel}>Длительность: {formatTime(elapsed)}</Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleSaveCancel}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>Отмена</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveConfirm}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveBtnText}>Сохранить</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ACCENT_BLUE,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  topRight: {
    width: 36,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 36,
  },
  timer: {
    color: '#ffffff',
    fontSize: 72,
    fontWeight: '300',
    letterSpacing: -2,
  },
  waveformWrapper: {
    width: '100%',
    paddingHorizontal: 8,
  },
  hint: {
    alignItems: 'center',
    gap: 4,
  },
  hintTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '500',
  },
  hintSubtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingTop: 16,
  },
  micBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: DONE_BTN_BG,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  pauseBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PAUSE_BTN_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: DONE_BTN_BG,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalKav: {
    width: '100%',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 0,
    gap: 16,
  },
  modalHandleRow: {
    paddingTop: 12,
    paddingBottom: 4,
    alignItems: 'center',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e0e4ed',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  input: {
    borderWidth: 1.5,
    borderColor: ACCENT_BLUE,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1a1a2e',
    backgroundColor: '#f5f7ff',
  },
  durationLabel: {
    fontSize: 13,
    color: '#8a93a8',
    marginTop: -4,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f0f2f8',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4a5568',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: ACCENT_BLUE,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
