import React, { memo } from 'react';
import { View } from 'react-native';

import type { Colors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib/platform';

type PlanPricingSkeletonProps = {
  color: Colors;
};

export const PlanPricingSkeleton = memo(function PlanPricingSkeleton({
  color,
}: PlanPricingSkeletonProps) {
  const cardStyle = {
    height: 90,
    borderRadius: 16,
    backgroundColor: color.background.tertiary,
    opacity: IS_IOS ? 0.65 : 0.55,
  };

  return (
    <View
      className="mt-3 gap-2.5"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={cardStyle} />
      <View style={cardStyle} />
    </View>
  );
});
