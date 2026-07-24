import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { Tag } from '@/shared/ui';

const COMPACT_MAX_TAGS = 2;

type RecordCardTagsRowProps = {
  tags: string[];
  color: Colors;
  variant?: 'compact' | 'full';
  maxVisible?: number;
};

export const RecordCardTagsRow = memo(function RecordCardTagsRow({
  tags,
  color,
  variant = 'full',
  maxVisible,
}: RecordCardTagsRowProps) {
  const { t } = useTranslation();

  if (tags.length === 0) {
    return null;
  }

  const compactLimit = maxVisible ?? COMPACT_MAX_TAGS;
  const visibleTags = variant === 'compact' ? tags.slice(0, compactLimit) : tags;
  const hiddenCount = variant === 'compact' ? Math.max(0, tags.length - compactLimit) : 0;

  return (
    <View className="flex-row flex-wrap items-center gap-1.5">
      {visibleTags.map((tag) => (
        <Tag key={tag} label={tag} />
      ))}
      {hiddenCount > 0 ? (
        <View
          className="rounded-full px-3 py-1"
          style={{ backgroundColor: color.background.tertiary }}
        >
          <Text className="text-xs font-semibold" style={{ color: color.text.muted }}>
            {t('inbox.cardLayout.moreTags', { count: hiddenCount })}
          </Text>
        </View>
      ) : null}
    </View>
  );
});
