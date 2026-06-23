import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LayoutChangeEvent } from 'react-native';
import { useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnUI, useSharedValue, withDecay } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { Folder } from '@/entities/folder';
import type { Colors } from '@/shared/config';
import { hapticLight } from '@/shared/lib';

import {
  computeFitCameraDistance,
  GRAPH_3D_DEFAULT_PITCH,
  GRAPH_3D_DEFAULT_YAW,
  GRAPH_3D_ORBIT_SENSITIVITY,
} from '../lib/graph3dProjection';
import {
  clampGraph3DDistanceWorklet,
  clampGraph3DPitchWorklet,
} from '../lib/graph3dProjectionWorklet';
import { NOTES_GRAPH_3D_LOADING_TIP_KEYS } from '../lib/graphLoadingTips';
import type { GraphEdge, GraphNode } from '../lib/graphTypes';
import { prepareGraph3DSceneLayout } from '../lib/prepareGraph3DSceneLayout';
import { DottedBackground } from './DottedBackground';
import { Graph3DScenePicture } from './Graph3DScenePicture';
import { GraphBuildingState } from './GraphBuildingState';
import { GraphControls } from './GraphControls';

type GraphCanvas3DProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  color: Colors;
  foldersById: Map<string, Folder>;
  isProActive: boolean;
  bottomInset: number;
  mapStatusActive?: boolean;
  mapStatusLabel?: string;
};

const ZOOM_STEP = 1.2;

export function GraphCanvas3D({
  nodes,
  edges,
  color,
  foldersById,
  isProActive,
  bottomInset,
  mapStatusActive = false,
  mapStatusLabel,
}: GraphCanvas3DProps) {
  const { t } = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [isPreparing3d, setIsPreparing3d] = useState(true);
  const prepareGenerationRef = useRef(0);

  const finishPrepare3d = useCallback((generation: number) => {
    if (prepareGenerationRef.current !== generation) {
      return;
    }
    setIsPreparing3d(false);
  }, []);

  const yawSV = useSharedValue(GRAPH_3D_DEFAULT_YAW);
  const pitchSV = useSharedValue(GRAPH_3D_DEFAULT_PITCH);
  const distanceSV = useSharedValue(3);
  const cameraReadySV = useSharedValue(0);
  const pinchStartDistanceSV = useSharedValue(3);

  const viewportWidth = viewportSize.width > 0 ? viewportSize.width : windowWidth;
  const viewportHeight =
    viewportSize.height > 0 ? viewportSize.height : Math.max(windowHeight - 120, 320);

  const sceneLayout = useMemo(
    () => prepareGraph3DSceneLayout(nodes, edges, color, foldersById, isProActive),
    [color, edges, foldersById, isProActive, nodes],
  );

  const handleCanvasLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewportSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  }, []);

  useEffect(() => {
    if (!sceneLayout || viewportWidth <= 0 || viewportHeight <= 0) {
      if (!sceneLayout) {
        setIsPreparing3d(false);
        cameraReadySV.value = 0;
      }
      return;
    }

    const generation = prepareGenerationRef.current + 1;
    prepareGenerationRef.current = generation;
    setIsPreparing3d(true);

    const fitDistance = computeFitCameraDistance(nodes, edges, {
      width: viewportWidth,
      height: viewportHeight,
    });

    runOnUI(() => {
      'worklet';
      cameraReadySV.value = 0;
      yawSV.value = GRAPH_3D_DEFAULT_YAW;
      pitchSV.value = GRAPH_3D_DEFAULT_PITCH;
      distanceSV.value = fitDistance;
      cameraReadySV.value = 1;
      scheduleOnRN(finishPrepare3d, generation);
    })();
  }, [
    cameraReadySV,
    distanceSV,
    edges,
    finishPrepare3d,
    nodes,
    pitchSV,
    sceneLayout,
    viewportHeight,
    viewportWidth,
    yawSV,
  ]);

  const fitToScreen = useCallback(() => {
    if (!sceneLayout || viewportWidth <= 0 || viewportHeight <= 0) {
      return;
    }

    hapticLight();
    const fitDistance = computeFitCameraDistance(nodes, edges, {
      width: viewportWidth,
      height: viewportHeight,
    });

    runOnUI(() => {
      'worklet';
      yawSV.value = GRAPH_3D_DEFAULT_YAW;
      pitchSV.value = GRAPH_3D_DEFAULT_PITCH;
      distanceSV.value = fitDistance;
    })();
  }, [distanceSV, edges, nodes, pitchSV, sceneLayout, viewportHeight, viewportWidth, yawSV]);

  const resetView = useCallback(() => {
    hapticLight();
    runOnUI(() => {
      'worklet';
      yawSV.value = GRAPH_3D_DEFAULT_YAW;
      pitchSV.value = GRAPH_3D_DEFAULT_PITCH;
      distanceSV.value = 3;
    })();
  }, [distanceSV, pitchSV, yawSV]);

  const zoomIn = useCallback(() => {
    hapticLight();
    runOnUI(() => {
      'worklet';
      distanceSV.value = clampGraph3DDistanceWorklet(distanceSV.value / ZOOM_STEP);
    })();
  }, [distanceSV]);

  const zoomOut = useCallback(() => {
    hapticLight();
    runOnUI(() => {
      'worklet';
      distanceSV.value = clampGraph3DDistanceWorklet(distanceSV.value * ZOOM_STEP);
    })();
  }, [distanceSV]);

  const orbitGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!isPreparing3d)
        .maxPointers(1)
        .onChange((event) => {
          'worklet';
          yawSV.value += event.changeX * GRAPH_3D_ORBIT_SENSITIVITY;
          pitchSV.value = clampGraph3DPitchWorklet(
            pitchSV.value + event.changeY * GRAPH_3D_ORBIT_SENSITIVITY,
          );
        })
        .onEnd((event) => {
          'worklet';
          const yawVelocity = event.velocityX * GRAPH_3D_ORBIT_SENSITIVITY * 0.0012;
          const pitchVelocity = event.velocityY * GRAPH_3D_ORBIT_SENSITIVITY * 0.0012;
          const pitchMin = -Math.PI / 2 + 0.1;
          const pitchMax = Math.PI / 2 - 0.1;

          if (Math.abs(yawVelocity) > 0.015) {
            yawSV.value = withDecay({
              velocity: yawVelocity,
              deceleration: 0.997,
            });
          }

          if (Math.abs(pitchVelocity) > 0.015) {
            pitchSV.value = withDecay({
              velocity: pitchVelocity,
              deceleration: 0.997,
              clamp: [pitchMin, pitchMax],
            });
          }
        }),
    [isPreparing3d, pitchSV, yawSV],
  );

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .enabled(!isPreparing3d)
        .onBegin(() => {
          'worklet';
          pinchStartDistanceSV.value = distanceSV.value;
        })
        .onUpdate((event) => {
          'worklet';
          distanceSV.value = clampGraph3DDistanceWorklet(
            pinchStartDistanceSV.value / Math.max(event.scale, 0.2),
          );
        }),
    [distanceSV, isPreparing3d, pinchStartDistanceSV],
  );

  const canvasGesture = useMemo(
    () => Gesture.Simultaneous(orbitGesture, pinchGesture),
    [orbitGesture, pinchGesture],
  );

  return (
    <View style={{ flex: 1 }} onLayout={handleCanvasLayout}>
      <DottedBackground
        width={viewportWidth}
        height={viewportHeight}
        dotColor={color.text.muted}
        opacity={0.28}
      />

      <GestureDetector gesture={isPreparing3d ? Gesture.Manual() : canvasGesture}>
        <View style={{ flex: 1 }}>
          <Graph3DScenePicture
            scene={sceneLayout}
            yaw={yawSV}
            pitch={pitchSV}
            distance={distanceSV}
            viewportWidth={viewportWidth}
            viewportHeight={viewportHeight}
            cameraReady={cameraReadySV}
          />
        </View>
      </GestureDetector>

      {isPreparing3d ? (
        <GraphBuildingState
          label={t('notesGraph.preparing3d')}
          blockTouches
          tipKeys={NOTES_GRAPH_3D_LOADING_TIP_KEYS}
        />
      ) : null}

      <GraphControls
        color={color}
        bottomInset={bottomInset}
        disabled={mapStatusActive || isPreparing3d}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFit={fitToScreen}
        onReset={resetView}
        legendVisible={false}
        legendToggleVisible={false}
        onToggleLegend={() => {}}
        statusActive={mapStatusActive}
        statusLabel={mapStatusLabel}
      />
    </View>
  );
}
