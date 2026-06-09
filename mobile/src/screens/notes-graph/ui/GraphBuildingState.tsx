import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useColors } from '@/shared/config';
import { ProgressStatusCard, RotatingTipText } from '@/shared/ui';

import {
  NOTES_GRAPH_LOADING_TIP_INTERVAL_MS,
  NOTES_GRAPH_LOADING_TIP_KEYS,
  pickRandomGraphLoadingTipIndex,
} from '../lib/graphLoadingTips';

type GraphBuildingStateProps = {
  label: string;
  showTips?: boolean;
};

export function GraphBuildingState({ label, showTips = true }: GraphBuildingStateProps) {
  const { t } = useTranslation();
  const color = useColors();
  const [tipIndex, setTipIndex] = useState(() => pickRandomGraphLoadingTipIndex());

  useEffect(() => {
    if (!showTips || NOTES_GRAPH_LOADING_TIP_KEYS.length <= 1) return;

    const intervalId = setInterval(() => {
      setTipIndex((current) => (current + 1) % NOTES_GRAPH_LOADING_TIP_KEYS.length);
    }, NOTES_GRAPH_LOADING_TIP_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [showTips]);

  const tipKey = NOTES_GRAPH_LOADING_TIP_KEYS[tipIndex];

  return (
    <View className="flex-1 items-center justify-center px-6">
      <ProgressStatusCard
        title={label}
        subtitle={
          showTips ? (
            <RotatingTipText
              text={t(tipKey)}
              color={color.text.secondary}
              className="text-center text-[14px] leading-5"
            />
          ) : undefined
        }
      />
    </View>
  );
}
