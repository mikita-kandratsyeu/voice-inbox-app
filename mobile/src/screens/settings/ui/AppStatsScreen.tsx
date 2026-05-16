import { useNavigation } from '@react-navigation/native';
import { Bot, Clock, FileText, Mic } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import { useRecordStore } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import { useIsTablet } from '@/shared/lib';
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
  color: Colors;
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
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isTablet = useIsTablet();

  const records = useRecordStore((s) => s.records);
  const purgeRecordPermanently = useRecordStore((s) => s.purgeRecordPermanently);

  const totalRecords = records.length;
  const withAudio = records.filter((r) => r.audioPath).length;
  const processedByAI = records.filter((r) => r.aiStatus === 'done').length;
  const withTranscript = records.filter((r) => r.transcript && r.transcript.length > 0).length;

  const handleClearCache = () => {
    Alert.alert(t('storage.clearCache'), t('storage.clearCacheConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('storage.clear'),
        style: 'destructive',
        onPress: () => Alert.alert(t('common.done'), t('appStats.cacheCleared')),
      },
    ]);
  };

  const handleDeleteAll = () => {
    Alert.alert(t('storage.deleteAllData'), t('storage.deleteAllConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('appStats.deleteAllAction'),
        style: 'destructive',
        onPress: async () => {
          for (const r of records) {
            await purgeRecordPermanently(r.id);
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('appStats.title')} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6 flex-row gap-3">
          <StatCard
            icon={<Mic size={22} color={color.accent.primary} strokeWidth={1.8} />}
            label={t('appStats.totalRecords')}
            value={String(totalRecords)}
            color={color}
          />
          <StatCard
            icon={<Clock size={22} color={color.accent.success} strokeWidth={1.8} />}
            label={t('appStats.withAudio')}
            value={String(withAudio)}
            color={color}
          />
        </View>
        <View className="mb-6 flex-row gap-3">
          <StatCard
            icon={<FileText size={22} color={color.accent.transcript} strokeWidth={1.8} />}
            label={t('appStats.transcripts')}
            value={String(withTranscript)}
            color={color}
          />
          <StatCard
            icon={<Bot size={22} color={color.accent.cache} strokeWidth={1.8} />}
            label={t('appStats.processedByAi')}
            value={String(processedByAI)}
            color={color}
          />
        </View>

        <SettingsSection title={t('appStats.dataManagement')}>
          <SettingsRow label={t('storage.clearCache')} onPress={handleClearCache} isFirst />
          <SettingsRow
            label={t('appStats.deleteAllRow')}
            onPress={handleDeleteAll}
            dangerous
            isLast
          />
        </SettingsSection>
      </ScrollView>
    </View>
  );
};
