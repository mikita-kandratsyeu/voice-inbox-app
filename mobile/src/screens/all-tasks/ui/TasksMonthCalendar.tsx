import dayjs, { type Dayjs } from 'dayjs';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
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
const IOS_SPRING_SNAPPY = { damping: 18, stiffness: 320, mass: 0.85 };
const IOS_SPRING_SOFT = { damping: 22, stiffness: 260, mass: 0.9 };
const CALENDAR_LAYOUT_TRANSITION = LinearTransition.springify()
  .damping(22)
  .stiffness(200)
  .duration(320);
const CALENDAR_PERIOD_ENTER = FadeIn.duration(240).easing(Easing.out(Easing.cubic));
const CALENDAR_PERIOD_EXIT = FadeOut.duration(180).easing(Easing.in(Easing.cubic));
const CALENDAR_CONTROL_ENTER = FadeIn.duration(200).easing(Easing.out(Easing.quad));
const CALENDAR_CONTROL_EXIT = FadeOut.duration(140).easing(Easing.in(Easing.quad));

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

function CalendarNavButton({
  onPress,
  accessibilityLabel,
  children,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.86, IOS_SPRING_SNAPPY);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, IOS_SPRING_SNAPPY);
      }}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </Pressable>
  );
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

const CalendarDayCellButton = memo(function CalendarDayCellButton({
  cell,
  options,
}: {
  cell: CalendarDayCell;
  options: CalendarDayCellRenderOptions;
}) {
  const {
    color,
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
  const pressScale = useSharedValue(1);
  const selectionProgress = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    selectionProgress.value = withSpring(isSelected ? 1 : 0, IOS_SPRING_SOFT);
  }, [isSelected, selectionProgress]);

  const pressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const selectionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: selectionProgress.value,
    transform: [{ scale: 0.7 + selectionProgress.value * 0.3 }],
  }));

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
        onPressIn={() => {
          pressScale.value = withSpring(0.9, IOS_SPRING_SNAPPY);
        }}
        onPressOut={() => {
          pressScale.value = withSpring(1, IOS_SPRING_SNAPPY);
        }}
        style={{
          width: '100%',
          height: cellHeight,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={formatDayA11y(cell.date, Boolean(marker))}
      >
        <Animated.View
          style={[
            {
              width: selectionDiameter,
              height: selectionDiameter,
              borderRadius: selectionDiameter / 2,
              alignItems: 'center',
              justifyContent: 'center',
            },
            pressAnimatedStyle,
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                width: selectionDiameter,
                height: selectionDiameter,
                borderRadius: selectionDiameter / 2,
                backgroundColor: withAlphaHex(color.accent.primary, SELECTED_DAY_TINT_ALPHA),
              },
              selectionAnimatedStyle,
            ]}
          />
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
          {dotColor ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                bottom: DOT_BOTTOM_INSET,
                left: '50%',
                width: DOT_SIZE,
                height: DOT_SIZE,
                marginLeft: -DOT_SIZE / 2,
                borderRadius: DOT_SIZE / 2,
                backgroundColor: dotColor,
              }}
            />
          ) : null}
        </Animated.View>
      </Pressable>
    </View>
  );
});

type CalendarWeekdayLabelsProps = {
  labels: string[];
  color: Colors;
  fontSize: number;
  marginBottom: number;
  keyPrefix: string;
};

function CalendarWeekdayLabels({
  labels,
  color,
  fontSize,
  marginBottom,
  keyPrefix,
}: CalendarWeekdayLabelsProps) {
  return (
    <View style={{ flexDirection: 'row', width: '100%', marginBottom, minHeight: 16 }}>
      {labels.map((label, index) => (
        <View key={`${keyPrefix}-${label}-${index}`} style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={{
              color: color.text.muted,
              fontSize,
              fontWeight: '500',
              letterSpacing: 0.3,
            }}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function CalendarGoToTodayButton({
  color,
  label,
  a11yLabel,
  onPress,
}: {
  color: Colors;
  label: string;
  a11yLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={({ pressed }) => ({
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: withAlphaHex(color.accent.primary, pressed ? 0.2 : 0.12),
        opacity: pressed ? 0.88 : 1,
      })}
    >
      <Text
        style={{
          color: color.accent.primary,
          fontSize: 13,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type WeekCalendarHeaderProps = {
  title: string;
  color: Colors;
  collapsible: boolean;
  showGoToToday: boolean;
  onGoToToday: () => void;
  onExpand?: () => void;
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  t: (key: string) => string;
};

function WeekCalendarHeader({
  title,
  color,
  collapsible,
  showGoToToday,
  onGoToToday,
  onExpand,
  onNavigatePrevious,
  onNavigateNext,
  t,
}: WeekCalendarHeaderProps) {
  return (
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
        {title}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {showGoToToday ? (
          <Animated.View entering={CALENDAR_CONTROL_ENTER} exiting={CALENDAR_CONTROL_EXIT}>
            <CalendarGoToTodayButton
              color={color}
              label={t('allTasks.today')}
              a11yLabel={t('allTasks.calendarGoToTodayA11y')}
              onPress={onGoToToday}
            />
          </Animated.View>
        ) : null}
        <CalendarNavButton
          onPress={onNavigatePrevious}
          accessibilityLabel={t('allTasks.calendarPreviousWeekA11y')}
        >
          <ChevronLeft size={22} color={color.accent.primary} strokeWidth={2.4} />
        </CalendarNavButton>
        <CalendarNavButton
          onPress={onNavigateNext}
          accessibilityLabel={t('allTasks.calendarNextWeekA11y')}
        >
          <ChevronRight size={22} color={color.accent.primary} strokeWidth={2.4} />
        </CalendarNavButton>
        {collapsible ? (
          <CalendarNavButton
            onPress={onExpand ?? (() => undefined)}
            accessibilityLabel={t('allTasks.calendarExpandA11y')}
          >
            <ChevronDown size={22} color={color.text.secondary} strokeWidth={2.4} />
          </CalendarNavButton>
        ) : null}
      </View>
    </View>
  );
}

function WeekDaysRow({
  weekAnchor,
  weekDayCellOptions,
}: {
  weekAnchor: Dayjs;
  weekDayCellOptions: CalendarDayCellRenderOptions;
}) {
  const weekDays = useMemo(() => buildWeekDays(weekAnchor), [weekAnchor]);

  return (
    <View style={{ flexDirection: 'row', width: '100%', height: WEEK_DAY_CELL_HEIGHT }}>
      {weekDays.map((cell) => (
        <CalendarDayCellButton key={cell.key} cell={cell} options={weekDayCellOptions} />
      ))}
    </View>
  );
}

const WeekCalendarBody = memo(function WeekCalendarBody({
  weekAnchor,
  weekdayLabels,
  color,
  weekDayCellOptions,
}: {
  weekAnchor: Dayjs;
  weekdayLabels: string[];
  color: Colors;
  weekDayCellOptions: CalendarDayCellRenderOptions;
}) {
  return (
    <View style={{ width: '100%' }}>
      <CalendarWeekdayLabels
        labels={weekdayLabels}
        color={color}
        fontSize={11}
        marginBottom={4}
        keyPrefix="week"
      />
      <WeekDaysRow weekAnchor={weekAnchor} weekDayCellOptions={weekDayCellOptions} />
    </View>
  );
});

type MonthCalendarFooterProps = {
  color: Colors;
  selectedDateTitle: string;
  selectedDateSubtitle: string;
  hasAnyDayMarkers: boolean;
  t: (key: string) => string;
};

function MonthCalendarFooter({
  color,
  selectedDateTitle,
  selectedDateSubtitle,
  hasAnyDayMarkers,
  t,
}: MonthCalendarFooterProps) {
  return (
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
  );
}

type MonthCalendarHeaderProps = {
  title: string;
  color: Colors;
  collapsible: boolean;
  showGoToToday: boolean;
  onGoToToday: () => void;
  onCollapse?: () => void;
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  t: (key: string) => string;
};

function MonthCalendarHeader({
  title,
  color,
  collapsible,
  showGoToToday,
  onGoToToday,
  onCollapse,
  onNavigatePrevious,
  onNavigateNext,
  t,
}: MonthCalendarHeaderProps) {
  return (
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
        numberOfLines={1}
      >
        {title}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {showGoToToday ? (
          <Animated.View entering={CALENDAR_CONTROL_ENTER} exiting={CALENDAR_CONTROL_EXIT}>
            <CalendarGoToTodayButton
              color={color}
              label={t('allTasks.today')}
              a11yLabel={t('allTasks.calendarGoToTodayA11y')}
              onPress={onGoToToday}
            />
          </Animated.View>
        ) : null}
        <CalendarNavButton
          onPress={onNavigatePrevious}
          accessibilityLabel={t('allTasks.calendarPreviousMonthA11y')}
        >
          <ChevronLeft size={22} color={color.accent.primary} strokeWidth={2.4} />
        </CalendarNavButton>
        <CalendarNavButton
          onPress={onNavigateNext}
          accessibilityLabel={t('allTasks.calendarNextMonthA11y')}
        >
          <ChevronRight size={22} color={color.accent.primary} strokeWidth={2.4} />
        </CalendarNavButton>
        {collapsible ? (
          <CalendarNavButton
            onPress={onCollapse ?? (() => undefined)}
            accessibilityLabel={t('allTasks.calendarCollapseA11y')}
          >
            <ChevronUp size={22} color={color.text.secondary} strokeWidth={2.4} />
          </CalendarNavButton>
        ) : null}
      </View>
    </View>
  );
}

function MonthGrid({
  visibleMonth,
  dayCellOptions,
  gridHeight,
}: {
  visibleMonth: Dayjs;
  dayCellOptions: CalendarDayCellRenderOptions;
  gridHeight: number;
}) {
  const monthWeeks = useMemo(() => buildMonthWeeks(visibleMonth), [visibleMonth]);

  return (
    <Animated.View
      layout={CALENDAR_LAYOUT_TRANSITION}
      style={{ width: '100%', height: gridHeight }}
    >
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
    </Animated.View>
  );
}

const MonthCalendarBody = memo(function MonthCalendarBody({
  visibleMonth,
  weekdayLabels,
  color,
  dayCellOptions,
  gridHeight,
}: {
  visibleMonth: Dayjs;
  weekdayLabels: string[];
  color: Colors;
  dayCellOptions: CalendarDayCellRenderOptions;
  gridHeight: number;
}) {
  return (
    <View style={{ width: '100%' }}>
      <CalendarWeekdayLabels
        labels={weekdayLabels}
        color={color}
        fontSize={12}
        marginBottom={6}
        keyPrefix="month"
      />
      <MonthGrid
        visibleMonth={visibleMonth}
        dayCellOptions={dayCellOptions}
        gridHeight={gridHeight}
      />
    </View>
  );
});

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

  const weekdayLabels = useMemo(() => {
    const weekStart = dayjs().locale(locale).startOf('week');
    return Array.from({ length: 7 }, (_, index) =>
      weekStart.add(index, 'day').locale(locale).format('dd').toUpperCase(),
    );
  }, [locale]);

  const monthGridHeight = useMemo(
    () => countWeeksInMonthGrid(visibleMonth) * DAY_CELL_HEIGHT,
    [visibleMonth],
  );

  const monthTitle = useMemo(() => {
    const formatted = visibleMonth.locale(locale).format('MMMM YYYY');
    const title = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    return i18n.language.startsWith('ru') ? `${title} г.` : title;
  }, [i18n.language, locale, visibleMonth]);

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
  const weekPeriodKey = selected.startOf('week').format('YYYY-MM-DD');
  const monthPeriodKey = visibleMonth.format('YYYY-MM');

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

  const showGoToToday = useMemo(() => {
    const today = dayjs().startOf('day');
    if (!selected.isSame(today, 'day')) return true;
    if (showWeekView) return !selected.isSame(today, 'week');
    return !visibleMonth.isSame(today, 'month');
  }, [selected, showWeekView, visibleMonth]);

  const goToToday = useCallback(() => {
    hapticSelection();
    const today = dayjs().startOf('day');
    onDateChange(today.toDate());
    if (!showWeekView) {
      setVisibleMonth(today.startOf('month'));
    }
  }, [onDateChange, showWeekView]);

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

  const formatDayA11y = useCallback(
    (date: Dayjs, hasTasks: boolean) =>
      hasTasks
        ? t('allTasks.calendarDayWithTasksA11y', {
            date: date.locale(locale).format('D MMMM'),
          })
        : date.locale(locale).format('D MMMM'),
    [locale, t],
  );

  const dayCellOptions = useMemo<CalendarDayCellRenderOptions>(
    () => ({
      color,
      locale,
      selected,
      dayMarkers,
      onDateChange,
      cellHeight: DAY_CELL_HEIGHT,
      selectionDiameter: SELECTION_DIAMETER,
      dayNumberFontSize: 20,
      formatDayA11y,
    }),
    [color, dayMarkers, formatDayA11y, locale, onDateChange, selected],
  );

  const weekDayCellOptions = useMemo<CalendarDayCellRenderOptions>(
    () => ({
      ...dayCellOptions,
      cellHeight: WEEK_DAY_CELL_HEIGHT,
      selectionDiameter: WEEK_SELECTION_DIAMETER,
      dayNumberFontSize: 18,
    }),
    [dayCellOptions],
  );

  return (
    <Animated.View layout={CALENDAR_LAYOUT_TRANSITION} style={cardStyle}>
      {showWeekView ? (
        <Animated.View
          key="calendar-week-mode"
          entering={CALENDAR_PERIOD_ENTER}
          exiting={CALENDAR_PERIOD_EXIT}
          style={{ width: '100%' }}
        >
          <WeekCalendarHeader
            title={weekRangeTitle}
            color={color}
            collapsible={collapsible}
            showGoToToday={showGoToToday}
            onGoToToday={goToToday}
            onExpand={() => onExpandedChange?.(true)}
            onNavigatePrevious={navigatePrevious}
            onNavigateNext={navigateNext}
            t={t}
          />
          <Animated.View
            key={weekPeriodKey}
            entering={CALENDAR_PERIOD_ENTER}
            exiting={CALENDAR_PERIOD_EXIT}
            layout={CALENDAR_LAYOUT_TRANSITION}
          >
            <WeekCalendarBody
              weekAnchor={selected}
              weekdayLabels={weekdayLabels}
              color={color}
              weekDayCellOptions={weekDayCellOptions}
            />
          </Animated.View>
        </Animated.View>
      ) : (
        <Animated.View
          key="calendar-month-mode"
          entering={CALENDAR_PERIOD_ENTER}
          exiting={CALENDAR_PERIOD_EXIT}
          style={{ width: '100%' }}
        >
          <MonthCalendarHeader
            title={monthTitle}
            color={color}
            collapsible={collapsible}
            showGoToToday={showGoToToday}
            onGoToToday={goToToday}
            onCollapse={() => onExpandedChange?.(false)}
            onNavigatePrevious={navigatePrevious}
            onNavigateNext={navigateNext}
            t={t}
          />
          <Animated.View
            key={monthPeriodKey}
            entering={CALENDAR_PERIOD_ENTER}
            exiting={CALENDAR_PERIOD_EXIT}
            layout={CALENDAR_LAYOUT_TRANSITION}
          >
            <MonthCalendarBody
              visibleMonth={visibleMonth}
              weekdayLabels={weekdayLabels}
              color={color}
              dayCellOptions={dayCellOptions}
              gridHeight={monthGridHeight}
            />
          </Animated.View>
          <Animated.View layout={CALENDAR_LAYOUT_TRANSITION}>
            <MonthCalendarFooter
              color={color}
              selectedDateTitle={selectedDateTitle}
              selectedDateSubtitle={selectedDateSubtitle}
              hasAnyDayMarkers={hasAnyDayMarkers}
              t={t}
            />
          </Animated.View>
        </Animated.View>
      )}
    </Animated.View>
  );
}
