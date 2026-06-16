import { Globe } from 'lucide-react-native';
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

type RecordCardPublicChipProps = {
  color: Colors;
};

export const RecordCardPublicChip = memo(function RecordCardPublicChip({
  color,
}: RecordCardPublicChipProps) {
  const { t } = useTranslation();

  return (
    <View
      className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
      style={{
        backgroundColor: color.status.processing.bg,
        flexShrink: 1,
        maxWidth: '100%',
      }}
      accessibilityRole="text"
      accessibilityLabel={t('share.publicBadge')}
    >
      <Globe size={11} color={color.status.processing.text} strokeWidth={2.5} />
      <Text
        className="text-xs font-medium"
        style={{ color: color.status.processing.text, flexShrink: 1 }}
        numberOfLines={1}
      >
        {t('share.publicBadge')}
      </Text>
    </View>
  );
});
