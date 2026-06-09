import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

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
  const [calendarExpanded, setCalendarExpanded] = useState(false);

  const handleExpandedChange = useCallback((next: boolean) => {
    hapticSelection();
    setCalendarExpanded(next);
  }, []);

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
      }}
    >
      <TasksMonthCalendar
        color={color}
        selectedDate={selectedDate}
        dayMarkers={dayMarkers}
        onDateChange={onDateChange}
        collapsible
        expanded={calendarExpanded}
        onExpandedChange={handleExpandedChange}
      />
    </View>
  );
}
