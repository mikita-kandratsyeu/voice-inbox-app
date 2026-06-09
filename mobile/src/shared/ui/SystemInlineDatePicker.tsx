import DateTimePicker from '@react-native-community/datetimepicker';
import React from 'react';
import { View } from 'react-native';

import { useAppTheme, useColors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';

/**
 * iOS inline UICalendarView always reserves six week rows. Keep a fixed height so
 * month navigation in the picker never clips (dynamic week counts underestimate).
 */
export const IOS_INLINE_DATE_PICKER_HEIGHT = 320;

type SystemInlineDatePickerProps = {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  /** Android only. Use `calendar` for full-screen month grids outside sheets. */
  androidDisplay?: 'default' | 'calendar';
};

export function SystemInlineDatePicker({
  value,
  onChange,
  minimumDate,
  maximumDate,
  androidDisplay = 'default',
}: SystemInlineDatePickerProps) {
  const color = useColors();
  const theme = useAppTheme();

  return (
    <View
      className="items-center overflow-hidden rounded-2xl"
      style={{
        alignSelf: 'center',
        backgroundColor: color.background.tertiary,
        width: '100%',
        ...(IS_IOS
          ? {
              height: IOS_INLINE_DATE_PICKER_HEIGHT,
              maxHeight: IOS_INLINE_DATE_PICKER_HEIGHT,
              overflow: 'hidden',
            }
          : null),
      }}
    >
      <DateTimePicker
        value={value}
        mode="date"
        display={IS_IOS ? 'inline' : androidDisplay}
        accentColor={color.accent.primary}
        themeVariant={theme}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        style={
          IS_IOS
            ? {
                alignSelf: 'center',
                height: IOS_INLINE_DATE_PICKER_HEIGHT,
                width: '100%',
              }
            : undefined
        }
        onChange={(_, selectedDate) => {
          if (selectedDate) {
            onChange(selectedDate);
          }
        }}
      />
    </View>
  );
}
