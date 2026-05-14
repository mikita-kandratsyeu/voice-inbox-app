import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight, Download, HardDrive, Pin, Rocket, Video, Wrench } from 'lucide-react-native';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/app/navigation/types';
import { useAppTheme, useColors } from '@/shared/config';
import { hapticSelection, useTabletContentMaxWidth } from '@/shared/lib';
import { Button } from '@/shared/ui';

const KNOWN_EVENT_ID_UPDATE_1_1_0 = 'update_1-1-0';

const easeOut = Easing.out(Easing.cubic);

const enterHero = FadeInDown.duration(280).delay(48).easing(easeOut);
const enterHighlights = FadeInDown.duration(300).delay(140).easing(easeOut);
const enterFooter = FadeIn.duration(260).delay(220).easing(easeOut);

type UpdateFeature = { title: string; description: string; isNew?: boolean };

type ScreenCopy =
  | {
      kind: 'update110';
      appName: string;
      version: string;
      tagline: string;
      features: UpdateFeature[];
    }
  | { kind: 'unknown'; title: string; subtitle: string };

const FEATURE_ICONS = [Video, Pin, Download, HardDrive, Wrench] as const;

export const InAppEventDetailScreen = () => {
  const { t } = useTranslation();
  const color = useColors();
  const colorScheme = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'InAppEventDetail'>>();
  const contentMaxWidth = useTabletContentMaxWidth();

  const { eventId } = route.params;

  const copy = useMemo((): ScreenCopy => {
    if (eventId === KNOWN_EVENT_ID_UPDATE_1_1_0) {
      const raw = t('inAppEvent.update110.features', { returnObjects: true });
      const features = Array.isArray(raw)
        ? (raw as UpdateFeature[]).filter((f) => f && typeof f.title === 'string')
        : [];
      return {
        kind: 'update110',
        appName: t('inAppEvent.update110.appName'),
        version: t('inAppEvent.update110.version'),
        tagline: t('inAppEvent.update110.tagline'),
        features,
      };
    }
    return {
      kind: 'unknown',
      title: t('inAppEvent.unknown.title'),
      subtitle: t('inAppEvent.unknown.subtitle'),
    };
  }, [eventId, t]);

  const handleClose = useCallback(() => {
    hapticSelection();
    navigation.goBack();
  }, [navigation]);

  const cardShadowStyle = useMemo(
    () => ({
      shadowColor: color.shadow.color,
      shadowOffset: { width: 0, height: 1 } as const,
      shadowOpacity: color.shadow.opacity,
      shadowRadius: 4,
      elevation: 2 as const,
    }),
    [color.shadow.color, color.shadow.opacity],
  );

  const titleStyle = Platform.OS === 'android' ? { includeFontPadding: false } : undefined;

  const iconAccentPairs = useMemo(
    () => [
      {
        fill: `${color.accent.transcript}38`,
        stroke: `${color.accent.transcript}55`,
        icon: color.accent.transcript,
      },
      {
        fill: `${color.accent.primary}30`,
        stroke: `${color.accent.primary}50`,
        icon: color.accent.primary,
      },
      {
        fill: `${color.accent.models}35`,
        stroke: `${color.accent.models}55`,
        icon: color.accent.models,
      },
      {
        fill: `${color.accent.aiData}32`,
        stroke: `${color.accent.aiData}50`,
        icon: color.accent.aiData,
      },
      {
        fill: `${color.accent.cache}30`,
        stroke: `${color.accent.cache}50`,
        icon: color.accent.cache,
      },
    ],
    [color.accent],
  );

  const scrollTopPad = insets.top + 16;

  return (
    <View style={{ flex: 1, backgroundColor: color.background.primary }}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View
          style={{
            position: 'absolute',
            top: -80,
            right: -60,
            width: 220,
            height: 220,
            borderRadius: 999,
            backgroundColor: `${color.accent.transcript}12`,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: '38%',
            left: -100,
            width: 260,
            height: 260,
            borderRadius: 999,
            backgroundColor: `${color.accent.primary}0C`,
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: -40,
            right: -20,
            width: 180,
            height: 180,
            borderRadius: 999,
            backgroundColor: `${color.accent.models}10`,
          }}
        />
      </View>

      <View
        style={{
          flex: 1,
          alignSelf: 'center',
          width: '100%',
          maxWidth: contentMaxWidth,
        }}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: 'transparent' }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: scrollTopPad,
            paddingBottom: 28,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={enterHero} className="items-center">
            <View
              className="mb-8 flex-row items-center justify-center gap-1.5 rounded-full"
              style={{
                backgroundColor: `${color.accent.transcript}24`,
                borderWidth: 1,
                borderColor: `${color.accent.transcript}40`,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Rocket size={13} color={color.accent.transcript} strokeWidth={2.2} />
              <Text
                className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={[{ color: color.accent.transcript }, titleStyle]}
              >
                {t('inAppEvent.whatsNewBadge')}
              </Text>
            </View>

            {copy.kind === 'update110' ? (
              <View className="mb-8 w-full flex-row items-center gap-4 self-stretch">
                <View
                  className="h-[68px] w-[68px] shrink-0 overflow-hidden rounded-[22px]"
                  style={{
                    borderWidth: 1,
                    borderColor: `${color.accent.primary}45`,
                    backgroundColor: color.background.card,
                    ...cardShadowStyle,
                  }}
                >
                  <Image
                    source={require('@/shared/assets/app-icon.png')}
                    className="h-full w-full"
                    resizeMode="cover"
                    accessibilityRole="image"
                    accessibilityLabel={copy.appName}
                  />
                </View>
                <View className="min-w-0 flex-1 justify-center py-0.5">
                  <Text
                    className="text-left text-[19px] font-bold leading-6 tracking-tight"
                    style={[{ color: color.text.primary }, titleStyle]}
                    accessibilityRole="header"
                  >
                    {copy.appName}
                  </Text>
                  <Text
                    className="mt-0.5 text-left text-[32px] font-extrabold leading-[36px] tracking-tight"
                    style={[{ color: color.accent.primary }, titleStyle]}
                  >
                    {copy.version}
                  </Text>
                  <Text
                    className="mt-1.5 text-left text-[14px] leading-5"
                    style={[{ color: color.text.secondary }, titleStyle]}
                  >
                    {copy.tagline}
                  </Text>
                </View>
              </View>
            ) : (
              <View className="mb-6 w-full flex-row items-center gap-3 self-stretch">
                <View
                  className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[18px]"
                  style={{
                    borderWidth: 1,
                    borderColor: `${color.accent.primary}40`,
                    backgroundColor: color.background.card,
                    ...cardShadowStyle,
                  }}
                >
                  <Image
                    source={require('@/shared/assets/app-icon.png')}
                    className="h-full w-full"
                    resizeMode="cover"
                    accessibilityRole="image"
                    accessibilityLabel={copy.title}
                  />
                </View>
                <View className="min-w-0 flex-1 py-0.5">
                  <Text
                    className="text-left text-[20px] font-bold leading-6 tracking-tight"
                    style={[{ color: color.text.primary }, titleStyle]}
                    accessibilityRole="header"
                  >
                    {copy.title}
                  </Text>
                  <Text
                    className="mt-2 text-left text-[14px] leading-5"
                    style={[{ color: color.text.secondary }, titleStyle]}
                  >
                    {copy.subtitle}
                  </Text>
                </View>
              </View>
            )}
          </Animated.View>

          {copy.kind === 'update110' && copy.features.length > 0 ? (
            <Animated.View entering={enterHighlights} className="mt-0 gap-2">
              {copy.features.map((feature, index) => {
                const Icon = FEATURE_ICONS[index % FEATURE_ICONS.length]!;
                const pair = iconAccentPairs[index % iconAccentPairs.length]!;
                return (
                  <View
                    key={`${feature.title}-${index}`}
                    className="flex-row items-center gap-3 px-3 py-2.5"
                    style={{
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor:
                        colorScheme === 'light' ? 'rgba(15, 23, 42, 0.08)' : color.border.default,
                      backgroundColor: color.background.card,
                      ...cardShadowStyle,
                    }}
                  >
                    <View
                      className="h-11 w-11 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: pair.fill,
                        borderWidth: 1,
                        borderColor: pair.stroke,
                      }}
                      accessibilityElementsHidden
                    >
                      <Icon size={22} color={pair.icon} strokeWidth={2} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <View className="flex-row flex-wrap items-center gap-1.5">
                        <Text
                          className="text-[15px] font-semibold leading-5"
                          style={[{ color: color.text.primary }, titleStyle]}
                        >
                          {feature.title}
                        </Text>
                        {feature.isNew ? (
                          <View
                            style={{
                              backgroundColor: `${color.accent.transcript}33`,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 5,
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            <Text
                              className="text-[10px] font-bold uppercase"
                              style={[
                                { color: color.accent.transcript, letterSpacing: 0 },
                                titleStyle,
                              ]}
                            >
                              {t('inAppEvent.newBadge')}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text
                        className="mt-0.5 text-[13px] leading-[18px]"
                        style={[{ color: color.text.secondary }, titleStyle]}
                      >
                        {feature.description}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Animated.View>
          ) : null}
        </ScrollView>

        <Animated.View
          entering={enterFooter}
          style={{
            backgroundColor: 'transparent',
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: insets.bottom + 24,
          }}
        >
          <Button
            color={color}
            variant="primary"
            size="lg"
            fullWidth
            label={t('inAppEvent.primaryCta')}
            trailingIcon={<ArrowRight size={20} color={color.icon.onAccent} strokeWidth={2.4} />}
            onPress={handleClose}
          />
        </Animated.View>
      </View>
    </View>
  );
};
