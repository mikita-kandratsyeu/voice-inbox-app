import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, useWindowDimensions, View } from 'react-native';

import type { TaskItem } from '@/entities/record';
import { formatRecordCardTaskDeadline } from '@/entities/record/lib/recordCardExpandedPreview';
import type { Colors } from '@/shared/config';

type RecordCardOpenTasksPreviewProps = {
  tasks: TaskItem[];
  color: Colors;
};

const COMPACT_TASK_ROW_MAX_WIDTH = 420;

export const RecordCardOpenTasksPreview = memo(function RecordCardOpenTasksPreview({
  tasks,
  color,
}: RecordCardOpenTasksPreviewProps) {
  const { t, i18n } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const compact = windowWidth < COMPACT_TASK_ROW_MAX_WIDTH;

  if (tasks.length === 0) {
    return null;
  }

  return (
    <View style={{ marginTop: 14 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.8,
          color: color.text.muted,
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        {t('inbox.cardLayout.tasksSectionTitle')}
      </Text>
      <View style={{ gap: 10 }}>
        {tasks.map((task) => {
          const deadline = compact ? null : formatRecordCardTaskDeadline(task, i18n.language, t);

          return (
            <View
              key={task.id}
              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}
              accessibilityRole="text"
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  marginTop: 7,
                  backgroundColor: color.accent.primary,
                }}
              />
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  lineHeight: 20,
                  color: color.text.primary,
                  minWidth: 0,
                }}
                numberOfLines={2}
              >
                {task.text}
              </Text>
              {deadline ? (
                <View
                  style={{
                    flexShrink: 0,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                    backgroundColor: color.background.tertiary,
                    maxWidth: 120,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: deadline.isOverdue ? color.accent.delete : color.text.muted,
                      textAlign: 'center',
                    }}
                    numberOfLines={2}
                  >
                    {deadline.label}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
});
