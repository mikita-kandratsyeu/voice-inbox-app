import { useNavigation } from '@react-navigation/native';
import { Bot, BrainCircuit, Clock, FileText, Mic, Mic2, Trash2, Type } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRecordStore } from '@/entities/record';
import type { WhisperModelId } from '@/entities/settings';
import { useSettingsStore, WHISPER_MODELS } from '@/entities/settings';
import { getModelFileSizeBytes } from '@/features/model-manager';
import { getColors } from '@/shared/config';
import { clearCache, getStorageStats, type StorageStats } from '@/shared/lib';
import { formatFileSize } from '@/shared/lib/whisper';
import { ScreenHeader, SettingsRow, SettingsSection } from '@/shared/ui';

const StorageBar = ({
  audioMb,
  transcriptKb,
  aiDataKb,
  cacheKb,
  modelsBytes,
  totalMb,
  color,
}: StorageStats & { modelsBytes: number; color: ReturnType<typeof getColors> }) => {
  const { t } = useTranslation();
  const modelsMb = modelsBytes / (1024 * 1024);
  const divisor = totalMb > 0 ? totalMb : 1;
  const audioFrac = audioMb / divisor;
  const transcriptFrac = transcriptKb / 1024 / divisor;
  const cacheFrac = cacheKb / 1024 / divisor;
  const modelsFrac = modelsMb / divisor;

  return (
    <View>
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-[16px] font-semibold" style={{ color: color.text.primary }}>
          {t('storage.used')}
        </Text>
        <Text className="text-[16px] font-semibold" style={{ color: color.text.primary }}>
          {totalMb >= 1000
            ? `${(totalMb / 1000).toFixed(1)} ${t('storage.gb')}`
            : `${totalMb.toFixed(1)} ${t('storage.mb')}`}
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
            <Text className="text-[14px]" style={{ color: color.text.secondary }}>
              {t('storage.audioRecords')}
            </Text>
          </View>
          <Text className="text-[14px]" style={{ color: color.text.primary }}>
            {audioMb.toFixed(1)} МБ
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: color.accent.transcript }}
            />
            <Text className="text-[14px]" style={{ color: color.text.secondary }}>
              {t('storage.transcriptsAndData')}
            </Text>
          </View>
          <Text className="text-[14px]" style={{ color: color.text.primary }}>
            {formatFileSize(transcriptKb * 1024)}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: color.accent.success }}
            />
            <Text className="text-[14px]" style={{ color: color.text.secondary }}>
              {t('storage.aiProcessing')}
            </Text>
          </View>
          <Text className="text-[14px]" style={{ color: color.text.primary }}>
            {formatFileSize(aiDataKb * 1024)}
          </Text>
        </View>
        {modelsBytes > 0 && (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: color.accent.success }}
              />
              <Text className="text-[14px]" style={{ color: color.text.secondary }}>
                {t('storage.whisperModels')}
              </Text>
            </View>
            <Text className="text-[14px]" style={{ color: color.text.primary }}>
              {formatFileSize(modelsBytes)}
            </Text>
          </View>
        )}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: color.accent.cache }}
            />
            <Text className="text-[14px]" style={{ color: color.text.secondary }}>
              {t('storage.cacheLabel')}
            </Text>
          </View>
          <Text className="text-[14px]" style={{ color: color.text.primary }}>
            {formatFileSize(cacheKb * 1024)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const DEFAULT_STATS: StorageStats = {
  audioMb: 0,
  transcriptKb: 0,
  aiDataKb: 0,
  cacheKb: 0,
  totalMb: 0,
};

export const StorageDetailsScreen = () => {
  const { t } = useTranslation();
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const records = useRecordStore((s) => s.records);
  const deleteRecord = useRecordStore((s) => s.deleteRecord);
  const whisperModelStatuses = useSettingsStore((s) => s.whisperModelStatuses);
  const [stats, setStats] = useState<StorageStats>(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [realModelSizes, setRealModelSizes] = useState<Partial<Record<WhisperModelId, number>>>({});

  const downloadedModels = WHISPER_MODELS.filter(
    (m) => (whisperModelStatuses[m.id] ?? 'not_downloaded') === 'downloaded',
  );

  const loadModelSizes = useCallback(async (statuses: typeof whisperModelStatuses) => {
    const downloaded = WHISPER_MODELS.filter(
      (m) => (statuses[m.id] ?? 'not_downloaded') === 'downloaded',
    );
    const entries = await Promise.all(
      downloaded.map(async (m) => {
        const bytes = await getModelFileSizeBytes(m.id);
        return [m.id, bytes] as const;
      }),
    );
    const updated: Partial<Record<WhisperModelId, number>> = {};
    for (const [id, bytes] of entries) {
      updated[id] = bytes;
    }
    setRealModelSizes(updated);
  }, []);

  const refreshStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const paths = records.map((r) => r.audioPath).filter((p): p is string => Boolean(p));
      const s = await getStorageStats(paths, records);
      setStats(s);
    } catch (err) {
      console.warn('[StorageDetails] Failed to load stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [records]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    loadModelSizes(whisperModelStatuses);
  }, [whisperModelStatuses, loadModelSizes]);

  const audioCount = records.filter((r) => r.audioPath).length;
  const withTranscript = records.filter((r) => r.transcript && r.transcript.length > 0).length;
  const processedByAI = records.filter(
    (r) => (r.summary && r.summary.length > 0) || (r.tasks && r.tasks.length > 0),
  ).length;

  const modelsBytes = downloadedModels.reduce((sum, m) => {
    const realBytes = realModelSizes[m.id];
    return sum + (realBytes !== undefined ? realBytes : m.sizeMb * 1024 * 1024);
  }, 0);
  const totalMb = stats.totalMb + modelsBytes / (1024 * 1024);

  const handleClearCache = () => {
    Alert.alert(t('storage.clearCache'), t('storage.clearCacheConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('storage.clear'),
        onPress: async () => {
          setIsClearing(true);
          try {
            const paths = records.map((r) => r.audioPath).filter((p): p is string => Boolean(p));
            const freed = await clearCache(paths);
            await refreshStats();
            const freedKb = Math.round(freed / 1024);
            Alert.alert(t('common.done'), t('storage.cacheCleared', { freed: freedKb }));
          } catch (err) {
            console.warn('[StorageDetails] Failed to clear cache:', err);
            Alert.alert(t('common.error'), t('storage.cacheClearError'));
          } finally {
            setIsClearing(false);
          }
        },
      },
    ]);
  };

  const handleDeleteAll = () => {
    Alert.alert(t('storage.deleteAllData'), t('storage.deleteAllConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          for (const r of records) {
            await deleteRecord(r.id);
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('storage.title')} color={color} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6 rounded-2xl p-4" style={{ backgroundColor: color.background.card }}>
          {isLoading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator size="large" color={color.accent.primary} />
              <Text className="mt-3 text-[16px]" style={{ color: color.text.secondary }}>
                {t('storage.loading')}
              </Text>
            </View>
          ) : (
            <StorageBar {...stats} modelsBytes={modelsBytes} totalMb={totalMb} color={color} />
          )}
        </View>
        <SettingsSection title={t('storage.details')} color={color}>
          <SettingsRow
            label={t('storage.audioRecords')}
            value={t('storage.audioFilesValue', {
              count: audioCount,
              size: stats.audioMb.toFixed(1),
            })}
            color={color}
            leftIcon={<Mic2 size={20} color={color.accent.primary} strokeWidth={1.8} />}
            showChevron={false}
            isFirst
          />
          <SettingsRow
            label={t('storage.transcriptsAndData')}
            value={formatFileSize(stats.transcriptKb * 1024)}
            color={color}
            leftIcon={<Type size={20} color={color.accent.transcript} strokeWidth={1.8} />}
            showChevron={false}
          />
          <SettingsRow
            label={t('storage.aiProcessing')}
            value={formatFileSize(stats.aiDataKb * 1024)}
            color={color}
            leftIcon={<Bot size={20} color={color.accent.success} strokeWidth={1.8} />}
            showChevron={false}
            isLast={downloadedModels.length === 0}
          />
          {downloadedModels.length > 0 && (
            <>
              {downloadedModels.map((model, index) => {
                const realBytes = realModelSizes[model.id];
                const sizeLabel =
                  realBytes !== undefined
                    ? formatFileSize(realBytes)
                    : formatFileSize(model.sizeMb * 1024 * 1024);

                return (
                  <SettingsRow
                    key={model.id}
                    label={`Whisper ${model.name}`}
                    value={sizeLabel}
                    color={color}
                    leftIcon={
                      <BrainCircuit size={20} color={color.accent.success} strokeWidth={1.8} />
                    }
                    showChevron={false}
                    isLast={index === downloadedModels.length - 1}
                  />
                );
              })}
            </>
          )}
        </SettingsSection>
        <SettingsSection title={t('storage.statistics')} color={color}>
          <SettingsRow
            label={t('storage.totalRecords')}
            value={String(records.length)}
            color={color}
            leftIcon={<Mic size={20} color={color.accent.primary} strokeWidth={1.8} />}
            showChevron={false}
            isFirst
          />
          <SettingsRow
            label={t('storage.withAudio')}
            value={String(audioCount)}
            color={color}
            leftIcon={<Clock size={20} color={color.accent.success} strokeWidth={1.8} />}
            showChevron={false}
          />
          <SettingsRow
            label={t('storage.transcripts')}
            value={String(withTranscript)}
            color={color}
            leftIcon={<FileText size={20} color={color.accent.transcript} strokeWidth={1.8} />}
            showChevron={false}
          />
          <SettingsRow
            label={t('storage.aiProcessed')}
            value={String(processedByAI)}
            color={color}
            leftIcon={<Bot size={20} color={color.accent.cache} strokeWidth={1.8} />}
            showChevron={false}
            isLast
          />
        </SettingsSection>

        <SettingsSection title={t('storage.management')} color={color}>
          <SettingsRow
            label={t('storage.clearCache')}
            value={isClearing ? t('storage.loading') : formatFileSize(stats.cacheKb * 1024)}
            color={color}
            leftIcon={<Trash2 size={20} color={color.accent.cache} strokeWidth={1.8} />}
            onPress={isClearing ? undefined : handleClearCache}
            isFirst
          />
          <SettingsRow
            label={t('storage.deleteAllData')}
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
