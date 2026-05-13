import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight, Check, Sparkles } from 'lucide-react-native';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/app/navigation/types';
import { useAppTheme, useColors } from '@/shared/config';
import { hapticSelection, useTabletContentMaxWidth } from '@/shared/lib';
import { Button } from '@/shared/ui';

const KNOWN_EVENT_ID_UPDATE_1_1_0 = 'update_1-1-0';

const HERO_CARD_RADIUS = 24;

/** Same orb overlay pattern as `SettingsPlanStatusCard` (free tier alphas). */
const PLAN_CARD_STYLE = {
  cardBaseTint: '0f',
  topOrb: '22',
  bottomOrb: '12',
} as const;

const easeOut = Easing.out(Easing.cubic);

const enterHero = FadeInDown.duration(280).delay(48).easing(easeOut);
const enterHighlights = FadeInDown.duration(300).delay(140).easing(easeOut);
const enterFooter = FadeIn.duration(260).delay(220).easing(easeOut);

export const InAppEventDetailScreen = () => {
  const { t } = useTranslation();
  const color = useColors();
  const colorScheme = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'InAppEventDetail'>>();
  const contentMaxWidth = useTabletContentMaxWidth();

  const { eventId } = route.params;

  const copy = useMemo(() => {
    if (eventId === KNOWN_EVENT_ID_UPDATE_1_1_0) {
      return {
        title: t('inAppEvent.update110.title'),
        subtitle: t('inAppEvent.update110.subtitle'),
        bullets: t('inAppEvent.update110.bullets', { returnObjects: true }) as string[],
      };
    }
    return {
      title: t('inAppEvent.unknown.title'),
      subtitle: t('inAppEvent.unknown.subtitle'),
      bullets: [] as string[],
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

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <View
        style={{
          flex: 1,
          alignSelf: 'center',
          width: '100%',
          maxWidth: contentMaxWidth,
        }}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: color.background.secondary }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: insets.top + 16,
            paddingBottom: 28,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={enterHero}
            style={{
              borderRadius: HERO_CARD_RADIUS,
              borderWidth: 1,
              borderColor: `${color.accent.primary}28`,
              backgroundColor: `${color.accent.primary}${PLAN_CARD_STYLE.cardBaseTint}`,
              marginBottom: 20,
              overflow: 'hidden',
              ...cardShadowStyle,
            }}
          >
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  borderRadius: HERO_CARD_RADIUS,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    top: -28,
                    right: -24,
                    width: 170,
                    height: 115,
                    borderRadius: 999,
                    backgroundColor: `${color.accent.primary}${PLAN_CARD_STYLE.topOrb}`,
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    bottom: -62,
                    left: -26,
                    width: 190,
                    height: 130,
                    borderRadius: 999,
                    backgroundColor: `${color.accent.primary}${PLAN_CARD_STYLE.bottomOrb}`,
                  }}
                />
              </View>
            </View>
            <View className="flex-row items-center px-5 py-5">
              <View
                className="mr-3 h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: color.background.tertiary }}
                accessibilityElementsHidden
              >
                <Sparkles size={28} color={color.accent.primary} strokeWidth={1.75} />
              </View>
              <View className="min-w-0 flex-1">
                <Text
                  className="text-left text-[18px] font-bold leading-6 tracking-tight"
                  style={[{ color: color.text.primary }, titleStyle]}
                  accessibilityRole="header"
                >
                  {copy.title}
                </Text>
                <Text
                  className="mt-1 text-left text-[15px] leading-[22px]"
                  style={[{ color: color.text.secondary }, titleStyle]}
                >
                  {copy.subtitle}
                </Text>
              </View>
            </View>
          </Animated.View>

          {copy.bullets.length > 0 ? (
            <Animated.View entering={enterHighlights} style={{ marginBottom: 8 }}>
              <Text
                className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: color.text.muted }}
              >
                {t('inAppEvent.highlightsTitle')}
              </Text>
              <View
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor:
                    colorScheme === 'light' ? 'rgba(15, 23, 42, 0.08)' : color.border.default,
                  backgroundColor: color.background.card,
                  overflow: 'hidden',
                  ...cardShadowStyle,
                }}
              >
                {copy.bullets.map((line, index) => (
                  <View
                    key={index}
                    className="flex-row gap-3 px-4 py-3.5"
                    style={
                      index < copy.bullets.length - 1
                        ? {
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: color.border.default,
                          }
                        : undefined
                    }
                  >
                    <View
                      className="mt-0.5 h-8 w-8 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: color.background.tertiary }}
                      accessibilityElementsHidden
                    >
                      <Check size={16} color={color.accent.primary} strokeWidth={2.6} />
                    </View>
                    <Text
                      className="flex-1 pt-0.5 text-[15px] leading-[22px]"
                      style={[{ color: color.text.primary }, titleStyle]}
                    >
                      {line}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          ) : null}
        </ScrollView>

        <Animated.View
          entering={enterFooter}
          style={{
            backgroundColor: color.background.secondary,
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
