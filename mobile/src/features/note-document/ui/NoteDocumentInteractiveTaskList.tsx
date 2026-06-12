import { CheckCircle2, Circle } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { TaskItem } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { formatTaskDeadlineTimeForDisplay } from '@/shared/lib';
import {
  NOTE_DOCUMENT_BODY_FONT_SIZE,
  NOTE_DOCUMENT_BODY_LINE_HEIGHT,
} from '@/shared/ui/documentMarkdownTheme';

import { DocumentSectionTitle } from './DocumentSectionTitle';

type NoteDocumentInteractiveTaskListProps = {
  color: Colors;
  tasks: TaskItem[];
  onToggleTask: (taskId: string) => void;
};

function formatTaskMetaLine(task: TaskItem, t: (key: string) => string): string | null {
  const parts: string[] = [];
  if (task.deadline) {
    const timeLabel =
      task.deadlineTime != null && String(task.deadlineTime).trim() !== ''
        ? formatTaskDeadlineTimeForDisplay(task.deadlineTime)
        : '';
    parts.push(
      timeLabel.length > 0
        ? `${t('tasks.deadlineLabel')}: ${task.deadline} ${timeLabel}`
        : `${t('tasks.deadlineLabel')}: ${task.deadline}`,
    );
  }
  if (task.priority) {
    parts.push(`${t('tasks.priorityLabel')}: ${t(`tasks.priority.${task.priority}`)}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function NoteDocumentInteractiveTaskList({
  color,
  tasks,
  onToggleTask,
}: NoteDocumentInteractiveTaskListProps) {
  const { t } = useTranslation();

  if (tasks.length === 0) return null;

  return (
    <View>
      <DocumentSectionTitle color={color}>{t('recordingDetail.tasks')}</DocumentSectionTitle>
      <View
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: color.border.default,
          backgroundColor: color.background.secondary,
          overflow: 'hidden',
        }}
      >
        {tasks.map((task, index) => {
          const meta = formatTaskMetaLine(task, t);
          const isLast = index === tasks.length - 1;

          return (
            <View key={task.id}>
              <Pressable
                className="flex-row items-start gap-3 px-4 py-3.5"
                onPress={() => onToggleTask(task.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: task.isDone }}
                accessibilityLabel={
                  task.isDone ? t('tasks.markUndoneA11y') : t('tasks.markDoneA11y')
                }
                style={({ pressed }) =>
                  pressed ? { backgroundColor: color.background.tertiary } : undefined
                }
              >
                <View className="mt-0.5">
                  {task.isDone ? (
                    <CheckCircle2 size={22} color={color.accent.success} strokeWidth={2} />
                  ) : (
                    <Circle size={22} color={color.icon.muted} strokeWidth={2} />
                  )}
                </View>
                <View className="min-w-0 flex-1">
                  <Text
                    style={{
                      fontSize: NOTE_DOCUMENT_BODY_FONT_SIZE,
                      lineHeight: NOTE_DOCUMENT_BODY_LINE_HEIGHT,
                      color: task.isDone ? color.text.secondary : color.text.primary,
                      textDecorationLine: task.isDone ? 'line-through' : undefined,
                    }}
                  >
                    {task.text}
                  </Text>
                  {meta ? (
                    <Text
                      className="mt-1 text-[14px] leading-5"
                      style={{ color: color.text.secondary }}
                    >
                      {meta}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
              {!isLast ? (
                <View
                  style={{
                    height: 1,
                    marginLeft: 52,
                    backgroundColor: color.border.default,
                  }}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
