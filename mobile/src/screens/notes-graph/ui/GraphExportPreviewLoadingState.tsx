import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useColors } from '@/shared/config';
import { ProgressStatusCard, RotatingTipText } from '@/shared/ui';

import { useRotatingGraphLoadingTip } from '../lib/graphLoadingTips';

type GraphExportPreviewLoadingStateProps = {
  label: string;
};

export function GraphExportPreviewLoadingState({ label }: GraphExportPreviewLoadingStateProps) {
  const { t } = useTranslation();
  const color = useColors();
  const tipKey = useRotatingGraphLoadingTip();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
      }}
    >
      <ProgressStatusCard
        title={label}
        subtitle={
          <RotatingTipText
            text={t(tipKey)}
            color={color.text.secondary}
            className="text-center text-[14px] leading-5"
          />
        }
      />
    </View>
  );
}
