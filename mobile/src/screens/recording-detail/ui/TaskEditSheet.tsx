import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { TaskItem } from '@/entities/record';
import { useAppTheme, useColors } from '@/shared/config';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { resolveDayjsLocale } from '@/shared/lib/date';
import { modalKeyboardBehavior } from '@/shared/lib/platform';
import { Button } from '@/shared/ui';

const TASK_TEXT_MAX_CHARS = 500;
const TABLET_SHEET_CONTENT_MAX_WIDTH = 720;
const SECTION_LABEL_STYLE = {
  fontSize: 12,
  fontWeight: '600' as const,
  letterSpacing: 0.8,
  marginBottom: 10,
  textTransform: 'uppercase' as const,
};

type TaskEditSheetProps = {
  visible: boolean;
  initialText: string;
  initialDeadline?: string | null;
  initialDeadlineTime?: string | null;
  initialPriority?: TaskItem['priority'];
  showMetadataFields?: boolean;
  onClose: () => void;
  onSave: (value: {
    text: string;
    deadline?: string | null;
    deadlineTime?: string | null;
    priority?: TaskItem['priority'];
  }) => boolean;
  sheetTitleKey?: string;
  placeholderKey?: string;
};

const PRIORITIES: NonNullable<TaskItem['priority']>[] = ['low', 'medium', 'high'];
const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

type CalendarDay = {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isPast: boolean;
  isSelected: boolean;
  key: string;
};

const formatTaskDeadline = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseTaskDeadlineDraft = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }

  return date;
};

const parseTaskDeadlineTimeDraft = (value: string): { hours: number; minutes: number } | null => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return { hours, minutes };
};

const formatTaskDeadlineTime = (date: Date): string => {
  return `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
};

const getNextSelectableTime = (): Date => {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setMinutes(date.getMinutes() + 1);
  return date;
};

const isSameLocalDate = (a: Date, b: Date): boolean => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const combineDeadlineDateAndTime = (deadline: string, deadlineTime: string): Date | null => {
  const date = parseTaskDeadlineDraft(deadline);
  const time = parseTaskDeadlineTimeDraft(deadlineTime);
  if (!date || !time) return null;

  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.hours, time.minutes);
};

const isPastDeadlineDateTime = (deadline: string, deadlineTime: string): boolean => {
  const combined = combineDeadlineDateAndTime(deadline, deadlineTime);
  return combined !== null && combined.getTime() <= Date.now();
};

const getTimePickerValue = (value: string, deadline: string): Date => {
  const parsed = parseTaskDeadlineTimeDraft(value);
  const date = new Date();
  date.setHours(parsed?.hours ?? 9, parsed?.minutes ?? 0, 0, 0);

  const deadlineDate = parseTaskDeadlineDraft(deadline);
  if (deadlineDate && isSameLocalDate(deadlineDate, new Date()) && date.getTime() <= Date.now()) {
    return getNextSelectableTime();
  }

  return date;
};

const buildCalendarDays = (monthDate: Date, selectedDate: Date | null): CalendarDay[] => {
  const monthStart = dayjs(monthDate).startOf('month');
  const startOffset = (monthStart.day() + 6) % 7;
  const gridStart = monthStart.subtract(startOffset, 'day');
  const selectedKey = selectedDate ? formatTaskDeadline(selectedDate) : null;

  return Array.from({ length: 42 }, (_, index) => {
    const day = gridStart.add(index, 'day');
    const key = day.format('YYYY-MM-DD');
    return {
      date: day.toDate(),
      dayOfMonth: day.date(),
      isCurrentMonth: day.month() === monthStart.month(),
      isPast: day.isBefore(dayjs(), 'day'),
      isSelected: key === selectedKey,
      key,
    };
  });
};

const buildCalendarWeeks = (days: CalendarDay[]): CalendarDay[][] => {
  return Array.from({ length: Math.ceil(days.length / 7) }, (_, weekIndex) =>
    days.slice(weekIndex * 7, weekIndex * 7 + 7),
  );
};

const formatCalendarMonthTitle = (date: Date, language: string): string => {
  const formatted = dayjs(date).locale(resolveDayjsLocale(language)).format('MMMM YYYY');
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const formatDeadlineDisplay = (date: Date | null, language: string): string | null => {
  if (!date) return null;
  return dayjs(date).locale(resolveDayjsLocale(language)).format('D MMMM YYYY');
};

const hexToRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized;
  const value = Number.parseInt(full, 16);
  if (Number.isNaN(value) || full.length !== 6) return `rgba(59, 130, 246, ${alpha})`;

  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export function TaskEditSheet({
  visible,
  initialText,
  initialDeadline,
  initialDeadlineTime,
  initialPriority = 'medium',
  showMetadataFields = false,
  onClose,
  onSave,
  sheetTitleKey = 'tasks.editTaskSheetTitle',
  placeholderKey = 'recordingDetail.addTaskPlaceholder',
}: TaskEditSheetProps) {
  const { t, i18n } = useTranslation();
  const color = useColors();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const tabletContentMaxWidth = useTabletContentMaxWidth();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [draft, setDraft] = useState('');
  const [deadlineDraft, setDeadlineDraft] = useState('');
  const [deadlineTimeDraft, setDeadlineTimeDraft] = useState('');
  const [priorityDraft, setPriorityDraft] = useState<NonNullable<TaskItem['priority']>>('medium');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const datePickerValue = useMemo(
    () => parseTaskDeadlineDraft(deadlineDraft) ?? new Date(),
    [deadlineDraft],
  );
  const timePickerValue = useMemo(
    () => getTimePickerValue(deadlineTimeDraft, deadlineDraft),
    [deadlineDraft, deadlineTimeDraft],
  );
  const timePickerMinimumDate = useMemo(() => {
    const deadlineDate = parseTaskDeadlineDraft(deadlineDraft);
    return deadlineDate && isSameLocalDate(deadlineDate, new Date())
      ? getNextSelectableTime()
      : undefined;
  }, [deadlineDraft]);
  const selectedDeadlineDate = useMemo(
    () => parseTaskDeadlineDraft(deadlineDraft),
    [deadlineDraft],
  );
  const deadlineDisplay = useMemo(
    () => formatDeadlineDisplay(selectedDeadlineDate, i18n.language),
    [i18n.language, selectedDeadlineDate],
  );
  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth, selectedDeadlineDate),
    [calendarMonth, selectedDeadlineDate],
  );
  const calendarWeeks = useMemo(() => buildCalendarWeeks(calendarDays), [calendarDays]);
  const calendarMonthTitle = useMemo(
    () => formatCalendarMonthTitle(calendarMonth, i18n.language),
    [calendarMonth, i18n.language],
  );
  const priorityColors = useMemo(
    () => ({
      low: color.text.secondary,
      medium: color.accent.cache,
      high: color.accent.delete,
    }),
    [color.accent.cache, color.accent.delete, color.text.secondary],
  );
  const canGoToPreviousMonth = dayjs(calendarMonth)
    .startOf('month')
    .isAfter(dayjs().startOf('month'));
  const sheetContentMaxWidth = isTablet
    ? Math.min(
        tabletContentMaxWidth ?? TABLET_SHEET_CONTENT_MAX_WIDTH,
        TABLET_SHEET_CONTENT_MAX_WIDTH,
      )
    : undefined;

  useEffect(() => {
    if (visible) {
      setDraft(initialText);
      setDeadlineDraft(initialDeadline ?? '');
      setDeadlineTimeDraft(initialDeadlineTime ?? '');
      setPriorityDraft(initialPriority ?? 'medium');
      setDatePickerOpen(false);
      setTimePickerOpen(false);
      setCalendarMonth(parseTaskDeadlineDraft(initialDeadline ?? '') ?? new Date());
      const frame = requestAnimationFrame(() => {
        bottomSheetRef.current?.present();
      });
      return () => cancelAnimationFrame(frame);
    }
    bottomSheetRef.current?.dismiss();
    return undefined;
  }, [visible, initialText, initialDeadline, initialDeadlineTime, initialPriority]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} pressBehavior="close" opacity={0.45} />
    ),
    [],
  );

  const handleSave = useCallback(() => {
    const trimmed = draft.split('\0').join('').trim();
    if (!trimmed) return;
    const deadline = deadlineDraft.split('\0').join('').trim();
    const deadlineTime = deadlineTimeDraft.split('\0').join('').trim();
    if (
      onSave({
        text: trimmed,
        deadline: deadline.length > 0 ? deadline : null,
        deadlineTime: deadline.length > 0 && deadlineTime.length > 0 ? deadlineTime : null,
        priority: priorityDraft,
      })
    ) {
      bottomSheetRef.current?.dismiss();
    }
  }, [deadlineDraft, deadlineTimeDraft, draft, onSave, priorityDraft]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      enableDynamicSizing
      enablePanDownToClose
      enableOverDrag={false}
      keyboardBehavior={modalKeyboardBehavior}
      keyboardBlurBehavior="restore"
      enableBlurKeyboardOnGesture
      backdropComponent={renderBackdrop}
      onDismiss={onClose}
      backgroundStyle={{
        backgroundColor: color.background.primary,
        borderTopWidth: 1,
        borderTopColor: color.border.default,
      }}
      handleIndicatorStyle={{
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: color.icon.muted,
      }}
    >
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={false}
        contentContainerStyle={{
          alignSelf: 'center',
          maxWidth: sheetContentMaxWidth,
          paddingHorizontal: isTablet ? 24 : 20,
          paddingBottom: Math.max(insets.bottom, 24),
          width: '100%',
        }}
      >
        <Text
          style={{
            color: color.text.primary,
            fontSize: 17,
            fontWeight: '600',
            marginBottom: 20,
            paddingTop: 4,
            textAlign: 'center',
          }}
        >
          {t(sheetTitleKey)}
        </Text>
        <BottomSheetTextInput
          value={draft}
          onChangeText={(text) => setDraft(text.split('\0').join('').slice(0, TASK_TEXT_MAX_CHARS))}
          multiline
          textAlignVertical="top"
          placeholder={t(placeholderKey)}
          placeholderTextColor={color.text.muted}
          accessibilityLabel={t(sheetTitleKey)}
          className="min-h-[104px] rounded-xl px-3.5 py-3 text-[16px] leading-[22px]"
          style={{
            color: color.text.primary,
            backgroundColor: color.background.tertiary,
          }}
        />
        <Text className="mt-2 text-center text-[12px]" style={{ color: color.text.secondary }}>
          {t('recordingDetail.tasksReextractCharCount', {
            current: draft.length,
            max: TASK_TEXT_MAX_CHARS,
          })}
        </Text>
        {showMetadataFields && (
          <View className="mt-6 gap-6">
            <View>
              <Text
                style={[
                  SECTION_LABEL_STYLE,
                  {
                    color: color.text.secondary,
                  },
                ]}
              >
                {t('tasks.deadlineLabel')}
              </Text>
              <View className="flex-row gap-2.5">
                <Pressable
                  onPress={() => {
                    setDatePickerOpen((prev) => !prev);
                    setTimePickerOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('tasks.deadlineLabel')}
                  className="min-w-0 flex-1 rounded-xl px-3.5 py-3.5"
                  style={{
                    backgroundColor: color.background.tertiary,
                  }}
                >
                  <Text
                    className="text-[16px]"
                    style={{ color: deadlineDraft ? color.text.primary : color.text.muted }}
                    numberOfLines={1}
                  >
                    {deadlineDisplay ?? t('tasks.noDeadline')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (!deadlineDraft) return;
                    setTimePickerOpen((prev) => !prev);
                    setDatePickerOpen(false);
                  }}
                  disabled={!deadlineDraft}
                  accessibilityRole="button"
                  accessibilityLabel={t('tasks.deadlineTimeLabel')}
                  accessibilityState={{ disabled: !deadlineDraft }}
                  className="rounded-xl px-3.5 py-3.5"
                  style={{
                    backgroundColor: color.background.tertiary,
                    minWidth: 104,
                    opacity: deadlineDraft ? 1 : 0.55,
                  }}
                >
                  <Text
                    className="text-center text-[16px]"
                    style={{ color: deadlineTimeDraft ? color.text.primary : color.text.muted }}
                    numberOfLines={1}
                  >
                    {deadlineTimeDraft || t('tasks.noDeadlineTime')}
                  </Text>
                </Pressable>
                {deadlineDraft.length > 0 && (
                  <Pressable
                    onPress={() => {
                      setDeadlineDraft('');
                      setDeadlineTimeDraft('');
                      setDatePickerOpen(false);
                      setTimePickerOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.clear')}
                    className="items-center justify-center rounded-xl px-3.5 py-3.5"
                    style={{
                      backgroundColor: color.background.tertiary,
                    }}
                  >
                    <Trash2 size={20} color={color.accent.delete} strokeWidth={2} />
                  </Pressable>
                )}
              </View>
              {datePickerOpen && Platform.OS === 'ios' && (
                <View
                  className="mt-3 rounded-2xl px-2 py-4"
                  style={{
                    alignSelf: 'center',
                    backgroundColor: color.background.tertiary,
                    width: '100%',
                  }}
                >
                  <View
                    style={{
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingHorizontal: 6,
                      marginBottom: 14,
                    }}
                  >
                    <Pressable
                      onPress={() =>
                        setCalendarMonth((prev) => dayjs(prev).subtract(1, 'month').toDate())
                      }
                      disabled={!canGoToPreviousMonth}
                      accessibilityRole="button"
                      accessibilityLabel={t('tasks.previousMonth')}
                      accessibilityState={{ disabled: !canGoToPreviousMonth }}
                      className="h-10 w-10 items-center justify-center rounded-full"
                    >
                      <ChevronLeft
                        size={24}
                        color={canGoToPreviousMonth ? color.accent.primary : color.icon.muted}
                        strokeWidth={2.4}
                      />
                    </Pressable>
                    <Text
                      className="text-[18px] font-semibold"
                      style={{ color: color.text.primary }}
                      numberOfLines={1}
                    >
                      {calendarMonthTitle}
                    </Text>
                    <Pressable
                      onPress={() =>
                        setCalendarMonth((prev) => dayjs(prev).add(1, 'month').toDate())
                      }
                      accessibilityRole="button"
                      accessibilityLabel={t('tasks.nextMonth')}
                      className="h-10 w-10 items-center justify-center rounded-full"
                    >
                      <ChevronRight size={24} color={color.accent.primary} strokeWidth={2.4} />
                    </Pressable>
                  </View>
                  <View className="mb-2 flex-row">
                    {WEEKDAY_KEYS.map((key) => (
                      <Text
                        key={key}
                        className="flex-1 text-center text-[13px] font-semibold"
                        style={{ color: color.text.secondary }}
                      >
                        {t(`tasks.weekdays.${key}`)}
                      </Text>
                    ))}
                  </View>
                  <View>
                    {calendarWeeks.map((week, weekIndex) => (
                      <View key={week[0]?.key ?? weekIndex} className="flex-row">
                        {week.map((day) => (
                          <View key={day.key} className="flex-1 p-[3px]">
                            <Pressable
                              onPress={() => {
                                if (day.isPast) return;
                                setDeadlineDraft(formatTaskDeadline(day.date));
                                setCalendarMonth(day.date);
                                setDatePickerOpen(false);
                              }}
                              disabled={day.isPast}
                              accessibilityRole="button"
                              accessibilityState={{
                                disabled: day.isPast,
                                selected: day.isSelected,
                              }}
                              accessibilityLabel={day.key}
                              className="aspect-square items-center justify-center rounded-full"
                              style={{
                                backgroundColor: day.isSelected
                                  ? color.accent.primary
                                  : 'transparent',
                              }}
                            >
                              <Text
                                className="text-[17px] font-medium"
                                style={{
                                  color: day.isSelected
                                    ? color.icon.onAccent
                                    : day.isCurrentMonth && !day.isPast
                                      ? color.text.primary
                                      : color.text.muted,
                                  opacity: day.isPast
                                    ? 0.3
                                    : day.isCurrentMonth || day.isSelected
                                      ? 1
                                      : 0.45,
                                }}
                              >
                                {day.dayOfMonth}
                              </Text>
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {datePickerOpen && Platform.OS !== 'ios' && (
                <DateTimePicker
                  value={datePickerValue}
                  mode="date"
                  display="default"
                  accentColor={color.accent.primary}
                  minimumDate={new Date()}
                  onValueChange={(_, selectedDate) => {
                    setDatePickerOpen(false);
                    if (selectedDate) {
                      setDeadlineDraft(formatTaskDeadline(selectedDate));
                      setCalendarMonth(selectedDate);
                    }
                  }}
                  onDismiss={() => setDatePickerOpen(false)}
                />
              )}
              {timePickerOpen && (
                <View
                  className="mt-3 items-center rounded-2xl px-3 py-2"
                  style={{ backgroundColor: color.background.tertiary }}
                >
                  <DateTimePicker
                    value={timePickerValue}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    accentColor={color.accent.primary}
                    minimumDate={timePickerMinimumDate}
                    textColor={color.text.primary}
                    themeVariant={theme}
                    style={Platform.OS === 'ios' ? { alignSelf: 'center', width: 320 } : undefined}
                    onValueChange={(_, selectedDate) => {
                      if (Platform.OS !== 'ios') {
                        setTimePickerOpen(false);
                      }
                      if (selectedDate) {
                        const nextTime = formatTaskDeadlineTime(selectedDate);
                        setDeadlineTimeDraft(
                          isPastDeadlineDateTime(deadlineDraft, nextTime)
                            ? formatTaskDeadlineTime(getNextSelectableTime())
                            : nextTime,
                        );
                      }
                    }}
                    onDismiss={() => setTimePickerOpen(false)}
                  />
                </View>
              )}
            </View>
            <View>
              <Text
                style={[
                  SECTION_LABEL_STYLE,
                  {
                    color: color.text.secondary,
                  },
                ]}
              >
                {t('tasks.priorityLabel')}
              </Text>
              <View className="flex-row gap-2.5">
                {PRIORITIES.map((priority) => {
                  const selected = priorityDraft === priority;
                  const priorityColor = priorityColors[priority];
                  return (
                    <Pressable
                      key={priority}
                      onPress={() => setPriorityDraft(priority)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      className="flex-1 rounded-xl px-3 py-3.5"
                      style={{
                        backgroundColor: selected
                          ? hexToRgba(priorityColor, 0.16)
                          : hexToRgba(priorityColor, 0.08),
                        borderColor: selected ? priorityColor : hexToRgba(priorityColor, 0.16),
                        borderWidth: 1,
                      }}
                    >
                      <Text
                        className="text-center text-[13px] font-semibold"
                        style={{ color: selected ? priorityColor : color.text.secondary }}
                      >
                        {t(`tasks.priority.${priority}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        )}
        <View className="mt-7 w-full">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            label={t('common.save')}
            color={color}
            onPress={handleSave}
            disabled={draft.trim().length === 0}
          />
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
