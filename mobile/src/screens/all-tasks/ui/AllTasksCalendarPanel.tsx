import dayjs from 'dayjs';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { resolveDayjsLocale } from '@/shared/lib/date';
import { SystemInlineDatePicker } from '@/shared/ui';

type AllTasksCalendarPanelProps = {
  color: Colors;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  horizontalPadding: number;
  maxWidth?: number;
};

export function AllTasksCalendarPanel({
  color,
  selectedDate,
  onDateChange,
  horizontalPadding,
  maxWidth,
}: AllTasksCalendarPanelProps) {
  const { i18n } = useTranslation();
  const selectedDateLabel = dayjs(selectedDate)
    .locale(resolveDayjsLocale(i18n.language))
    .format('D MMMM YYYY');

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
      <SystemInlineDatePicker
        value={selectedDate}
        onChange={onDateChange}
        androidDisplay="calendar"
      />
      <Text
        style={{
          color: color.text.secondary,
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.8,
          marginTop: 12,
          marginBottom: 4,
          textTransform: 'uppercase',
        }}
      >
        {selectedDateLabel}
      </Text>
    </View>
  );
}
