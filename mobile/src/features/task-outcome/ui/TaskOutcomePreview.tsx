import { ChevronRight, FileText } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { TaskItem } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';

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
  const trimmedFollowUpTitle = followUpTitle?.trim() ?? '';
  const hasFollowUp = Boolean(task.outcomeRecordId && trimmedFollowUpTitle.length > 0);

  if (!outcomeText && !hasFollowUp) {
    return null;
  }

  const outcomeChipStyle = {
    backgroundColor: withAlphaHex(color.accent.success, 0.14),
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  };

  return (
    <View
      className="mt-2 flex-row flex-wrap items-center gap-2"
      style={indent ? { paddingLeft: 36 } : undefined}
    >
      {outcomeText ? (
        <View className="self-start" style={[outcomeChipStyle, { maxWidth: '100%' }]}>
          <Text
            className="text-xs font-semibold leading-4"
            style={{ color: color.text.primary }}
            numberOfLines={3}
          >
            <Text style={{ color: color.accent.success }}>{t('taskOutcome.resultLabel')}: </Text>
            {outcomeText}
          </Text>
        </View>
      ) : null}
      {hasFollowUp && onOpenFollowUp ? (
        <Pressable
          onPress={onOpenFollowUp}
          accessibilityRole="button"
          accessibilityLabel={t('taskOutcome.openFollowUpA11y', { title: trimmedFollowUpTitle })}
          style={[outcomeChipStyle, { maxWidth: '100%' }]}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 8 }}
        >
          <View className="max-w-full flex-row items-center">
            <FileText
              size={12}
              color={color.accent.success}
              strokeWidth={2}
              style={{ flexShrink: 0 }}
            />
            <Text
              className="ml-1.5 min-w-0 shrink text-xs font-semibold"
              style={{ color: color.text.primary }}
              numberOfLines={1}
            >
              {trimmedFollowUpTitle}
            </Text>
            <ChevronRight
              size={12}
              color={color.accent.success}
              strokeWidth={2.5}
              style={{ flexShrink: 0, marginLeft: 2 }}
            />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}
