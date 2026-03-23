import React from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

type Status = 'granted' | 'denied' | 'not-determined';

type Props = {
  status: Status;
  color: Colors;
  labelGranted: string;
  labelDenied: string;
  labelNotDetermined: string;
};

export const SettingsPermissionStatusBadge = ({
  status,
  color,
  labelGranted,
  labelDenied,
  labelNotDetermined,
}: Props) => {
  let backgroundColor: string;
  let textColor: string;
  let label: string;

  switch (status) {
    case 'granted':
      backgroundColor = color.onboarding.zap.bg;
      textColor = color.accent.success;
      label = labelGranted;
      break;
    case 'denied':
      backgroundColor = color.status.error.bg;
      textColor = color.status.error.text;
      label = labelDenied;
      break;
    default:
      backgroundColor = color.background.tertiary;
      textColor = color.text.secondary;
      label = labelNotDetermined;
  }

  return (
    <View className="rounded-full px-2.5 py-1" style={{ backgroundColor }}>
      <Text className="text-[12px] font-semibold" style={{ color: textColor }}>
        {label}
      </Text>
    </View>
  );
};
