import { ChevronDown } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { getAnimationDuration, useColors, useFadeInEntering } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

export type DigestMetricCardProps = {
  label: string;
  value: string;
  helper: string;
  tone: string;
};

export function DigestMetricCard({ label, value, helper, tone }: DigestMetricCardProps) {
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

export type AnimatedMetricCardProps = {
  label: string;
  helper: string;
  rawValue: number;
  formatter: (n: number) => string;
  tone: string;
  /** Remount / restart count-up when the digest period changes. */
  animationKey: string;
};

export function useAnimatedCounter(rawValue: number, animationKey: string): number {
  const sv = useSharedValue(0);
  const [display, setDisplay] = useState(0);

  const updateDisplay = useCallback((value: number) => {
    setDisplay(value);
  }, []);

  useEffect(() => {
    sv.value = 0;
    sv.value = withTiming(rawValue, {
      duration: getAnimationDuration(900),
      easing: Easing.out(Easing.cubic),
    });
  }, [animationKey, rawValue, sv]);

  useAnimatedReaction(
    () => Math.round(sv.value),
    (current, previous) => {
      if (current !== previous) {
        scheduleOnRN(updateDisplay, current);
      }
    },
  );

  return display;
}

export function AnimatedMetricCard({
  label,
  helper,
  rawValue,
  formatter,
  tone,
  animationKey,
}: AnimatedMetricCardProps) {
  const color = useColors();
  const animatedValue = useAnimatedCounter(rawValue, animationKey);
  const display = formatter(animatedValue);

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
        {display}
      </Text>
      <Text className="mt-1 text-[13px] leading-[18px]" style={{ color: color.text.secondary }}>
        {helper}
      </Text>
    </View>
  );
}

export type DigestSectionCardProps = {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
};

export function DigestSectionCard({ title, children, icon }: DigestSectionCardProps) {
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

export type DigestCollapsibleSectionCardProps = {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  defaultExpanded?: boolean;
  /** Shown below the header whether the section is expanded or collapsed. */
  persistentContent?: React.ReactNode;
};

export function DigestCollapsibleSectionCard({
  title,
  children,
  icon,
  defaultExpanded = true,
  persistentContent,
}: DigestCollapsibleSectionCardProps) {
  const { t } = useTranslation();
  const color = useColors();
  const sectionExpandEntering = useFadeInEntering(140);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const chevronRotation = useSharedValue(defaultExpanded ? 0 : -90);

  useEffect(() => {
    chevronRotation.value = withTiming(expanded ? 0 : -90, {
      duration: 120,
      easing: expanded ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
  }, [chevronRotation, expanded]);

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  return (
    <View
      className="mb-7 rounded-2xl p-4"
      style={{
        borderWidth: 1,
        borderColor: color.border.default,
        backgroundColor: color.background.card,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded
            ? t('recordingDetail.document.sections.collapseA11y', { title })
            : t('recordingDetail.document.sections.expandA11y', { title })
        }
        onPress={() => {
          hapticSelection();
          setExpanded((current) => !current);
        }}
        className="flex-row items-center gap-2 active:opacity-80"
      >
        {icon}
        <Text
          className="min-w-0 flex-1 text-[16px] font-semibold leading-[21px]"
          style={{ color: color.text.primary }}
          numberOfLines={2}
        >
          {title}
        </Text>
        <Animated.View
          style={[
            chevronAnimatedStyle,
            {
              width: 28,
              height: 28,
              flexShrink: 0,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <ChevronDown size={16} color={color.text.secondary} strokeWidth={2} />
        </Animated.View>
      </Pressable>
      {persistentContent ? <View className="pt-2">{persistentContent}</View> : null}
      {expanded ? (
        <Animated.View entering={sectionExpandEntering} className="pt-3">
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}
