import { useNavigation } from '@react-navigation/native';
import { Check, Download, Smartphone, Trash2, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { WhisperModelId } from '@/entities/settings';
import {
  useSettingsStore,
  useWhisperModelCompatibility,
  WHISPER_MODELS,
} from '@/entities/settings';
import { useModelManager } from '@/features/model-manager';
import { getModelFileSizeFormatted } from '@/features/model-manager';
import { getColors } from '@/shared/config';
import { ScreenHeader } from '@/shared/ui';

const ACCURACY_LABEL: Record<string, string> = {
  low: 'Базовое',
  medium: 'Хорошее',
  high: 'Высокое',
  very_high: 'Отличное',
};

const SPEED_LABEL: Record<string, string> = {
  fast: 'Быстро',
  medium: 'Средне',
  slow: 'Медленно',
  very_slow: 'Очень медленно',
};

const SPEED_COLOR: Record<string, string> = {
  fast: '#10b981',
  medium: '#f59e0b',
  slow: '#ef4444',
  very_slow: '#ef4444',
};

const getCardRadiusClass = (index: number, total: number): string => {
  const isFirst = index === 0;
  const isLast = index === total - 1;

  if (isFirst && isLast) {
    return 'rounded-2xl';
  }

  if (isFirst) {
    return 'rounded-t-2xl';
  }

  if (isLast) {
    return 'rounded-b-2xl';
  }

  return '';
};

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
      {
        text: 'Скачать',
        onPress: () => {
          startDownload(id);
        },
      },
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
      if (model) {
        handleDownload(id, model.sizeMb);
      }
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
          {WHISPER_MODELS.map((model, index) => {
            const isSelected = model.id === selectedWhisperModel;
            const status = whisperModelStatuses[model.id] ?? 'not_downloaded';
            const isDownloaded = status === 'downloaded';
            const isDownloading = status === 'downloading';
            const isError = status === 'error';
            const isLast = index === WHISPER_MODELS.length - 1;
            const displaySize = realSizes[model.id] ?? model.sizeLabel;

            const borderStyle = !isLast
              ? { borderBottomWidth: 1, borderBottomColor: color.border.default }
              : {};
            const radiusClass = getCardRadiusClass(index, WHISPER_MODELS.length);

            return (
              <TouchableOpacity
                key={model.id}
                onPress={() => handleSelect(model.id)}
                activeOpacity={0.7}
                className={`px-4 py-4 ${radiusClass}`}
                style={[{ backgroundColor: color.background.card }, borderStyle]}
              >
                <View className="flex-row items-center justify-between">
                  <View className="mr-3 flex-1">
                    <View className="mb-1 flex-row items-center gap-2">
                      <Text
                        className="text-[16px] font-semibold"
                        style={{ color: color.text.primary }}
                      >
                        Whisper {model.name}
                      </Text>
                      <View
                        className="rounded-full px-2 py-0.5"
                        style={{ backgroundColor: color.background.tertiary }}
                      >
                        <Text className="text-[12px]" style={{ color: color.text.secondary }}>
                          {displaySize}
                        </Text>
                      </View>
                    </View>
                    <Text
                      className="mb-1.5 text-[14px] leading-5"
                      style={{ color: color.text.secondary }}
                    >
                      {model.description}
                    </Text>
                    <View className="flex-row items-center gap-3">
                      <Text className="text-[14px]" style={{ color: color.text.secondary }}>
                        Качество: {ACCURACY_LABEL[model.accuracy]}
                      </Text>
                      <View className="flex-row items-center gap-1">
                        <View
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: SPEED_COLOR[model.speed] }}
                        />
                        <Text className="text-[14px]" style={{ color: color.text.secondary }}>
                          {SPEED_LABEL[model.speed]}
                        </Text>
                      </View>
                    </View>
                    {compatibility && (
                      <View className="mt-1.5 flex-row items-center gap-2">
                        <Smartphone
                          size={14}
                          color={
                            compatibility[model.id].isCompatible ? '#10b981' : color.accent.delete
                          }
                          strokeWidth={2}
                        />
                        <Text
                          className="flex-1 text-[14px]"
                          style={{
                            color: compatibility[model.id].isCompatible
                              ? '#10b981'
                              : color.accent.delete,
                          }}
                        >
                          {compatibility[model.id].isCompatible
                            ? 'Совместимо с устройством'
                            : compatibility[model.id].reason}
                        </Text>
                      </View>
                    )}
                    {isDownloading ? (
                      <TouchableOpacity
                        className="mt-2"
                        onPress={() => cancelDownload(model.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text className="text-[13px]" style={{ color: color.text.secondary }}>
                          Отмена
                        </Text>
                      </TouchableOpacity>
                    ) : isError ? (
                      <Text
                        className="mt-1.5 text-[14px] font-medium"
                        style={{ color: color.accent.delete }}
                      >
                        Ошибка загрузки — нажмите для повтора
                      </Text>
                    ) : !isDownloaded ? (
                      <Text className="mt-1.5 text-[14px]" style={{ color: color.text.secondary }}>
                        Не скачана — нажмите для загрузки
                      </Text>
                    ) : null}
                  </View>

                  <View className="items-center gap-2">
                    {isDownloaded && isSelected ? (
                      <View
                        className="h-6 w-6 items-center justify-center rounded-full"
                        style={{ backgroundColor: color.accent.primary }}
                      >
                        <Check size={14} color="#ffffff" strokeWidth={2.5} />
                      </View>
                    ) : isDownloaded ? (
                      <View
                        className="h-6 w-6 rounded-full"
                        style={{ borderWidth: 2, borderColor: color.border.default }}
                      />
                    ) : (
                      <View
                        className="h-8 w-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: color.background.tertiary }}
                      >
                        <Download size={16} color={color.accent.primary} strokeWidth={2} />
                      </View>
                    )}

                    {isDownloaded && (
                      <TouchableOpacity
                        onPress={() => handleDelete(model.id)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        className="h-7 w-7 items-center justify-center rounded-full"
                        style={{ backgroundColor: color.background.tertiary }}
                      >
                        <Trash2 size={14} color={color.accent.delete} strokeWidth={2} />
                      </TouchableOpacity>
                    )}

                    {isError && (
                      <View
                        className="h-8 w-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: color.background.tertiary }}
                      >
                        <X size={16} color={color.accent.delete} strokeWidth={2} />
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};
