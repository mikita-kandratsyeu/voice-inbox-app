import dayjs from 'dayjs';
import { CalendarDays, ChevronDown, ChevronUp } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection, IS_IOS, withAlphaHex } from '@/shared/lib';
import { resolveDayjsLocale } from '@/shared/lib/date';
import { IOS_INLINE_DATE_PICKER_HEIGHT, SystemInlineDatePicker } from '@/shared/ui';

const CALENDAR_PICKER_GAP = 12;
const CALENDAR_PICKER_HEIGHT = IS_IOS ? IOS_INLINE_DATE_PICKER_HEIGHT : 340;
const CARD_RADIUS = 16;

type AllTasksCalendarPanelProps = {
  color: Colors;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  /** Match AllTasksTaskRow: tablet FlashList padding 12 + mx-3; phone mx-4. */
  compactHorizontalMargin?: boolean;
  maxWidth?: number;
};

function capitalizeFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatCollapsedCalendarLabels(
  date: Date,
  locale: string,
  language: string,
): { weekday: string; dateLine: string } {
  const localized = dayjs(date).locale(locale);
  const weekday = capitalizeFirst(localized.format('dddd'));
  const dateLine = language.startsWith('ru')
    ? `${localized.format('D MMMM YYYY')} г.`
    : localized.format('D MMMM YYYY');

  return { weekday, dateLine };
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
      style={({ pressed }) => [
        {
          flexShrink: 0,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 8,
          backgroundColor: withAlphaHex(color.accent.primary, pressed ? 0.2 : 0.12),
        },
        pressed ? { opacity: 0.88 } : null,
      ]}
    >
      <Text
        style={{
          color: color.accent.primary,
          fontSize: 16,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type CalendarPanelHeaderProps = {
  color: Colors;
  weekday: string;
  dateLine: string;
  isToday: boolean;
  expanded: boolean;
  todayLabel: string;
  goToTodayA11y: string;
  expandA11y: string;
  collapseA11y: string;
  onToggleExpanded: () => void;
  onGoToToday: () => void;
};

function CalendarPanelHeader({
  color,
  weekday,
  dateLine,
  isToday,
  expanded,
  todayLabel,
  goToTodayA11y,
  expandA11y,
  collapseA11y,
  onToggleExpanded,
  onGoToToday,
}: CalendarPanelHeaderProps) {
  return (
    <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
        <Pressable
          onPress={onToggleExpanded}
          accessibilityRole="button"
          accessibilityLabel={expanded ? collapseA11y : `${weekday}, ${dateLine}`}
          accessibilityState={{ expanded }}
          style={({ pressed }) => [{ width: '100%' }, pressed ? { opacity: 0.88 } : null]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: withAlphaHex(color.accent.primary, 0.12),
              }}
            >
              <CalendarDays size={22} color={color.accent.primary} strokeWidth={2.2} />
            </View>

            <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
              <Text
                style={{
                  color: color.text.secondary,
                  fontSize: 13,
                  fontWeight: '500',
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {weekday}
              </Text>
              <Text
                style={{
                  color: color.text.primary,
                  fontSize: 17,
                  fontWeight: '600',
                  marginTop: 2,
                  letterSpacing: -0.2,
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {dateLine}
              </Text>
            </View>
          </View>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
        {!isToday ? (
          <View style={{ marginRight: 12 }}>
            <CalendarGoToTodayButton
              color={color}
              label={todayLabel}
              a11yLabel={goToTodayA11y}
              onPress={onGoToToday}
            />
          </View>
        ) : null}

        <Pressable
          onPress={onToggleExpanded}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={expanded ? collapseA11y : expandA11y}
          accessibilityState={{ expanded }}
          style={({ pressed }) => [
            {
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: color.background.tertiary,
            },
            pressed ? { opacity: 0.88 } : null,
          ]}
        >
          {expanded ? (
            <ChevronUp size={18} color={color.text.secondary} strokeWidth={2.4} />
          ) : (
            <ChevronDown size={18} color={color.text.secondary} strokeWidth={2.4} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

export function AllTasksCalendarPanel({
  color,
  selectedDate,
  onDateChange,
  compactHorizontalMargin = false,
  maxWidth,
}: AllTasksCalendarPanelProps) {
  const { i18n, t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const locale = resolveDayjsLocale(i18n.language);

  const { weekday, dateLine } = useMemo(
    () => formatCollapsedCalendarLabels(selectedDate, locale, i18n.language),
    [i18n.language, locale, selectedDate],
  );

  const isToday = useMemo(() => dayjs(selectedDate).isSame(dayjs(), 'day'), [selectedDate]);

  const toggleExpanded = useCallback(() => {
    hapticSelection();
    setExpanded((current) => !current);
  }, []);

  const goToToday = useCallback(() => {
    hapticSelection();
    onDateChange(new Date());
    setExpanded(false);
  }, [onDateChange]);

  const handleDateChange = useCallback(
    (date: Date) => {
      hapticSelection();
      onDateChange(date);
      setExpanded(false);
    },
    [onDateChange],
  );

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
            paddingHorizontal: 14,
            paddingVertical: 12,
          },
        ]}
      >
        <CalendarPanelHeader
          color={color}
          weekday={weekday}
          dateLine={dateLine}
          isToday={isToday}
          expanded={expanded}
          todayLabel={t('allTasks.today')}
          goToTodayA11y={t('allTasks.calendarGoToTodayA11y')}
          expandA11y={t('allTasks.calendarExpandA11y')}
          collapseA11y={t('allTasks.calendarCollapseA11y')}
          onToggleExpanded={toggleExpanded}
          onGoToToday={goToToday}
        />

        <View
          pointerEvents={expanded ? 'auto' : 'none'}
          style={{
            height: expanded ? CALENDAR_PICKER_HEIGHT + CALENDAR_PICKER_GAP : 0,
            marginTop: expanded ? CALENDAR_PICKER_GAP : 0,
            overflow: 'hidden',
          }}
        >
          <View style={{ height: CALENDAR_PICKER_HEIGHT }}>
            <SystemInlineDatePicker
              value={selectedDate}
              onChange={handleDateChange}
              androidDisplay="calendar"
              embedded
              accessibilityLabel={t('allTasks.calendarDatePickerA11y')}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
