import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

import type {
  Graph3DNodeLegendItem,
  Graph3DNodeLegendKind,
  Graph3DSceneClusterSummary,
} from '../lib/prepareGraph3DSceneLayout';
import {
  GraphLegendDotRow,
  GraphLegendLineRow,
  GraphLegendSectionTitle,
} from './GraphLegendSamples';

type Graph3DInfoOverlayProps = {
  color: Colors;
  clusterSummaries: Graph3DSceneClusterSummary[];
  nodeLegendItems: Graph3DNodeLegendItem[];
  edgeCount: number;
  recordCount: number;
  taskCount: number;
};

const NODE_LEGEND_LABEL_KEYS: Record<Graph3DNodeLegendKind, string> = {
  folder: '',
  inbox: 'notesGraph.legend3d.inbox',
  archived: 'notesGraph.legend3d.archived',
  taskOpen: 'notesGraph.legend3d.taskOpen',
  taskHigh: 'notesGraph.legend3d.taskHigh',
  taskMedium: 'notesGraph.legend3d.taskMedium',
  taskDone: 'notesGraph.legend3d.taskDone',
};

export function Graph3DInfoOverlay({
  color,
  clusterSummaries,
  nodeLegendItems,
  edgeCount,
  recordCount,
  taskCount,
}: Graph3DInfoOverlayProps) {
  const { t } = useTranslation();
  const clusterCount = clusterSummaries.length;

  const resolveNodeLegendLabel = (item: Graph3DNodeLegendItem): string => {
    if (item.kind === 'folder') {
      return item.label;
    }

    return t(NODE_LEGEND_LABEL_KEYS[item.kind]);
  };

  return (
    <ScrollView
      style={{ maxHeight: 320 }}
      contentContainerStyle={{ gap: 12 }}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      <Text
        style={{
          color: color.text.primary,
          fontSize: 13,
          fontWeight: '700',
          lineHeight: 17,
        }}
      >
        {recordCount} {t('notesGraph.legend3d.notes')} · {taskCount}{' '}
        {t('notesGraph.legend3d.tasks')} · {edgeCount} {t('notesGraph.legend3d.linksCount')}
      </Text>

      {nodeLegendItems.length > 0 ? (
        <View style={{ gap: 8 }}>
          <GraphLegendSectionTitle color={color} title={t('notesGraph.legend3d.dots')} />
          <View style={{ gap: 8 }}>
            {nodeLegendItems.map((item) => (
              <GraphLegendDotRow
                key={item.id}
                color={color}
                dotColor={item.color}
                label={resolveNodeLegendLabel(item)}
                count={item.count}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <GraphLegendSectionTitle color={color} title={t('notesGraph.legend3d.links')} />
        <View style={{ gap: 8 }}>
          <GraphLegendLineRow
            color={color}
            edgeKind="similar"
            label={t('notesGraph.legend.similar')}
          />
          <GraphLegendLineRow
            color={color}
            edgeKind="sharedTag"
            label={t('notesGraph.legend.sharedTag')}
          />
          <GraphLegendLineRow
            color={color}
            edgeKind="sameFolder"
            label={t('notesGraph.legend.sameFolder')}
          />
          <GraphLegendLineRow
            color={color}
            edgeKind="linked"
            label={t('notesGraph.legend.linked')}
          />
          <GraphLegendLineRow
            color={color}
            edgeKind="contains"
            label={t('notesGraph.legend.tasks')}
          />
        </View>
      </View>

      {clusterCount > 0 ? (
        <View style={{ gap: 8 }}>
          <GraphLegendSectionTitle color={color} title={t('notesGraph.legend3d.groups')} />
          <View style={{ gap: 8 }}>
            {clusterSummaries.map((cluster) => (
              <GraphLegendDotRow
                key={cluster.id}
                color={color}
                dotColor={cluster.color}
                label={cluster.label}
                count={cluster.count}
              />
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
