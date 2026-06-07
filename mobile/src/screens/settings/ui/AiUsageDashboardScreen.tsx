import {
  Cloud,
  FolderTree,
  Languages,
  MessageCircleQuestion,
  Mic,
  Newspaper,
  Sparkles,
  WifiOff,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import { useSettingsStackBack } from '@/app/navigation/useSettingsStackBack';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { useProEntitlement } from '@/features/pro-license';
import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import {
  type AiUsage,
  type AiUsageHistoryEntry,
  getAiUsage,
  getAiUsageHistory,
} from '@/shared/lib/ai-api';
import { formatTokenCount } from '@/shared/lib/formatTokenCount';
import { formatLocalizedLongDateWithTime } from '@/shared/lib/taskDeadlineTimeDisplay';
import {
  SCREEN_PADDING,
  ScreenHeader,
  SettingsRow,
  SettingsSection,
  SkeletonPulse,
} from '@/shared/ui';

type UsageMetricCardProps = {
  label: string;
  value: string;
  helper: string;
  color: Colors;
  tone: string;
};

const HISTORY_PAGE_LIMIT = 25;

function UsageMetricCard({ label, value, helper, color, tone }: UsageMetricCardProps) {
  return (
    <View
      className="flex-1 rounded-2xl p-4"
      style={{
        minWidth: '47%',
        borderWidth: 1,
        borderColor: color.border.default,
        backgroundColor: color.background.card,
      }}
    >
      <Text
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: color.text.muted }}
      >
        {label}
      </Text>
      <Text
        className="mt-2 text-[20px] font-semibold leading-6"
        style={[styles.tabular, { color: tone }]}
      >
        {value}
      </Text>
      <Text className="mt-1 text-[13px] leading-[18px]" style={{ color: color.text.secondary }}>
        {helper}
      </Text>
    </View>
  );
}

function HistoryAmount({ amount, color }: { amount: number; color: Colors }) {
  const isPositive = amount > 0;
  const tone = isPositive
    ? { bg: color.status.success, text: '#ffffff' }
    : { bg: color.status.error.bg, text: color.status.error.text };

  return (
    <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: tone.bg }}>
      <Text
        className="text-right text-[15px] font-bold"
        style={[styles.tabular, { color: tone.text }]}
      >
        {isPositive ? `+${amount}` : String(amount)}
      </Text>
    </View>
  );
}

function UsageMetricsSkeleton({ color }: { color: Colors }) {
  return (
    <SkeletonPulse>
      <View className="mb-7 flex-row flex-wrap gap-3">
        {[1, 2, 3, 4].map((item) => (
          <View
            key={item}
            className="flex-1 rounded-2xl p-4"
            style={{
              minWidth: '47%',
              borderWidth: 1,
              borderColor: color.border.default,
              backgroundColor: color.background.card,
            }}
          >
            <View
              className="h-3 w-20 rounded"
              style={{ backgroundColor: color.background.tertiary }}
            />
            <View
              className="mt-3 h-6 w-14 rounded"
              style={{ backgroundColor: color.background.tertiary }}
            />
            <View
              className="mt-2 h-3 w-24 rounded"
              style={{ backgroundColor: color.background.tertiary }}
            />
          </View>
        ))}
      </View>
    </SkeletonPulse>
  );
}

export const AiUsageDashboardScreen = () => {
  const handleBack = useSettingsStackBack();
  const { t, i18n } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  const isTablet = useIsTablet();
  const { isProActive } = useProEntitlement();

  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [historyItems, setHistoryItems] = useState<AiUsageHistoryEntry[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyLoadFailed, setHistoryLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadUsage = useCallback(async (isPull = false) => {
    if (isPull) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setHistoryLoading(true);
    }

    try {
      const [nextUsage, nextHistory] = await Promise.all([
        getAiUsage(),
        getAiUsageHistory({ limit: HISTORY_PAGE_LIMIT }),
      ]);
      setUsage(nextUsage);
      if (nextHistory) {
        setHistoryItems(nextHistory.items);
        setHistoryCursor(nextHistory.nextCursor);
        setHistoryLoadFailed(false);
      } else {
        setHistoryItems([]);
        setHistoryCursor(null);
        setHistoryLoadFailed(true);
      }
    } finally {
      setLoading(false);
      setHistoryLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  const loadMoreHistory = useCallback(async () => {
    if (!historyCursor || historyLoadingMore) return;

    setHistoryLoadingMore(true);
    try {
      const nextHistory = await getAiUsageHistory({
        cursor: historyCursor,
        limit: HISTORY_PAGE_LIMIT,
      });
      if (nextHistory) {
        setHistoryItems((current) => [...current, ...nextHistory.items]);
        setHistoryCursor(nextHistory.nextCursor);
        setHistoryLoadFailed(false);
      } else {
        setHistoryLoadFailed(true);
      }
    } finally {
      setHistoryLoadingMore(false);
    }
  }, [historyCursor, historyLoadingMore]);

  const progressPercent =
    usage && usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;
  const resetDateText = usage ? formatLocalizedLongDateWithTime(usage.resetAt, i18n.language) : '—';
  const remainingText = usage ? String(usage.remaining) : '—';
  const usedText = usage ? String(usage.used) : '—';
  const limitText = usage ? String(usage.limit) : '—';
  const historyHasFooter = historyLoadFailed || historyCursor != null;
  const getHistoryOperationLabel = useCallback(
    (entry: AiUsageHistoryEntry) =>
      t(`settings.aiUsageDashboard.history.operations.${entry.operation}`),
    [t],
  );
  const getHistorySubtitle = useCallback(
    (entry: AiUsageHistoryEntry) => {
      const date = formatLocalizedLongDateWithTime(entry.createdAt, i18n.language);
      const details: string[] = [];
      const model = entry.modelLabel?.trim() || entry.model?.trim();

      if (model) {
        details.push(model);
      }
      if (entry.tokenUsage) {
        details.push(
          t('recordingDetail.summaryMetaTokens', {
            input: formatTokenCount(entry.tokenUsage.prompt),
            output: formatTokenCount(entry.tokenUsage.completion),
          }),
        );
      }

      return details.length > 0 ? `${date}\n${details.join(' • ')}` : date;
    },
    [i18n.language, t],
  );

  const featureRows = useMemo(
    () => [
      {
        key: 'transcription',
        icon: <Mic size={20} color={color.accent.success} strokeWidth={1.8} />,
        label: t('settings.aiUsageDashboard.features.transcription.title'),
        value: t('settings.aiUsageDashboard.localBadge'),
        subtitle: t('settings.aiUsageDashboard.features.transcription.subtitle'),
      },
      {
        key: 'summary',
        icon: <Sparkles size={20} color={color.accent.primary} strokeWidth={1.8} />,
        label: t('settings.aiUsageDashboard.features.summary.title'),
        value: t('settings.aiUsageDashboard.hybridBadge'),
        subtitle: t('settings.aiUsageDashboard.features.summary.subtitle'),
      },
      {
        key: 'ask',
        icon: <MessageCircleQuestion size={20} color={color.accent.transcript} strokeWidth={1.8} />,
        label: t('settings.aiUsageDashboard.features.ask.title'),
        value: t('settings.aiUsageDashboard.hybridBadge'),
        subtitle: t('settings.aiUsageDashboard.features.ask.subtitle'),
      },
      {
        key: 'translate',
        icon: <Languages size={20} color={color.accent.cache} strokeWidth={1.8} />,
        label: t('settings.aiUsageDashboard.features.translate.title'),
        value: t('settings.aiUsageDashboard.cloudBadge'),
        subtitle: t('settings.aiUsageDashboard.features.translate.subtitle'),
      },
      {
        key: 'digest',
        icon: <Newspaper size={20} color={color.accent.transcript} strokeWidth={1.8} />,
        label: t('settings.aiUsageDashboard.features.digest.title'),
        value: t('settings.aiUsageDashboard.cloudBadge'),
        subtitle: t('settings.aiUsageDashboard.features.digest.subtitle'),
      },
      {
        key: 'autoOrganize',
        icon: <FolderTree size={20} color={color.accent.aiData} strokeWidth={1.8} />,
        label: t('settings.aiUsageDashboard.features.autoOrganize.title'),
        value: t('settings.aiUsageDashboard.cloudBadge'),
        subtitle: t('settings.aiUsageDashboard.features.autoOrganize.subtitle'),
      },
    ],
    [color, t],
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('settings.aiUsageDashboard.title')} onBack={handleBack} />
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
              refreshing={refreshing}
              onRefresh={() => loadUsage(true)}
              tintColor={color.status.processing.text}
              colors={[color.status.processing.text]}
              progressBackgroundColor={color.background.secondary}
            />
          }
        >
          {loading ? (
            <UsageMetricsSkeleton color={color} />
          ) : usage == null ? (
            <View
              className="mb-7 overflow-hidden rounded-2xl"
              style={{ borderWidth: 1, borderColor: color.border.default }}
            >
              <SettingsRow
                label={t('settings.aiUsage.loadFailed')}
                subtitle={t('settings.aiUsage.loadFailedHint')}
                leftIcon={<WifiOff size={20} color={color.text.secondary} strokeWidth={1.8} />}
                showChevron={false}
                isFirst
                isLast
              />
            </View>
          ) : (
            <View className="mb-7 flex-row flex-wrap gap-3">
              <UsageMetricCard
                label={t('settings.aiUsageDashboard.metrics.used')}
                value={usedText}
                helper={t('settings.aiUsageDashboard.metrics.usedHelper', {
                  percent: progressPercent,
                })}
                color={color}
                tone={color.text.primary}
              />
              <UsageMetricCard
                label={t('settings.aiUsageDashboard.metrics.remaining')}
                value={remainingText}
                helper={t('settings.aiUsageDashboard.metrics.remainingHelper')}
                color={color}
                tone={usage?.remaining === 0 ? color.accent.delete : color.accent.primary}
              />
              <UsageMetricCard
                label={t('settings.aiUsageDashboard.metrics.limit')}
                value={limitText}
                helper={
                  isProActive
                    ? t('settings.aiUsageDashboard.metrics.proLimitHelper')
                    : t('settings.aiUsageDashboard.metrics.freeLimitHelper')
                }
                color={color}
                tone={color.accent.transcript}
              />
              <UsageMetricCard
                label={t('settings.aiUsageDashboard.metrics.reset')}
                value={t('settings.aiUsageDashboard.metrics.weekly')}
                helper={resetDateText}
                color={color}
                tone={color.accent.cache}
              />
            </View>
          )}

          <SettingsSection title={t('settings.aiUsageDashboard.featureBreakdownTitle')}>
            {featureRows.map((row, index) => (
              <SettingsRow
                key={row.key}
                label={row.label}
                subtitle={row.subtitle}
                value={row.value}
                leftIcon={row.icon}
                showChevron={false}
                isFirst={index === 0}
                isLast={index === featureRows.length - 1}
              />
            ))}
          </SettingsSection>

          <SettingsSection title={t('settings.aiUsageDashboard.history.title')}>
            {historyLoading ? (
              <SettingsRow
                label={t('settings.aiUsageDashboard.history.loading')}
                leftIcon={<ActivityIndicator size="small" color={color.accent.primary} />}
                showChevron={false}
                isFirst
                isLast
              />
            ) : historyLoadFailed && historyItems.length === 0 ? (
              <SettingsRow
                label={t('settings.aiUsageDashboard.history.loadFailed')}
                subtitle={t('settings.aiUsageDashboard.history.loadFailedHint')}
                leftIcon={<WifiOff size={20} color={color.text.secondary} strokeWidth={1.8} />}
                showChevron={false}
                isFirst
                isLast
              />
            ) : historyItems.length === 0 ? (
              <SettingsRow
                label={t('settings.aiUsageDashboard.history.emptyTitle')}
                subtitle={t('settings.aiUsageDashboard.history.emptySubtitle')}
                leftIcon={<Cloud size={20} color={color.text.secondary} strokeWidth={1.8} />}
                showChevron={false}
                isFirst
                isLast
              />
            ) : (
              <>
                {historyItems.map((entry, index) => (
                  <SettingsRow
                    key={entry.id}
                    label={getHistoryOperationLabel(entry)}
                    subtitle={getHistorySubtitle(entry)}
                    rightSlot={<HistoryAmount amount={entry.amount} color={color} />}
                    showChevron={false}
                    isFirst={index === 0}
                    isLast={index === historyItems.length - 1 && !historyHasFooter}
                  />
                ))}
                {historyLoadFailed ? (
                  <SettingsRow
                    label={t('settings.aiUsageDashboard.history.loadMoreFailed')}
                    subtitle={t('settings.aiUsageDashboard.history.loadFailedHint')}
                    leftIcon={<WifiOff size={20} color={color.text.secondary} strokeWidth={1.8} />}
                    showChevron={false}
                    isLast={historyCursor == null}
                  />
                ) : null}
                {historyCursor ? (
                  <SettingsRow
                    label={t('settings.aiUsageDashboard.history.loadMore')}
                    onPress={historyLoadingMore ? undefined : loadMoreHistory}
                    rightSlot={
                      historyLoadingMore ? (
                        <ActivityIndicator size="small" color={color.accent.primary} />
                      ) : undefined
                    }
                    showChevron={false}
                    isLast
                  />
                ) : null}
              </>
            )}
          </SettingsSection>

          <View
            className="mb-7 rounded-2xl p-4"
            style={{
              borderWidth: 1,
              borderColor: color.border.default,
              backgroundColor: color.background.card,
            }}
          >
            <View className="mb-3 flex-row items-center gap-2">
              <Cloud size={18} color={color.accent.primary} strokeWidth={1.8} />
              <Text
                className="text-[16px] font-semibold leading-[21px]"
                style={{ color: color.text.primary }}
              >
                {t('settings.aiUsageDashboard.savingTitle')}
              </Text>
            </View>
            {[
              t('settings.aiUsageDashboard.savingTips.localTranscription'),
              t('settings.aiUsageDashboard.savingTips.batchAsk'),
              t('settings.aiUsageDashboard.savingTips.privateMode'),
            ].map((tip) => (
              <View key={tip} className="mb-2 flex-row gap-2">
                <Text className="text-[14px] leading-5" style={{ color: color.accent.primary }}>
                  •
                </Text>
                <Text
                  className="flex-1 text-[14px] leading-5"
                  style={{ color: color.text.secondary }}
                >
                  {tip}
                </Text>
              </View>
            ))}
          </View>

          <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} />
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
