import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useColors } from '@/shared/config';
import { ProgressStatusCard, RotatingTipText } from '@/shared/ui';

import { useRotatingGraphLoadingTip } from '../lib/graphLoadingTips';

type GraphBuildingStateProps = {
  label: string;
  showTips?: boolean;
  /** 0–1 layout build progress; omit for indeterminate spinner only. */
  progress?: number;
};

export function GraphBuildingState({ label, showTips = true, progress }: GraphBuildingStateProps) {
  const { t } = useTranslation();
  const color = useColors();
  const tipKey = useRotatingGraphLoadingTip(showTips);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
      }}
    >
      <ProgressStatusCard
        title={label}
        progress={progress}
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
