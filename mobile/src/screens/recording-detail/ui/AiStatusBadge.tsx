import { CheckCircle2 } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import type { RecordingStatus } from '@/entities/record';

import { AI_STATUS_CONFIG } from '../config';

type AiStatusBadgeProps = {
  aiStatus: RecordingStatus;
};

export const AiStatusBadge = ({ aiStatus }: AiStatusBadgeProps) => {
  const cfg = AI_STATUS_CONFIG[aiStatus];

  return (
    <View className="gap-2.5 rounded-xl p-3" style={{ backgroundColor: cfg.bgColor }}>
      <View className="flex-row items-center gap-2">
        <CheckCircle2 size={18} color={cfg.iconColor} strokeWidth={2} />
        <Text className="text-sm font-semibold" style={{ color: cfg.iconColor }}>
          {cfg.label}
        </Text>
      </View>
    </View>
  );
};
