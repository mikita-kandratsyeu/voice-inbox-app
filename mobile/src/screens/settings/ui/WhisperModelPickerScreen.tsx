import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { WhisperModelId } from '@/entities/settings';
import {
  useSettingsStore,
  useWhisperModelCompatibility,
  WHISPER_MODELS,
} from '@/entities/settings';
import { getModelFileSizeFormatted, useModelManager } from '@/features/model-manager';
import { getColors } from '@/shared/config';
import { ScreenHeader } from '@/shared/ui';

import { WhisperModelCard } from './WhisperModelCard';

export const WhisperModelPickerScreen = () => {
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);
  const whisperModelStatuses = useSettingsStore((s) => s.whisperModelStatuses);
  const setWhisperModel = useSettingsStore((s) => s.setWhisperModel);

  const compatibility = useWhisperModelCompatibility();
  const { startDownload, cancelDownload, removeModel } = useModelManager();

  const [realSizes, setRealSizes] = useState<Partial<Record<WhisperModelId, string>>>({});

  const refreshRealSizes = useCallback(async () => {
    const entries = await Promise.all(
      WHISPER_MODELS.map(async (m) => {
        const status = whisperModelStatuses[m.id] ?? 'not_downloaded';
        if (status !== 'downloaded') return [m.id, null] as const;
        const size = await getModelFileSizeFormatted(m.id);
        return [m.id, size] as const;
      }),
    );

    const updated: Partial<Record<WhisperModelId, string>> = {};
    for (const [id, size] of entries) {
      if (size) updated[id] = size;
    }
    setRealSizes(updated);
  }, [whisperModelStatuses]);

  useEffect(() => {
    refreshRealSizes();
  }, [refreshRealSizes]);

  const handleDownload = (id: WhisperModelId, sizeMb: number) => {
    Alert.alert('Скачать модель', `Для загрузки потребуется ~${sizeMb} МБ. Продолжить?`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Скачать', onPress: () => startDownload(id) },
    ]);
  };

  const handleDelete = (id: WhisperModelId) => {
    const model = WHISPER_MODELS.find((m) => m.id === id);
    Alert.alert(
      'Удалить модель',
      `Файл модели Whisper ${model?.name ?? ''} будет удалён с устройства. Продолжить?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            await removeModel(id);
            await refreshRealSizes();
          },
        },
      ],
    );
  };

  const handleSelect = (id: WhisperModelId) => {
    const status = whisperModelStatuses[id] ?? 'not_downloaded';
    if (status === 'downloading') return;
    if (status !== 'downloaded') {
      const model = WHISPER_MODELS.find((m) => m.id === id);
      if (model) handleDownload(id, model.sizeMb);
      return;
    }
    setWhisperModel(id);
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title="Модель транскрипции" color={color} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-4 text-[14px] leading-5" style={{ color: color.text.secondary }}>
          Whisper — офлайн-модель транскрипции от OpenAI. Модели хранятся на устройстве. Большие
          модели дают лучшее качество, но требуют больше памяти и работают медленнее.
        </Text>
        <View className="overflow-hidden rounded-2xl">
          {WHISPER_MODELS.map((model, index) => (
            <WhisperModelCard
              key={model.id}
              model={model}
              index={index}
              total={WHISPER_MODELS.length}
              status={whisperModelStatuses[model.id] ?? 'not_downloaded'}
              isSelected={model.id === selectedWhisperModel}
              displaySize={realSizes[model.id] ?? model.sizeLabel}
              compatibility={compatibility ? compatibility[model.id] : null}
              color={color}
              onPress={handleSelect}
              onDelete={handleDelete}
              onCancelDownload={cancelDownload}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};
