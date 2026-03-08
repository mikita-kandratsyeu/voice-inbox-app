import { Lock, Mic, Shield, Sparkles, Zap } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
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

import { getColors } from '@/shared/config';

import { setHasSeenOnboarding } from '../lib/onboardingStorage';
import { getOnboardingSlides, type OnboardingSlide } from '../model/constants';

const ICON_MAP = {
  Mic,
  Lock,
  Sparkles,
  Zap,
} as const;

type OnboardingScreenProps = {
  onComplete: () => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<OnboardingSlide>);

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
}: {
  scrollX: SharedValue<number>;
  onDotPress: (index: number) => void;
  color: ReturnType<typeof getColors>;
  slides: OnboardingSlide[];
}) => {
  const pillPositions = slides.map((_, i) => i * SLOT_WIDTH + PILL_LEFT);
  const slideColors = slides.map((s) => s.iconColor);

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
            accessibilityLabel={`Перейти к слайду ${index + 1}`}
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
}: {
  label: string;
  onPress: () => void;
  scrollX: SharedValue<number>;
  slideColors: string[];
  iconOnAccent: string;
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
        },
        animatedStyle,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        className="flex-1 flex-row items-center justify-center py-3.5 px-7"
      >
        <Text className="text-[16px] font-semibold" style={{ color: iconOnAccent }}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

type SlideItemProps = {
  item: OnboardingSlide;
  index: number;
  scrollX: SharedValue<number>;
  color: ReturnType<typeof getColors>;
};

const AnimatedSlideIcon = ({
  iconName,
  iconColor,
  iconBg,
  iconOnAccent,
}: {
  iconName: OnboardingSlide['iconName'];
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

const SlideItem = ({ item, index, scrollX, color }: SlideItemProps) => {
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
        {item.title}
      </Text>

      <Text
        className="mb-6 text-center text-[18px] leading-7"
        style={{ color: color.text.secondary }}
      >
        {item.description}
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
            100% Приватно
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
            Ваши данные в безопасности
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

export const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');
  const slides = useMemo(() => getOnboardingSlides(color), [color]);
  const slideColors = useMemo(() => slides.map((s) => s.iconColor), [slides]);
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingSlide>>(null);
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleComplete = () => {
    setHasSeenOnboarding();
    onComplete();
  };

  const handleNext = () => {
    const lastIndex = slides.length - 1;

    if (currentIndex >= lastIndex) {
      handleComplete();
      return;
    }

    flatListRef.current?.scrollToOffset({
      offset: (currentIndex + 1) * SCREEN_WIDTH,
      animated: true,
    });
  };

  const handleDotPress = (index: number) => {
    flatListRef.current?.scrollToOffset({
      offset: index * SCREEN_WIDTH,
      animated: true,
    });
  };

  const renderItem = useCallback(
    ({ item, index }: { item: OnboardingSlide; index: number }) => (
      <SlideItem item={item} index={index} scrollX={scrollX} color={color} />
    ),
    [color, scrollX],
  );

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: color.background.primary,
        paddingTop: insets.top,
      }}
    >
      {!isLastSlide && (
        <View className="absolute top-20 right-5 z-10">
          <TouchableOpacity
            onPress={handleComplete}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text className="px-4 py-2 text-sm font-medium" style={{ color: color.text.secondary }}>
              Пропустить
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <AnimatedFlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
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
        />
        <AnimatedNextButton
          label={isLastSlide ? 'Начать' : 'Далее'}
          onPress={handleNext}
          scrollX={scrollX}
          slideColors={slideColors}
          iconOnAccent={color.icon.onAccent}
        />
      </View>
    </View>
  );
};
