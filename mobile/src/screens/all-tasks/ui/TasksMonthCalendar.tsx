import dayjs, { type Dayjs } from 'dayjs';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

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
const SELECTION_DIAMETER = 38;
const DOT_SIZE = 5;
const DOT_BOTTOM_INSET = 1.5;
const SELECTED_DAY_TINT_ALPHA = 0.16;
const FOOTER_ICON_SIZE = 40;

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
};

type CalendarDayCell = {
  date: Dayjs;
  inMonth: boolean;
  key: string;
};

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

export function TasksMonthCalendar({
  color,
  selectedDate,
  dayMarkers,
  onDateChange,
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
  const selectedDateTitle = useMemo(
    () => formatSelectedDateTitle(selected, locale),
    [locale, selected],
  );
  const selectedDateSubtitle = useMemo(
    () => formatSelectedDateSubtitle(selected, locale, i18n.language),
    [i18n.language, locale, selected],
  );
  const hasAnyDayMarkers = dayMarkers.size > 0;

  return (
    <View
      style={{
        width: '100%',
        backgroundColor: color.background.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: color.border.default,
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 14,
      }}
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
          }}
          accessibilityRole="header"
        >
          {monthTitle}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <Pressable
            onPress={() => {
              hapticSelection();
              setVisibleMonth((current) => current.subtract(1, 'month'));
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('allTasks.calendarPreviousMonthA11y')}
          >
            <ChevronLeft size={22} color={color.accent.primary} strokeWidth={2.4} />
          </Pressable>
          <Pressable
            onPress={() => {
              hapticSelection();
              setVisibleMonth((current) => current.add(1, 'month'));
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('allTasks.calendarNextMonthA11y')}
          >
            <ChevronRight size={22} color={color.accent.primary} strokeWidth={2.4} />
          </Pressable>
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
            {week.map((cell) => {
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
                  key={cell.key}
                  style={{
                    flex: 1,
                    height: DAY_CELL_HEIGHT,
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
                      height: DAY_CELL_HEIGHT,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.82 : 1,
                    })}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={
                      marker
                        ? t('allTasks.calendarDayWithTasksA11y', {
                            date: cell.date.locale(locale).format('D MMMM'),
                          })
                        : cell.date.locale(locale).format('D MMMM')
                    }
                  >
                    <View
                      style={{
                        width: SELECTION_DIAMETER,
                        height: SELECTION_DIAMETER,
                        borderRadius: SELECTION_DIAMETER / 2,
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
                          fontSize: 20,
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
            })}
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
    </View>
  );
}
