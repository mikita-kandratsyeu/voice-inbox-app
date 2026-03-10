import dayjs from 'dayjs';
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { VoiceRecord } from '@/entities/record';
import { getColors } from '@/shared/config';
import { formatTime } from '@/shared/lib';
import { Button } from '@/shared/ui';

import { generateRecordId } from '../lib/generateRecordId';

type SaveRecordModalProps = {
  visible: boolean;
  title: string;
  elapsed: number;
  elapsedMs: number;
  audioPath: string | null;
  onTitleChange: (text: string) => void;
  onCancel: () => void;
  onSave: (record: VoiceRecord) => Promise<void> | void;
  onSaveComplete?: () => void;
};

export const SaveRecordModal = ({
  visible,
  title,
  elapsed,
  elapsedMs,
  audioPath,
  onTitleChange,
  onCancel,
  onSave,
  onSaveComplete,
}: SaveRecordModalProps) => {
  const { t } = useTranslation();
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const c = getColors(scheme);

  const insets = useSafeAreaInsets();

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
            onCancel();
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
    ]).start(cb);
  };

  const handleCancel = () => {
    closeModal(onCancel);
  };

  const handleSave = async () => {
    const record: VoiceRecord = {
      id: generateRecordId(),
      title: title.trim() || t('record.newRecord'),
      transcript: '',
      transcriptSegments: [],
      summary: '',
      tasks: [],
      duration: formatTime(elapsed),
      durationMs: Math.round(elapsedMs),
      createdAt: dayjs().toISOString(),
      status: 'unread',
      aiStatus: 'idle',
      transcriptProgress: 0,
      isPinned: false,
      tags: [],
      audioPath: audioPath?.startsWith('file://') ? audioPath.slice(7) : (audioPath ?? undefined),
    };

    await onSave(record);
    closeModal(() => onSaveComplete?.());
  };

  React.useEffect(() => {
    if (visible) {
      overlayOpacity.setValue(0);
      sheetTranslateY.setValue(300);
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- overlayOpacity/sheetTranslateY are refs, stable
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <Animated.View
        className="flex-1 justify-end"
        style={{ opacity: overlayOpacity, backgroundColor: 'rgba(0,0,0,0.35)' }}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            Keyboard.dismiss();
            handleCancel();
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

            <Text className="text-lg font-bold text-gray-900">{t('record.saveModalTitle')}</Text>
            <TextInput
              className="rounded-xl border-2 px-4 py-3 text-[16px]"
              style={{
                borderColor: c.accent.primary,
                color: '#1a1a2e',
                backgroundColor: '#f5f7ff',
              }}
              placeholder={t('record.titlePlaceholder')}
              placeholderTextColor="#b0b8c8"
              value={title}
              onChangeText={onTitleChange}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <Text className="-mt-1 text-[14px] text-gray-500">
              {t('record.duration', { time: formatTime(elapsed) })}
            </Text>
            <View className="mt-1 flex-row gap-3">
              <Button
                variant="secondary"
                label={t('common.cancel')}
                onPress={handleCancel}
                activeOpacity={0.8}
                fullWidth
                containerStyle={{ backgroundColor: '#f3f4f6', borderRadius: 12 }}
              />
              <Button
                variant="primary"
                label={t('common.save')}
                onPress={handleSave}
                activeOpacity={0.85}
                fullWidth
                containerStyle={{ backgroundColor: c.accent.primary, borderRadius: 12 }}
              />
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};
