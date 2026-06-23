import React from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

import type { Graph3DSceneClusterSummary } from '../lib/prepareGraph3DSceneLayout';

type Graph3DInfoOverlayProps = {
  color: Colors;
  clusterSummaries: Graph3DSceneClusterSummary[];
  edgeCount: number;
  recordCount: number;
  taskCount: number;
};

export function Graph3DInfoOverlay({
  color,
  clusterSummaries,
  edgeCount,
  recordCount,
  taskCount,
}: Graph3DInfoOverlayProps) {
  const clusterCount = clusterSummaries.length;

  return (
    <View pointerEvents="none" style={{ gap: 8 }}>
      <Text
        style={{
          color: color.text.primary,
          fontSize: 13,
          fontWeight: '700',
          lineHeight: 17,
        }}
      >
        {recordCount} notes · {taskCount} tasks · {edgeCount} links
      </Text>

      {clusterCount > 0 ? (
        <View style={{ gap: 6 }}>
          {clusterSummaries.map((cluster) => (
            <View key={cluster.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: cluster.color,
                }}
              />
              <Text
                numberOfLines={1}
                style={{
                  color: color.text.secondary,
                  flexShrink: 1,
                  fontSize: 12,
                  fontWeight: '600',
                  lineHeight: 16,
                }}
              >
                {cluster.label} · {cluster.count}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
