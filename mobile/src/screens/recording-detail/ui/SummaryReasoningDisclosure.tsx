import { ChevronDown, Route } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutAnimation, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import {
  buildSummaryMetaLines,
  summaryMetaA11yHint,
  type SummaryTokenUsage,
} from '@/shared/lib/summaryMetaSubtitle';

import { SummaryMetaLinesText } from './SummaryMetaLinesText';

const REASONING_SCROLL_MAX_HEIGHT = 280;

type SummaryReasoningDisclosureProps = {
  reasoning: string;
  color: Colors;
  surfaceBackgroundColor?: string;
  modelLabel?: string;
  tokenUsage?: SummaryTokenUsage;
  generationDurationMs?: number;
};

export const SummaryReasoningDisclosure = ({
  reasoning,
  color,
  surfaceBackgroundColor,
  modelLabel,
  tokenUsage,
  generationDurationMs,
}: SummaryReasoningDisclosureProps) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const chevronRotation = useSharedValue(-90);

  useEffect(() => {
    chevronRotation.value = withTiming(expanded ? 0 : -90, {
      duration: 120,
      easing: expanded ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
  }, [chevronRotation, expanded]);

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const headerMeta = useMemo(
    () => buildSummaryMetaLines(t, modelLabel, tokenUsage, generationDurationMs),
    [generationDurationMs, modelLabel, tokenUsage, t],
  );
  const headerMetaA11y = useMemo(() => summaryMetaA11yHint(headerMeta), [headerMeta]);

  const trimmed = reasoning.trim();
  if (!trimmed) {
    return null;
  }

  const cardBg = surfaceBackgroundColor ?? color.background.tertiary;

  return (
    <View accessible={false} className="gap-2 rounded-2xl p-4" style={{ backgroundColor: cardBg }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded
            ? t('recordingDetail.summaryReasoningCollapseA11y')
            : t('recordingDetail.summaryReasoningExpandA11y')
        }
        accessibilityHint={headerMetaA11y}
        onPress={() => {
          hapticSelection();
          setExpanded((v) => {
            if (!v) {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            }
            return !v;
          });
        }}
        className="flex-row items-start justify-between gap-3 active:opacity-80"
      >
        <View className="min-w-0 flex-1 flex-row items-start gap-2" accessible={false}>
          <Route size={18} color={color.icon.muted} strokeWidth={2} style={{ marginTop: 1 }} />
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-sm font-medium" style={{ color: color.text.primary }}>
              {t('recordingDetail.summaryReasoningTitle')}
            </Text>
            <SummaryMetaLinesText lines={headerMeta} color={color} />
          </View>
        </View>
        <Animated.View
          style={[
            chevronAnimatedStyle,
            {
              width: 28,
              height: 28,
              flexShrink: 0,
              alignSelf: 'center',
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <ChevronDown size={16} color={color.text.secondary} strokeWidth={2} />
        </Animated.View>
      </Pressable>
      {expanded ? (
        <Animated.View
          entering={FadeIn.duration(200).easing(Easing.out(Easing.cubic))}
          className="gap-2"
        >
          <ScrollView
            style={{ maxHeight: REASONING_SCROLL_MAX_HEIGHT }}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            <Text className="text-[13px] leading-5" style={{ color: color.text.secondary }}>
              {trimmed}
            </Text>
          </ScrollView>
        </Animated.View>
      ) : null}
    </View>
  );
};
