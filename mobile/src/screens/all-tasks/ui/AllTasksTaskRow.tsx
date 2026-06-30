import { MenuView } from '@react-native-menu/menu';
import dayjs from 'dayjs';
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  FileText,
  Flag,
  MoreHorizontal,
  Pin,
} from 'lucide-react-native';
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { TaskOutcomePreview } from '@/features/task-outcome';
import { type Colors, useAppTheme } from '@/shared/config';
import { hapticLight, hapticSelection, hapticSuccess, inlineNativeMenuSection } from '@/shared/lib';
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
  getFollowUpRecordTitle?: (recordId: string) => string | null;
  onOpenFollowUp?: (recordId: string) => void;
  onOpenNote: (recordId: string) => void;
  onEditTask: (recordId: string, taskId: string, text: string) => void;
  onEditTaskOutcome: (recordId: string, taskId: string, outcomeText: string) => void;
  onQuickSchedule: (recordId: string, taskId: string, deadline: string) => void;
  onAddToCalendar: (item: TaskWithRecord) => void;
  onAddToReminder: (item: TaskWithRecord) => void;
  onTogglePin: (recordId: string, taskId: string, currentlyPinned: boolean) => void;
  onDeleteTask: (recordId: string, taskId: string) => void;
};

export const AllTasksTaskRow = memo(function AllTasksTaskRow({
  item,
  color,
  compactHorizontalMargin = false,
  openNoteLabel,
  onToggle,
  getFollowUpRecordTitle,
  onOpenFollowUp,
  onOpenNote,
  onEditTask,
  onEditTaskOutcome,
  onQuickSchedule,
  onAddToCalendar,
  onAddToReminder,
  onTogglePin,
  onDeleteTask,
}: AllTasksTaskRowProps) {
  const theme = useAppTheme();
  const isDark = theme === 'dark';
  const { t, i18n } = useTranslation();

  const { task, recordId, recordTitle } = item;
  const checkboxScale = useSharedValue(1);
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

  const checkboxAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkboxScale.value }],
  }));

  const handleToggle = () => {
    if (task.isDone) {
      hapticLight();
    } else {
      hapticSuccess();
    }
    checkboxScale.value = withSequence(
      withTiming(0.9, { duration: 40 }),
      withTiming(1, { duration: 90 }),
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

  const titleColor = color.text.primary;
  const taskActionsSection = [
    {
      id: 'togglePin',
      title: task.isPinned ? t('tasks.unpinTask') : t('tasks.pinTask'),
      image: 'pin',
      imageColor: task.isPinned ? color.accent.pin : titleColor,
      titleColor,
    },
    {
      id: 'editTask',
      title: t('tasks.editTask'),
      image: 'pencil',
      imageColor: titleColor,
      titleColor,
    },
    ...(task.isDone
      ? [
          {
            id: 'editTaskOutcome',
            title: t('tasks.editTaskOutcome'),
            image: 'text.alignleft',
            imageColor: titleColor,
            titleColor,
          },
        ]
      : []),
  ];
  const menuActions = [
    {
      id: 'openNote',
      title: openNoteLabel,
      image: 'doc.text',
      imageColor: titleColor,
      titleColor,
    },
    inlineNativeMenuSection('taskActionsSection', titleColor, taskActionsSection),
    inlineNativeMenuSection('integrationsSection', titleColor, [
      {
        id: 'addToReminder',
        title: t('tasks.addToReminder'),
        image: 'bell',
        imageColor: titleColor,
        titleColor,
      },
      {
        id: 'addToCalendar',
        title: t('tasks.addToCalendar'),
        image: 'calendar',
        imageColor: titleColor,
        titleColor,
      },
    ]),
    inlineNativeMenuSection('deleteSection', titleColor, [
      {
        id: 'deleteTask',
        title: t('tasks.deleteTask'),
        image: 'trash',
        imageColor: color.accent.delete,
        titleColor: color.accent.delete,
        attributes: { destructive: true },
      },
    ]),
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
        <View
          style={{ backgroundColor: color.background.card, borderRadius: CARD_RADIUS }}
          className="flex-row items-stretch py-1"
        >
          <Pressable
            className="px-4 py-3.5 items-center justify-center"
            onPress={handleToggle}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: task.isDone }}
            accessibilityLabel={task.isDone ? t('tasks.markUndoneA11y') : t('tasks.markDoneA11y')}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Animated.View style={checkboxAnimStyle}>
              {task.isDone ? (
                <CheckCircle2 size={24} color={color.accent.success} strokeWidth={2} />
              ) : (
                <Circle size={24} color={color.icon.muted} strokeWidth={2} />
              )}
            </Animated.View>
          </Pressable>

          <View className="min-w-0 flex-1 flex-col py-3 pr-1">
            <Pressable
              onPress={handleEdit}
              accessibilityRole="button"
              accessibilityLabel={t('tasks.editTaskA11y', { text: task.text })}
            >
              <View className="mb-2.5 flex-row items-start gap-1.5">
                {task.isPinned ? (
                  <Pin
                    size={14}
                    color={color.accent.pin}
                    strokeWidth={2}
                    style={{ marginTop: 3, flexShrink: 0 }}
                  />
                ) : null}
                <Text
                  className="min-w-0 flex-1 text-[15px] leading-5"
                  style={{
                    color: task.isDone ? color.text.secondary : color.text.primary,
                    textDecorationLine: task.isDone ? 'line-through' : undefined,
                  }}
                  numberOfLines={3}
                >
                  {task.text}
                </Text>
              </View>
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
            <TaskOutcomePreview
              task={task}
              color={color}
              indent={false}
              followUpTitle={
                task.outcomeRecordId && getFollowUpRecordTitle
                  ? getFollowUpRecordTitle(task.outcomeRecordId)
                  : null
              }
              onOpenFollowUp={
                task.outcomeRecordId && onOpenFollowUp
                  ? () => onOpenFollowUp(task.outcomeRecordId!)
                  : undefined
              }
            />
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
                } else if (nativeEvent.event === 'editTaskOutcome') {
                  onEditTaskOutcome(recordId, task.id, task.outcomeText ?? '');
                } else if (nativeEvent.event === 'addToReminder') {
                  onAddToReminder(item);
                } else if (nativeEvent.event === 'addToCalendar') {
                  onAddToCalendar(item);
                } else if (nativeEvent.event === 'togglePin') {
                  hapticSelection();
                  onTogglePin(recordId, task.id, Boolean(task.isPinned));
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
        </View>
      </View>
    </View>
  );
});
