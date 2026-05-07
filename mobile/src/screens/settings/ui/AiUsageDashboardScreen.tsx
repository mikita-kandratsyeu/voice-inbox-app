import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import {
  CalendarDays,
  Cloud,
  FolderTree,
  Languages,
  MessageCircleQuestion,
  Mic,
  Sparkles,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { useProEntitlement } from '@/features/pro-license';
import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import type { AiUsage } from '@/shared/lib/ai-api';
import { getAiUsage } from '@/shared/lib/ai-api';
import { resolveDayjsLocale } from '@/shared/lib/date';
import {
  SCREEN_PADDING,
  ScreenHeader,
  SettingsRow,
  SettingsSection,
  SkeletonPulse,
} from '@/shared/ui';

const formatResetDate = (isoString: string, locale: string): string => {
  const dayjsLocale = resolveDayjsLocale(locale);
  const date = dayjs(isoString);

  if (!date.isValid()) return '—';

  return date.locale(dayjsLocale).format('dddd, D MMMM HH:mm');
};

type UsageMetricCardProps = {
  label: string;
  value: string;
  helper: string;
  color: Colors;
  tone: string;
};

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
  const { t, i18n } = useTranslation();
  const color = useColors();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  const isTablet = useIsTablet();
  const { isProActive } = useProEntitlement();

  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadUsage = useCallback(async (isPull = false) => {
    if (isPull) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextUsage = await getAiUsage();
      setUsage(nextUsage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  const progressPercent =
    usage && usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;
  const resetDateText = usage ? formatResetDate(usage.resetAt, i18n.language) : '—';
  const remainingText = usage ? String(usage.remaining) : '—';
  const usedText = usage ? String(usage.used) : '—';
  const limitText = usage ? String(usage.limit) : '—';

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
        icon: <CalendarDays size={20} color={color.accent.primary} strokeWidth={1.8} />,
        label: t('settings.aiUsageDashboard.features.digest.title'),
        value: t('settings.aiUsageDashboard.hybridBadge'),
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
      <ScreenHeader
        title={t('settings.aiUsageDashboard.title')}
        onBack={() => navigation.goBack()}
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
            <UsageMetricsSkeleton color={color} />
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
