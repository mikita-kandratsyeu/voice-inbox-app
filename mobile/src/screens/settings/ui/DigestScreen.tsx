import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, Sparkles } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import Markdown from 'react-native-markdown-display';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { useColors } from '@/shared/config';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import type { DigestAiResult } from '@/shared/lib/ai-api';
import { generateDigest } from '@/shared/lib/ai-api';
import { ensureCloudAiThirdPartyConsent } from '@/shared/lib/cloud-ai-consent';
import { resolveDayjsLocale } from '@/shared/lib/date';
import { Button, SCREEN_PADDING, ScreenHeader } from '@/shared/ui';

import {
  buildDeterministicDigest,
  buildDigestAiPayload,
  type DigestPeriod,
  getDigestCacheKey,
  loadCachedDigest,
  saveCachedDigest,
} from '../lib/digest';

type MetricCardProps = {
  label: string;
  value: string;
  helper: string;
  tone: string;
};

function MetricCard({ label, value, helper, tone }: MetricCardProps) {
  const color = useColors();
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
      <Text className="mt-2 text-[22px] font-semibold leading-7" style={{ color: tone }}>
        {value}
      </Text>
      <Text className="mt-1 text-[13px] leading-[18px]" style={{ color: color.text.secondary }}>
        {helper}
      </Text>
    </View>
  );
}

function SectionCard({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const color = useColors();
  return (
    <View
      className="mb-7 rounded-2xl p-4"
      style={{
        borderWidth: 1,
        borderColor: color.border.default,
        backgroundColor: color.background.card,
      }}
    >
      <View className="mb-3 flex-row items-center gap-2">
        {icon}
        <Text
          className="text-[16px] font-semibold leading-[21px]"
          style={{ color: color.text.primary }}
        >
          {title}
        </Text>
      </View>
      {children}
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

function PeriodTabs({
  period,
  onChange,
}: {
  period: DigestPeriod;
  onChange: (period: DigestPeriod) => void;
}) {
  const { t } = useTranslation();
  const color = useColors();
  const items: DigestPeriod[] = ['day', 'week'];

  return (
    <View
      className="mb-5 flex-row rounded-full p-1"
      style={{ backgroundColor: color.background.tertiary }}
    >
      {items.map((item) => {
        const selected = item === period;
        return (
          <TouchableOpacity
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className="flex-1 rounded-full px-4 py-2.5"
            style={{ backgroundColor: selected ? color.background.card : 'transparent' }}
            onPress={() => onChange(item)}
            activeOpacity={0.75}
          >
            <Text
              className="text-center text-[15px] font-semibold"
              style={{ color: selected ? color.text.primary : color.text.secondary }}
            >
              {t(`settings.digest.period.${item}`)}
            </Text>
          </TouchableOpacity>
        );
      })}
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
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  const isTablet = useIsTablet();

  const [period, setPeriod] = useState<DigestPeriod>('day');
  const [refreshing, setRefreshing] = useState(false);
  const [aiResult, setAiResult] = useState<DigestAiResult | null>(null);
  const [aiCreatedAt, setAiCreatedAt] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      void loadRecords();
    }
  }, [isLoaded, loadRecords]);

  const digest = useMemo(() => buildDeterministicDigest(period, records), [period, records]);
  const digestCacheKey = useMemo(() => getDigestCacheKey(digest), [digest]);

  useEffect(() => {
    const cached = loadCachedDigest(digestCacheKey);
    setAiResult(cached?.result ?? null);
    setAiCreatedAt(cached?.createdAt ?? null);
  }, [digestCacheKey]);

  const dayjsLocale = resolveDayjsLocale(i18n.language);
  const rangeText =
    period === 'day'
      ? dayjs(digest.fromIso).locale(dayjsLocale).format('D MMMM YYYY')
      : `${dayjs(digest.fromIso).locale(dayjsLocale).format('D MMM')} - ${dayjs(digest.toIso)
          .locale(dayjsLocale)
          .format('D MMM YYYY')}`;

  const formatDuration = (durationMs: number): string => {
    const minutes = Math.round(durationMs / 60_000);
    if (minutes < 60) {
      return t('settings.digest.durationMinutes', { count: minutes });
    }
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest > 0
      ? t('settings.digest.durationHoursMinutes', { hours, minutes: rest })
      : t('settings.digest.durationHours', { count: hours });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadRecords();
    } finally {
      setRefreshing(false);
    }
  }, [loadRecords]);

  const handleGenerate = useCallback(async () => {
    if (digest.recordCount === 0) return;

    const consentOk = await ensureCloudAiThirdPartyConsent();
    if (!consentOk) return;

    setAiLoading(true);
    try {
      const language = i18n.language.toLowerCase().startsWith('ru') ? 'ru' : 'en';
      const result = await generateDigest({
        payload: buildDigestAiPayload(digest, language),
        model: selectedAIModel,
        modelMode: aiModelRoutingMode,
      });

      if (!result.ok) {
        const message = result.limitExceeded ? t('settings.digest.aiLimitError') : result.error;
        Alert.alert(t('common.error'), message);
        return;
      }

      const cached = saveCachedDigest(digestCacheKey, result.result);
      setAiResult(cached.result);
      setAiCreatedAt(cached.createdAt);
    } finally {
      setAiLoading(false);
    }
  }, [aiModelRoutingMode, digest, digestCacheKey, i18n.language, selectedAIModel, t]);

  const topPhraseItems = digest.topKeyPhrases.map((item) =>
    item.count > 1 ? `${item.phrase} x${item.count}` : item.phrase,
  );
  const openTaskItems = digest.openTasks.slice(0, 8).map((task) => {
    const deadline = task.deadline ? ` - ${dayjs(task.deadline).format('D MMM')}` : '';
    return `${task.text}${deadline}`;
  });
  const overdueTaskItems = digest.overdueTasks.map((task) => {
    const deadline = task.deadline ? ` - ${dayjs(task.deadline).format('D MMM')}` : '';
    return `${task.text}${deadline}`;
  });
  const aiGeneratedText = aiCreatedAt
    ? t('settings.digest.aiGeneratedAt', {
        date: dayjs(aiCreatedAt).locale(dayjsLocale).format('D MMM HH:mm'),
      })
    : t('settings.digest.aiManualHint');
  const markdownStyles = useMemo(
    () => ({
      body: {
        color: color.text.primary,
        fontSize: 15,
        lineHeight: 23,
        marginBottom: 0,
      },
      heading1: {
        color: color.text.primary,
        fontSize: 17,
        fontWeight: '700' as const,
        marginTop: 0,
        marginBottom: 6,
      },
      heading2: {
        color: color.text.primary,
        fontSize: 16,
        fontWeight: '600' as const,
        marginTop: 8,
        marginBottom: 4,
      },
      strong: {
        color: color.text.primary,
        fontWeight: '600' as const,
      },
      bullet_list: {
        marginTop: 4,
        marginBottom: 0,
      },
      ordered_list: {
        marginTop: 4,
        marginBottom: 0,
      },
      list_item: {
        color: color.text.secondary,
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 2,
      },
    }),
    [color],
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('settings.digest.title')} onBack={() => navigation.goBack()} />
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
          <PeriodTabs period={period} onChange={setPeriod} />

          <View className="mb-5 px-1">
            <Text
              className="text-[20px] font-semibold leading-7"
              style={{ color: color.text.primary }}
            >
              {rangeText}
            </Text>
            <Text className="mt-1 text-[14px] leading-5" style={{ color: color.text.secondary }}>
              {t('settings.digest.subtitle')}
            </Text>
          </View>

          <View className="mb-7 flex-row flex-wrap gap-3">
            <MetricCard
              label={t('settings.digest.metrics.records')}
              value={String(digest.recordCount)}
              helper={t('settings.digest.metrics.recordsHelper')}
              tone={color.text.primary}
            />
            <MetricCard
              label={t('settings.digest.metrics.duration')}
              value={formatDuration(digest.totalDurationMs)}
              helper={t('settings.digest.metrics.durationHelper')}
              tone={color.accent.transcript}
            />
            <MetricCard
              label={t('settings.digest.metrics.openTasks')}
              value={String(digest.openTasks.length)}
              helper={t('settings.digest.metrics.openTasksHelper')}
              tone={color.accent.primary}
            />
            <MetricCard
              label={t('settings.digest.metrics.overdue')}
              value={String(digest.overdueTasks.length)}
              helper={t('settings.digest.metrics.overdueHelper')}
              tone={digest.overdueTasks.length > 0 ? color.accent.delete : color.accent.success}
            />
          </View>

          <SectionCard
            title={t('settings.digest.aiTitle')}
            icon={<Sparkles size={18} color={color.accent.primary} strokeWidth={1.8} />}
          >
            <Text className="mb-3 text-[13px] leading-[18px]" style={{ color: color.text.muted }}>
              {aiGeneratedText}
            </Text>
            {aiLoading ? (
              <View className="items-center py-6">
                <ActivityIndicator color={color.accent.primary} />
                <Text className="mt-3 text-[14px]" style={{ color: color.text.secondary }}>
                  {t('settings.digest.aiGenerating')}
                </Text>
              </View>
            ) : aiResult ? (
              <View className="mb-4">
                <Markdown style={markdownStyles}>{aiResult.markdown}</Markdown>
              </View>
            ) : (
              <Text className="mb-4 text-[14px] leading-5" style={{ color: color.text.secondary }}>
                {digest.recordCount === 0
                  ? t('settings.digest.emptyAi')
                  : t('settings.digest.aiDescription')}
              </Text>
            )}
            <Button
              label={aiResult ? t('settings.digest.regenerateAi') : t('settings.digest.generateAi')}
              icon={<Sparkles size={17} color={color.icon.onAccent} strokeWidth={2} />}
              color={color}
              loading={aiLoading}
              disabled={digest.recordCount === 0}
              onPress={handleGenerate}
              fullWidth
            />
          </SectionCard>

          <SectionCard
            title={t('settings.digest.topicsTitle')}
            icon={<CalendarDays size={18} color={color.accent.cache} strokeWidth={1.8} />}
          >
            <BulletList items={topPhraseItems} emptyText={t('settings.digest.emptyTopics')} />
          </SectionCard>

          <SectionCard
            title={t('settings.digest.nextStepsTitle')}
            icon={<CheckCircle2 size={18} color={color.accent.success} strokeWidth={1.8} />}
          >
            <BulletList items={digest.nextSteps} emptyText={t('settings.digest.emptyNextSteps')} />
          </SectionCard>

          <SectionCard
            title={t('settings.digest.openTasksTitle')}
            icon={<Clock3 size={18} color={color.accent.primary} strokeWidth={1.8} />}
          >
            <BulletList items={openTaskItems} emptyText={t('settings.digest.emptyOpenTasks')} />
          </SectionCard>

          {digest.overdueTasks.length > 0 && (
            <SectionCard
              title={t('settings.digest.overdueTitle')}
              icon={<AlertTriangle size={18} color={color.accent.delete} strokeWidth={1.8} />}
            >
              <BulletList items={overdueTaskItems} emptyText={t('settings.digest.emptyOverdue')} />
            </SectionCard>
          )}

          <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} />
        </ScrollView>
      </View>
    </View>
  );
};
