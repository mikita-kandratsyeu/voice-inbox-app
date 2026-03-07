import { useNavigation } from '@react-navigation/native';
import { Bot, BrainCircuit, Clock, FileText, Mic, Mic2, Trash2, Type } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRecordStore } from '@/entities/record';
import { useSettingsStore, WHISPER_MODELS } from '@/entities/settings';
import { getColors } from '@/shared/config';
import { ScreenHeader, SettingsRow, SettingsSection } from '@/shared/ui';

type StorageStats = {
  audioMb: number;
  transcriptKb: number;
  cacheKb: number;
  totalMb: number;
};

const MOCK_STORAGE: StorageStats = {
  audioMb: 42.7,
  transcriptKb: 380,
  cacheKb: 1200,
  totalMb: 44.5,
};

const formatModelSize = (mb: number): string => {
  if (mb >= 1000) {
    return `${(mb / 1000).toFixed(1)} ГБ`;
  }

  return `${mb} МБ`;
};

const StorageBar = ({
  audioMb,
  transcriptKb,
  cacheKb,
  modelsMb,
  totalMb,
  color,
}: StorageStats & { modelsMb: number; color: ReturnType<typeof getColors> }) => {
  const audioFrac = audioMb / totalMb;
  const transcriptFrac = transcriptKb / 1024 / totalMb;
  const cacheFrac = cacheKb / 1024 / totalMb;
  const modelsFrac = modelsMb / totalMb;

  return (
    <View>
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-[15px] font-semibold" style={{ color: color.text.primary }}>
          Использовано
        </Text>
        <Text className="text-[15px] font-semibold" style={{ color: color.text.primary }}>
          {totalMb >= 1000 ? `${(totalMb / 1000).toFixed(1)} ГБ` : `${totalMb.toFixed(1)} МБ`}
        </Text>
      </View>
      <View
        className="mb-4 h-3 overflow-hidden rounded-full flex-row"
        style={{ backgroundColor: color.background.tertiary }}
      >
        <View style={{ flex: audioFrac, backgroundColor: color.accent.primary }} />
        <View style={{ flex: transcriptFrac, backgroundColor: color.accent.transcript }} />
        <View style={{ flex: cacheFrac, backgroundColor: color.accent.cache }} />
        {modelsFrac > 0 && (
          <View style={{ flex: modelsFrac, backgroundColor: color.accent.success }} />
        )}
      </View>
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: color.accent.primary }}
            />
            <Text className="text-[13px]" style={{ color: color.text.secondary }}>
              Аудиозаписи
            </Text>
          </View>
          <Text className="text-[13px]" style={{ color: color.text.primary }}>
            {audioMb.toFixed(1)} МБ
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: color.accent.transcript }}
            />
            <Text className="text-[13px]" style={{ color: color.text.secondary }}>
              Транскрипты
            </Text>
          </View>
          <Text className="text-[13px]" style={{ color: color.text.primary }}>
            {transcriptKb} КБ
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: color.accent.cache }}
            />
            <Text className="text-[13px]" style={{ color: color.text.secondary }}>
              Кэш
            </Text>
          </View>
          <Text className="text-[13px]" style={{ color: color.text.primary }}>
            {cacheKb} КБ
          </Text>
        </View>
        {modelsMb > 0 && (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: color.accent.success }}
              />
              <Text className="text-[13px]" style={{ color: color.text.secondary }}>
                Whisper модели
              </Text>
            </View>
            <Text className="text-[13px]" style={{ color: color.text.primary }}>
              {formatModelSize(modelsMb)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export const StorageDetailsScreen = () => {
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const records = useRecordStore((s) => s.records);
  const deleteRecord = useRecordStore((s) => s.deleteRecord);
  const whisperModelStatuses = useSettingsStore((s) => s.whisperModelStatuses);
  const [stats] = useState<StorageStats>(MOCK_STORAGE);

  const audioCount = records.filter((r) => r.audioPath).length;
  const withTranscript = records.filter((r) => r.transcript && r.transcript.length > 0).length;
  const processedByAI = records.filter((r) => r.aiStatus === 'done').length;

  const downloadedModels = WHISPER_MODELS.filter(
    (m) => (whisperModelStatuses[m.id] ?? 'not_downloaded') === 'downloaded',
  );
  const modelsMb = downloadedModels.reduce((sum, m) => sum + m.sizeMb, 0);
  const totalMb = stats.totalMb + modelsMb;

  const handleClearCache = () => {
    Alert.alert('Очистить кэш', 'Временные файлы будут удалены. Продолжить?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Очистить', onPress: () => Alert.alert('Готово', 'Кэш очищен') },
    ]);
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Удалить все данные',
      'Все записи, транскрипты и аудио будут удалены безвозвратно. Продолжить?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            for (const r of records) {
              await deleteRecord(r.id);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title="Офлайн хранилище" color={color} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6 rounded-2xl p-4" style={{ backgroundColor: color.background.card }}>
          <StorageBar {...stats} modelsMb={modelsMb} totalMb={totalMb} color={color} />
        </View>

        <SettingsSection title="Детализация" color={color}>
          <SettingsRow
            label="Аудиозаписи"
            value={`${audioCount} файлов · ${stats.audioMb.toFixed(1)} МБ`}
            color={color}
            leftIcon={<Mic2 size={20} color={color.accent.primary} strokeWidth={1.8} />}
            showChevron={false}
            isFirst
          />
          <SettingsRow
            label="Транскрипты и данные"
            value={`${stats.transcriptKb} КБ`}
            color={color}
            leftIcon={<Type size={20} color={color.accent.transcript} strokeWidth={1.8} />}
            showChevron={false}
            isLast={downloadedModels.length === 0}
          />
          {downloadedModels.length > 0 && (
            <>
              {downloadedModels.map((model, index) => (
                <SettingsRow
                  key={model.id}
                  label={`Whisper ${model.name}`}
                  value={formatModelSize(model.sizeMb)}
                  color={color}
                  leftIcon={
                    <BrainCircuit size={20} color={color.accent.success} strokeWidth={1.8} />
                  }
                  showChevron={false}
                  isLast={index === downloadedModels.length - 1}
                />
              ))}
            </>
          )}
        </SettingsSection>

        <SettingsSection title="Статистика" color={color}>
          <SettingsRow
            label="Всего записей"
            value={String(records.length)}
            color={color}
            leftIcon={<Mic size={20} color={color.accent.primary} strokeWidth={1.8} />}
            showChevron={false}
            isFirst
          />
          <SettingsRow
            label="С аудио"
            value={String(audioCount)}
            color={color}
            leftIcon={<Clock size={20} color={color.accent.success} strokeWidth={1.8} />}
            showChevron={false}
          />
          <SettingsRow
            label="Транскриптов"
            value={String(withTranscript)}
            color={color}
            leftIcon={<FileText size={20} color={color.accent.transcript} strokeWidth={1.8} />}
            showChevron={false}
          />
          <SettingsRow
            label="Обработано ИИ"
            value={String(processedByAI)}
            color={color}
            leftIcon={<Bot size={20} color={color.accent.cache} strokeWidth={1.8} />}
            showChevron={false}
            isLast
          />
        </SettingsSection>

        <SettingsSection title="Управление" color={color}>
          <SettingsRow
            label="Очистить кэш"
            value={`${stats.cacheKb} КБ`}
            color={color}
            leftIcon={<Trash2 size={20} color={color.accent.cache} strokeWidth={1.8} />}
            onPress={handleClearCache}
            isFirst
          />
          <SettingsRow
            label="Удалить все данные"
            color={color}
            leftIcon={<Trash2 size={20} color={color.accent.delete} strokeWidth={1.8} />}
            onPress={handleDeleteAll}
            dangerous
            isLast
          />
        </SettingsSection>
      </ScrollView>
    </View>
  );
};
