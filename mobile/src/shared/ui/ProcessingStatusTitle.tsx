import React from 'react';
import { Text, type TextStyle, View } from 'react-native';

import { splitTrailingEllipsis } from '@/shared/lib/splitTrailingEllipsis';

import { ProcessingArcSpinner } from './ProcessingArcSpinner';

type ProcessingStatusTitleProps = {
  title: string;
  color: string;
  /** Accent for the trailing loader (defaults to `color`). */
  loaderColor?: string;
  className?: string;
  style?: TextStyle;
};

export function ProcessingStatusTitle({
  title,
  color,
  loaderColor,
  className,
  style,
}: ProcessingStatusTitleProps) {
  const { base, hasEllipsis } = splitTrailingEllipsis(title);
  const spinnerTint = loaderColor ?? color;

  return (
    <View className="flex-row items-center gap-2.5">
      <Text className={`flex-shrink ${className ?? ''}`} style={[style, { color }]}>
        {base}
      </Text>
      {hasEllipsis ? <ProcessingArcSpinner color={spinnerTint} size="md" /> : null}
    </View>
  );
}
