import { MenuView } from '@react-native-menu/menu';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Info,
  Newspaper,
  Share as ShareIcon,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import { alertAiLimitExceeded } from '@/app/navigation/openPlanPaywall';
import { useRecordStore } from '@/entities/record';
import { isDigestAiEnabled, useSettingsStore } from '@/entities/settings';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { useProEntitlement } from '@/features/pro-license';
import { saveLastShareRecipientEmail } from '@/features/share-record';
import type { ShareRecordExportFormat } from '@/features/share-record/model/shareRecordExportFormat';
import { useAppTheme, useColors } from '@/shared/config';
import { hapticError, hapticSelection, hapticSuccess } from '@/shared/lib';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import type { DigestAiResult } from '@/shared/lib/ai-api';
import { ensureCloudAiThirdPartyConsent } from '@/shared/lib/cloud-ai-consent';
import { resolveDayjsLocale } from '@/shared/lib/date';
import { toUserFacingFetchErrorFromUnknown } from '@/shared/lib/fetch/userFacingFetchError';
import {
  formatLocalTimeOfDay,
  formatTaskDeadlineTimeForDisplay,
} from '@/shared/lib/taskDeadlineTimeDisplay';
import { Button, HeaderIconButton, NoteMarkdown, SCREEN_PADDING, ScreenHeader } from '@/shared/ui';

import { getSettingsIconColor } from '../lib';
import { buildAppStats, formatDigestDurationMs } from '../lib/appStats';
import {
  buildAnalyticsSharePayload,
  formatAnalyticsTaskLine,
} from '../lib/buildAnalyticsSharePayload';
import { buildDigestAiExecutionContext } from '../lib/buildDigestAiExecutionContext';
import {
  buildDeterministicDigest,
  buildDigestAiPayload,
  buildDigestSharePayload,
  type DigestAiPayloadCoverage,
  type DigestFormat,
  type DigestPeriod,
  getDigestAiPayloadCoverage,
  getDigestCacheKey,
  getStoredDigestFormat,
  isDigestAiPeriod,
  loadCachedDigest,
  saveStoredDigestFormat,
} from '../lib/digest';
import {
  consumeDigestGenerationError,
  startDigestGeneration,
  useDigestGenerating,
} from '../lib/digestGeneration';
import {
  emailDigestExport,
  sanitizeDigestFileBaseName,
  shareDigestExport,
  shareDigestPlainText,
} from '../lib/shareDigest';
import { AppStatsContent } from './AppStatsContent';
import { DigestPeriodFilter } from './DigestPeriodFilter';
import { AnimatedMetricCard, DigestCollapsibleSectionCard } from './DigestScreenCards';
import { type DigestShareKind, DigestShareSheet } from './DigestShareSheet';

function DigestAiCoverageBanner({ coverage }: { coverage: DigestAiPayloadCoverage }) {
  const { t } = useTranslation();
  const color = useColors();
  const showNotesPartial = coverage.hasOmittedNotes;
  const showSummariesTruncated = coverage.truncatedSummaryCount > 0;

  if (!showNotesPartial && !showSummariesTruncated) {
    return null;
  }

  return (
    <View
      className="mb-4 rounded-2xl px-4 py-3"
      style={{
        borderWidth: 1,
        borderColor: color.border.default,
        backgroundColor: color.background.tertiary,
      }}
    >
      <View className="flex-row items-start gap-3">
        <Info size={18} color={color.accent.primary} strokeWidth={1.8} style={{ marginTop: 1 }} />
        <View className="flex-1 gap-1">
          {showNotesPartial ? (
            <Text className="text-[13px] leading-[18px]" style={{ color: color.text.secondary }}>
              {t('settings.digest.aiCoverageNotesPartial', {
                included: coverage.includedNotes,
                total: coverage.totalNotes,
              })}
            </Text>
          ) : null}
          {showSummariesTruncated ? (
            <Text className="text-[13px] leading-[18px]" style={{ color: color.text.secondary }}>
              {t('settings.digest.aiCoverageSummariesTruncated', {
                count: coverage.truncatedSummaryCount,
              })}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function DigestAiLoadingState({ viaPrivateRemote }: { viaPrivateRemote: boolean }) {
  const { t } = useTranslation();
  const color = useColors();
  const generatingDescriptionKey = viaPrivateRemote
    ? 'settings.digest.aiGeneratingDescriptionPrivateRemote'
    : 'settings.digest.aiGeneratingDescriptionCloud';

  return (
    <View
      className="mb-4 rounded-2xl px-4 py-3"
      style={{
        borderWidth: 1,
        borderColor: color.border.default,
        backgroundColor: color.background.tertiary,
      }}
    >
      <View className="flex-row items-center gap-3">
        <View
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: color.background.card }}
        >
          <ActivityIndicator size="small" color={color.accent.primary} />
        </View>
        <View className="flex-1">
          <Text
            className="text-[15px] font-semibold leading-5"
            style={{ color: color.text.primary }}
          >
            {t('settings.digest.aiGenerating')}
          </Text>
          <Text className="mt-1 text-[13px] leading-[18px]" style={{ color: color.text.secondary }}>
            {t(generatingDescriptionKey)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function BulletList({ items, emptyText }: { items: string[]; emptyText: string }) {
  const color = useColors();
  if (items.length === 0) {
    return (
      <Text className="text-[14px] leading-5" style={{ color: color.text.muted }}>
        {emptyText}
      </Text>
    );
  }

  return (
    <View className="gap-2">
      {items.map((item) => (
        <View key={item} className="flex-row items-start gap-2">
          <Text className="w-3 text-[14px] leading-5" style={{ color: color.accent.primary }}>
            •
          </Text>
          <Text className="flex-1 text-[14px] leading-5" style={{ color: color.text.secondary }}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

function DigestFormatTabs({
  format,
  onChange,
}: {
  format: DigestFormat;
  onChange: (format: DigestFormat) => void;
}) {
  const { t } = useTranslation();
  const color = useColors();
  const theme = useAppTheme();
  const isDark = theme === 'dark';
  const items: DigestFormat[] = ['brief', 'detailed', 'tasks'];
  const selectedLabel = t(`settings.digest.format.${format}`);

  return (
    <View
      className="mb-5 flex-row items-center justify-between gap-3 rounded-2xl px-4 py-3"
      style={{
        borderWidth: 1,
        borderColor: color.border.default,
        backgroundColor: color.background.card,
      }}
    >
      <View className="min-w-0 flex-1">
        <Text
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: color.text.secondary }}
        >
          {t('settings.digest.formatTitle')}
        </Text>
        <Text
          className="mt-0.5 text-[13px] leading-[18px]"
          style={{ color: color.text.muted }}
          numberOfLines={1}
        >
          {t('settings.digest.formatHint')}
        </Text>
      </View>
      <MenuView
        key={`digest-format-${theme}`}
        themeVariant={isDark ? 'dark' : 'light'}
        shouldOpenOnLongPress={false}
        onPressAction={({ nativeEvent }) => {
          const next = nativeEvent.event as DigestFormat;
          if (!items.includes(next)) return;
          hapticSelection();
          onChange(next);
        }}
        actions={items.map((item) => ({
          id: item,
          title: t(`settings.digest.format.${item}`),
          titleColor: color.text.primary,
          state: item === format ? 'on' : 'off',
        }))}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${t('settings.digest.formatTitle')}: ${selectedLabel}`}
          className="min-h-10 flex-row items-center gap-1.5 rounded-full px-3.5 py-2"
          style={{ backgroundColor: color.background.tertiary }}
          activeOpacity={0.75}
        >
          <Text
            className="text-[14px] font-semibold leading-[18px]"
            style={{ color: color.text.primary }}
            numberOfLines={1}
          >
            {selectedLabel}
          </Text>
          <ChevronDown size={16} color={color.text.secondary} strokeWidth={2} />
        </TouchableOpacity>
      </MenuView>
    </View>
  );
}

export const DigestScreen = () => {
  const { t, i18n } = useTranslation();
  const color = useColors();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const records = useRecordStore((s) => s.records);
  const isLoaded = useRecordStore((s) => s.isLoaded);
  const loadRecords = useRecordStore((s) => s.load);
  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);
  const aiModelRoutingMode = useSettingsStore((s) => s.aiModelRoutingMode);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  const isTablet = useIsTablet();
  const digestAiEnabled = isDigestAiEnabled(aiExecutionMode, privateAiProvider);
  const useCloudDigest = aiExecutionMode === 'smart_hybrid';
  const usePrivateRemoteDigest = digestAiEnabled && !useCloudDigest;

  const [period, setPeriod] = useState<DigestPeriod>('day');
  const [digestFormat, setDigestFormat] = useState<DigestFormat>(() => getStoredDigestFormat());
  const [refreshing, setRefreshing] = useState(false);
  const [aiResult, setAiResult] = useState<DigestAiResult | null>(null);
  const [aiCreatedAt, setAiCreatedAt] = useState<string | null>(null);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const { isProActive } = useProEntitlement();
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!isLoaded) {
      void loadRecords();
    }
  }, [isLoaded, loadRecords]);

  const digest = useMemo(() => buildDeterministicDigest(period, records), [period, records]);
  const aiPayloadCoverage = useMemo(() => getDigestAiPayloadCoverage(digest), [digest]);
  const digestCacheKey = useMemo(
    () => getDigestCacheKey(digest, digestFormat),
    [digest, digestFormat],
  );
  const aiLoading = useDigestGenerating(digestCacheKey);
  const lastSyncCachedDigestRef = useRef<number>(0);
  const SYNC_CACHED_DIGEST_THROTTLE_MS = 1000;

  const syncCachedDigest = useCallback(() => {
    const now = Date.now();
    if (now - lastSyncCachedDigestRef.current < SYNC_CACHED_DIGEST_THROTTLE_MS) {
      return;
    }
    lastSyncCachedDigestRef.current = now;
    const cached = loadCachedDigest(digestCacheKey);
    setAiResult(cached?.result ?? null);
    setAiCreatedAt(cached?.createdAt ?? null);
  }, [digestCacheKey]);

  const handleDigestFormatChange = useCallback((format: DigestFormat) => {
    saveStoredDigestFormat(format);
    setDigestFormat(format);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    syncCachedDigest();
  }, [digestCacheKey, aiLoading, syncCachedDigest]);

  const showDigestGenerationError = useCallback(
    (error: NonNullable<ReturnType<typeof consumeDigestGenerationError>>) => {
      if (error.type === 'limit') {
        alertAiLimitExceeded(t('settings.digest.aiLimitError'));
        return;
      }
      Alert.alert(t('common.error'), error.message);
    },
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      const pendingError = consumeDigestGenerationError(digestCacheKey);
      if (pendingError) {
        showDigestGenerationError(pendingError);
      }
      syncCachedDigest();
    }, [digestCacheKey, showDigestGenerationError, syncCachedDigest]),
  );

  const dayjsLocale = resolveDayjsLocale(i18n.language);
  const digestAiPeriodActive = isDigestAiPeriod(period);
  const rangeText =
    period === 'all'
      ? t('settings.digest.period.all')
      : period === 'day'
        ? dayjs(digest.fromIso).locale(dayjsLocale).format('D MMMM YYYY')
        : `${dayjs(digest.fromIso).locale(dayjsLocale).format('D MMM')} - ${dayjs(digest.toIso)
            .locale(dayjsLocale)
            .format('D MMM YYYY')}`;
  const metricsHelperKey =
    period === 'all'
      ? 'settings.digest.metrics.allTimeHelper'
      : 'settings.digest.metrics.recordsHelper';

  const formatDuration = (durationMs: number): string => formatDigestDurationMs(durationMs, t);

  const onRefresh = useCallback(async () => {
    if (!digestAiEnabled) return;

    setRefreshing(true);
    try {
      await loadRecords();
    } finally {
      setRefreshing(false);
    }
  }, [digestAiEnabled, loadRecords]);

  const handleGenerate = useCallback(async () => {
    if (!digestAiEnabled || !digestAiPeriodActive) {
      if (!digestAiPeriodActive) {
        Alert.alert(t('settings.digest.aiTitle'), t('settings.digest.aiUnavailableAllTime'));
        return;
      }
      Alert.alert(t('settings.digest.unavailableTitle'), t('settings.digest.unavailableDesc'));
      return;
    }
    if (digest.recordCount === 0) return;

    if (useCloudDigest) {
      const consentOk = await ensureCloudAiThirdPartyConsent();
      if (!consentOk) return;
    }

    const language = i18n.language.toLowerCase().startsWith('ru') ? 'ru' : 'en';
    void startDigestGeneration({
      cacheKey: digestCacheKey,
      payload: buildDigestAiPayload(digest, language, digestFormat),
      target: useCloudDigest
        ? { kind: 'cloud', model: selectedAIModel, modelMode: aiModelRoutingMode }
        : { kind: 'private_remote', ctx: buildDigestAiExecutionContext() },
    }).then(() => {
      if (!mountedRef.current) return;

      const pendingError = consumeDigestGenerationError(digestCacheKey);
      if (pendingError) {
        showDigestGenerationError(pendingError);
        return;
      }

      syncCachedDigest();
    });
  }, [
    aiModelRoutingMode,
    digest,
    digestAiEnabled,
    digestAiPeriodActive,
    digestCacheKey,
    digestFormat,
    i18n.language,
    selectedAIModel,
    useCloudDigest,
    showDigestGenerationError,
    syncCachedDigest,
    t,
  ]);

  const topPhraseItems = digest.topKeyPhrases.map((item) =>
    item.count > 1 ? `${item.phrase} x${item.count}` : item.phrase,
  );
  const openTaskItems = digest.openTasks.slice(0, 8).map((task) => {
    const time = task.deadlineTime ? ` ${formatTaskDeadlineTimeForDisplay(task.deadlineTime)}` : '';
    const deadline = task.deadline ? ` - ${dayjs(task.deadline).format('D MMM')}${time}` : '';
    return `${task.text}${deadline}`;
  });
  const overdueTaskItems = digest.overdueTasks.map((task) => {
    const time = task.deadlineTime ? ` ${formatTaskDeadlineTimeForDisplay(task.deadlineTime)}` : '';
    const deadline = task.deadline ? ` - ${dayjs(task.deadline).format('D MMM')}${time}` : '';
    return `${task.text}${deadline}`;
  });
  const aiGeneratedText = aiCreatedAt
    ? t('settings.digest.aiGeneratedAt', {
        date: `${dayjs(aiCreatedAt).locale(dayjsLocale).format('D MMM')} ${formatLocalTimeOfDay(dayjs(aiCreatedAt).toDate())}`,
      })
    : t('settings.digest.aiManualHint');
  const aiDescriptionKey = usePrivateRemoteDigest
    ? 'settings.digest.aiDescriptionPrivateRemote'
    : useCloudDigest
      ? 'settings.digest.aiDescriptionCloud'
      : 'settings.digest.aiDescription';

  const digestSharePayload = useMemo(() => {
    if (!aiResult) return null;

    const generatedDate = aiCreatedAt ? dayjs(aiCreatedAt).toDate() : new Date();
    const { message, title } = buildDigestSharePayload({
      title: t('settings.digest.title'),
      periodLabel: t(`settings.digest.period.${period}`),
      rangeText,
      formatLabel: t(`settings.digest.format.${digestFormat}`),
      generatedAtText: `${dayjs(generatedDate).locale(dayjsLocale).format('D MMM YYYY')} ${formatLocalTimeOfDay(generatedDate)}`,
      sourceNote: t('settings.digest.exportSourceNote'),
      labels: {
        period: t('settings.digest.exportHeader.period'),
        dates: t('settings.digest.exportHeader.dates'),
        format: t('settings.digest.exportHeader.format'),
        generated: t('settings.digest.exportHeader.generated'),
      },
      markdown: aiResult.markdown,
    });

    return {
      message,
      title,
      fileBaseName: sanitizeDigestFileBaseName(title),
    };
  }, [aiCreatedAt, aiResult, dayjsLocale, digestFormat, period, rangeText, t]);

  const analyticsSharePayload = useMemo(() => {
    const stats = buildAppStats(period, records, i18n.language);
    const exportedAt = new Date();
    const exportedAtText = `${dayjs(exportedAt).locale(dayjsLocale).format('D MMM YYYY')} ${formatLocalTimeOfDay(exportedAt)}`;
    const { message, title } = buildAnalyticsSharePayload({
      periodLabel: t(`settings.digest.period.${period}`),
      rangeText,
      exportedAtText,
      stats,
      digest,
      formatDuration: (durationMs) => formatDigestDurationMs(durationMs, t),
      formatTaskLine: (task) =>
        formatAnalyticsTaskLine(task, (hhmm) =>
          hhmm?.trim() ? ` ${formatTaskDeadlineTimeForDisplay(hhmm)}` : '',
        ),
      labels: {
        title: t('appStats.title'),
        period: t('settings.digest.exportHeader.period'),
        dates: t('settings.digest.exportHeader.dates'),
        exported: t('settings.digest.exportHeader.exported'),
        sourceNote: t('settings.digest.exportAnalyticsSourceNote'),
        overview: t('settings.digest.exportAnalyticsOverview'),
        totalRecords: t('appStats.totalRecords'),
        totalDuration: t('appStats.totalDuration'),
        aiProcessed: t('appStats.aiProcessed'),
        tasksCompletion: t('appStats.tasksCompletion'),
        activity: t(`appStats.activityTitle.${period}`),
        activityColumnLabel: t('settings.digest.exportAnalyticsActivityLabel'),
        activityColumnCount: t('settings.digest.exportAnalyticsActivityCount'),
        classification: t('appStats.classification'),
        classificationType: t('settings.digest.exportAnalyticsClassificationType'),
        classificationCount: t('settings.digest.exportAnalyticsClassificationCount'),
        classificationShare: t('settings.digest.exportAnalyticsClassificationShare'),
        topTags: t('appStats.topTags'),
        topicsTitle: t('settings.digest.topicsTitle'),
        nextStepsTitle: t('settings.digest.nextStepsTitle'),
        openTasksTitle: t('settings.digest.openTasksTitle'),
        overdueTitle: t('settings.digest.overdueTitle'),
        empty: t('settings.digest.exportAnalyticsEmpty'),
        class: {
          work: t('appStats.class.work'),
          meeting: t('appStats.class.meeting'),
          idea: t('appStats.class.idea'),
          personal: t('appStats.class.personal'),
          other: t('appStats.class.other'),
        },
      },
    });

    return {
      message,
      title,
      fileBaseName: sanitizeDigestFileBaseName(title),
    };
  }, [dayjsLocale, digest, i18n.language, period, rangeText, records, t]);

  const resolveSharePayload = useCallback(
    (kind: DigestShareKind) => (kind === 'aiDigest' ? digestSharePayload : analyticsSharePayload),
    [analyticsSharePayload, digestSharePayload],
  );

  const handleShareDigestExport = useCallback(
    async (format: ShareRecordExportFormat, kind: DigestShareKind) => {
      const payload = resolveSharePayload(kind);
      if (!payload) return;

      try {
        await shareDigestExport(payload, format);
      } catch (err) {
        Alert.alert(t('common.error'), toUserFacingFetchErrorFromUnknown(err));
      }
    },
    [resolveSharePayload, t],
  );

  const handleEmailDigest = useCallback(
    async (email: string, format: ShareRecordExportFormat, kind: DigestShareKind) => {
      const payload = resolveSharePayload(kind);
      if (!payload) return;

      setEmailSending(true);
      try {
        await emailDigestExport(email, payload, format);
        saveLastShareRecipientEmail(email);
        hapticSuccess();
        setShareSheetVisible(false);
        const sentMessageKey =
          kind === 'analytics'
            ? 'settings.digest.emailSentMessageAnalytics'
            : 'settings.digest.emailSentMessage';
        Alert.alert(t('share.emailSentTitle'), t(sentMessageKey, { email }));
      } catch (err) {
        hapticError();
        Alert.alert(t('share.emailFailedTitle'), toUserFacingFetchErrorFromUnknown(err));
      } finally {
        setEmailSending(false);
      }
    },
    [resolveSharePayload, t],
  );

  const canShareAnalytics = analyticsSharePayload !== null;
  const canShareAiDigest = digestSharePayload !== null;

  const onOpenShare = useCallback(() => {
    if (!canShareAnalytics && !canShareAiDigest) return;

    if (isProActive) {
      setShareSheetVisible(true);
      return;
    }

    const fallbackPayload = digestSharePayload ?? analyticsSharePayload;
    if (!fallbackPayload) return;

    void shareDigestPlainText(fallbackPayload).catch((err: unknown) => {
      Alert.alert(t('common.error'), toUserFacingFetchErrorFromUnknown(err));
    });
  }, [
    analyticsSharePayload,
    canShareAiDigest,
    canShareAnalytics,
    digestSharePayload,
    isProActive,
    t,
  ]);

  const onCloseShareSheet = useCallback(() => setShareSheetVisible(false), []);

  const shareHeaderButton = useMemo(
    () =>
      canShareAnalytics || canShareAiDigest ? (
        <HeaderIconButton
          iconOnly
          variant="icon"
          size="md"
          icon={<ShareIcon size={20} color={color.text.primary} strokeWidth={2.2} />}
          color={color}
          onPress={onOpenShare}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={t('share.share')}
        />
      ) : null,
    [canShareAiDigest, canShareAnalytics, color, onOpenShare, t],
  );

  if (!digestAiEnabled) {
    return (
      <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
        <ScreenHeader
          title={t('settings.digest.sectionTitle')}
          onBack={() => navigation.goBack()}
          rightSlot={shareHeaderButton}
        />
        <View style={{ flex: 1, alignSelf: 'center', width: '100%', maxWidth: contentMaxWidth }}>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: SCREEN_PADDING,
              paddingTop: 16,
              paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
            }}
            showsVerticalScrollIndicator={false}
          >
            <DigestPeriodFilter period={period} onChange={setPeriod} />
            <AppStatsContent period={period} locale={i18n.language} />
            <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} />
          </ScrollView>
        </View>

        <DigestShareSheet
          visible={shareSheetVisible}
          isSendingEmail={emailSending}
          canShareAnalytics={canShareAnalytics}
          canShareAiDigest={false}
          onClose={onCloseShareSheet}
          onShare={handleShareDigestExport}
          onEmail={handleEmailDigest}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader
        title={t('settings.digest.title')}
        onBack={() => navigation.goBack()}
        rightSlot={shareHeaderButton}
      />
      <View style={{ flex: 1, alignSelf: 'center', width: '100%', maxWidth: contentMaxWidth }}>
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
              onRefresh={onRefresh}
              tintColor={color.status.processing.text}
              colors={[color.status.processing.text]}
              progressBackgroundColor={color.background.secondary}
            />
          }
        >
          <DigestPeriodFilter period={period} onChange={setPeriod} />

          <View className="mb-5 px-1">
            <Text
              className="text-[20px] font-semibold leading-7"
              style={{ color: color.text.primary }}
            >
              {rangeText}
            </Text>
            <Text className="mt-1 text-[14px] leading-5" style={{ color: color.text.secondary }}>
              {period === 'all' ? t('settings.digest.subtitleAll') : t('settings.digest.subtitle')}
            </Text>
          </View>

          <View className="mb-7 flex-row flex-wrap gap-3">
            <AnimatedMetricCard
              animationKey={`digest-${period}-records`}
              label={t('settings.digest.metrics.records')}
              rawValue={digest.recordCount}
              formatter={(n) => `${n}`}
              helper={t(metricsHelperKey)}
              tone={color.text.primary}
            />
            <AnimatedMetricCard
              animationKey={`digest-${period}-duration`}
              label={t('settings.digest.metrics.duration')}
              rawValue={Math.floor(digest.totalDurationMs / 60_000)}
              formatter={(n) => formatDuration(n * 60_000)}
              helper={t('settings.digest.metrics.durationHelper')}
              tone={color.accent.transcript}
            />
            <AnimatedMetricCard
              animationKey={`digest-${period}-open-tasks`}
              label={t('settings.digest.metrics.openTasks')}
              rawValue={digest.openTasks.length}
              formatter={(n) => `${n}`}
              helper={t(metricsHelperKey)}
              tone={color.accent.primary}
            />
            <AnimatedMetricCard
              animationKey={`digest-${period}-overdue`}
              label={t('settings.digest.metrics.overdue')}
              rawValue={digest.overdueTasks.length}
              formatter={(n) => `${n}`}
              helper={t(metricsHelperKey)}
              tone={digest.overdueTasks.length > 0 ? color.accent.delete : color.accent.success}
            />
          </View>

          {digestAiPeriodActive ? (
            <DigestFormatTabs format={digestFormat} onChange={handleDigestFormatChange} />
          ) : null}

          <DigestCollapsibleSectionCard
            key={`digest-ai-${period}`}
            title={t('settings.digest.aiTitle')}
            icon={
              <Newspaper
                size={18}
                color={getSettingsIconColor(color, 'newspaper')}
                strokeWidth={1.8}
              />
            }
            defaultExpanded={!aiResult && digestAiPeriodActive && digest.recordCount > 0}
            persistentContent={
              digestAiPeriodActive && aiCreatedAt ? (
                <Text className="text-[13px] leading-[18px]" style={{ color: color.text.muted }}>
                  {aiGeneratedText}
                </Text>
              ) : undefined
            }
          >
            {digestAiPeriodActive ? (
              <>
                {!aiCreatedAt ? (
                  <Text
                    className="mb-3 text-[13px] leading-[18px]"
                    style={{ color: color.text.muted }}
                  >
                    {aiGeneratedText}
                  </Text>
                ) : null}
                {digest.recordCount > 0 ? (
                  <DigestAiCoverageBanner coverage={aiPayloadCoverage} />
                ) : null}
                {aiResult ? (
                  <View className="mb-4">
                    <NoteMarkdown color={color} variant="digest">
                      {aiResult.markdown}
                    </NoteMarkdown>
                  </View>
                ) : aiLoading ? (
                  <DigestAiLoadingState viaPrivateRemote={usePrivateRemoteDigest} />
                ) : (
                  <Text
                    className="mb-4 text-[14px] leading-5"
                    style={{ color: color.text.secondary }}
                  >
                    {digest.recordCount === 0 ? t('settings.digest.emptyAi') : t(aiDescriptionKey)}
                  </Text>
                )}
                {aiLoading && aiResult ? (
                  <DigestAiLoadingState viaPrivateRemote={usePrivateRemoteDigest} />
                ) : null}
                {!aiLoading ? (
                  <Button
                    label={
                      aiResult ? t('settings.digest.regenerateAi') : t('settings.digest.generateAi')
                    }
                    color={color}
                    disabled={digest.recordCount === 0}
                    onPress={handleGenerate}
                    fullWidth
                  />
                ) : null}
              </>
            ) : (
              <Text className="text-[14px] leading-5" style={{ color: color.text.secondary }}>
                {t('settings.digest.aiUnavailableAllTime')}
              </Text>
            )}
          </DigestCollapsibleSectionCard>

          <AppStatsContent period={period} locale={i18n.language} />

          <DigestCollapsibleSectionCard
            key={`digest-topics-${period}`}
            title={t('settings.digest.topicsTitle')}
            icon={<CalendarDays size={18} color={color.accent.cache} strokeWidth={1.8} />}
            defaultExpanded={topPhraseItems.length > 0}
          >
            <BulletList items={topPhraseItems} emptyText={t('settings.digest.emptyTopics')} />
          </DigestCollapsibleSectionCard>

          <DigestCollapsibleSectionCard
            key={`digest-next-steps-${period}`}
            title={t('settings.digest.nextStepsTitle')}
            icon={<CheckCircle2 size={18} color={color.accent.success} strokeWidth={1.8} />}
            defaultExpanded={digest.nextSteps.length > 0}
          >
            <BulletList items={digest.nextSteps} emptyText={t('settings.digest.emptyNextSteps')} />
          </DigestCollapsibleSectionCard>

          <DigestCollapsibleSectionCard
            key={`digest-open-tasks-${period}`}
            title={t('settings.digest.openTasksTitle')}
            icon={<Clock3 size={18} color={color.accent.primary} strokeWidth={1.8} />}
            defaultExpanded={openTaskItems.length > 0}
          >
            <BulletList items={openTaskItems} emptyText={t('settings.digest.emptyOpenTasks')} />
          </DigestCollapsibleSectionCard>

          {digest.overdueTasks.length > 0 ? (
            <DigestCollapsibleSectionCard
              key={`digest-overdue-${period}`}
              title={t('settings.digest.overdueTitle')}
              icon={<AlertTriangle size={18} color={color.accent.delete} strokeWidth={1.8} />}
              defaultExpanded
            >
              <BulletList items={overdueTaskItems} emptyText={t('settings.digest.emptyOverdue')} />
            </DigestCollapsibleSectionCard>
          ) : null}

          <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} />
        </ScrollView>
      </View>

      <DigestShareSheet
        visible={shareSheetVisible}
        isSendingEmail={emailSending}
        canShareAnalytics={canShareAnalytics}
        canShareAiDigest={canShareAiDigest}
        onClose={onCloseShareSheet}
        onShare={handleShareDigestExport}
        onEmail={handleEmailDigest}
      />
    </View>
  );
};
