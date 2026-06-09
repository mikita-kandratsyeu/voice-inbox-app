import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions, View } from 'react-native';

import { openPlanPaywall } from '@/app/navigation/openPlanPaywall';
import type { RootStackParamList } from '@/app/navigation/types';
import { useRootStackBack } from '@/app/navigation/useRootStackBack';
import { useRecordStore } from '@/entities/record';
import { useProEntitlement } from '@/features/pro-license';
import { AutomationComingSoonSheet } from '@/screens/settings/ui/AutomationComingSoonSheet';
import { useColors } from '@/shared/config';
import { ScreenHeader } from '@/shared/ui';

import { beginNotesGraphScreenWarm } from '../lib/warmNotesGraph';
import { DEFAULT_EDGE_VISIBILITY, type GraphFilters } from '../lib/graphTypes';
import { getPrefetchedNotesGraphScreenBody, prefetchNotesGraphScreenBody } from '../lib/prefetchNotesGraphScreenBody';
import { unloadNotesGraphScreen } from '../lib/unloadNotesGraphScreen';
import { GraphBuildingState } from './GraphBuildingState';

type NotesGraphScreenBodyComponent = React.ComponentType;

export const NotesGraphScreen = () => {
  const { t } = useTranslation();
  const handleBack = useRootStackBack();
  const route = useRoute<RouteProp<RootStackParamList, 'NotesGraph'>>();
  const color = useColors();
  const { isProActive } = useProEntitlement();
  const records = useRecordStore((state) => state.records);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [proSheetVisible, setProSheetVisible] = useState(true);
  const [Body, setBody] = useState<NotesGraphScreenBodyComponent | null>(
    () => getPrefetchedNotesGraphScreenBody(),
  );

  const initialFilters = useMemo<GraphFilters>(
    () => ({
      folderId: route.params?.folderId ?? null,
      tags: route.params?.tag ? [route.params.tag] : [],
      showTasks: true,
      edgeVisibility: { ...DEFAULT_EDGE_VISIBILITY },
    }),
    [route.params?.folderId, route.params?.tag],
  );

  useEffect(() => {
    return () => {
      unloadNotesGraphScreen();
    };
  }, []);

  useEffect(() => {
    if (!isProActive) return;

    let cancelled = false;

    const frameId = requestAnimationFrame(() => {
      if (!cancelled) {
        beginNotesGraphScreenWarm(records, initialFilters, windowWidth, windowHeight, null);
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [initialFilters, isProActive, records, windowHeight, windowWidth]);

  useEffect(() => {
    if (!isProActive || Body) return;

    let cancelled = false;

    void prefetchNotesGraphScreenBody().then((mod) => {
      if (!cancelled) {
        setBody(() => mod.NotesGraphScreenBody);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [Body, isProActive]);

  if (!isProActive) {
    return (
      <AutomationComingSoonSheet
        visible={proSheetVisible}
        feature="notesGraph"
        onClose={() => {
          setProSheetVisible(false);
          handleBack();
        }}
        onUpgradePress={() => {
          setProSheetVisible(false);
          openPlanPaywall();
          handleBack();
        }}
      />
    );
  }

  if (!Body) {
    return (
      <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
        <ScreenHeader title={t('notesGraph.title')} onBack={handleBack} />
        <GraphBuildingState label={t('notesGraph.building')} />
      </View>
    );
  }

  return <Body />;
};
