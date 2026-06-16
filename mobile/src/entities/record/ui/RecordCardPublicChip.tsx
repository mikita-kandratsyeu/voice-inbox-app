import { Globe } from 'lucide-react-native';
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';

type RecordCardPublicChipProps = {
  color: Colors;
};

export const RecordCardPublicChip = memo(function RecordCardPublicChip({
  color,
}: RecordCardPublicChipProps) {
  const { t } = useTranslation();
  const accentColor = color.accent.primary;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: withAlphaHex(accentColor, 0.14),
        borderWidth: 1,
        borderColor: withAlphaHex(accentColor, 0.28),
      }}
      accessibilityRole="text"
      accessibilityLabel={t('share.publicBadge')}
    >
      <Globe size={12} color={accentColor} strokeWidth={2.2} />
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: color.text.primary,
        }}
      >
        {t('share.publicBadge')}
      </Text>
    </View>
  );
});
