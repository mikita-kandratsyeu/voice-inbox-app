import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolateColor,
  runOnJS,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { SPRING_CONFIGS } from '@/shared/config';
import { hapticLight, hapticSelection, useIsTablet, withAlphaHex } from '@/shared/lib';
import { resolveDayjsLocale } from '@/shared/lib/date';

import {
  formatCalendarHeaderDate,
  formatWeekdayShort,
  getIsoWeekDays,
  resolveWeekSlideDirection,
  shiftCalendarDateByWeeks,
  type WeekSlideDirection,
} from '../lib/allTasksCalendarDate';
import { getAllTasksCalendarMetrics } from '../lib/allTasksLayoutMetrics';

const CARD_RADIUS = 16;
const CALENDAR_SELECTION_MS = 200;
const CALENDAR_WEEK_SLIDE_MS = 220;
const SWIPE_VELOCITY_THRESHOLD = 500;
const SWIPE_TRANSLATION_THRESHOLD = 50;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type AllTasksCalendarPanelProps = {
  color: Colors;
  selectedDate: Date;
  tasksCount: number;
  taskCountsByDay: ReadonlyMap<string, number>;
  onDateChange: (date: Date) => void;
  /** Match AllTasksTaskRow: tablet FlashList padding 12 + mx-3; phone mx-4. */
  compactHorizontalMargin?: boolean;
  maxWidth?: number;
};

function WeekNavControls({
  color,
  metrics,
  onPreviousWeek,
  onNextWeek,
  previousWeekA11y,
  nextWeekA11y,
}: {
  color: Colors;
  metrics: ReturnType<typeof getAllTasksCalendarMetrics>;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  previousWeekA11y: string;
  nextWeekA11y: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pressable
        onPress={onPreviousWeek}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={previousWeekA11y}
        style={({ pressed }) => [
          {
            width: metrics.navButtonSize,
            height: metrics.navButtonSize,
            alignItems: 'center',
            justifyContent: 'center',
          },
          pressed ? { opacity: 0.7 } : null,
        ]}
      >
        <ChevronLeft size={metrics.navIconSize} color={color.text.secondary} strokeWidth={2.5} />
      </Pressable>
      <Pressable
        onPress={onNextWeek}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={nextWeekA11y}
        style={({ pressed }) => [
          {
            width: metrics.navButtonSize,
            height: metrics.navButtonSize,
            alignItems: 'center',
            justifyContent: 'center',
          },
          pressed ? { opacity: 0.7 } : null,
        ]}
      >
        <ChevronRight size={metrics.navIconSize} color={color.text.secondary} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

type WeekDayCellProps = {
  color: Colors;
  date: dayjs.Dayjs;
  locale: 'en' | 'ru';
  selected: boolean;
  hasTasks: boolean;
  cellWidth?: number;
  metrics: ReturnType<typeof getAllTasksCalendarMetrics>;
  selectedDayBackground: string;
  a11yLabel: string;
  onPress: () => void;
};

function WeekDayCell({
  color,
  date,
  locale,
  selected,
  hasTasks,
  cellWidth,
  metrics,
  selectedDayBackground,
  a11yLabel,
  onPress,
}: WeekDayCellProps) {
  const weekday = formatWeekdayShort(date, locale);
  const dayNumber = date.format('D');
  const selectedProgress = useSharedValue(selected ? 1 : 0);
  const pressScale = useSharedValue(1);
  const dotOpacity = useSharedValue(hasTasks ? 1 : 0);

  useEffect(() => {
    selectedProgress.value = withTiming(selected ? 1 : 0, {
      duration: CALENDAR_SELECTION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [selected, selectedProgress]);

  useEffect(() => {
    dotOpacity.value = withTiming(hasTasks ? 1 : 0, {
      duration: CALENDAR_SELECTION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [dotOpacity, hasTasks]);

  const cellAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const selectionAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      selectedProgress.value,
      [0, 1],
      ['rgba(0,0,0,0)', selectedDayBackground],
    ),
  }));

  const dayNumberAnimatedStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      selectedProgress.value,
      [0, 1],
      [color.text.primary, color.accent.primary],
    ),
  }));

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
    transform: [{ scale: dotOpacity.value }],
  }));

  return (
    <View
      style={{
        width: cellWidth,
        flex: cellWidth ? undefined : 1,
        minWidth: cellWidth ? undefined : 0,
        height: metrics.dayCellHeight,
      }}
    >
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => {
          pressScale.value = withTiming(0.94, { duration: 80 });
        }}
        onPressOut={() => {
          pressScale.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.cubic) });
        }}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityState={{ selected }}
        style={[
          {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          },
          cellAnimatedStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              width: '100%',
              height: '100%',
              borderRadius: metrics.selectedDayRadius,
              alignItems: 'center',
              justifyContent: 'center',
            },
            selectionAnimatedStyle,
          ]}
        >
          <Text
            style={{
              color: color.text.secondary,
              fontSize: metrics.weekdayFontSize,
              fontWeight: '500',
              lineHeight: metrics.weekdayFontSize + 2,
            }}
            numberOfLines={1}
          >
            {weekday}
          </Text>
          <Animated.Text
            style={[
              {
                fontSize: metrics.dayNumberFontSize,
                fontWeight: '600',
                lineHeight: metrics.dayNumberFontSize + 2,
                marginTop: metrics.weekdayToDayNumberGap,
              },
              dayNumberAnimatedStyle,
            ]}
            numberOfLines={1}
          >
            {dayNumber}
          </Animated.Text>
          <View
            style={{
              height: metrics.dotSize + 4,
              marginTop: 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Animated.View
              style={[
                {
                  width: metrics.dotSize,
                  height: metrics.dotSize,
                  borderRadius: metrics.dotSize / 2,
                  backgroundColor: color.accent.primary,
                },
                dotAnimatedStyle,
              ]}
            />
          </View>
        </Animated.View>
      </AnimatedPressable>
    </View>
  );
}

export function AllTasksCalendarPanel({
  color,
  selectedDate,
  tasksCount,
  taskCountsByDay,
  onDateChange,
  compactHorizontalMargin = false,
  maxWidth,
}: AllTasksCalendarPanelProps) {
  const { i18n, t } = useTranslation();
  const isTablet = useIsTablet();
  const metrics = getAllTasksCalendarMetrics(isTablet);
  const locale = resolveDayjsLocale(i18n.language);
  const [weekDaysWidth, setWeekDaysWidth] = useState(0);
  const [weekSlideDirection, setWeekSlideDirection] = useState<WeekSlideDirection>('none');
  const dayCellWidth = weekDaysWidth > 0 ? weekDaysWidth / 7 : 0;
  const selectedDayBackground = withAlphaHex(color.accent.primary, 0.14);

  const translateX = useSharedValue(0);
  const isSwipingRef = useRef(false);

  const selected = useMemo(() => dayjs(selectedDate).locale(locale), [locale, selectedDate]);

  const isToday = useMemo(() => selected.isSame(dayjs(), 'day'), [selected]);

  const selectedDateTitle = useMemo(
    () => formatCalendarHeaderDate(selected, i18n.language),
    [i18n.language, selected],
  );

  const selectedDateSubtitle = useMemo(() => {
    if (tasksCount === 0) {
      return t('allTasks.calendarNoTasksOnDay');
    }

    const tasksLabel = t('allTasks.calendarTasksCount', { count: tasksCount });

    return tasksLabel;
  }, [t, tasksCount]);

  const weekDays = useMemo(
    () => getIsoWeekDays(selectedDate, locale).map((date) => date.locale(locale)),
    [locale, selectedDate],
  );

  const weekKey = weekDays[0]?.format('YYYY-MM-DD') ?? selected.format('YYYY-MM-DD');

  const headerSummaryMinHeight =
    metrics.selectedDateTitleFontSize + 2 + 4 + metrics.headerSubtitleFontSize + 2;

  const weekRowEntering = useMemo(() => {
    if (weekSlideDirection === 'prev') {
      return SlideInLeft.duration(CALENDAR_WEEK_SLIDE_MS).easing(Easing.out(Easing.cubic));
    }
    if (weekSlideDirection === 'next') {
      return SlideInRight.duration(CALENDAR_WEEK_SLIDE_MS).easing(Easing.out(Easing.cubic));
    }
    return undefined;
  }, [weekSlideDirection]);

  const weekRowExiting = useMemo(() => {
    if (weekSlideDirection === 'prev') {
      return SlideOutRight.duration(CALENDAR_WEEK_SLIDE_MS - 40).easing(Easing.in(Easing.cubic));
    }
    if (weekSlideDirection === 'next') {
      return SlideOutLeft.duration(CALENDAR_WEEK_SLIDE_MS - 40).easing(Easing.in(Easing.cubic));
    }
    return undefined;
  }, [weekSlideDirection]);

  const goToToday = useCallback(() => {
    hapticSelection();
    const today = new Date();
    setWeekSlideDirection(resolveWeekSlideDirection(selectedDate, today));
    onDateChange(today);
  }, [onDateChange, selectedDate]);

  const goToPreviousWeek = useCallback(() => {
    hapticSelection();
    setWeekSlideDirection('prev');
    onDateChange(shiftCalendarDateByWeeks(selectedDate, -1));
  }, [onDateChange, selectedDate]);

  const goToNextWeek = useCallback(() => {
    hapticSelection();
    setWeekSlideDirection('next');
    onDateChange(shiftCalendarDateByWeeks(selectedDate, 1));
  }, [onDateChange, selectedDate]);

  const handleSelectDay = useCallback(
    (date: dayjs.Dayjs) => {
      hapticSelection();
      setWeekSlideDirection('none');
      onDateChange(date.toDate());
    },
    [onDateChange],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-10, 10])
        .onStart(() => {
          isSwipingRef.current = true;
        })
        .onUpdate((event) => {
          const maxTranslation = weekDaysWidth * 0.3;
          const clampedX = Math.max(-maxTranslation, Math.min(maxTranslation, event.translationX));
          translateX.value = clampedX;
        })
        .onEnd((event) => {
          const shouldChangePrev =
            event.velocityX > SWIPE_VELOCITY_THRESHOLD ||
            event.translationX > SWIPE_TRANSLATION_THRESHOLD;
          const shouldChangeNext =
            event.velocityX < -SWIPE_VELOCITY_THRESHOLD ||
            event.translationX < -SWIPE_TRANSLATION_THRESHOLD;

          if (shouldChangePrev) {
            runOnJS(hapticLight)();
            runOnJS(setWeekSlideDirection)('prev');
            runOnJS(onDateChange)(shiftCalendarDateByWeeks(selectedDate, -1));
          } else if (shouldChangeNext) {
            runOnJS(hapticLight)();
            runOnJS(setWeekSlideDirection)('next');
            runOnJS(onDateChange)(shiftCalendarDateByWeeks(selectedDate, 1));
          }

          translateX.value = withSpring(0, SPRING_CONFIGS.gentle);
          isSwipingRef.current = false;
        })
        .onFinalize(() => {
          isSwipingRef.current = false;
          translateX.value = withSpring(0, SPRING_CONFIGS.gentle);
        }),
    [onDateChange, selectedDate, translateX, weekDaysWidth],
  );

  const weekRowAnimatedStyle = useAnimatedStyle(() => {
    const maxTranslation = weekDaysWidth * 0.3;
    const progress = Math.abs(translateX.value) / maxTranslation;
    const opacity = 1 - progress * 0.15;

    return {
      transform: [{ translateX: translateX.value }],
      opacity,
    };
  });

  const cardShadowStyle = {
    shadowColor: color.shadow.color,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: color.shadow.opacity,
    shadowRadius: 4,
    elevation: 2,
  };

  return (
    <View
      style={{
        alignSelf: 'center',
        width: '100%',
        maxWidth,
        paddingHorizontal: compactHorizontalMargin ? 12 : 0,
        paddingTop: 8,
        paddingBottom: 4,
        backgroundColor: color.background.secondary,
      }}
    >
      <View
        className={compactHorizontalMargin ? 'mx-3' : 'mx-4'}
        style={[
          cardShadowStyle,
          {
            backgroundColor: color.background.card,
            borderRadius: CARD_RADIUS,
            paddingHorizontal: metrics.cardPaddingH,
            paddingVertical: metrics.cardPaddingV,
          },
        ]}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flex: 1, minWidth: 0, minHeight: headerSummaryMinHeight }}>
            <Text
              accessibilityRole="header"
              style={{
                color: color.text.primary,
                fontSize: metrics.selectedDateTitleFontSize,
                fontWeight: '700',
                letterSpacing: -0.3,
                lineHeight: metrics.selectedDateTitleFontSize + 2,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {selectedDateTitle}
            </Text>
            <Text
              style={{
                marginTop: 4,
                color: color.text.secondary,
                fontSize: metrics.headerSubtitleFontSize,
                fontWeight: '500',
                lineHeight: metrics.headerSubtitleFontSize + 2,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {selectedDateSubtitle}
            </Text>
          </View>

          <View
            style={{
              flexShrink: 0,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              minHeight: metrics.navButtonSize,
            }}
          >
            {!isToday ? (
              <Pressable
                onPress={goToToday}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('allTasks.calendarGoToTodayA11y')}
                style={({ pressed }) => [
                  {
                    height: metrics.navButtonSize,
                    justifyContent: 'center',
                  },
                  pressed ? { opacity: 0.88 } : null,
                ]}
              >
                <Text
                  style={{
                    color: color.accent.primary,
                    fontSize: metrics.headerFontSize,
                    fontWeight: '600',
                    lineHeight: metrics.headerFontSize + 2,
                  }}
                >
                  {t('allTasks.today')}
                </Text>
              </Pressable>
            ) : null}

            <WeekNavControls
              color={color}
              metrics={metrics}
              onPreviousWeek={goToPreviousWeek}
              onNextWeek={goToNextWeek}
              previousWeekA11y={t('allTasks.calendarPreviousWeekA11y')}
              nextWeekA11y={t('allTasks.calendarNextWeekA11y')}
            />
          </View>
        </View>

        <GestureDetector gesture={panGesture}>
          <View
            style={{
              marginTop: 12,
              width: '100%',
              height: metrics.dayCellHeight,
              overflow: 'hidden',
            }}
            onLayout={(event) => {
              const nextWidth = Math.round(event.nativeEvent.layout.width);
              setWeekDaysWidth((current) => (current === nextWidth ? current : nextWidth));
            }}
          >
            <Animated.View
              key={weekKey}
              entering={weekRowEntering}
              exiting={weekRowExiting}
              style={[
                { flexDirection: 'row', width: weekDaysWidth > 0 ? weekDaysWidth : '100%' },
                weekRowAnimatedStyle,
              ]}
            >
              {weekDays.map((date) => {
                const dayKey = date.format('YYYY-MM-DD');
                const isSelected = date.isSame(selected, 'day');
                const hasTasks = (taskCountsByDay.get(dayKey) ?? 0) > 0;
                const dateLabel = formatCalendarHeaderDate(date.locale(locale), i18n.language);

                return (
                  <WeekDayCell
                    key={dayKey}
                    color={color}
                    date={date}
                    locale={locale}
                    selected={isSelected}
                    hasTasks={hasTasks}
                    cellWidth={dayCellWidth > 0 ? dayCellWidth : undefined}
                    metrics={metrics}
                    selectedDayBackground={selectedDayBackground}
                    a11yLabel={t('allTasks.calendarSelectDayA11y', { date: dateLabel })}
                    onPress={() => handleSelectDay(date)}
                  />
                );
              })}
            </Animated.View>
          </View>
        </GestureDetector>
      </View>
    </View>
  );
}
