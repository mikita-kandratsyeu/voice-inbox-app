import { CheckCircle2, Circle, Cloud, ListChecks } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { TaskItem } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { TabEmptyState } from '@/shared/ui';

type TasksTabProps = {
  tasks: TaskItem[];
  color: Colors;
  onToggle: (id: string) => void;
  onExtract: () => void;
};

export const TasksTab = ({ tasks, color, onToggle, onExtract }: TasksTabProps) => {
  if (tasks.length === 0) {
    return (
      <TabEmptyState
        icon={<ListChecks size={28} color={color.icon.muted} strokeWidth={1.8} />}
        title="Задачи не извлечены"
        description={'Нажмите кнопку ниже, чтобы\nавтоматически найти задачи с помощью Gemini.'}
        buttonLabel="Найти задачи"
        buttonIcon={<ListChecks size={18} color="#fff" strokeWidth={2} />}
        hint="Gemini · Требует подключения к интернету"
        hintIcon={
          <Cloud size={14} color={color.text.secondary} strokeWidth={1.8} className="mt-0.5" />
        }
        onPress={onExtract}
        color={color}
      />
    );
  }

  return (
    <View className="gap-3.5 p-4">
      {tasks.map((task) => (
        <Pressable
          key={task.id}
          className="flex-row items-center gap-3 py-1"
          onPress={() => onToggle(task.id)}
          android_ripple={{ color: color.background.tertiary }}
        >
          {task.isDone ? (
            <CheckCircle2 size={20} color={color.accent.success} strokeWidth={2} />
          ) : (
            <Circle size={20} color={color.icon.muted} strokeWidth={2} />
          )}
          <Text
            className="flex-1 text-sm leading-5"
            style={{
              color: task.isDone ? color.text.secondary : color.text.primary,
              textDecorationLine: task.isDone ? 'line-through' : undefined,
            }}
          >
            {task.text}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};
