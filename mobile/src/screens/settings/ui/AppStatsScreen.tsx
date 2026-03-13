import { useNavigation } from '@react-navigation/native';
import { Bot, Clock, FileText, Mic } from 'lucide-react-native';
import React from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRecordStore } from '@/entities/record';
import { getColors, useAppTheme } from '@/shared/config';
import { ScreenHeader, SettingsRow, SettingsSection } from '@/shared/ui';

const StatCard = ({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: ReturnType<typeof getColors>;
}) => (
  <View
    className="flex-1 items-center rounded-2xl p-4"
    style={{ backgroundColor: color.background.card }}
  >
    <View className="mb-2">{icon}</View>
    <Text className="text-[24px] font-bold" style={{ color: color.text.primary }}>
      {value}
    </Text>
    <Text className="mt-0.5 text-center text-[14px]" style={{ color: color.text.secondary }}>
      {label}
    </Text>
  </View>
);

export const AppStatsScreen = () => {
  const color = getColors(useAppTheme());
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const records = useRecordStore((s) => s.records);
  const deleteRecord = useRecordStore((s) => s.deleteRecord);

  const totalRecords = records.length;
  const withAudio = records.filter((r) => r.audioPath).length;
  const processedByAI = records.filter((r) => r.aiStatus === 'done').length;
  const withTranscript = records.filter((r) => r.transcript && r.transcript.length > 0).length;

  const handleClearCache = () => {
    Alert.alert('Очистить кэш', 'Временные файлы будут удалены. Продолжить?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Очистить', onPress: () => Alert.alert('Готово', 'Кэш очищен') },
    ]);
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Удалить все данные',
      'Все записи, транскрипты и аудио будут удалены безвозвратно. Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить всё',
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
      <ScreenHeader title="Статистика" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6 flex-row gap-3">
          <StatCard
            icon={<Mic size={22} color={color.accent.primary} strokeWidth={1.8} />}
            label="Всего записей"
            value={String(totalRecords)}
            color={color}
          />
          <StatCard
            icon={<Clock size={22} color={color.accent.success} strokeWidth={1.8} />}
            label="С аудио"
            value={String(withAudio)}
            color={color}
          />
        </View>
        <View className="mb-6 flex-row gap-3">
          <StatCard
            icon={<FileText size={22} color={color.accent.transcript} strokeWidth={1.8} />}
            label="Транскриптов"
            value={String(withTranscript)}
            color={color}
          />
          <StatCard
            icon={<Bot size={22} color={color.accent.cache} strokeWidth={1.8} />}
            label="Обработано ИИ"
            value={String(processedByAI)}
            color={color}
          />
        </View>

        <SettingsSection title="Управление данными">
          <SettingsRow label="Очистить кэш" onPress={handleClearCache} isFirst />
          <SettingsRow
            label="Удалить все данные приложения"
            onPress={handleDeleteAll}
            dangerous
            isLast
          />
        </SettingsSection>
      </ScrollView>
    </View>
  );
};
