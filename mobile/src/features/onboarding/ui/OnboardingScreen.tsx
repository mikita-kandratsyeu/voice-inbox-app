import { Check, Lock, Mic, Settings, Shield, Sparkles, Zap } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Linking,
  Text,
  TouchableOpacity,
  useColorScheme,
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

import { useSettingsStore } from '@/entities/settings';
import { useModelManager } from '@/features/model-manager';
import { getColors, WEBSITE_URL } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

import { getTermsAgreedAt, setHasSeenOnboarding, setTermsAgreedAt } from '../lib/onboardingStorage';
import { getOnboardingSlides, type OnboardingSlideContent } from '../model/constants';
import { OnboardingSetupStep } from './OnboardingSetupStep';

const ICON_MAP = {
  Mic,
  Lock,
  Sparkles,
  Zap,
  Settings,
} as const;

type OnboardingScreenProps = {
  onComplete: () => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<OnboardingSlideContent>);

const DOT_SIZE = 8;
const PILL_WIDTH = 20;
const DOT_GAP = 4;
const SLOT_WIDTH = PILL_WIDTH + DOT_GAP;
const DOT_LEFT = (SLOT_WIDTH - DOT_SIZE) / 2;
const PILL_LEFT = (SLOT_WIDTH - PILL_WIDTH) / 2;

const AnimatedProgressDots = ({
  scrollX,
  onDotPress,
  color,
  slides,
  t,
}: {
  scrollX: SharedValue<number>;
  onDotPress: (index: number) => void;
  color: ReturnType<typeof getColors>;
  slides: OnboardingSlideContent[];
  t: (key: string, opts?: { index?: number }) => string;
}) => {
  const pillPositions = slides.map((_, i) => i * SLOT_WIDTH + PILL_LEFT);
  const slideColors = slides.map((s, i) =>
    i === slides.length - 1 ? color.accent.primary : s.iconColor,
  );

  const pillStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      scrollX.value,
      slides.map((_, i) => i * SCREEN_WIDTH),
      pillPositions,
    );
    const backgroundColor = interpolateColor(
      scrollX.value,
      slides.map((_, i) => i * SCREEN_WIDTH),
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
  slideColors,
  iconOnAccent,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  scrollX: SharedValue<number>;
  slideColors: string[];
  iconOnAccent: string;
  disabled?: boolean;
  loading?: boolean;
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = slideColors.map((_, i) => i * SCREEN_WIDTH);
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
          opacity: disabled ? 0.5 : 1,
        },
        animatedStyle,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        disabled={disabled}
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
  color: ReturnType<typeof getColors>;
  agreedToTerms?: boolean;
  onAgreeChange?: (value: boolean) => void;
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

  React.useEffect(() => {
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

const SlideItem = ({
  item,
  index,
  scrollX,
  color,
  t,
  agreedToTerms = false,
  onAgreeChange,
}: SlideItemProps & { t: (k: string) => string }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];
    const opacity = interpolate(scrollX.value, inputRange, [0.4, 1, 0.4]);
    const scale = interpolate(scrollX.value, inputRange, [0.92, 1, 0.92]);
    const translateX = interpolate(scrollX.value, inputRange, [-30, 0, 30]);

    return {
      opacity,
      transform: [{ scale }, { translateX }],
    };
  });

  const isSetupSlide = item.extra === 'setup' || item.extra === 'setupWhisper';
  if (isSetupSlide) {
    const linkStyle = {
      color: color.accent.primary,
      textDecorationLine: 'underline' as const,
    };
    const setupMode = item.extra === 'setupWhisper' ? 'whisper' : 'ai';
    const showTerms = item.extra === 'setupWhisper';

    return (
      <Animated.View
        style={[
          {
            width: SCREEN_WIDTH,
            paddingHorizontal: 32,
            paddingTop: 48,
          },
          animatedStyle,
        ]}
        className="flex-1"
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
          <OnboardingSetupStep
            color={color}
            mode={setupMode}
            selectedColor={item.extra === 'setupWhisper' ? color.accent.primary : item.iconColor}
          />
        </View>
        {showTerms && (
          <View className="mt-4 flex-row items-start gap-3">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                hapticSelection();
                onAgreeChange?.(!agreedToTerms);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View
                className="h-7 w-7 items-center justify-center rounded-md"
                style={{
                  backgroundColor: agreedToTerms ? color.accent.primary : 'transparent',
                  borderWidth: 2,
                  borderColor: agreedToTerms ? color.accent.primary : color.text.secondary,
                }}
              >
                {agreedToTerms && <Check size={16} color="#fff" strokeWidth={2.5} />}
              </View>
            </TouchableOpacity>
            <Text className="flex-1 text-sm leading-5" style={{ color: color.text.secondary }}>
              {t('onboarding.agreeToTermsPrefix')}
              <Text
                style={linkStyle}
                onPress={() => WEBSITE_URL && Linking.openURL(`${WEBSITE_URL}/terms`)}
              >
                {t('onboarding.agreeToTermsLink')}
              </Text>
              {t('onboarding.agreeToTermsAnd')}
              <Text
                style={linkStyle}
                onPress={() => WEBSITE_URL && Linking.openURL(`${WEBSITE_URL}/privacy`)}
              >
                {t('onboarding.agreeToTermsLink2')}
              </Text>
            </Text>
          </View>
        )}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[{ width: SCREEN_WIDTH, paddingHorizontal: 32 }, animatedStyle]}
      className="flex-1 items-center justify-center"
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
          <Text className="text-sm font-semibold" style={{ color: color.onboarding.privacy.text }}>
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
    </Animated.View>
  );
};

export const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  const { t } = useTranslation();
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');
  const slides = useMemo(() => getOnboardingSlides(color), [color]);
  const slideColors = useMemo(() => {
    const colors = slides.map((s) => s.iconColor);
    colors[colors.length - 1] = color.accent.primary;
    return colors;
  }, [slides, color.accent.primary]);
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(() => getTermsAgreedAt() != null);
  const [isStartingDownload, setIsStartingDownload] = useState(false);
  const flatListRef = useRef<FlatList<OnboardingSlideContent>>(null);
  const scrollX = useSharedValue(0);

  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);
  const whisperModelStatuses = useSettingsStore((s) => s.whisperModelStatuses);
  const { startDownload } = useModelManager();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleComplete = () => {
    setTermsAgreedAt();
    setHasSeenOnboarding();
    onComplete();
  };

  const handleNext = () => {
    const lastIndex = slides.length - 1;

    if (currentIndex < lastIndex) {
      flatListRef.current?.scrollToOffset({
        offset: (currentIndex + 1) * SCREEN_WIDTH,
        animated: true,
      });
      return;
    }

    const whisperStatus = whisperModelStatuses[selectedWhisperModel] ?? 'not_downloaded';

    if (whisperStatus === 'downloaded') {
      handleComplete();
      return;
    }

    if (whisperStatus === 'downloading') {
      handleComplete();
      return;
    }

    Alert.alert(t('onboarding.downloadBeforeStart'), t('onboarding.downloadBeforeStartHint'), [
      { text: t('common.skip'), style: 'cancel', onPress: handleComplete },
      {
        text: t('common.download'),
        onPress: async () => {
          setIsStartingDownload(true);
          try {
            await startDownload(selectedWhisperModel);
            handleComplete();
          } catch {
            setIsStartingDownload(false);
          }
        },
      },
    ]);
  };

  const handleDotPress = (index: number) => {
    flatListRef.current?.scrollToOffset({
      offset: index * SCREEN_WIDTH,
      animated: true,
    });
  };

  const renderItem = useCallback(
    ({ item, index }: { item: OnboardingSlideContent; index: number }) => (
      <SlideItem
        item={item}
        index={index}
        scrollX={scrollX}
        color={color}
        t={t}
        agreedToTerms={agreedToTerms}
        onAgreeChange={setAgreedToTerms}
      />
    ),
    [agreedToTerms, color, scrollX, t],
  );

  const isLastSlide = currentIndex === slides.length - 1;
  const isOnLastTwoScreens = currentIndex >= slides.length - 2;
  const showSkipButton = agreedToTerms && !isOnLastTwoScreens;

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: color.background.primary,
        paddingTop: insets.top,
      }}
    >
      <View className="flex-row justify-end px-5 py-3" style={{ minHeight: 48 }}>
        <TouchableOpacity
          onPress={handleComplete}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ opacity: showSkipButton ? 1 : 0 }}
          pointerEvents={showSkipButton ? 'auto' : 'none'}
        >
          <Text className="px-4 py-2 text-sm font-medium" style={{ color: color.text.secondary }}>
            {t('common.skip')}
          </Text>
        </TouchableOpacity>
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
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(index);
        }}
      />
      <View className="px-6" style={{ paddingBottom: insets.bottom + 48, paddingTop: 32 }}>
        <AnimatedProgressDots
          scrollX={scrollX}
          onDotPress={handleDotPress}
          color={color}
          slides={slides}
          t={t}
        />
        <AnimatedNextButton
          label={isLastSlide ? t('common.start') : t('common.next')}
          onPress={handleNext}
          scrollX={scrollX}
          slideColors={slideColors}
          iconOnAccent={color.icon.onAccent}
          loading={isStartingDownload}
          disabled={isStartingDownload || (isLastSlide && !agreedToTerms)}
        />
      </View>
    </View>
  );
};
