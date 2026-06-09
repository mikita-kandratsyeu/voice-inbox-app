import React from 'react';
import { View } from 'react-native';

import type { Colors } from '@/shared/config';

import type { TaskDeadlineDayMarker } from '../lib/buildTaskDeadlineDayMarkers';
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
    </View>
  );
}
