import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { TaskItem } from '@/entities/record';
import { formatRecordCardTaskDeadline } from '@/entities/record/lib/recordCardExpandedPreview';
import type { Colors } from '@/shared/config';

type RecordCardOpenTasksPreviewProps = {
  tasks: TaskItem[];
  color: Colors;
};

export const RecordCardOpenTasksPreview = memo(function RecordCardOpenTasksPreview({
  tasks,
  color,
}: RecordCardOpenTasksPreviewProps) {
  const { t, i18n } = useTranslation();

  if (tasks.length === 0) {
    return null;
  }

  return (
    <View style={{ marginTop: 10, gap: 8 }}>
      {tasks.map((task) => {
        const deadline = formatRecordCardTaskDeadline(task, i18n.language, t);

        return (
          <View
            key={task.id}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}
            accessibilityRole="text"
          >
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 2.5,
                marginTop: 7,
                backgroundColor: color.text.muted,
              }}
            />
            <Text
              style={{
                flex: 1,
                fontSize: 13,
                lineHeight: 18,
                color: color.text.primary,
              }}
              numberOfLines={2}
            >
              {task.text}
            </Text>
            {deadline ? (
              <Text
                style={{
                  flexShrink: 0,
                  fontSize: 12,
                  fontWeight: '600',
                  color: deadline.isOverdue ? color.accent.delete : color.text.muted,
                  maxWidth: 120,
                }}
                numberOfLines={2}
              >
                {deadline.label}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
});
