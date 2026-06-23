import {
  AlertCircle,
  ArrowLeftRight,
  Cloud,
  Download,
  FolderTree,
  Gauge,
  History,
  Inbox,
  Languages,
  MessageCircleQuestion,
  Mic,
  Newspaper,
  Sparkles,
  UsersRound,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
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
import { isUserCancelledShare } from '@/features/share-record/lib/isUserCancelledShare';
import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import { hapticError, hapticSuccess, useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import {
  type AiUsage,
  type AiUsageHistoryEntry,
  getAiUsage,
  getAiUsageHistory,
} from '@/shared/lib/ai-api';
import { resolveAiModelRoutingDisplayLabel } from '@/shared/lib/aiModelRoutingDisplay';
import { formatLocalizedLongDateWithTime } from '@/shared/lib/taskDeadlineTimeDisplay';
import {
  FrostedHeaderIconButton,
  SCREEN_PADDING,
  ScreenHeader,
  SettingsRow,
  SettingsSection,
  SkeletonPulse,
} from '@/shared/ui';

import { getSettingsIconColor } from '../lib';
import { AiUsageHistoryExportError, exportAiUsageHistoryCsv } from '../lib/exportAiUsageHistoryCsv';

type UsageMetricCardProps = {
  label: string;
  value: string;
  helper: string;
  color: Colors;
  tone: string;
};

const HISTORY_PAGE_LIMIT = 5;

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

function SkeletonBar({
  color,
  width,
  height = 12,
  className,
}: {
  color: Colors;
  width: number | `${number}%`;
  height?: number;
  className?: string;
}) {
  return (
    <View
      className={`rounded ${className ?? ''}`}
      style={{ width, height, backgroundColor: color.background.tertiary }}
    />
  );
}

function SettingsListRowSkeleton({
  color,
  tall = false,
  isFirst = false,
  isLast = false,
}: {
  color: Colors;
  tall?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const borderStyle = !isLast
    ? { borderBottomWidth: 1, borderBottomColor: color.border.default }
    : {};

  return (
    <View
      className={`flex-row items-center px-4 py-3.5 ${isFirst ? 'rounded-t-2xl' : ''} ${isLast ? 'rounded-b-2xl' : ''}`}
      style={[
        {
          backgroundColor: color.background.card,
          minHeight: tall ? 68 : 52,
        },
        borderStyle,
      ]}
    >
      <View className="min-w-0 flex-1">
        <SkeletonBar color={color} width="52%" height={16} />
        {tall ? (
          <>
            <SkeletonBar color={color} width="72%" height={13} className="mt-2" />
            <SkeletonBar color={color} width="48%" height={13} className="mt-1.5" />
          </>
        ) : (
          <SkeletonBar color={color} width="68%" height={13} className="mt-2" />
        )}
      </View>
      <SkeletonBar color={color} width={36} height={28} className="ml-2 rounded-full" />
    </View>
  );
}

function AiUsageDashboardSkeleton({
  color,
  historyRowCount,
  historyTitle,
  featuresTitle,
}: {
  color: Colors;
  historyRowCount: number;
  historyTitle: string;
  featuresTitle: string;
}) {
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
            <SkeletonBar color={color} width={80} height={12} />
            <SkeletonBar color={color} width={56} height={24} className="mt-3" />
            <SkeletonBar color={color} width={96} height={12} className="mt-2" />
          </View>
        ))}
      </View>

      <View className="mb-7">
        <Text
          className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-widest"
          style={{ color: color.text.secondary }}
        >
          {historyTitle}
        </Text>
        <View
          className="overflow-hidden rounded-2xl"
          style={{ borderWidth: 1, borderColor: color.border.default }}
        >
          {Array.from({ length: historyRowCount }, (_, index) => (
            <SettingsListRowSkeleton
              key={`history-skeleton-${index}`}
              color={color}
              tall
              isFirst={index === 0}
              isLast={index === historyRowCount - 1}
            />
          ))}
        </View>
      </View>

      <View className="mb-7">
        <Text
          className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-widest"
          style={{ color: color.text.secondary }}
        >
          {featuresTitle}
        </Text>
        <View
          className="overflow-hidden rounded-2xl"
          style={{ borderWidth: 1, borderColor: color.border.default }}
        >
          {Array.from({ length: 6 }, (_, index) => (
            <View
              key={`feature-skeleton-${index}`}
              className={`flex-row items-center px-4 py-3.5 ${index === 0 ? 'rounded-t-2xl' : ''} ${index === 5 ? 'rounded-b-2xl' : ''}`}
              style={[
                {
                  backgroundColor: color.background.card,
                  minHeight: 68,
                },
                index < 5 ? { borderBottomWidth: 1, borderBottomColor: color.border.default } : {},
              ]}
            >
              <View
                className="mr-3 rounded-full"
                style={{
                  width: 24,
                  height: 24,
                  backgroundColor: color.background.tertiary,
                }}
              />
              <View className="min-w-0 flex-1">
                <SkeletonBar color={color} width="42%" height={16} />
                <SkeletonBar color={color} width="88%" height={13} className="mt-2" />
              </View>
              <SkeletonBar color={color} width={52} height={16} className="ml-2" />
            </View>
          ))}
        </View>
      </View>

      <View
        className="mb-7 rounded-2xl p-4"
        style={{
          borderWidth: 1,
          borderColor: color.border.default,
          backgroundColor: color.background.card,
        }}
      >
        <View className="mb-3 flex-row items-center gap-2">
          <View
            className="rounded-full"
            style={{ width: 18, height: 18, backgroundColor: color.background.tertiary }}
          />
          <SkeletonBar color={color} width={160} height={18} />
        </View>
        {[1, 2, 3].map((item) => (
          <SkeletonBar
            key={item}
            color={color}
            width={`${92 - item * 8}%`}
            height={14}
            className="mb-2"
          />
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
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyLoadFailed, setHistoryLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const loadUsage = useCallback(async (isPull = false) => {
    if (isPull) {
      setRefreshing(true);
    } else {
      setLoading(true);
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
    (entry: AiUsageHistoryEntry) => {
      const key = `settings.aiUsageDashboard.history.operations.${entry.operation}`;
      const label = t(key);
      return label === key ? t('settings.aiUsageDashboard.history.operations.unknown') : label;
    },
    [t],
  );
  const getHistorySubtitle = useCallback(
    (entry: AiUsageHistoryEntry) => {
      const date = formatLocalizedLongDateWithTime(entry.createdAt, i18n.language);
      const model = resolveAiModelRoutingDisplayLabel(t, {
        modelMode: entry.modelMode,
        model: entry.model,
        modelLabel: entry.modelLabel,
      });
      return model ? `${date}\n${model}` : date;
    },
    [i18n.language, t],
  );

  const handleExportCsv = useCallback(async () => {
    if (exportingCsv || loading) return;

    setExportingCsv(true);
    try {
      await exportAiUsageHistoryCsv({ t, language: i18n.language });
      hapticSuccess();
    } catch (err) {
      if (isUserCancelledShare(err)) return;

      if (err instanceof AiUsageHistoryExportError) {
        if (err.reason === 'empty') {
          Alert.alert(
            t('settings.aiUsageDashboard.history.exportCsv'),
            t('settings.aiUsageDashboard.history.exportCsvEmpty'),
          );
          return;
        }
      }

      hapticError();
      Alert.alert(t('common.error'), t('settings.aiUsageDashboard.history.exportCsvFailed'));
    } finally {
      setExportingCsv(false);
    }
  }, [exportingCsv, i18n.language, loading, t]);

  const headerRightSlot = useMemo(
    () => (
      <FrostedHeaderIconButton
        iconOnly
        variant="icon"
        size="md"
        icon={<Download size={20} color={color.text.primary} strokeWidth={2} />}
        color={color}
        onPress={handleExportCsv}
        loading={exportingCsv}
        disabled={loading || exportingCsv}
        accessibilityLabel={t('settings.aiUsageDashboard.history.exportCsvA11y')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      />
    ),
    [color, exportingCsv, handleExportCsv, loading, t],
  );

  const featureRows = useMemo(
    () => [
      {
        key: 'transcription',
        icon: <Mic size={20} color={getSettingsIconColor(color, 'mic')} strokeWidth={1.8} />,
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
        key: 'meetingMode',
        icon: <UsersRound size={20} color={color.accent.models} strokeWidth={1.8} />,
        label: t('settings.aiUsageDashboard.features.meetingMode.title'),
        value: t('settings.aiUsageDashboard.hybridBadge'),
        subtitle: t('settings.aiUsageDashboard.features.meetingMode.subtitle'),
      },
      {
        key: 'ask',
        icon: <MessageCircleQuestion size={20} color={color.accent.transcript} strokeWidth={1.8} />,
        label: t('settings.aiUsageDashboard.features.ask.title'),
        value: t('settings.aiUsageDashboard.hybridBadge'),
        subtitle: t('settings.aiUsageDashboard.features.ask.subtitle'),
      },
      {
        key: 'inboxAsk',
        icon: <Inbox size={20} color={color.accent.aiData} strokeWidth={1.8} />,
        label: t('settings.aiUsageDashboard.features.inboxAsk.title'),
        value: t('settings.aiUsageDashboard.hybridBadge'),
        subtitle: t('settings.aiUsageDashboard.features.inboxAsk.subtitle'),
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
        icon: (
          <Newspaper size={20} color={getSettingsIconColor(color, 'newspaper')} strokeWidth={1.8} />
        ),
        label: t('settings.aiUsageDashboard.features.digest.title'),
        value: t('settings.aiUsageDashboard.hybridBadge'),
        subtitle: t('settings.aiUsageDashboard.features.digest.subtitle'),
      },
      {
        key: 'autoOrganize',
        icon: <FolderTree size={20} color={color.accent.aiData} strokeWidth={1.8} />,
        label: t('settings.aiUsageDashboard.features.autoOrganize.title'),
        value: t('settings.aiUsageDashboard.hybridBadge'),
        subtitle: t('settings.aiUsageDashboard.features.autoOrganize.subtitle'),
      },
    ],
    [color, t],
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader
        title={t('settings.aiUsageDashboard.title')}
        onBack={handleBack}
        rightSlot={headerRightSlot}
      />
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
            <AiUsageDashboardSkeleton
              color={color}
              historyRowCount={HISTORY_PAGE_LIMIT}
              historyTitle={t('settings.aiUsageDashboard.history.title')}
              featuresTitle={t('settings.aiUsageDashboard.featureBreakdownTitle')}
            />
          ) : (
            <>
              {usage == null ? (
                <View
                  className="mb-7 overflow-hidden rounded-2xl"
                  style={{ borderWidth: 1, borderColor: color.border.default }}
                >
                  <SettingsRow
                    label={t('settings.aiUsage.loadFailed')}
                    subtitle={t('settings.aiUsage.loadFailedHint')}
                    leftIcon={<Gauge size={20} color={color.text.secondary} strokeWidth={1.8} />}
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

              <SettingsSection title={t('settings.aiUsageDashboard.history.title')}>
                {historyLoadFailed && historyItems.length === 0 ? (
                  <SettingsRow
                    label={t('settings.aiUsageDashboard.history.loadFailed')}
                    subtitle={t('settings.aiUsageDashboard.history.loadFailedHint')}
                    leftIcon={
                      <History size={20} color={color.status.error.text} strokeWidth={1.8} />
                    }
                    showChevron={false}
                    isFirst
                    isLast
                  />
                ) : historyItems.length === 0 ? (
                  <SettingsRow
                    label={t('settings.aiUsageDashboard.history.emptyTitle')}
                    subtitle={t('settings.aiUsageDashboard.history.emptySubtitle')}
                    leftIcon={
                      <ArrowLeftRight size={20} color={color.text.muted} strokeWidth={1.8} />
                    }
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
                        leftIcon={
                          <AlertCircle
                            size={20}
                            color={color.status.error.text}
                            strokeWidth={1.8}
                          />
                        }
                        showChevron={false}
                        isLast={historyCursor == null}
                      />
                    ) : null}
                    {historyCursor ? (
                      <SettingsRow
                        label={t('settings.aiUsageDashboard.history.loadMore')}
                        loading={historyLoadingMore}
                        onPress={loadMoreHistory}
                        showChevron={false}
                        isLast
                      />
                    ) : null}
                  </>
                )}
              </SettingsSection>

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
                  t('settings.aiUsageDashboard.savingTips.meetingMode'),
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
            </>
          )}
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
