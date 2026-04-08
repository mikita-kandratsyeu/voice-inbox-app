import {
  Bell,
  Check,
  Lock,
  Mic,
  Settings,
  Shield,
  Smartphone,
  Sparkles,
  UploadCloud,
  Zap,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRecordStore } from '@/entities/record';
import { getWhisperModelVariantId, useSettingsStore } from '@/entities/settings';
import { openInAppBrowser } from '@/features/in-app-browser';
import { useModelManager } from '@/features/model-manager';
import { importData } from '@/features/sync-data';
import type { Colors } from '@/shared/config';
import { getWebsiteUrl, useColors } from '@/shared/config';
import { hapticSelection, IS_IOS, useTabletContentMaxWidth } from '@/shared/lib';
import { logAnalyticsEvent } from '@/shared/lib/analytics';
import {
  checkMicPermission,
  type MicPermissionStatus,
  openAppSettings,
  requestMicPermission,
} from '@/shared/lib/permissions';
import {
  checkPushPermission,
  type PushPermissionStatus,
  requestPushPermission,
} from '@/shared/lib/push';

import { getHasSeenOnboarding, getTermsAgreedAt, setTermsAgreedAt } from '../lib/onboardingStorage';
import { getOnboardingSlides, type OnboardingSlideContent } from '../model/constants';
import { OnboardingSetupStep } from './OnboardingSetupStep';

const ICON_MAP = {
  Mic,
  Lock,
  Sparkles,
  Smartphone,
  Zap,
  Settings,
  Shield,
  UploadCloud,
} as const;

type OnboardingScreenProps = {
  onComplete: () => void;
};

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<OnboardingSlideContent>);

const DOT_SIZE = 8;
const DOT_GAP = 4;
const SLOT_WIDTH = DOT_SIZE + DOT_GAP * 2; // segment from dot to dot
const PILL_WIDTH = SLOT_WIDTH;
const DOT_LEFT = (SLOT_WIDTH - DOT_SIZE) / 2;
const PILL_LEFT = 0;

const AnimatedProgressDots = ({
  scrollX,
  screenWidth,
  onDotPress,
  color,
  slides,
  t,
}: {
  scrollX: SharedValue<number>;
  screenWidth: SharedValue<number>;
  onDotPress: (index: number) => void;
  color: Colors;
  slides: OnboardingSlideContent[];
  t: (key: string, opts?: { index?: number }) => string;
}) => {
  const pillPositions = slides.map((_, i) => i * SLOT_WIDTH + PILL_LEFT);
  const slideColors = slides.map((s) => s.iconColor);

  const pillStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      scrollX.value,
      slides.map((_, i) => i * screenWidth.value),
      pillPositions,
    );
    const backgroundColor = interpolateColor(
      scrollX.value,
      slides.map((_, i) => i * screenWidth.value),
      slideColors,
    );

    return {
      transform: [{ translateX }],
      backgroundColor,
    };
  });

  return (
    <View className="mb-6 flex-row justify-center" style={{ height: DOT_SIZE }}>
      <View style={{ position: 'relative', width: slides.length * SLOT_WIDTH - DOT_GAP }}>
        {slides.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => onDotPress(index)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.goToSlide', { index: index + 1 })}
            style={{
              position: 'absolute',
              left: index * SLOT_WIDTH + DOT_LEFT,
              width: DOT_SIZE,
              height: DOT_SIZE,
              borderRadius: DOT_SIZE / 2,
              backgroundColor: color.border.default,
            }}
          />
        ))}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              top: 0,
              width: PILL_WIDTH,
              height: DOT_SIZE,
              borderRadius: DOT_SIZE / 2,
            },
            pillStyle,
          ]}
        />
      </View>
    </View>
  );
};

const AnimatedNextButton = ({
  label,
  onPress,
  scrollX,
  screenWidth,
  slideColors,
  iconOnAccent,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  scrollX: SharedValue<number>;
  screenWidth: SharedValue<number>;
  slideColors: string[];
  iconOnAccent: string;
  disabled?: boolean;
  loading?: boolean;
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = slideColors.map((_, i) => i * screenWidth.value);
    const backgroundColor = interpolateColor(scrollX.value, inputRange, slideColors);

    return {
      backgroundColor,
    };
  });

  return (
    <Animated.View
      style={[
        {
          width: '100%',
          borderRadius: 9999,
          minHeight: 52,
          overflow: 'hidden',
          backgroundColor: slideColors[0],
          opacity: disabled && !loading ? 0.5 : 1,
        },
        animatedStyle,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: Boolean(disabled || loading) }}
        className="flex-1 flex-row items-center justify-center gap-2 py-3.5 px-7"
      >
        {loading ? (
          <ActivityIndicator size="small" color={iconOnAccent} />
        ) : (
          <Text className="text-[16px] font-semibold" style={{ color: iconOnAccent }}>
            {label}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

type SlideItemProps = {
  item: OnboardingSlideContent;
  index: number;
  scrollX: SharedValue<number>;
  screenWidth: SharedValue<number>;
  windowWidth: number;
  contentMaxWidth?: number;
  color: Colors;
  agreedToTerms?: boolean;
  onAgreeChange?: (value: boolean) => void;
  onRestorePress?: () => void;
  isRestoring?: boolean;
};

const AnimatedSlideIcon = ({
  iconName,
  iconColor,
  iconBg,
  iconOnAccent,
}: {
  iconName: OnboardingSlideContent['iconName'];
  iconColor: string;
  iconBg: string;
  iconOnAccent: string;
}) => {
  const scale = useSharedValue(1);
  const IconComponent = ICON_MAP[iconName];

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 1200 }), withTiming(1, { duration: 1200 })),
      -1,
      true,
    );
  }, [scale]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View
      className="mb-8 h-32 w-32 items-center justify-center rounded-full"
      style={{ backgroundColor: iconBg }}
    >
      <Animated.View
        style={[
          {
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: iconColor,
            alignItems: 'center',
            justifyContent: 'center',
          },
          iconAnimatedStyle,
        ]}
      >
        <IconComponent size={48} color={iconOnAccent} strokeWidth={2} />
      </Animated.View>
    </View>
  );
};

type PermissionRowStatus = MicPermissionStatus | PushPermissionStatus;

const PermissionRow = ({
  icon,
  label,
  description,
  status,
  onPress,
  color,
  t,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  status: PermissionRowStatus | null;
  onPress: () => void;
  color: Colors;
  t: (k: string) => string;
}) => {
  const isGranted = status === 'granted';
  const isDenied = status === 'denied';

  const badgeText = isGranted
    ? t('permissions.granted')
    : isDenied
      ? t('permissions.denied')
      : t('permissions.notDetermined');

  const badgeBg = isGranted
    ? color.onboarding.zap.bg
    : isDenied
      ? color.status.error.bg
      : color.background.tertiary;

  const badgeTextColor = isGranted
    ? color.accent.success
    : isDenied
      ? color.status.error.text
      : color.text.secondary;

  return (
    <TouchableOpacity
      activeOpacity={isGranted ? 1 : 0.7}
      onPress={isGranted ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${badgeText}`}
      accessibilityState={{ disabled: isGranted }}
      className="flex-row items-center gap-4 rounded-2xl p-4"
      style={{ backgroundColor: color.background.secondary }}
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-xl"
        style={{ backgroundColor: color.background.tertiary }}
      >
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-semibold" style={{ color: color.text.primary }}>
          {label}
        </Text>
        <Text className="mt-0.5 text-[13px]" style={{ color: color.text.secondary }}>
          {description}
        </Text>
      </View>
      <View className="rounded-full px-3 py-1" style={{ backgroundColor: badgeBg }}>
        <Text className="text-[12px] font-semibold" style={{ color: badgeTextColor }}>
          {badgeText}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

type PermissionsSlideProps = {
  color: Colors;
  t: (k: string) => string;
  windowWidth: number;
  contentMaxWidth?: number;
  index: number;
  scrollX: SharedValue<number>;
  screenWidth: SharedValue<number>;
  agreedToTerms?: boolean;
  onAgreeChange?: (value: boolean) => void;
};

const PermissionsSlide = ({
  color,
  t,
  windowWidth,
  contentMaxWidth,
  index,
  scrollX,
  screenWidth,
  agreedToTerms = false,
  onAgreeChange,
}: PermissionsSlideProps) => {
  const [micStatus, setMicStatus] = useState<MicPermissionStatus | null>(null);
  const [pushStatus, setPushStatus] = useState<PushPermissionStatus | null>(null);

  useEffect(() => {
    checkMicPermission().then(setMicStatus);
    if (IS_IOS) {
      checkPushPermission().then(setPushStatus);
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * screenWidth.value,
      index * screenWidth.value,
      (index + 1) * screenWidth.value,
    ];
    const opacity = interpolate(scrollX.value, inputRange, [0.4, 1, 0.4]);
    const scale = interpolate(scrollX.value, inputRange, [0.92, 1, 0.92]);
    const translateX = interpolate(scrollX.value, inputRange, [-30, 0, 30]);
    return { opacity, transform: [{ scale }, { translateX }] };
  });

  const handleMicPress = async () => {
    if (micStatus === 'denied') {
      await openAppSettings();
      return;
    }
    const granted = await requestMicPermission({
      title: t('permissions.micTitle'),
      message: t('permissions.micMessage'),
      buttonPositive: t('permissions.allow'),
      buttonNegative: t('permissions.deny'),
    });
    setMicStatus(granted ? 'granted' : 'denied');
  };

  const handlePushPress = async () => {
    if (pushStatus === 'denied') {
      await openAppSettings();
      return;
    }
    const status = await requestPushPermission();
    setPushStatus(status);
  };

  return (
    <Animated.View
      style={[{ width: windowWidth, paddingHorizontal: 24, paddingTop: 48 }, animatedStyle]}
      className="flex-1"
    >
      <View
        style={{
          flex: 1,
          alignSelf: 'center',
          width: '100%',
          maxWidth: contentMaxWidth,
        }}
      >
        <View className="mb-8 items-center">
          <View
            className="mb-6 h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: color.onboarding.shield.bg }}
          >
            <Shield size={40} color={color.onboarding.shield.color} strokeWidth={2} />
          </View>
          <Text
            className="mb-3 text-center text-[28px] font-bold leading-tight"
            style={{ color: color.text.primary }}
          >
            {t('permissions.onboardingTitle')}
          </Text>
          <Text
            className="text-center text-[16px] leading-6"
            style={{ color: color.text.secondary }}
          >
            {t('permissions.onboardingDesc')}
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ gap: 12 }}>
          <PermissionRow
            icon={<Mic size={22} color={color.onboarding.shield.color} strokeWidth={2} />}
            label={t('permissions.micLabel')}
            description={t('permissions.micDesc')}
            status={micStatus}
            onPress={handleMicPress}
            color={color}
            t={t}
          />
          <PermissionRow
            icon={<Bell size={22} color={color.onboarding.shield.color} strokeWidth={2} />}
            label={t('permissions.notificationsLabel')}
            description={t('permissions.notificationsDesc')}
            status={pushStatus}
            onPress={handlePushPress}
            color={color}
            t={t}
          />
        </ScrollView>
        <View className="mt-6 flex-row items-center gap-3">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              hapticSelection();
              onAgreeChange?.(!agreedToTerms);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="checkbox"
            accessibilityLabel={t('onboarding.termsCheckboxA11y')}
            accessibilityState={{ checked: Boolean(agreedToTerms) }}
          >
            <View
              className="h-7 w-7 items-center justify-center rounded-md"
              style={{
                backgroundColor: agreedToTerms ? color.onboarding.shield.color : 'transparent',
                borderWidth: 2,
                borderColor: agreedToTerms ? color.onboarding.shield.color : color.text.secondary,
              }}
            >
              {agreedToTerms && <Check size={16} color={color.icon.onAccent} strokeWidth={2.5} />}
            </View>
          </TouchableOpacity>
          <Text className="flex-1 text-sm leading-5" style={{ color: color.text.secondary }}>
            {t('onboarding.agreeToTermsPrefix')}
            <Text
              style={{ color: color.accent.primary, textDecorationLine: 'underline' }}
              onPress={() => getWebsiteUrl() && openInAppBrowser(`${getWebsiteUrl()}/terms`)}
            >
              {t('onboarding.agreeToTermsLink')}
            </Text>
            {t('onboarding.agreeToTermsAnd')}
            <Text
              style={{ color: color.accent.primary, textDecorationLine: 'underline' }}
              onPress={() => getWebsiteUrl() && openInAppBrowser(`${getWebsiteUrl()}/privacy`)}
            >
              {t('onboarding.agreeToTermsLink2')}
            </Text>
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const SlideItem = ({
  item,
  index,
  scrollX,
  screenWidth,
  windowWidth,
  contentMaxWidth,
  color,
  t,
  agreedToTerms = false,
  onAgreeChange,
  onRestorePress,
  isRestoring = false,
}: SlideItemProps & { t: (k: string) => string }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * screenWidth.value,
      index * screenWidth.value,
      (index + 1) * screenWidth.value,
    ];
    const opacity = interpolate(scrollX.value, inputRange, [0.4, 1, 0.4]);
    const scale = interpolate(scrollX.value, inputRange, [0.92, 1, 0.92]);
    const translateX = interpolate(scrollX.value, inputRange, [-30, 0, 30]);

    return {
      opacity,
      transform: [{ scale }, { translateX }],
    };
  });

  if (item.extra === 'permissions') {
    return (
      <PermissionsSlide
        color={color}
        t={t}
        windowWidth={windowWidth}
        contentMaxWidth={contentMaxWidth}
        index={index}
        scrollX={scrollX}
        screenWidth={screenWidth}
        agreedToTerms={agreedToTerms}
        onAgreeChange={onAgreeChange}
      />
    );
  }

  const isSetupSlide = item.extra === 'setup' || item.extra === 'setupWhisper';
  if (isSetupSlide) {
    const setupMode = item.extra === 'setupWhisper' ? 'whisper' : 'ai';

    return (
      <Animated.View
        style={[
          {
            width: windowWidth,
            paddingHorizontal: 32,
            paddingTop: 48,
          },
          animatedStyle,
        ]}
        className="flex-1"
      >
        <View
          style={{
            flex: 1,
            alignSelf: 'center',
            width: '100%',
            maxWidth: contentMaxWidth,
          }}
        >
          <View style={{ width: '100%', alignItems: 'center', marginBottom: 20 }}>
            <Text
              className="mb-2 text-center text-[28px] font-bold leading-tight"
              style={{ color: color.text.primary }}
            >
              {t(item.titleKey)}
            </Text>
            <Text
              className="mb-4 text-center text-[18px] leading-7"
              style={{ color: color.text.secondary }}
            >
              {t(item.descKey)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <OnboardingSetupStep color={color} mode={setupMode} selectedColor={item.iconColor} />
          </View>
        </View>
      </Animated.View>
    );
  }

  if (item.extra === 'restore') {
    return (
      <Animated.View
        style={[
          {
            width: windowWidth,
            paddingHorizontal: 32,
            paddingTop: 48,
          },
          animatedStyle,
        ]}
        className="flex-1"
      >
        <View
          style={{
            flex: 1,
            alignSelf: 'center',
            width: '100%',
            maxWidth: contentMaxWidth,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AnimatedSlideIcon
            iconName={item.iconName}
            iconColor={item.iconColor}
            iconBg={item.iconBg}
            iconOnAccent={color.icon.onAccent}
          />
          <Text
            className="mb-2 text-center text-[28px] font-bold leading-tight"
            style={{ color: color.text.primary }}
          >
            {t(item.titleKey)}
          </Text>
          <Text
            className="mb-6 text-center text-[18px] leading-7"
            style={{ color: color.text.secondary }}
          >
            {t(item.descKey)}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              hapticSelection();
              onRestorePress?.();
            }}
            disabled={isRestoring}
            accessibilityRole="button"
            accessibilityLabel={
              isRestoring ? t('importExport.importing') : t('onboarding.restoreButton')
            }
            accessibilityState={{ disabled: isRestoring }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 14,
              paddingHorizontal: 24,
              borderRadius: 12,
              backgroundColor: item.iconBg,
              minWidth: 200,
            }}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={item.iconColor} />
            ) : (
              <UploadCloud size={22} color={item.iconColor} strokeWidth={2} />
            )}
            <Text className="text-base font-semibold" style={{ color: item.iconColor }}>
              {isRestoring ? t('importExport.importing') : t('onboarding.restoreButton')}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[{ width: windowWidth, paddingHorizontal: 32 }, animatedStyle]}
      className="flex-1 items-center justify-center"
    >
      <View
        style={{
          flex: 1,
          alignSelf: 'center',
          width: '100%',
          maxWidth: contentMaxWidth,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AnimatedSlideIcon
          iconName={item.iconName}
          iconColor={item.iconColor}
          iconBg={item.iconBg}
          iconOnAccent={color.icon.onAccent}
        />

        <Text
          className="mb-4 text-center text-[28px] font-bold leading-tight"
          style={{ color: color.text.primary }}
        >
          {t(item.titleKey)}
        </Text>

        <Text
          className="mb-6 text-center text-[18px] leading-7"
          style={{ color: color.text.secondary }}
        >
          {t(item.descKey)}
        </Text>

        {item.extra === 'privacy' && (
          <View
            className="flex-row items-center gap-2 rounded-full border px-4 py-2"
            style={{
              backgroundColor: item.iconBg,
              borderColor: color.onboarding.privacy.border,
            }}
          >
            <Lock size={16} color={item.iconColor} strokeWidth={2} />
            <Text
              className="text-sm font-semibold"
              style={{ color: color.onboarding.privacy.text }}
            >
              {t('onboarding.privacy')}
            </Text>
          </View>
        )}

        {item.extra === 'ai-features' && (
          <View
            className="flex-row items-center gap-2 rounded-full border px-4 py-2"
            style={{
              backgroundColor: item.iconBg,
              borderColor: color.onboarding.ai.border,
            }}
          >
            <Shield size={16} color={item.iconColor} strokeWidth={2} />
            <Text className="text-sm font-semibold" style={{ color: color.onboarding.ai.text }}>
              {t('onboarding.aiPrivacy')}
            </Text>
          </View>
        )}

        {item.extra === 'private-mode' && (
          <View
            className="flex-row items-center gap-2 rounded-full border px-4 py-2"
            style={{
              backgroundColor: item.iconBg,
              borderColor: color.onboarding.privateSlide.chipBorder,
            }}
          >
            <Smartphone size={16} color={item.iconColor} strokeWidth={2} />
            <Text
              className="text-sm font-semibold"
              style={{ color: color.onboarding.privateSlide.chipText }}
            >
              {t('onboarding.privateModeBadge')}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

export const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  const { t } = useTranslation();
  const color = useColors();
  const contentMaxWidth = useTabletContentMaxWidth();
  const slides = useMemo(() => getOnboardingSlides(color), [color]);
  const slideColors = useMemo(() => slides.map((s) => s.iconColor), [slides]);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasSeenOnboarding = useMemo(() => getHasSeenOnboarding(), []);
  const [agreedToTerms, setAgreedToTerms] = useState(() => getTermsAgreedAt() != null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isFinishingOnboarding, setIsFinishingOnboarding] = useState(false);
  const finishingRef = useRef(false);
  const flatListRef = useRef<FlatList<OnboardingSlideContent>>(null);
  const scrollX = useSharedValue(0);
  const screenWidth = useSharedValue(windowWidth);

  const existingRecords = useRecordStore((s) => s.records);
  const addRecord = useRecordStore((s) => s.addRecord);

  useEffect(() => {
    screenWidth.value = windowWidth;
  }, [windowWidth, screenWidth]);

  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);
  const whisperModelStatuses = useSettingsStore((s) => s.whisperModelStatuses);
  const { startDownload } = useModelManager();

  const handleRestore = useCallback(async () => {
    setIsRestoring(true);
    let showedConfirm = false;
    try {
      const result = await importData();
      if (!result.success) {
        if (result.error !== 'cancelled') {
          Alert.alert(t('common.error'), result.error);
        }
        return;
      }
      const existingIds = new Set(existingRecords.map((r) => r.id));
      const toImport = result.records.filter((r) => !existingIds.has(r.id));
      if (toImport.length === 0) {
        Alert.alert(
          t('common.done'),
          result.records.length > 0
            ? t('onboarding.restoreAllAlreadyInApp')
            : t('onboarding.restoreNoRecords'),
        );
        return;
      }
      showedConfirm = true;
      Alert.alert(t('onboarding.restoreImportAllConfirm', { count: toImport.length }), '', [
        { text: t('common.cancel'), style: 'cancel', onPress: () => setIsRestoring(false) },
        {
          text: t('importExport.import'),
          onPress: async () => {
            try {
              for (const record of toImport) {
                await addRecord(record);
              }
              Alert.alert(
                t('common.done'),
                t('onboarding.restoreSuccess', { count: toImport.length }),
              );
            } finally {
              setIsRestoring(false);
            }
          },
        },
      ]);
    } catch (err) {
      if (__DEV__) {
        console.warn('[onboarding] restore failed', err);
      }

      Alert.alert(t('common.error'), t('importExport.importError'));
    } finally {
      if (!showedConfirm) setIsRestoring(false);
    }
  }, [addRecord, existingRecords, t]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleComplete = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setIsFinishingOnboarding(true);
    setTermsAgreedAt();
    void logAnalyticsEvent('onboarding_completed');

    setTimeout(() => {
      onComplete();
    }, 0);
  }, [onComplete]);

  const handleNext = () => {
    const lastIndex = slides.length - 1;

    if (currentIndex < lastIndex) {
      flatListRef.current?.scrollToOffset({
        offset: (currentIndex + 1) * windowWidth,
        animated: true,
      });
      return;
    }

    const selectedVariantId = getWhisperModelVariantId(selectedWhisperModel, 'q5_1');
    const whisperStatus = whisperModelStatuses[selectedVariantId] ?? 'not_downloaded';
    const anyWhisperDownloading = Object.values(whisperModelStatuses).some(
      (s) => s === 'downloading',
    );

    if (
      whisperStatus === 'downloaded' ||
      whisperStatus === 'downloading' ||
      anyWhisperDownloading
    ) {
      handleComplete();
      return;
    }

    Alert.alert(t('onboarding.downloadBeforeStart'), t('onboarding.downloadBeforeStartHint'), [
      { text: t('common.skip'), style: 'cancel', onPress: handleComplete },
      {
        text: t('common.download'),
        onPress: () => {
          void startDownload(selectedWhisperModel, { format: 'q5_1' }).catch(() => {});
          setTimeout(handleComplete, 120);
        },
      },
    ]);
  };

  const handleDotPress = (index: number) => {
    flatListRef.current?.scrollToOffset({
      offset: index * windowWidth,
      animated: true,
    });
  };

  const renderItem = useCallback(
    ({ item, index }: { item: OnboardingSlideContent; index: number }) => (
      <SlideItem
        item={item}
        index={index}
        scrollX={scrollX}
        screenWidth={screenWidth}
        windowWidth={windowWidth}
        contentMaxWidth={contentMaxWidth}
        color={color}
        t={t}
        agreedToTerms={agreedToTerms}
        onAgreeChange={setAgreedToTerms}
        onRestorePress={handleRestore}
        isRestoring={isRestoring}
      />
    ),
    [
      agreedToTerms,
      color,
      contentMaxWidth,
      handleRestore,
      isRestoring,
      scrollX,
      screenWidth,
      t,
      windowWidth,
    ],
  );

  const isLastSlide = currentIndex === slides.length - 1;
  const permissionsSlideIndex = slides.findIndex((s) => s.id === 'permissions');
  const isOnPermissionsSlide = permissionsSlideIndex >= 0 && currentIndex === permissionsSlideIndex;
  const isOnLastFourScreens = currentIndex >= slides.length - 4;
  const showSkipButton = hasSeenOnboarding && !isOnLastFourScreens;

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: color.background.primary,
        paddingTop: insets.top,
      }}
    >
      <View className="flex-row justify-end px-5 py-3" style={{ minHeight: 48 }}>
        <View
          style={{ opacity: showSkipButton ? 1 : 0 }}
          pointerEvents={showSkipButton ? 'auto' : 'none'}
        >
          <TouchableOpacity
            onPress={handleComplete}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            disabled={isFinishingOnboarding}
            accessibilityRole="button"
            accessibilityLabel={t('common.skip')}
            accessibilityState={{ disabled: isFinishingOnboarding }}
          >
            {isFinishingOnboarding ? (
              <View className="min-h-[36px] min-w-[80px] items-center justify-center px-4 py-2">
                <ActivityIndicator size="small" color={color.text.secondary} />
              </View>
            ) : (
              <Text
                className="px-4 py-2 text-sm font-medium"
                style={{ color: color.text.secondary }}
              >
                {t('common.skip')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <AnimatedFlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        className="flex-1"
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
          setCurrentIndex(index);
        }}
      />
      <View
        style={{
          paddingBottom: insets.bottom + 48,
          paddingTop: 32,
          paddingHorizontal: 24,
          alignSelf: 'center',
          width: '100%',
          maxWidth: contentMaxWidth,
        }}
      >
        <AnimatedProgressDots
          scrollX={scrollX}
          screenWidth={screenWidth}
          onDotPress={handleDotPress}
          color={color}
          slides={slides}
          t={t}
        />
        <AnimatedNextButton
          label={isLastSlide ? t('common.start') : t('common.next')}
          onPress={handleNext}
          scrollX={scrollX}
          screenWidth={screenWidth}
          slideColors={slideColors}
          iconOnAccent={color.icon.onAccent}
          disabled={
            isFinishingOnboarding || ((isOnPermissionsSlide || isLastSlide) && !agreedToTerms)
          }
          loading={isFinishingOnboarding}
        />
      </View>
    </View>
  );
};
