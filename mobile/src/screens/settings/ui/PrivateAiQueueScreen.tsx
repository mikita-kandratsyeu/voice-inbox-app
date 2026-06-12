import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { Layers, Play, Trash2 } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import type { SettingsStackParamList } from '@/app/navigation/types';
import { useRecordStore } from '@/entities/record';
import {
  drainPrivateAiTaskQueue,
  drainSinglePrivateAiTask,
  listPrivateAiTasks,
  type PrivateAiQueuedTask,
  removePrivateAiTask,
} from '@/features/ai-task-queue';
import { useColors } from '@/shared/config';
import { hapticSelection, IS_ANDROID, useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { resolveDayjsLocale } from '@/shared/lib/date';
import {
  ActionListItemCard,
  BlockingProgressModal,
  EmptyState,
  SCREEN_PADDING,
  ScreenHeader,
} from '@/shared/ui';

export const PrivateAiQueueScreen = () => {
  const { t, i18n } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = useIsTablet();
  const records = useRecordStore((s) => s.records);

  const [items, setItems] = useState<PrivateAiQueuedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAll, setRunningAll] = useState(false);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [runAllProgress, setRunAllProgress] = useState({ current: 0, total: 0 });

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listPrivateAiTasks();
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadQueue();
    }, [loadQueue]),
  );

  const formatDate = useCallback(
    (iso: string) => {
      const loc = resolveDayjsLocale(i18n.language);
      return dayjs(iso).locale(loc).format('D MMM, HH:mm');
    },
    [i18n.language],
  );

  const resolveRecordContext = useCallback(
    (recordId: string) => {
      const record = records.find((r) => r.id === recordId);
      const title = record?.title?.trim() || recordId;
      const preview = record?.transcript?.trim() || record?.summary?.trim() || null;
      return { title, preview };
    },
    [records],
  );

  const onRemove = useCallback(
    (task: PrivateAiQueuedTask) => {
      Alert.alert(t('privateAiQueue.removeTitle'), t('privateAiQueue.removeMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('privateAiQueue.removeConfirm'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await removePrivateAiTask(task.id);
              useRecordStore.getState().setSummaryStatus(task.recordId, 'idle');
              await loadQueue();
            })();
          },
        },
      ]);
    },
    [loadQueue, t],
  );

  const showServerUnreachableAlert = useCallback(() => {
    Alert.alert(t('privateAiQueue.serverUnreachableTitle'), t('privateAiQueue.serverUnreachableMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('privateAiQueue.openServerSettings'),
        onPress: () => navigation.navigate('PrivateRemoteServer'),
      },
    ]);
  }, [navigation, t]);

  const onRunOne = useCallback(
    (task: PrivateAiQueuedTask) => {
      hapticSelection();
      setRunningTaskId(task.id);
      void drainSinglePrivateAiTask(task.id)
        .then((result) => {
          if (result === 'server_unreachable') {
            showServerUnreachableAlert();
          }
        })
        .catch(() => {})
        .finally(() => {
          setRunningTaskId(null);
          void loadQueue();
        });
    },
    [loadQueue, showServerUnreachableAlert],
  );

  const onRunAll = useCallback(() => {
    if (items.length === 0) return;
    hapticSelection();
    setRunningAll(true);
    setRunAllProgress({ current: 0, total: items.length });
    void drainPrivateAiTaskQueue({
      forceReachabilityCheck: true,
      onProgress: (current, total) => setRunAllProgress({ current, total }),
    })
      .then((result) => {
        if (result === 'server_unreachable') {
          showServerUnreachableAlert();
        }
      })
      .catch(() => {})
      .finally(() => {
        setRunningAll(false);
        setRunAllProgress({ current: 0, total: 0 });
        void loadQueue();
      });
  }, [items.length, loadQueue, showServerUnreachableAlert]);

  const listPaddingBottom = getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet);
  const contentWidth = contentMaxWidth ?? windowWidth;

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader
        title={t('privateAiQueue.title')}
        onBack={() => navigation.goBack()}
        rightSlot={
          items.length > 0 ? (
            <Pressable
              onPress={onRunAll}
              disabled={runningAll}
              accessibilityRole="button"
              accessibilityLabel={t('privateAiQueue.runAll')}
              hitSlop={8}
              style={{ opacity: runningAll ? 0.5 : 1, paddingHorizontal: 4 }}
            >
              <Text
                className="text-[15px] font-semibold"
                style={{
                  color: color.accent.primary,
                  ...(IS_ANDROID ? { includeFontPadding: false } : {}),
                }}
              >
                {t('privateAiQueue.runAll')}
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      <View style={{ flex: 1, alignSelf: 'center', width: '100%', maxWidth: contentWidth }}>
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={color.accent.primary} />
          </View>
        ) : items.length === 0 ? (
          <View className="min-h-[320px] flex-1 justify-center px-8 py-8">
            <EmptyState
              icon={<Layers size={40} color={color.icon.muted} strokeWidth={1.5} />}
              title={t('privateAiQueue.emptyTitle')}
              description={t('privateAiQueue.emptySubtitle')}
            />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: SCREEN_PADDING,
              paddingTop: 16,
              paddingBottom: listPaddingBottom,
              flexGrow: 1,
            }}
            renderItem={({ item }) => {
              const isRunning = runningTaskId === item.id;
              const { title, preview } = resolveRecordContext(item.recordId);
              return (
                <ActionListItemCard
                  color={color}
                  title={title}
                  preview={preview}
                  meta={`${t('privateAiQueue.taskSummarize')} · ${formatDate(item.createdAt)}`}
                  errorText={
                    item.lastError ? t('privateAiQueue.lastError', { error: item.lastError }) : null
                  }
                  primaryAction={{
                    label: t('privateAiQueue.runOne'),
                    accessibilityLabel: t('privateAiQueue.runOne'),
                    icon: <Play size={15} color={color.accent.primary} strokeWidth={2.2} />,
                    loading: isRunning,
                    disabled: runningAll,
                    onPress: () => onRunOne(item),
                  }}
                  secondaryAction={{
                    accessibilityLabel: t('privateAiQueue.removeConfirm'),
                    icon: <Trash2 size={16} color={color.accent.delete} strokeWidth={2.2} />,
                    disabled: runningAll || isRunning,
                    onPress: () => onRemove(item),
                  }}
                />
              );
            }}
          />
        )}
      </View>

      <BlockingProgressModal
        visible={runningAll}
        title={t('privateAiQueue.runningAll')}
        description={t('privateAiQueue.emptySubtitle')}
        total={runAllProgress.total}
        progressLabel={
          runAllProgress.total > 0
            ? t('batch.progressCounter', {
                current: runAllProgress.current,
                total: runAllProgress.total,
              })
            : undefined
        }
      />
    </View>
  );
};
