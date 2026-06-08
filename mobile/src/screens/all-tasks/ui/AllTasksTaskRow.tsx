import { MenuView } from '@react-native-menu/menu';
import dayjs from 'dayjs';
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  FileText,
  Flag,
  MoreHorizontal,
} from 'lucide-react-native';
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { type Colors, useAppTheme } from '@/shared/config';
import { hapticLight, hapticSelection, hapticSuccess } from '@/shared/lib';
import { resolveDayjsLocale } from '@/shared/lib/date';
import { parseTaskDeadline } from '@/shared/lib/parseTaskDeadline';
import { formatTaskDeadlineTimeForDisplay } from '@/shared/lib/taskDeadlineTimeDisplay';

import type { TaskWithRecord } from '../types';

const CARD_RADIUS = 16;

type AllTasksTaskRowProps = {
  item: TaskWithRecord;
  color: Colors;
  compactHorizontalMargin?: boolean;
  openNoteLabel: string;
  onToggle: (recordId: string, taskId: string, currentlyDone: boolean) => void;
  onOpenNote: (recordId: string) => void;
  onEditTask: (recordId: string, taskId: string, text: string) => void;
  onQuickSchedule: (recordId: string, taskId: string, deadline: string) => void;
  onAddToCalendar: (item: TaskWithRecord) => void;
  onAddToReminder: (item: TaskWithRecord) => void;
  onDeleteTask: (recordId: string, taskId: string) => void;
};

export const AllTasksTaskRow = memo(function AllTasksTaskRow({
  item,
  color,
  compactHorizontalMargin = false,
  openNoteLabel,
  onToggle,
  onOpenNote,
  onEditTask,
  onQuickSchedule,
  onAddToCalendar,
  onAddToReminder,
  onDeleteTask,
}: AllTasksTaskRowProps) {
  const theme = useAppTheme();
  const isDark = theme === 'dark';
  const { t, i18n } = useTranslation();

  const { task, recordId, recordTitle } = item;
  const pressScale = useSharedValue(1);
  const parsedDeadline = parseTaskDeadline(task.deadline);
  const deadlineText =
    parsedDeadline !== null
      ? `${dayjs(parsedDeadline).locale(resolveDayjsLocale(i18n.language)).format('D MMM')}${
          task.deadlineTime ? `, ${formatTaskDeadlineTimeForDisplay(task.deadlineTime)}` : ''
        }`
      : null;
  const isOverdue =
    parsedDeadline !== null && !task.isDone && dayjs(parsedDeadline).isBefore(dayjs(), 'day');
  const priorityColor =
    task.priority === 'high'
      ? color.accent.delete
      : task.priority === 'medium'
        ? color.accent.cache
        : color.text.secondary;
  const showScheduleActions = parsedDeadline === null && !task.isDone;

  const pressAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handleToggle = () => {
    if (task.isDone) {
      hapticLight();
    } else {
      hapticSuccess();
    }
    pressScale.value = withSequence(
      withTiming(0.97, { duration: 55 }),
      withSpring(1, { damping: 16, stiffness: 280 }),
    );
    onToggle(recordId, task.id, task.isDone);
  };

  const handleEdit = () => {
    hapticSelection();
    onEditTask(recordId, task.id, task.text);
  };

  const cardShadowStyle = {
    shadowColor: color.shadow.color,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: color.shadow.opacity,
    shadowRadius: 4,
    elevation: 2,
  };

  const menuActions = [
    {
      id: 'openNote',
      title: openNoteLabel,
      image: 'doc.text',
      imageColor: color.text.primary,
      titleColor: color.text.primary,
    },
    {
      id: 'editTask',
      title: t('tasks.editTask'),
      image: 'pencil',
      imageColor: color.text.primary,
      titleColor: color.text.primary,
    },
    {
      id: 'addToReminder',
      title: t('tasks.addToReminder'),
      image: 'bell',
      imageColor: color.text.primary,
      titleColor: color.text.primary,
    },
    {
      id: 'addToCalendar',
      title: t('tasks.addToCalendar'),
      image: 'calendar',
      imageColor: color.text.primary,
      titleColor: color.text.primary,
    },
    {
      id: 'deleteTask',
      title: t('tasks.deleteTask'),
      image: 'trash',
      imageColor: color.accent.delete,
      titleColor: color.accent.delete,
      attributes: { destructive: true },
    },
  ];

  const scheduleChipStyle = {
    backgroundColor: color.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  };

  return (
    <View
      className={compactHorizontalMargin ? 'mx-3 mb-4' : 'mx-4 mb-4'}
      style={[
        cardShadowStyle,
        { borderRadius: CARD_RADIUS, backgroundColor: color.background.card },
      ]}
    >
      <View style={{ overflow: 'hidden', borderRadius: CARD_RADIUS }}>
        <Animated.View
          style={[
            pressAnimStyle,
            { backgroundColor: color.background.card, borderRadius: CARD_RADIUS },
          ]}
          className="flex-row items-stretch py-1"
        >
          <Pressable
            className="px-4 py-3.5 items-center justify-center"
            onPress={handleToggle}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: task.isDone }}
            accessibilityLabel={
              task.isDone ? t('tasks.markUndoneA11y') : t('tasks.markDoneA11y')
            }
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            {task.isDone ? (
              <CheckCircle2 size={24} color={color.accent.success} strokeWidth={2} />
            ) : (
              <Circle size={24} color={color.icon.muted} strokeWidth={2} />
            )}
          </Pressable>

          <View className="min-w-0 flex-1 flex-col py-3 pr-1">
            <Pressable
              onPress={handleEdit}
              accessibilityRole="button"
              accessibilityLabel={t('tasks.editTask')}
            >
              <Text
                className="text-[15px] leading-5 mb-2.5"
                style={{
                  color: task.isDone ? color.text.secondary : color.text.primary,
                  textDecorationLine: task.isDone ? 'line-through' : undefined,
                }}
                numberOfLines={3}
              >
                {task.text}
              </Text>
              <View className="flex-row flex-wrap items-center gap-1.5">
                {parsedDeadline !== null && (
                  <View
                    className="flex-row items-center rounded-md px-2 py-1"
                    style={{ backgroundColor: color.background.secondary }}
                  >
                    <CalendarDays
                      size={12}
                      color={isOverdue ? color.accent.delete : color.icon.muted}
                      strokeWidth={2}
                      style={{ flexShrink: 0 }}
                    />
                    <Text
                      className="ml-1.5 text-xs font-medium"
                      style={{
                        color: isOverdue ? color.accent.delete : color.text.secondary,
                      }}
                      numberOfLines={1}
                    >
                      {deadlineText}
                    </Text>
                  </View>
                )}
                {task.priority && (
                  <View
                    className="flex-row items-center rounded-md px-2 py-1"
                    style={{ backgroundColor: color.background.secondary }}
                  >
                    <Flag
                      size={12}
                      color={priorityColor}
                      strokeWidth={2}
                      style={{ flexShrink: 0 }}
                    />
                    <Text
                      className="ml-1.5 text-xs font-medium"
                      style={{ color: priorityColor }}
                      numberOfLines={1}
                    >
                      {t(`tasks.priority.${task.priority}`)}
                    </Text>
                  </View>
                )}
                <View
                  className="max-w-full flex-row items-center rounded-md px-2 py-1"
                  style={{ backgroundColor: color.background.secondary }}
                >
                  <FileText
                    size={12}
                    color={color.icon.muted}
                    strokeWidth={2}
                    style={{ flexShrink: 0 }}
                  />
                  <Text
                    className="ml-1.5 min-w-0 shrink text-xs font-medium"
                    style={{ color: color.text.secondary }}
                    numberOfLines={1}
                  >
                    {recordTitle}
                  </Text>
                </View>
              </View>
            </Pressable>
            {showScheduleActions ? (
              <View className="mt-2 flex-row flex-wrap items-center gap-2">
                <Pressable
                  onPress={() => {
                    hapticSelection();
                    onQuickSchedule(recordId, task.id, dayjs().format('YYYY-MM-DD'));
                  }}
                  style={scheduleChipStyle}
                  accessibilityRole="button"
                  accessibilityLabel={t('allTasks.scheduleTodayA11y')}
                >
                  <Text className="text-xs font-semibold" style={{ color: color.accent.primary }}>
                    {t('allTasks.scheduleToday')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    hapticSelection();
                    onQuickSchedule(recordId, task.id, dayjs().add(1, 'day').format('YYYY-MM-DD'));
                  }}
                  style={scheduleChipStyle}
                  accessibilityRole="button"
                  accessibilityLabel={t('allTasks.scheduleTomorrowA11y')}
                >
                  <Text className="text-xs font-semibold" style={{ color: color.accent.primary }}>
                    {t('allTasks.scheduleTomorrow')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleEdit}
                  style={scheduleChipStyle}
                  accessibilityRole="button"
                  accessibilityLabel={t('allTasks.scheduleCustomA11y')}
                >
                  <Text className="text-xs font-semibold" style={{ color: color.text.secondary }}>
                    {t('allTasks.scheduleCustom')}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <View className="justify-center px-1 pr-1.5" style={{ zIndex: 10 }}>
            <MenuView
              key={`task-menu-${task.id}-${theme}`}
              themeVariant={isDark ? 'dark' : 'light'}
              shouldOpenOnLongPress={false}
              onPressAction={({ nativeEvent }) => {
                if (nativeEvent.event === 'openNote') {
                  onOpenNote(recordId);
                } else if (nativeEvent.event === 'editTask') {
                  onEditTask(recordId, task.id, task.text);
                } else if (nativeEvent.event === 'addToReminder') {
                  onAddToReminder(item);
                } else if (nativeEvent.event === 'addToCalendar') {
                  onAddToCalendar(item);
                } else if (nativeEvent.event === 'deleteTask') {
                  onDeleteTask(recordId, task.id);
                }
              }}
              actions={menuActions}
            >
              <Pressable
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                style={{ padding: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('tasks.taskMenu')}
              >
                <MoreHorizontal size={20} color={color.icon.muted} strokeWidth={2} />
              </Pressable>
            </MenuView>
          </View>
        </Animated.View>
      </View>
    </View>
  );
});
