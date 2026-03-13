import { Cloud, WifiOff } from 'lucide-react-native';
import React from 'react';

import { useColors } from '@/shared/config';
import { useNetworkStatus } from '@/shared/lib';

type AiTabHintIconProps = {
  size?: number;
};

export const AiTabHintIcon = ({ size = 14 }: AiTabHintIconProps) => {
  const { isConnected } = useNetworkStatus();
  const color = useColors();

  return isConnected === false ? (
    <WifiOff size={size} color={color.accent.delete} strokeWidth={1.8} />
  ) : (
    <Cloud size={size} color={color.text.secondary} strokeWidth={1.8} />
  );
};
