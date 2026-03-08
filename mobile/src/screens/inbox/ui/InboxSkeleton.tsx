import React from 'react';
import { View } from 'react-native';

import type { Colors } from '@/shared/config';
import { SkeletonPulse } from '@/shared/ui';

const SkeletonBlock = ({ color, className }: { color: Colors; className: string }) => (
  <View className={className} style={{ backgroundColor: color.background.tertiary }} />
);

const SkeletonCard = ({ color }: { color: Colors }) => (
  <View
    className="mx-4 mb-3 rounded-2xl p-4"
    style={{
      backgroundColor: color.background.card,
      shadowColor: color.shadow.color,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: color.shadow.opacity,
      shadowRadius: 4,
      elevation: 2,
    }}
  >
    <SkeletonBlock color={color} className="mb-3 h-4 w-3/5 rounded-full" />
    <SkeletonBlock color={color} className="mb-4 h-3 w-2/5 rounded-full" />
    <SkeletonBlock color={color} className="mb-1.5 h-3 w-full rounded-full" />
    <SkeletonBlock color={color} className="mb-4 h-3 w-4/5 rounded-full" />
    <View className="flex-row gap-2">
      <SkeletonBlock color={color} className="h-5 w-14 rounded-full" />
      <SkeletonBlock color={color} className="h-5 w-16 rounded-full" />
    </View>
  </View>
);

type InboxSkeletonProps = {
  color: Colors;
};

export const InboxSkeleton = ({ color }: InboxSkeletonProps) => (
  <View className="flex-1" style={{ backgroundColor: color.background.secondary }}>
    <SkeletonPulse>
      <View className="mx-4 mb-2 mt-4">
        <SkeletonBlock color={color} className="h-3 w-28 rounded-full" />
      </View>
      <SkeletonCard color={color} />

      <View className="mx-4 mb-2 mt-2">
        <SkeletonBlock color={color} className="h-3 w-24 rounded-full" />
      </View>
      <SkeletonCard color={color} />
      <SkeletonCard color={color} />
      <SkeletonCard color={color} />
    </SkeletonPulse>
  </View>
);
