import dayjs, { type Dayjs } from 'dayjs';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { hapticSelection, withAlphaHex } from '@/shared/lib';
import { resolveDayjsLocale } from '@/shared/lib/date';

import {
  CALENDAR_OVERDUE_MARKER_COLOR,
  CALENDAR_TASK_MARKER_COLOR,
  getTaskMarkerDotColor,
  type TaskDeadlineDayMarker,
} from '../lib/buildTaskDeadlineDayMarkers';

const DAY_CELL_HEIGHT = 44;
const WEEK_DAY_CELL_HEIGHT = 40;
const SELECTION_DIAMETER = 38;
const WEEK_SELECTION_DIAMETER = 34;
const DOT_SIZE = 5;
const DOT_BOTTOM_INSET = 1.5;
const SELECTED_DAY_TINT_ALPHA = 0.16;
const FOOTER_ICON_SIZE = 40;
const CALENDAR_CARD_LAYOUT_TRANSITION = LinearTransition.duration(260).easing(Easing.out(Easing.quad));
const CALENDAR_CONTENT_FADE_IN = FadeIn.duration(200);
const CALENDAR_CONTENT_FADE_OUT = FadeOut.duration(160);
const SWIPE_COMMIT_DISTANCE = 44;
const SWIPE_VELOCITY_THRESHOLD = 600;
const SWIPE_ACTIVE_OFFSET_X = 14;
const SWIPE_FAIL_OFFSET_Y = 18;
const SWIPE_COMMIT_NUDGE = 28;

function countWeeksInMonthGrid(month: Dayjs): number {
  const gridStart = month.startOf('month').startOf('week');
  const gridEnd = month.endOf('month').endOf('week');
  return gridEnd.diff(gridStart, 'week') + 1;
}

type CalendarDayVisualState = {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  fontWeight: '400' | '600';
  textColor: string;
};

function getCalendarDayVisualState(
  color: Colors,
  options: {
    cellInMonth: boolean;
    isSelected: boolean;
    isToday: boolean;
  },
): CalendarDayVisualState {
  const { cellInMonth, isSelected, isToday } = options;
  const mutedText = color.text.muted;
  const defaultText = cellInMonth ? color.text.primary : mutedText;

  if (isSelected) {
    return {
      backgroundColor: withAlphaHex(color.accent.primary, SELECTED_DAY_TINT_ALPHA),
      borderColor: 'transparent',
      borderWidth: 0,
      textColor: color.accent.primary,
      fontWeight: '600',
    };
  }

  if (isToday) {
    return {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      borderWidth: 0,
      textColor: color.accent.primary,
      fontWeight: '600',
    };
  }

  return {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    textColor: defaultText,
    fontWeight: '400',
  };
}

type TasksMonthCalendarProps = {
  color: Colors;
  selectedDate: Date;
  dayMarkers: Map<string, TaskDeadlineDayMarker>;
  onDateChange: (date: Date) => void;
  collapsible?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
};

type CalendarDayCell = {
  date: Dayjs;
  inMonth: boolean;
  key: string;
};

function buildWeekDays(anchor: Dayjs): CalendarDayCell[] {
  const weekStart = anchor.startOf('week');

  return Array.from({ length: 7 }, (_, index) => {
    const date = weekStart.add(index, 'day');
    return {
      date,
      inMonth: date.month() === anchor.month(),
      key: date.format('YYYY-MM-DD'),
    };
  });
}

function formatWeekRangeTitle(
  weekStart: Dayjs,
  weekEnd: Dayjs,
  locale: string,
  language: string,
): string {
  const start = weekStart.locale(locale);
  const end = weekEnd.locale(locale);

  if (start.isSame(end, 'month')) {
    const range = `${start.format('D')}–${end.format('D MMMM YYYY')}`;
    return language.startsWith('ru') ? `${range} г.` : range;
  }

  const range = `${start.format('D MMM')} – ${end.format('D MMM YYYY')}`;
  return language.startsWith('ru') ? `${range} г.` : range;
}

function buildMonthWeeks(visibleMonth: Dayjs): CalendarDayCell[][] {
  const monthStart = visibleMonth.startOf('month');
  const gridStart = monthStart.startOf('week');
  const weekCount = countWeeksInMonthGrid(visibleMonth);
  const weeks: CalendarDayCell[][] = [];

  for (let week = 0; week < weekCount; week++) {
    const row: CalendarDayCell[] = [];
    for (let day = 0; day < 7; day++) {
      const date = gridStart.add(week * 7 + day, 'day');
      row.push({
        date,
        inMonth: date.month() === visibleMonth.month(),
        key: date.format('YYYY-MM-DD'),
      });
    }
    weeks.push(row);
  }

  return weeks;
}

function capitalizeFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatSelectedDateTitle(date: Dayjs, locale: string): string {
  return date.locale(locale).format('D MMMM YYYY');
}

function formatSelectedDateSubtitle(date: Dayjs, locale: string, language: string): string {
  const localized = date.locale(locale);
  if (language.startsWith('ru')) {
    return `${capitalizeFirst(localized.format('dddd'))}, ${localized.format('D MMMM YYYY')} г.`;
  }
  return capitalizeFirst(localized.format('dddd, D MMMM YYYY'));
}

type CalendarDayCellRenderOptions = {
  color: Colors;
  locale: string;
  selected: Dayjs;
  dayMarkers: Map<string, TaskDeadlineDayMarker>;
  onDateChange: (date: Date) => void;
  cellHeight: number;
  selectionDiameter: number;
  dayNumberFontSize: number;
  formatDayA11y: (date: Dayjs, hasTasks: boolean) => string;
};

function CalendarDayCellButton({
  cell,
  options,
}: {
  cell: CalendarDayCell;
  options: CalendarDayCellRenderOptions;
}) {
  const {
    color,
    locale,
    selected,
    dayMarkers,
    onDateChange,
    cellHeight,
    selectionDiameter,
    dayNumberFontSize,
    formatDayA11y,
  } = options;

  const isSelected = cell.date.isSame(selected, 'day');
  const isToday = cell.date.isSame(dayjs(), 'day');
  const marker = dayMarkers.get(cell.key);
  const dayVisual = getCalendarDayVisualState(color, {
    cellInMonth: cell.inMonth,
    isSelected,
    isToday,
  });
  const dotColor = getTaskMarkerDotColor(marker);

  return (
    <View
      style={{
        flex: 1,
        height: cellHeight,
        alignItems: 'center',
      }}
    >
      <Pressable
        onPress={() => {
          hapticSelection();
          onDateChange(cell.date.toDate());
        }}
        style={({ pressed }) => ({
          width: '100%',
          height: cellHeight,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.82 : 1,
        })}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={formatDayA11y(cell.date, Boolean(marker))}
      >
        <View
          style={{
            width: selectionDiameter,
            height: selectionDiameter,
            borderRadius: selectionDiameter / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: dayVisual.backgroundColor,
            borderWidth: dayVisual.borderWidth,
            borderColor: dayVisual.borderColor,
          }}
        >
          <Text
            style={{
              color: dayVisual.textColor,
              fontSize: dayNumberFontSize,
              fontWeight: dayVisual.fontWeight,
              fontVariant: ['tabular-nums'],
            }}
          >
            {cell.date.date()}
          </Text>
        </View>
      </Pressable>
      {dotColor ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: DOT_BOTTOM_INSET,
            left: '50%',
            width: DOT_SIZE,
            height: DOT_SIZE,
            marginLeft: -DOT_SIZE / 4,
            borderRadius: DOT_SIZE / 2,
            backgroundColor: dotColor,
          }}
        />
      ) : null}
    </View>
  );
}

export function TasksMonthCalendar({
  color,
  selectedDate,
  dayMarkers,
  onDateChange,
  collapsible = false,
  expanded = true,
  onExpandedChange,
}: TasksMonthCalendarProps) {
  const { i18n, t } = useTranslation();
  const locale = resolveDayjsLocale(i18n.language);
  const selected = useMemo(() => dayjs(selectedDate).startOf('day'), [selectedDate]);
  const [visibleMonth, setVisibleMonth] = useState(() => selected.startOf('month'));

  useEffect(() => {
    const selectedMonth = selected.startOf('month');
    setVisibleMonth((current) =>
      current.isSame(selectedMonth, 'month') ? current : selectedMonth,
    );
  }, [selected]);

  const monthTitle = useMemo(() => {
    const formatted = visibleMonth.locale(locale).format('MMMM YYYY');
    const title = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    return i18n.language.startsWith('ru') ? `${title} г.` : title;
  }, [i18n.language, locale, visibleMonth]);

  const weekdayLabels = useMemo(() => {
    const weekStart = dayjs().locale(locale).startOf('week');
    return Array.from({ length: 7 }, (_, index) =>
      weekStart.add(index, 'day').locale(locale).format('dd').toUpperCase(),
    );
  }, [locale]);

  const monthWeeks = useMemo(() => buildMonthWeeks(visibleMonth), [visibleMonth]);
  const calendarBodyHeight = monthWeeks.length * DAY_CELL_HEIGHT;
  const weekDays = useMemo(() => buildWeekDays(selected), [selected]);
  const weekStart = useMemo(() => selected.startOf('week'), [selected]);
  const weekEnd = useMemo(() => selected.endOf('week'), [selected]);
  const weekRangeTitle = useMemo(
    () => formatWeekRangeTitle(weekStart, weekEnd, locale, i18n.language),
    [i18n.language, locale, weekEnd, weekStart],
  );
  const selectedDateTitle = useMemo(
    () => formatSelectedDateTitle(selected, locale),
    [locale, selected],
  );
  const selectedDateSubtitle = useMemo(
    () => formatSelectedDateSubtitle(selected, locale, i18n.language),
    [i18n.language, locale, selected],
  );
  const hasAnyDayMarkers = dayMarkers.size > 0;

  const showWeekView = collapsible && !expanded;
  const slideX = useSharedValue(0);
  const pageWidthSV = useSharedValue(0);

  useEffect(() => {
    slideX.value = 0;
  }, [expanded, selected, slideX, visibleMonth]);

  const navigatePrevious = useCallback(() => {
    hapticSelection();
    if (showWeekView) {
      onDateChange(selected.subtract(7, 'day').toDate());
      return;
    }
    setVisibleMonth((current) => current.subtract(1, 'month'));
  }, [onDateChange, selected, showWeekView]);

  const navigateNext = useCallback(() => {
    hapticSelection();
    if (showWeekView) {
      onDateChange(selected.add(7, 'day').toDate());
      return;
    }
    setVisibleMonth((current) => current.add(1, 'month'));
  }, [onDateChange, selected, showWeekView]);

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-SWIPE_ACTIVE_OFFSET_X, SWIPE_ACTIVE_OFFSET_X])
        .failOffsetY([-SWIPE_FAIL_OFFSET_Y, SWIPE_FAIL_OFFSET_Y])
        .onUpdate((event) => {
          const width = Math.max(pageWidthSV.value, 1);
          const rubberBand = 0.42;
          const maxDrag = width * 0.34;
          const nextX = event.translationX * rubberBand;
          slideX.value = Math.max(-maxDrag, Math.min(maxDrag, nextX));
        })
        .onEnd((event) => {
          const shouldGoNext =
            event.translationX < -SWIPE_COMMIT_DISTANCE ||
            event.velocityX < -SWIPE_VELOCITY_THRESHOLD;
          const shouldGoPrev =
            event.translationX > SWIPE_COMMIT_DISTANCE ||
            event.velocityX > SWIPE_VELOCITY_THRESHOLD;

          if (shouldGoNext) {
            slideX.value = withTiming(-SWIPE_COMMIT_NUDGE, { duration: 130 }, (finished) => {
              if (finished) {
                runOnJS(navigateNext)();
                slideX.value = 0;
              }
            });
            return;
          }

          if (shouldGoPrev) {
            slideX.value = withTiming(SWIPE_COMMIT_NUDGE, { duration: 130 }, (finished) => {
              if (finished) {
                runOnJS(navigatePrevious)();
                slideX.value = 0;
              }
            });
            return;
          }

          slideX.value = withSpring(0, { damping: 22, stiffness: 320 });
        }),
    [navigateNext, navigatePrevious, pageWidthSV, slideX],
  );

  const swipeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));

  const cardStyle = {
    width: '100%' as const,
    backgroundColor: color.background.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    shadowColor: color.shadow.color,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: color.shadow.opacity,
    shadowRadius: 4,
    elevation: 2,
  };

  const formatDayA11y = (date: Dayjs, hasTasks: boolean) =>
    hasTasks
      ? t('allTasks.calendarDayWithTasksA11y', {
          date: date.locale(locale).format('D MMMM'),
        })
      : date.locale(locale).format('D MMMM');

  const dayCellOptions: CalendarDayCellRenderOptions = {
    color,
    locale,
    selected,
    dayMarkers,
    onDateChange,
    cellHeight: DAY_CELL_HEIGHT,
    selectionDiameter: SELECTION_DIAMETER,
    dayNumberFontSize: 20,
    formatDayA11y,
  };

  const weekDayCellOptions: CalendarDayCellRenderOptions = {
    ...dayCellOptions,
    cellHeight: WEEK_DAY_CELL_HEIGHT,
    selectionDiameter: WEEK_SELECTION_DIAMETER,
    dayNumberFontSize: 18,
  };

  return (
    <Animated.View layout={CALENDAR_CARD_LAYOUT_TRANSITION} style={cardStyle}>
      <GestureDetector gesture={swipeGesture}>
        <Animated.View
          style={swipeAnimatedStyle}
          onLayout={(event) => {
            pageWidthSV.value = event.nativeEvent.layout.width;
          }}
        >
      {showWeekView ? (
        <Animated.View
          key="week-calendar"
          entering={CALENDAR_CONTENT_FADE_IN}
          exiting={CALENDAR_CONTENT_FADE_OUT}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              paddingHorizontal: 4,
              minHeight: 28,
            }}
          >
            <Text
              style={{
                color: color.text.primary,
                fontSize: 16,
                fontWeight: '600',
                flex: 1,
                minWidth: 0,
              }}
              accessibilityRole="header"
              numberOfLines={1}
            >
              {weekRangeTitle}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable
                onPress={navigatePrevious}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t('allTasks.calendarPreviousWeekA11y')}
              >
                <ChevronLeft size={22} color={color.accent.primary} strokeWidth={2.4} />
              </Pressable>
              <Pressable
                onPress={navigateNext}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t('allTasks.calendarNextWeekA11y')}
              >
                <ChevronRight size={22} color={color.accent.primary} strokeWidth={2.4} />
              </Pressable>
              <Pressable
                onPress={() => onExpandedChange?.(true)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t('allTasks.calendarExpandA11y')}
              >
                <ChevronDown size={22} color={color.text.secondary} strokeWidth={2.4} />
              </Pressable>
            </View>
          </View>

          <View style={{ flexDirection: 'row', width: '100%', marginBottom: 4, minHeight: 16 }}>
            {weekdayLabels.map((label, index) => (
              <View key={`week-${label}-${index}`} style={{ flex: 1, alignItems: 'center' }}>
                <Text
                  style={{
                    color: color.text.muted,
                    fontSize: 11,
                    fontWeight: '500',
                    letterSpacing: 0.3,
                  }}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', width: '100%', height: WEEK_DAY_CELL_HEIGHT }}>
            {weekDays.map((cell) => (
              <CalendarDayCellButton key={cell.key} cell={cell} options={weekDayCellOptions} />
            ))}
          </View>
        </Animated.View>
      ) : (
        <Animated.View
          key="month-calendar"
          entering={CALENDAR_CONTENT_FADE_IN}
          exiting={CALENDAR_CONTENT_FADE_OUT}
        >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          paddingHorizontal: 4,
          minHeight: 28,
        }}
      >
        <Text
          style={{
            color: color.text.primary,
            fontSize: 18,
            fontWeight: '600',
            flex: 1,
            minWidth: 0,
          }}
          accessibilityRole="header"
        >
          {monthTitle}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={navigatePrevious}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('allTasks.calendarPreviousMonthA11y')}
          >
            <ChevronLeft size={22} color={color.accent.primary} strokeWidth={2.4} />
          </Pressable>
          <Pressable
            onPress={navigateNext}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('allTasks.calendarNextMonthA11y')}
          >
            <ChevronRight size={22} color={color.accent.primary} strokeWidth={2.4} />
          </Pressable>
          {collapsible ? (
            <Pressable
              onPress={() => onExpandedChange?.(false)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('allTasks.calendarCollapseA11y')}
            >
              <ChevronUp size={22} color={color.text.secondary} strokeWidth={2.4} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', width: '100%', marginBottom: 6, minHeight: 16 }}>
        {weekdayLabels.map((label, index) => (
          <View key={`${label}-${index}`} style={{ flex: 1, alignItems: 'center' }}>
            <Text
              style={{
                color: color.text.muted,
                fontSize: 12,
                fontWeight: '500',
                letterSpacing: 0.3,
              }}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ width: '100%', height: calendarBodyHeight }}>
        {monthWeeks.map((week) => (
          <View
            key={week[0]?.key ?? 'week'}
            style={{ flexDirection: 'row', width: '100%', height: DAY_CELL_HEIGHT }}
          >
            {week.map((cell) => (
              <CalendarDayCellButton key={cell.key} cell={cell} options={dayCellOptions} />
            ))}
          </View>
        ))}
      </View>

      <View
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: color.border.default,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: FOOTER_ICON_SIZE,
              height: FOOTER_ICON_SIZE,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: color.background.tertiary,
            }}
          >
            <CalendarDays size={20} color={color.accent.primary} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                color: color.text.primary,
                fontSize: 16,
                fontWeight: '600',
              }}
              numberOfLines={1}
            >
              {selectedDateTitle}
            </Text>
            <Text
              style={{
                color: color.text.secondary,
                fontSize: 13,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {selectedDateSubtitle}
            </Text>
          </View>
        </View>
        {hasAnyDayMarkers ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              marginTop: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 2.5,
                  backgroundColor: CALENDAR_TASK_MARKER_COLOR,
                }}
              />
              <Text style={{ color: color.text.secondary, fontSize: 12 }}>
                {t('allTasks.calendarLegendHasTasks')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 2.5,
                  backgroundColor: CALENDAR_OVERDUE_MARKER_COLOR,
                }}
              />
              <Text style={{ color: color.text.secondary, fontSize: 12 }}>
                {t('allTasks.calendarLegendOverdue')}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
        </Animated.View>
      )}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
