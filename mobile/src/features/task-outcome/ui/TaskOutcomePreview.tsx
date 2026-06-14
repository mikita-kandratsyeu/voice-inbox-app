import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { TaskItem } from '@/entities/record';
import type { Colors } from '@/shared/config';

type TaskOutcomePreviewProps = {
  task: TaskItem;
  followUpTitle?: string | null;
  color: Colors;
  onOpenFollowUp?: () => void;
  indent?: boolean;
};

export function TaskOutcomePreview({
  task,
  followUpTitle,
  color,
  onOpenFollowUp,
  indent = true,
}: TaskOutcomePreviewProps) {
  const { t } = useTranslation();
  const outcomeText = task.outcomeText?.trim();
  const hasFollowUp = Boolean(task.outcomeRecordId && followUpTitle?.trim());

  if (!outcomeText && !hasFollowUp) {
    return null;
  }

  return (
    <View className="mt-1.5 gap-1.5" style={indent ? { paddingLeft: 36 } : undefined}>
      {outcomeText ? (
        <Text
          className="text-xs leading-4"
          style={{ color: color.text.secondary }}
          numberOfLines={3}
        >
          <Text style={{ color: color.text.muted, fontWeight: '600' }}>
            {t('taskOutcome.resultLabel')}:{' '}
          </Text>
          {outcomeText}
        </Text>
      ) : null}
      {hasFollowUp && onOpenFollowUp ? (
        <Pressable
          onPress={onOpenFollowUp}
          accessibilityRole="button"
          accessibilityLabel={t('taskOutcome.openFollowUpA11y', { title: followUpTitle })}
          className="flex-row items-center gap-1"
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 8 }}
        >
          <Text
            className="text-xs font-semibold"
            style={{ color: color.accent.primary }}
            numberOfLines={1}
          >
            {t('taskOutcome.openFollowUp', { title: followUpTitle })}
          </Text>
          <ChevronRight size={14} color={color.accent.primary} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );
}
