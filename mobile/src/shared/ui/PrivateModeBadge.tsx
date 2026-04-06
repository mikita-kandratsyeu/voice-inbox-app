import { Mic, Shield } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

type PrivateModeBadgeProps = {
  color: Colors;
  compact?: boolean;
  text?: string;
};

export const PrivateModeBadge = ({ color, compact = false, text }: PrivateModeBadgeProps) => {
  const { t } = useTranslation();

  const iconProps = {
    size: compact ? 11 : 12,
    color: color.accent.primary,
    strokeWidth: compact ? 2.2 : 2,
  };

  return (
    <View
      className="flex-row items-center rounded-full"
      style={{
        gap: compact ? 4 : 6,
        paddingHorizontal: compact ? 8 : 10,
        paddingVertical: compact ? 3 : 4,
        backgroundColor: `${color.accent.primary}22`,
        borderWidth: 1,
        borderColor: `${color.accent.primary}66`,
      }}
    >
      {text && <Mic {...iconProps} />}
      {!text && <Shield {...iconProps} />}
      <Text
        className={compact ? 'text-[11px] font-semibold' : 'text-xs font-semibold'}
        style={{ color: color.accent.primary }}
      >
        {text ?? t('settings.planStatus.privateBadge')}
      </Text>
    </View>
  );
};
