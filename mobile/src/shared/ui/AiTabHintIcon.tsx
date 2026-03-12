import { Cloud, WifiOff } from 'lucide-react-native';
import React from 'react';

import type { Colors } from '@/shared/config';
import { useNetworkStatus } from '@/shared/lib';

type AiTabHintIconProps = {
  color: Colors;
  size?: number;
};

export const AiTabHintIcon = ({ color, size = 14 }: AiTabHintIconProps) => {
  const { isConnected } = useNetworkStatus();

  return isConnected === false ? (
    <WifiOff size={size} color={color.accent.delete} strokeWidth={1.8} />
  ) : (
    <Cloud size={size} color={color.text.secondary} strokeWidth={1.8} />
  );
};
