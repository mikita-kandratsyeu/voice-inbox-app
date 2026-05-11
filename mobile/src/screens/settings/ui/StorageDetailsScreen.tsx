import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BrainCircuit, Sparkles, Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import type { SettingsStackParamList } from '@/app/navigation/types';
import { useFolderStore } from '@/entities/folder';
import { useRecordStore } from '@/entities/record';
import { recordRepository } from '@/entities/record/model/repository';
import type { WhisperModelId, WhisperModelWeightsFormat } from '@/entities/settings';
import { LOCAL_AI_MODELS, useSettingsStore, WHISPER_MODELS } from '@/entities/settings';
import { getWhisperModelDisplayName } from '@/entities/settings/model/constants';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { getLocalLlmModelFileSizeBytes, getModelFileSizeBytes } from '@/features/model-manager';
import { useColors } from '@/shared/config';
import {
  clearCache,
  computeAiDataBytes,
  computeTranscriptPayloadBytes,
  getStorageStats,
  hapticSelection,
  type StorageStats,
  sumAudioFileSizesBytes,
  useIsTablet,
  useTabletContentMaxWidth,
} from '@/shared/lib';
import { NitroFS } from '@/shared/lib/fs';
import { getLocalLlmModelPath } from '@/shared/lib/local-llm';
import { IS_ANDROID } from '@/shared/lib/platform';
import { formatFileSize, getWhisperModelPath } from '@/shared/lib/whisper';
import {
  SCREEN_PADDING,
  ScreenHeader,
  SettingsRow,
  SettingsSection,
  SkeletonPulse,
} from '@/shared/ui';

import {
  ROW_BULLET_SIZE,
  StorageBreakdownRow,
  type StorageRingSegmentId,
  StorageUsageRing,
} from './StorageUsageRing';

const DEFAULT_STATS: StorageStats = {
  audioMb: 0,
  transcriptKb: 0,
  aiDataKb: 0,
  cacheKb: 0,
  totalMb: 0,
};

const EMPTY_TRASH_STORAGE = {
  recordCount: 0,
  audioBytes: 0,
  transcriptPayloadBytes: 0,
  aiPayloadBytes: 0,
  recordsWithAudio: 0,
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
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  const isTablet = useIsTablet();

  const records = useRecordStore((s) => s.records);
  const purgeRecordPermanently = useRecordStore((s) => s.purgeRecordPermanently);
  const folders = useFolderStore((s) => s.folders);
  const deleteFolder = useFolderStore((s) => s.deleteFolder);
  const whisperModelWeightsFormat = useSettingsStore((s) => s.whisperModelWeightsFormat);
  const [stats, setStats] = useState<StorageStats>(DEFAULT_STATS);
  const [trashStorage, setTrashStorage] = useState(EMPTY_TRASH_STORAGE);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deleteAllProgress, setDeleteAllProgress] = useState({ current: 0, total: 0 });
  const [downloadedVariants, setDownloadedVariants] = useState<DownloadedModelVariant[]>([]);
  const [downloadedLocalLlm, setDownloadedLocalLlm] = useState<DownloadedLocalLlmEntry[]>([]);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<StorageRingSegmentId[]>([]);
  const [expandedBreakdownId, setExpandedBreakdownId] = useState<StorageRingSegmentId | null>(null);

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
        const activeRecords = useRecordStore.getState().records;
        const trashedPayloads = await recordRepository.getTrashedStoragePayloads();

        const audioPathSet = new Set<string>();
        for (const r of activeRecords) {
          if (r.audioPath) audioPathSet.add(r.audioPath);
        }
        for (const t of trashedPayloads) {
          if (t.audioPath) audioPathSet.add(t.audioPath);
        }
        const paths = [...audioPathSet];

        const recordsForStats = [
          ...activeRecords.map((r) => ({
            transcript: r.transcript,
            transcriptSegments: r.transcriptSegments,
            summary: r.summary,
            tasks: r.tasks,
          })),
          ...trashedPayloads.map(({ audioPath: _audioPath, ...rest }) => rest),
        ];

        const s = await getStorageStats(paths, recordsForStats);
        setStats(s);
        await loadModelSizes();

        const trashAudioBytes = await sumAudioFileSizesBytes(
          trashedPayloads.map((t) => t.audioPath),
        );
        setTrashStorage({
          recordCount: trashedPayloads.length,
          audioBytes: trashAudioBytes,
          transcriptPayloadBytes: computeTranscriptPayloadBytes(trashedPayloads),
          aiPayloadBytes: computeAiDataBytes(trashedPayloads),
          recordsWithAudio: trashedPayloads.filter((t) => Boolean(t.audioPath)).length,
        });
      } catch (err) {
        if (__DEV__) console.warn('[StorageDetails] Failed to load stats:', err);
        setTrashStorage(EMPTY_TRASH_STORAGE);
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

  const activeAudioCount = records.filter((r) => r.audioPath).length;
  const totalRecordingsWithAudio = activeAudioCount + trashStorage.recordsWithAudio;
  const withTranscript = records.filter((r) => r.transcript && r.transcript.length > 0).length;
  const processedByAI = records.filter(
    (r) => (r.summary && r.summary.length > 0) || (r.tasks && r.tasks.length > 0),
  ).length;

  const whisperModelsBytes = downloadedVariants.reduce((sum, m) => sum + m.bytes, 0);
  const localGenerationModelsBytes = downloadedLocalLlm.reduce((sum, m) => sum + m.bytes, 0);
  const modelsBytesTotal = whisperModelsBytes + localGenerationModelsBytes;
  const hasOnDeviceModelRows = downloadedVariants.length > 0 || downloadedLocalLlm.length > 0;
  const hasClearableCache = stats.cacheKb > 0;

  const { ringSegments, totalBytesForRing } = useMemo(() => {
    const audioBytes = stats.audioMb * 1024 * 1024;
    const transcriptBytes = stats.transcriptKb * 1024;
    const aiBytes = stats.aiDataKb * 1024;
    const cacheBytes = stats.cacheKb * 1024;
    const total = audioBytes + transcriptBytes + aiBytes + cacheBytes + modelsBytesTotal;
    return {
      totalBytesForRing: total,
      ringSegments: [
        { id: 'audio' as const, color: color.accent.primary, bytes: audioBytes },
        { id: 'transcript' as const, color: color.accent.transcript, bytes: transcriptBytes },
        { id: 'ai' as const, color: color.accent.aiData, bytes: aiBytes },
        { id: 'models' as const, color: color.accent.models, bytes: modelsBytesTotal },
        { id: 'cache' as const, color: color.accent.cache, bytes: cacheBytes },
      ],
    };
  }, [stats, modelsBytesTotal, color]);

  const segmentLabels = useMemo(
    (): Record<StorageRingSegmentId, string> => ({
      audio: t('storage.audioRecords'),
      transcript: t('storage.transcriptsAndData'),
      ai: t('storage.aiProcessing'),
      cache: t('storage.cacheLabel'),
      models: t('storage.onDeviceModels'),
    }),
    [t],
  );

  const toggleSegment = useCallback((id: StorageRingSegmentId) => {
    hapticSelection();
    setSelectedSegmentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const clearRingSelection = useCallback(() => {
    hapticSelection();
    setSelectedSegmentIds([]);
  }, []);

  const toggleBreakdownExpand = useCallback((id: StorageRingSegmentId) => {
    hapticSelection();
    setExpandedBreakdownId((cur) => (cur === id ? null : id));
  }, []);

  const segmentHasExpandableDetails = useCallback(
    (id: StorageRingSegmentId) => {
      switch (id) {
        case 'cache':
          return false;
        case 'models':
          return hasOnDeviceModelRows;
        case 'audio':
          return stats.audioMb > 0 || activeAudioCount > 0 || trashStorage.audioBytes > 0;
        case 'transcript':
          return stats.transcriptKb > 0 || trashStorage.recordCount > 0;
        case 'ai':
          return stats.aiDataKb > 0 || trashStorage.aiPayloadBytes > 0;
        default:
          return false;
      }
    },
    [
      stats.audioMb,
      stats.transcriptKb,
      stats.aiDataKb,
      activeAudioCount,
      trashStorage.audioBytes,
      trashStorage.recordCount,
      trashStorage.aiPayloadBytes,
      hasOnDeviceModelRows,
    ],
  );

  const { ringCenterTitle, ringCenterValue } = useMemo(() => {
    const ids = selectedSegmentIds;
    if (ids.length === 0) {
      return {
        ringCenterTitle: t('storage.totalUsed'),
        ringCenterValue: formatFileSize(totalBytesForRing),
      };
    }
    if (ids.length === 1) {
      const id = ids[0]!;
      const bytes = ringSegments.find((s) => s.id === id)?.bytes ?? 0;
      return {
        ringCenterTitle: segmentLabels[id],
        ringCenterValue: formatFileSize(bytes),
      };
    }
    const sum = ringSegments.filter((s) => ids.includes(s.id)).reduce((acc, s) => acc + s.bytes, 0);
    return {
      ringCenterTitle: t('storage.selectedSegmentsTitle', { count: ids.length }),
      ringCenterValue: formatFileSize(sum),
    };
  }, [selectedSegmentIds, ringSegments, segmentLabels, t, totalBytesForRing]);

  const handleClearCache = () => {
    Alert.alert(t('storage.clearCache'), t('storage.clearCacheConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('storage.clear'),
        onPress: async () => {
          setIsClearing(true);
          try {
            const activePaths = records
              .map((r) => r.audioPath)
              .filter((p): p is string => Boolean(p));
            const trashed = await recordRepository.getTrashedStoragePayloads();
            const pathSet = new Set<string>(activePaths);
            for (const t of trashed) {
              if (t.audioPath) pathSet.add(t.audioPath);
            }
            const paths = [...pathSet];
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
          const trashedRecords = await recordRepository.getTrashedList();
          const totalToDelete = records.length + trashedRecords.length + folders.length;
          setIsDeletingAll(true);
          setDeleteAllProgress({ current: 0, total: totalToDelete });
          try {
            let deleted = 0;
            for (let i = 0; i < records.length; i += 1) {
              const r = records[i];
              await purgeRecordPermanently(r.id);
              deleted += 1;
              setDeleteAllProgress({ current: deleted, total: totalToDelete });
            }
            for (let i = 0; i < trashedRecords.length; i += 1) {
              const tr = trashedRecords[i];
              await purgeRecordPermanently(tr.id);
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
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: 16,
            paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
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
          <View
            className="mb-7 rounded-2xl px-4 pt-4 pb-4"
            style={{
              backgroundColor: color.background.card,
            }}
          >
            {isLoading ? (
              <SkeletonPulse>
                <StorageUsageRing
                  segments={[]}
                  totalBytes={0}
                  selectedIds={[]}
                  onClearSelection={() => {}}
                  centerTitle=""
                  centerValue=""
                  tapHint=""
                  color={color}
                  isLoading
                />
                <View
                  className="mt-4 overflow-hidden rounded-2xl border"
                  style={{
                    width: '100%',
                    borderColor: color.border.default,
                    backgroundColor: color.background.secondary,
                  }}
                >
                  {[1, 2, 3, 4, 5].map((i) => (
                    <View
                      key={i}
                      className="flex-row items-center px-4 py-3.5"
                      style={{
                        minHeight: 52,
                        borderBottomWidth: i < 5 ? 1 : 0,
                        borderBottomColor: color.border.default,
                      }}
                    >
                      <View
                        style={{
                          width: ROW_BULLET_SIZE,
                          height: ROW_BULLET_SIZE,
                          borderRadius: ROW_BULLET_SIZE / 2,
                          marginRight: 12,
                          backgroundColor: color.background.tertiary,
                        }}
                      />
                      <View
                        className="min-w-0 flex-1 flex-shrink flex-row items-center pr-2"
                        style={{ columnGap: 10 }}
                      >
                        <View
                          className="rounded"
                          style={{
                            height: 16,
                            width: 120,
                            maxWidth: '55%',
                            backgroundColor: color.background.tertiary,
                          }}
                        />
                        <View
                          className="rounded"
                          style={{
                            height: 16,
                            width: 48,
                            backgroundColor: color.background.tertiary,
                          }}
                        />
                      </View>
                      <View
                        className="rounded"
                        style={{
                          width: 64,
                          height: 16,
                          backgroundColor: color.background.tertiary,
                        }}
                      />
                    </View>
                  ))}
                </View>
              </SkeletonPulse>
            ) : (
              <>
                <StorageUsageRing
                  segments={ringSegments}
                  totalBytes={totalBytesForRing}
                  selectedIds={selectedSegmentIds}
                  onClearSelection={clearRingSelection}
                  centerTitle={ringCenterTitle}
                  centerValue={ringCenterValue}
                  tapHint={t('storage.tapRingHint')}
                  color={color}
                />
                <View
                  className="mt-4 overflow-hidden rounded-2xl border"
                  style={{
                    width: '100%',
                    borderColor: color.border.default,
                    backgroundColor: color.background.secondary,
                  }}
                >
                  {ringSegments.map((seg, index) => {
                    const pct =
                      totalBytesForRing > 0
                        ? ((seg.bytes / totalBytesForRing) * 100).toFixed(1)
                        : '0.0';
                    const hasExp = segmentHasExpandableDetails(seg.id);
                    const expanded = expandedBreakdownId === seg.id;
                    const isLastSeg = index === ringSegments.length - 1;
                    const mainShowBottomBorder = (hasExp && expanded) || !isLastSeg;

                    return (
                      <React.Fragment key={seg.id}>
                        <StorageBreakdownRow
                          segment={seg}
                          label={segmentLabels[seg.id]}
                          valueLabel={formatFileSize(seg.bytes)}
                          percentLabel={`${pct}%`}
                          selected={selectedSegmentIds.includes(seg.id)}
                          onSelectPress={() => toggleSegment(seg.id)}
                          color={color}
                          showBottomBorder={mainShowBottomBorder}
                          hasExpandableDetails={hasExp}
                          detailsExpanded={expanded}
                          onExpandPress={hasExp ? () => toggleBreakdownExpand(seg.id) : undefined}
                          expandChevronAccessibilityLabel={t('storage.breakdownA11y', {
                            category: segmentLabels[seg.id],
                          })}
                        />
                        {expanded && hasExp ? (
                          <View
                            style={{
                              paddingLeft: 16 + ROW_BULLET_SIZE + 12,
                              paddingRight: 16,
                              paddingTop: 10,
                              paddingBottom: 12,
                              backgroundColor: color.background.secondary,
                              borderBottomWidth: !isLastSeg ? 1 : 0,
                              borderBottomColor: color.border.default,
                            }}
                          >
                            {seg.id === 'audio' ? (
                              <>
                                <Text
                                  style={{
                                    color: color.text.secondary,
                                    fontSize: 15,
                                    lineHeight: 20,
                                  }}
                                >
                                  {t('storage.audioFilesValue', {
                                    count: totalRecordingsWithAudio,
                                    size: stats.audioMb.toFixed(1),
                                  })}
                                </Text>
                                {trashStorage.audioBytes > 0 ? (
                                  <Text
                                    style={{
                                      marginTop: 8,
                                      color: color.text.muted,
                                      fontSize: 14,
                                      lineHeight: 19,
                                    }}
                                  >
                                    {t('storage.trashAudioDetail', {
                                      size: formatFileSize(trashStorage.audioBytes),
                                      count: trashStorage.recordsWithAudio,
                                    })}
                                  </Text>
                                ) : null}
                              </>
                            ) : null}
                            {seg.id === 'transcript' ? (
                              <View>
                                <Text
                                  style={{
                                    color: color.text.secondary,
                                    fontSize: 15,
                                    lineHeight: 20,
                                  }}
                                >
                                  {formatFileSize(stats.transcriptKb * 1024)}
                                </Text>
                                {withTranscript > 0 ? (
                                  <Text
                                    style={{
                                      marginTop: 6,
                                      color: color.text.muted,
                                      fontSize: 14,
                                      lineHeight: 19,
                                    }}
                                  >
                                    {t('storage.transcripts')}: {withTranscript}
                                  </Text>
                                ) : null}
                                {trashStorage.recordCount > 0 ? (
                                  <Text
                                    style={{
                                      marginTop: 8,
                                      color: color.text.muted,
                                      fontSize: 14,
                                      lineHeight: 19,
                                    }}
                                  >
                                    {t('storage.trashTranscriptDetail', {
                                      count: trashStorage.recordCount,
                                      size: formatFileSize(trashStorage.transcriptPayloadBytes),
                                    })}
                                  </Text>
                                ) : null}
                              </View>
                            ) : null}
                            {seg.id === 'ai' ? (
                              <View>
                                <Text
                                  style={{
                                    color: color.text.secondary,
                                    fontSize: 15,
                                    lineHeight: 20,
                                  }}
                                >
                                  {formatFileSize(stats.aiDataKb * 1024)}
                                </Text>
                                {processedByAI > 0 ? (
                                  <Text
                                    style={{
                                      marginTop: 6,
                                      color: color.text.muted,
                                      fontSize: 14,
                                      lineHeight: 19,
                                    }}
                                  >
                                    {t('storage.aiProcessed')}: {processedByAI}
                                  </Text>
                                ) : null}
                                {trashStorage.aiPayloadBytes > 0 ? (
                                  <Text
                                    style={{
                                      marginTop: 8,
                                      color: color.text.muted,
                                      fontSize: 14,
                                      lineHeight: 19,
                                    }}
                                  >
                                    {t('storage.trashAiSliceDetail', {
                                      size: formatFileSize(trashStorage.aiPayloadBytes),
                                    })}
                                  </Text>
                                ) : null}
                              </View>
                            ) : null}
                            {seg.id === 'models' ? (
                              <View>
                                {downloadedVariants.map((model, idx) => {
                                  const isFirst = idx === 0;
                                  return (
                                    <View
                                      key={`${model.id}:${model.format}`}
                                      style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingTop: isFirst ? 0 : 10,
                                        marginTop: isFirst ? 0 : 10,
                                        borderTopWidth: isFirst ? 0 : 1,
                                        borderTopColor: color.border.default,
                                      }}
                                    >
                                      <View
                                        style={{
                                          width: 18,
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          marginRight: 10,
                                        }}
                                      >
                                        <BrainCircuit
                                          size={18}
                                          color={color.accent.models}
                                          strokeWidth={1.8}
                                        />
                                      </View>
                                      <Text
                                        style={{
                                          flex: 1,
                                          minWidth: 0,
                                          fontSize: 15,
                                          lineHeight: 20,
                                          color: color.text.primary,
                                        }}
                                        numberOfLines={2}
                                      >
                                        {getWhisperModelDisplayName(model.id, model.format)}
                                      </Text>
                                      <Text
                                        style={{
                                          marginLeft: 8,
                                          fontSize: 15,
                                          lineHeight: 20,
                                          color: color.text.muted,
                                          fontVariant: ['tabular-nums'],
                                        }}
                                      >
                                        {formatFileSize(model.bytes)}
                                      </Text>
                                    </View>
                                  );
                                })}
                                {downloadedLocalLlm.map((model, idx) => {
                                  const isFirst = idx === 0 && downloadedVariants.length === 0;
                                  return (
                                    <View
                                      key={model.id}
                                      style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingTop: isFirst ? 0 : 10,
                                        marginTop: isFirst ? 0 : 10,
                                        borderTopWidth: isFirst ? 0 : 1,
                                        borderTopColor: color.border.default,
                                      }}
                                    >
                                      <View
                                        style={{
                                          width: 18,
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          marginRight: 10,
                                        }}
                                      >
                                        <Sparkles
                                          size={18}
                                          color={color.accent.models}
                                          strokeWidth={1.8}
                                        />
                                      </View>
                                      <Text
                                        style={{
                                          flex: 1,
                                          minWidth: 0,
                                          fontSize: 15,
                                          lineHeight: 20,
                                          color: color.text.primary,
                                        }}
                                        numberOfLines={2}
                                      >
                                        {model.name}
                                      </Text>
                                      <Text
                                        style={{
                                          marginLeft: 8,
                                          fontSize: 15,
                                          lineHeight: 20,
                                          color: color.text.muted,
                                          fontVariant: ['tabular-nums'],
                                        }}
                                      >
                                        {formatFileSize(model.bytes)}
                                      </Text>
                                    </View>
                                  );
                                })}
                              </View>
                            ) : null}
                          </View>
                        ) : null}
                      </React.Fragment>
                    );
                  })}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    isClearing
                      ? t('storage.loading')
                      : `${t('storage.clearCache')}, ${
                          hasClearableCache
                            ? formatFileSize(stats.cacheKb * 1024)
                            : `0 ${t('storage.mb')}`
                        }`
                  }
                  accessibilityState={{ disabled: !hasClearableCache || isClearing }}
                  onPress={hasClearableCache && !isClearing ? handleClearCache : undefined}
                  disabled={!hasClearableCache || isClearing}
                  className="mt-4 items-center justify-center rounded-2xl py-4"
                  style={{
                    minHeight: 52,
                    backgroundColor: hasClearableCache
                      ? color.accent.primary
                      : color.background.tertiary,
                    opacity: isClearing ? 0.55 : 1,
                  }}
                >
                  {isClearing ? (
                    <Text
                      className="text-[16px] font-semibold"
                      style={{
                        color: hasClearableCache ? color.icon.onAccent : color.text.muted,
                      }}
                    >
                      {t('storage.loading')}
                    </Text>
                  ) : (
                    <Text
                      className="text-center text-[16px] font-semibold leading-6"
                      style={{
                        color: hasClearableCache ? color.icon.onAccent : color.text.muted,
                        ...(IS_ANDROID ? { includeFontPadding: false } : null),
                      }}
                    >
                      {t('storage.clearCache')}
                      <Text
                        className="text-[14px] font-medium leading-6"
                        style={{
                          color: hasClearableCache ? color.icon.onAccent : color.text.muted,
                          opacity: hasClearableCache ? 0.82 : 1,
                          fontVariant: ['tabular-nums'],
                          ...(IS_ANDROID ? { includeFontPadding: false } : null),
                        }}
                      >
                        {' '}
                        {hasClearableCache
                          ? formatFileSize(stats.cacheKb * 1024)
                          : `0 ${t('storage.mb')}`}
                      </Text>
                    </Text>
                  )}
                </Pressable>
              </>
            )}
          </View>

          <SettingsSection title={t('storage.dangerZone')}>
            <SettingsRow
              label={t('storage.deleteAllData')}
              leftIcon={<Trash2 size={20} color={color.accent.delete} strokeWidth={1.8} />}
              onPress={isDeletingAll ? undefined : handleDeleteAll}
              dangerous
              isFirst
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
