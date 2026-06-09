import dayjs from 'dayjs';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { resolveDayjsLocale } from '@/shared/lib/date';

import {
  CALENDAR_OVERDUE_MARKER_COLOR,
  CALENDAR_TASK_MARKER_COLOR,
  type TaskDeadlineDayMarker,
} from '../lib/buildTaskDeadlineDayMarkers';
import { TasksMonthCalendar } from './TasksMonthCalendar';

type AllTasksCalendarPanelProps = {
  color: Colors;
  selectedDate: Date;
  dayMarkers: Map<string, TaskDeadlineDayMarker>;
  onDateChange: (date: Date) => void;
  horizontalPadding: number;
  maxWidth?: number;
};

export function AllTasksCalendarPanel({
  color,
  selectedDate,
  dayMarkers,
  onDateChange,
  horizontalPadding,
  maxWidth,
}: AllTasksCalendarPanelProps) {
  const { i18n, t } = useTranslation();
  const selectedDateLabel = dayjs(selectedDate)
    .locale(resolveDayjsLocale(i18n.language))
    .format('D MMMM YYYY');
  const hasAnyDayMarkers = dayMarkers.size > 0;

  return (
    <View
      style={{
        alignSelf: 'center',
        width: '100%',
        maxWidth,
        paddingHorizontal: horizontalPadding,
        paddingTop: 8,
        paddingBottom: 4,
        backgroundColor: color.background.secondary,
        borderBottomWidth: 1,
        borderBottomColor: color.border.default,
      }}
    >
      <TasksMonthCalendar
        color={color}
        selectedDate={selectedDate}
        dayMarkers={dayMarkers}
        onDateChange={onDateChange}
      />
      <Text
        style={{
          color: color.text.secondary,
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.8,
          marginTop: 12,
          marginBottom: hasAnyDayMarkers ? 8 : 4,
          textTransform: 'uppercase',
        }}
      >
        {selectedDateLabel}
      </Text>
      {hasAnyDayMarkers ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
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
