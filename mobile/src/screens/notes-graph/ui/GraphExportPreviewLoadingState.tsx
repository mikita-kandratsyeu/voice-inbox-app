import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useColors } from '@/shared/config';
import { ProgressStatusCard, RotatingTipText } from '@/shared/ui';

import { useRotatingGraphLoadingTip } from '../lib/graphLoadingTips';

type GraphExportPreviewLoadingStateProps = {
  label: string;
  showTips?: boolean;
};

export function GraphExportPreviewLoadingState({
  label,
  showTips = true,
}: GraphExportPreviewLoadingStateProps) {
  const { t } = useTranslation();
  const color = useColors();
  const tipKey = useRotatingGraphLoadingTip(showTips);

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
