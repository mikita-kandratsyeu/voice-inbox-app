import { useNavigation } from '@react-navigation/native';
import {
  Bot,
  BrainCircuit,
  Clock,
  FileText,
  Mic,
  Mic2,
  Sparkles,
  Trash2,
  Type,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFolderStore } from '@/entities/folder';
import { useRecordStore } from '@/entities/record';
import type { WhisperModelId, WhisperModelWeightsFormat } from '@/entities/settings';
import { LOCAL_AI_MODELS, useSettingsStore, WHISPER_MODELS } from '@/entities/settings';
import { getWhisperModelDisplayName } from '@/entities/settings/model/constants';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { getLocalLlmModelFileSizeBytes, getModelFileSizeBytes } from '@/features/model-manager';
import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import {
  clearCache,
  getStorageStats,
  type StorageStats,
  useTabletContentMaxWidth,
} from '@/shared/lib';
import { NitroFS } from '@/shared/lib/fs';
import { getLocalLlmModelPath } from '@/shared/lib/local-llm';
import { formatFileSize, getWhisperModelPath } from '@/shared/lib/whisper';
import { ScreenHeader, SettingsRow, SettingsSection, SkeletonPulse } from '@/shared/ui';

const StorageBar = ({
  audioMb,
  transcriptKb,
  aiDataKb,
  cacheKb,
  whisperModelsBytes,
  localGenerationModelsBytes,
  totalMb,
  color,
}: StorageStats & {
  whisperModelsBytes: number;
  localGenerationModelsBytes: number;
  totalMb: number;
  color: Colors;
}) => {
  const { t } = useTranslation();
  const modelsBytes = whisperModelsBytes + localGenerationModelsBytes;
  const modelsMb = modelsBytes / (1024 * 1024);
  const divisor = totalMb > 0 ? totalMb : 1;
  const audioFrac = audioMb / divisor;
  const transcriptFrac = transcriptKb / 1024 / divisor;
  const aiDataFrac = aiDataKb / 1024 / divisor;
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
        <View style={{ flex: aiDataFrac, backgroundColor: color.accent.aiData }} />
        <View style={{ flex: cacheFrac, backgroundColor: color.accent.cache }} />
        {modelsFrac > 0 && (
          <View style={{ flex: modelsFrac, backgroundColor: color.accent.models }} />
        )}
      </View>
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: color.accent.primary }}
            />
            <Text className="text-[14px]" style={{ color: color.text.primary }}>
              {t('storage.audioRecords')}
            </Text>
          </View>
          <Text className="text-[14px]" style={{ color: color.text.primary }}>
            {`${audioMb.toFixed(1)} ${t('storage.mb')}`}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: color.accent.transcript }}
            />
            <Text className="text-[14px]" style={{ color: color.text.primary }}>
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
              style={{ backgroundColor: color.accent.aiData }}
            />
            <Text className="text-[14px]" style={{ color: color.text.primary }}>
              {t('storage.aiProcessing')}
            </Text>
          </View>
          <Text className="text-[14px]" style={{ color: color.text.primary }}>
            {formatFileSize(aiDataKb * 1024)}
          </Text>
        </View>
        {whisperModelsBytes > 0 && (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: color.accent.models }}
              />
              <Text className="text-[14px]" style={{ color: color.text.primary }}>
                {t('storage.transcriptionModels')}
              </Text>
            </View>
            <Text className="text-[14px]" style={{ color: color.text.primary }}>
              {formatFileSize(whisperModelsBytes)}
            </Text>
          </View>
        )}
        {localGenerationModelsBytes > 0 && (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: color.accent.models }}
              />
              <Text className="text-[14px]" style={{ color: color.text.primary }}>
                {t('storage.localGenerationModels')}
              </Text>
            </View>
            <Text className="text-[14px]" style={{ color: color.text.primary }}>
              {formatFileSize(localGenerationModelsBytes)}
            </Text>
          </View>
        )}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: color.accent.cache }}
            />
            <Text className="text-[14px]" style={{ color: color.text.primary }}>
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

function StorageBarSkeleton({ color }: { color: Colors }) {
  return (
    <SkeletonPulse>
      <View className="mb-3 flex-row items-center justify-between">
        <View className="h-4 w-12 rounded" style={{ backgroundColor: color.background.tertiary }} />
        <View className="h-4 w-16 rounded" style={{ backgroundColor: color.background.tertiary }} />
      </View>
      <View
        className="mb-4 h-3 overflow-hidden rounded-full"
        style={{ backgroundColor: color.background.tertiary }}
      />
      <View className="gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: color.background.tertiary }}
              />
              <View
                className="h-3.5 w-24 rounded"
                style={{ backgroundColor: color.background.tertiary }}
              />
            </View>
            <View
              className="h-3.5 w-12 rounded"
              style={{ backgroundColor: color.background.tertiary }}
            />
          </View>
        ))}
      </View>
    </SkeletonPulse>
  );
}

const DEFAULT_STATS: StorageStats = {
  audioMb: 0,
  transcriptKb: 0,
  aiDataKb: 0,
  cacheKb: 0,
  totalMb: 0,
};

type DownloadedModelVariant = {
  id: WhisperModelId;
  name: string;
  format: WhisperModelWeightsFormat;
  bytes: number;
};

type DownloadedLocalLlmEntry = {
  id: string;
  name: string;
  bytes: number;
};

export const StorageDetailsScreen = () => {
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  const records = useRecordStore((s) => s.records);
  const deleteRecord = useRecordStore((s) => s.deleteRecord);
  const folders = useFolderStore((s) => s.folders);
  const deleteFolder = useFolderStore((s) => s.deleteFolder);
  const whisperModelWeightsFormat = useSettingsStore((s) => s.whisperModelWeightsFormat);
  const [stats, setStats] = useState<StorageStats>(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deleteAllProgress, setDeleteAllProgress] = useState({ current: 0, total: 0 });
  const [downloadedVariants, setDownloadedVariants] = useState<DownloadedModelVariant[]>([]);
  const [downloadedLocalLlm, setDownloadedLocalLlm] = useState<DownloadedLocalLlmEntry[]>([]);

  const loadModelSizes = useCallback(async () => {
    const formats: WhisperModelWeightsFormat[] = ['q5_1', 'full'];
    const whisperEntries = await Promise.all(
      WHISPER_MODELS.flatMap((model) =>
        formats.map(async (format) => {
          const path = getWhisperModelPath(model.id, format);
          const exists = await NitroFS.exists(path);
          if (!exists) return null;
          const bytes = await getModelFileSizeBytes(model.id, format);
          if (bytes <= 0) return null;
          return { id: model.id, name: model.name, format, bytes } as DownloadedModelVariant;
        }),
      ),
    );
    const localEntries = await Promise.all(
      LOCAL_AI_MODELS.map(async (m) => {
        const path = getLocalLlmModelPath(m.id);
        const exists = await NitroFS.exists(path);
        if (!exists) return null;
        const bytes = await getLocalLlmModelFileSizeBytes(m.id);
        if (bytes <= 0) return null;
        return { id: m.id, name: m.name, bytes } as DownloadedLocalLlmEntry;
      }),
    );
    setDownloadedVariants(whisperEntries.filter((x): x is DownloadedModelVariant => x != null));
    setDownloadedLocalLlm(localEntries.filter((x): x is DownloadedLocalLlmEntry => x != null));
  }, []);

  const refreshStats = useCallback(
    async (isPull = false) => {
      if (isPull) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      try {
        const currentRecords = useRecordStore.getState().records;
        const paths = currentRecords.map((r) => r.audioPath).filter((p): p is string => Boolean(p));
        const s = await getStorageStats(paths, currentRecords);
        setStats(s);
        await loadModelSizes();
      } catch (err) {
        if (__DEV__) console.warn('[StorageDetails] Failed to load stats:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [loadModelSizes],
  );

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    loadModelSizes();
  }, [whisperModelWeightsFormat, loadModelSizes]);

  const audioCount = records.filter((r) => r.audioPath).length;
  const withTranscript = records.filter((r) => r.transcript && r.transcript.length > 0).length;
  const processedByAI = records.filter(
    (r) => (r.summary && r.summary.length > 0) || (r.tasks && r.tasks.length > 0),
  ).length;

  const whisperModelsBytes = downloadedVariants.reduce((sum, m) => sum + m.bytes, 0);
  const localGenerationModelsBytes = downloadedLocalLlm.reduce((sum, m) => sum + m.bytes, 0);
  const totalMb = stats.totalMb + (whisperModelsBytes + localGenerationModelsBytes) / (1024 * 1024);
  const hasOnDeviceModelRows = downloadedVariants.length > 0 || downloadedLocalLlm.length > 0;

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
            const freedMb = (freedKb / 1024).toFixed(1);
            const msg =
              freedKb >= 1024
                ? t('storage.cacheClearedMb', { freed: freedMb })
                : t('storage.cacheCleared', { freed: freedKb });
            Alert.alert(t('common.done'), msg);
          } catch (err) {
            if (__DEV__) console.warn('[StorageDetails] Failed to clear cache:', err);
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
          const totalToDelete = records.length + folders.length;
          setIsDeletingAll(true);
          setDeleteAllProgress({ current: 0, total: totalToDelete });
          try {
            let deleted = 0;
            for (let i = 0; i < records.length; i += 1) {
              const r = records[i];
              await deleteRecord(r.id);
              deleted += 1;
              setDeleteAllProgress({ current: deleted, total: totalToDelete });
            }
            for (let i = 0; i < folders.length; i += 1) {
              const f = folders[i];
              await deleteFolder(f.id);
              deleted += 1;
              setDeleteAllProgress({ current: deleted, total: totalToDelete });
            }
            await refreshStats();
            navigation.goBack();
          } catch {
            Alert.alert(t('common.error'), t('storage.deleteAllError'));
          } finally {
            setIsDeletingAll(false);
            setDeleteAllProgress({ current: 0, total: 0 });
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('storage.title')} onBack={() => navigation.goBack()} />
      <View
        style={{
          flex: 1,
          alignSelf: 'center',
          width: '100%',
          maxWidth: contentMaxWidth,
        }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => refreshStats(true)}
              tintColor={color.status.processing.text}
              colors={[color.status.processing.text]}
              progressBackgroundColor={color.background.secondary}
            />
          }
        >
          <View className="mb-6 rounded-2xl p-4" style={{ backgroundColor: color.background.card }}>
            {isLoading ? (
              <StorageBarSkeleton color={color} />
            ) : (
              <StorageBar
                {...stats}
                whisperModelsBytes={whisperModelsBytes}
                localGenerationModelsBytes={localGenerationModelsBytes}
                totalMb={totalMb}
                color={color}
              />
            )}
          </View>
          <SettingsSection title={t('storage.details')}>
            <SettingsRow
              label={t('storage.audioRecords')}
              value={t('storage.audioFilesValue', {
                count: audioCount,
                size: stats.audioMb.toFixed(1),
              })}
              leftIcon={<Mic2 size={20} color={color.accent.primary} strokeWidth={1.8} />}
              showChevron={false}
              isFirst
            />
            <SettingsRow
              label={t('storage.transcriptsAndData')}
              value={formatFileSize(stats.transcriptKb * 1024)}
              leftIcon={<Type size={20} color={color.accent.transcript} strokeWidth={1.8} />}
              showChevron={false}
            />
            <SettingsRow
              label={t('storage.aiProcessing')}
              value={formatFileSize(stats.aiDataKb * 1024)}
              leftIcon={<Bot size={20} color={color.accent.aiData} strokeWidth={1.8} />}
              showChevron={false}
              isLast={!hasOnDeviceModelRows}
            />
            {downloadedVariants.map((model, index) => (
              <SettingsRow
                key={`${model.id}:${model.format}`}
                label={getWhisperModelDisplayName(model.id, model.format)}
                value={formatFileSize(model.bytes)}
                leftIcon={<BrainCircuit size={20} color={color.accent.models} strokeWidth={1.8} />}
                showChevron={false}
                isLast={index === downloadedVariants.length - 1 && downloadedLocalLlm.length === 0}
              />
            ))}
            {downloadedLocalLlm.map((model, index) => (
              <SettingsRow
                key={model.id}
                label={model.name}
                value={formatFileSize(model.bytes)}
                leftIcon={<Sparkles size={20} color={color.accent.models} strokeWidth={1.8} />}
                showChevron={false}
                isLast={index === downloadedLocalLlm.length - 1}
              />
            ))}
          </SettingsSection>
          <SettingsSection title={t('storage.statistics')}>
            <SettingsRow
              label={t('storage.totalRecords')}
              value={String(records.length)}
              leftIcon={<Mic size={20} color={color.accent.primary} strokeWidth={1.8} />}
              showChevron={false}
              isFirst
            />
            <SettingsRow
              label={t('storage.withAudio')}
              value={String(audioCount)}
              leftIcon={<Clock size={20} color={color.accent.success} strokeWidth={1.8} />}
              showChevron={false}
            />
            <SettingsRow
              label={t('storage.transcripts')}
              value={String(withTranscript)}
              leftIcon={<FileText size={20} color={color.accent.transcript} strokeWidth={1.8} />}
              showChevron={false}
            />
            <SettingsRow
              label={t('storage.aiProcessed')}
              value={String(processedByAI)}
              leftIcon={<Bot size={20} color={color.accent.aiData} strokeWidth={1.8} />}
              showChevron={false}
              isLast
            />
          </SettingsSection>

          <SettingsSection title={t('storage.management')}>
            <SettingsRow
              label={t('storage.clearCache')}
              value={isClearing ? t('storage.loading') : formatFileSize(stats.cacheKb * 1024)}
              leftIcon={<Trash2 size={20} color={color.accent.cache} strokeWidth={1.8} />}
              onPress={isClearing || stats.cacheKb * 1024 === 0 ? undefined : handleClearCache}
              isFirst
            />
            <SettingsRow
              label={t('storage.deleteAllData')}
              leftIcon={<Trash2 size={20} color={color.accent.delete} strokeWidth={1.8} />}
              onPress={isDeletingAll ? undefined : handleDeleteAll}
              dangerous
              isLast
            />
          </SettingsSection>
          <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} />
        </ScrollView>
      </View>
      <Modal visible={isDeletingAll} transparent animationType="fade" statusBarTranslucent>
        <View
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        >
          <View
            className="w-full max-w-sm rounded-2xl px-6 py-8"
            style={{ backgroundColor: color.background.card }}
          >
            <View className="items-center justify-center">
              <ActivityIndicator size="large" color={color.accent.primary} />
            </View>
            <Text
              className="mt-5 text-center text-[16px] font-semibold leading-6"
              style={{ color: color.text.primary }}
            >
              {t('storage.deleteAllLoadingTitle')}
            </Text>
            <Text
              className="mt-2 text-center text-[14px] leading-5"
              style={{ color: color.text.secondary }}
            >
              {t('storage.deleteAllLoadingDescription')}
            </Text>
            {deleteAllProgress.total > 0 && (
              <Text
                className="mt-3 text-center text-[13px] font-medium leading-5"
                style={{ color: color.accent.primary }}
              >
                {t('storage.deleteAllProgressCounter', {
                  current: deleteAllProgress.current,
                  total: deleteAllProgress.total,
                })}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};
