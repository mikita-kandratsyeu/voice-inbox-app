import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/shared/config';
import { ProgressStatusCard, RotatingTipText } from '@/shared/ui';

import { NOTES_GRAPH_LOADING_TIP_KEYS, useRotatingGraphLoadingTip } from '../lib/graphLoadingTips';

type GraphBuildingStateProps = {
  label: string;
  showTips?: boolean;
  /** 0–1 layout build progress; omit for indeterminate spinner only. */
  progress?: number;
  /** When true, captures touches so the graph underneath cannot be interacted with. */
  blockTouches?: boolean;
  tipKeys?: readonly string[];
};

export function GraphBuildingState({
  label,
  showTips = true,
  progress,
  blockTouches = false,
  tipKeys = NOTES_GRAPH_LOADING_TIP_KEYS,
}: GraphBuildingStateProps) {
  const { t } = useTranslation();
  const color = useColors();
  const tipKey = useRotatingGraphLoadingTip(showTips, tipKeys);

  return (
    <View
      pointerEvents={blockTouches ? 'auto' : 'box-none'}
      style={[StyleSheet.absoluteFill, styles.overlay]}
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

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
